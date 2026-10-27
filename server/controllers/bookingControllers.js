import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import {
    MAX_SEATS_PER_BOOKING,
    getCategoryPrices,
    getSeatCategory,
    isValidSeat
} from "../config/pricing.js";
import { SNACKS, MAX_SNACK_QUANTITY, getSnack } from "../config/snacks.js";
import {
    HOLD_MINUTES,
    lockSeats,
    confirmSeatLocks,
    releaseSeats
} from "../services/seatLocks.js";
import {
    createOrder,
    getRazorpayKeyId,
    isRazorpayConfigured,
    isWebhookConfigured,
    verifyPaymentSignature,
    verifyWebhookSignature
} from "../services/razorpay.js";
import { getMoviesForShows, getTakenSeats } from "./showControllers.js";

// Stops one user holding many seats at once without paying
const MAX_PENDING_BOOKINGS = 3;

const isExpiredPending = (booking) =>
    booking.status === "pending" && booking.expiresAt && booking.expiresAt.getTime() <= Date.now();

// Marks an unpaid booking as expired once its hold has run out
const expireIfNeeded = async (booking) => {
    if (!isExpiredPending(booking)) return booking;

    await releaseSeats(booking._id);
    return Booking.findOneAndUpdate(
        { _id: booking._id, status: "pending" },
        { status: "expired" },
        { new: true }
    ).lean().then((updated) => updated || booking);
};

// Adds show and movie details for display
const withShowDetails = async (bookings) => {
    const shows = await Show.find({ _id: { $in: bookings.map((booking) => booking.show) } }).lean();
    const movies = await getMoviesForShows(shows);
    const showsById = new Map(shows.map((show) => [String(show._id), show]));

    return bookings.map((booking) => {
        const show = showsById.get(String(booking.show));
        return {
            ...booking,
            show: show
                ? {
                    _id: show._id,
                    showDateTime: show.showDateTime,
                    movie: movies.get(show.movie) || null
                }
                : null
        };
    });
};

// Marks a booking paid. Shared by payment verification and the webhook,
// so it is safe to call more than once.
const confirmBooking = async (booking, paymentId) => {
    if (booking.status === "paid") return booking;

    const lockResult = await confirmSeatLocks(booking);

    if (!lockResult.ok) {
        // Paid after the hold ran out and someone else took a seat
        return Booking.findByIdAndUpdate(
            booking._id,
            { status: "refund_required", razorpayPaymentId: paymentId },
            { new: true }
        ).lean();
    }

    const seatUpdates = {};
    booking.seats.forEach((item) => {
        seatUpdates[`occupiedSeats.${item.seat}`] = booking.user;
    });
    await Show.updateOne({ _id: booking.show }, { $set: seatUpdates });

    return Booking.findByIdAndUpdate(
        booking._id,
        {
            status: "paid",
            razorpayPaymentId: paymentId,
            paidAt: new Date(),
            $unset: { expiresAt: 1 }
        },
        { new: true }
    ).lean();
};

// API to list snacks
export const getSnacks = (req, res) => {
    res.json({ success: true, snacks: SNACKS, maxQuantity: MAX_SNACK_QUANTITY });
};

// API to hold seats and create a Razorpay order
// Body: { showId, seats: ["A1", "A2"], snacks: [{ id: "popcorn", quantity: 2 }] }
export const createBooking = async (req, res) => {
    try {
        const userId = req.userId;
        const { showId, seats, snacks = [] } = req.body || {};

        if (!mongoose.isValidObjectId(showId)) {
            return res.status(400).json({ success: false, message: "Invalid show." });
        }

        if (
            !Array.isArray(seats) ||
            seats.length === 0 ||
            seats.length > MAX_SEATS_PER_BOOKING ||
            !seats.every(isValidSeat) ||
            new Set(seats).size !== seats.length
        ) {
            return res.status(400).json({
                success: false,
                message: `Choose between 1 and ${MAX_SEATS_PER_BOOKING} valid seats.`
            });
        }

        if (!Array.isArray(snacks)) {
            return res.status(400).json({ success: false, message: "Invalid snacks." });
        }

        const snackItems = [];
        for (const item of snacks) {
            const snack = getSnack(item?.id);
            const quantity = Number(item?.quantity);

            if (!snack || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_SNACK_QUANTITY) {
                return res.status(400).json({ success: false, message: "Invalid snack selection." });
            }

            if (snackItems.some((existing) => existing.id === snack.id)) {
                return res.status(400).json({ success: false, message: "Each snack can only be listed once." });
            }

            snackItems.push({ id: snack.id, name: snack.name, price: snack.price, quantity });
        }

        if (!isRazorpayConfigured()) {
            return res.status(503).json({ success: false, message: "Payments are not configured yet." });
        }

        const show = await Show.findById(showId).lean();

        if (!show) {
            return res.status(404).json({ success: false, message: "Show not found." });
        }

        if (show.showDateTime.getTime() <= Date.now()) {
            return res.status(400).json({ success: false, message: "This show has already started." });
        }

        const pendingCount = await Booking.countDocuments({
            user: userId,
            status: "pending",
            expiresAt: { $gt: new Date() }
        });

        if (pendingCount >= MAX_PENDING_BOOKINGS) {
            return res.status(429).json({
                success: false,
                message: "You have unpaid bookings waiting. Pay for or cancel them first."
            });
        }

        // Prices are fixed at the moment the seats are held
        const taken = await getTakenSeats(show._id);
        const { categories } = getCategoryPrices(show, taken.booked.length + taken.held.length);
        const priceByCategory = Object.fromEntries(categories.map((category) => [category.id, category.price]));

        const seatItems = seats.map((seat) => {
            const category = getSeatCategory(seat);
            return { seat, category: category.id, price: priceByCategory[category.id] };
        });

        const ticketAmount = seatItems.reduce((sum, item) => sum + item.price, 0);
        const snackAmount = snackItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

        const booking = new Booking({
            user: userId,
            show: show._id,
            movie: show.movie,
            seats: seatItems,
            snacks: snackItems,
            ticketAmount,
            snackAmount,
            amount: ticketAmount + snackAmount,
            status: "pending",
            expiresAt
        });

        const lockResult = await lockSeats({
            showId: show._id,
            seats,
            bookingId: booking._id,
            userId,
            expiresAt
        });

        if (!lockResult.ok) {
            return res.status(409).json({
                success: false,
                message: `Sorry, ${lockResult.takenSeats.join(", ") || "some seats"} just got taken. Please choose other seats.`,
                takenSeats: lockResult.takenSeats
            });
        }

        let order;
        try {
            order = await createOrder({
                amount: booking.amount,
                receipt: String(booking._id),
                notes: { bookingId: String(booking._id) }
            });
        } catch (error) {
            await releaseSeats(booking._id);
            console.error("Razorpay order failed:", error.response?.data || error.message);
            return res.status(502).json({ success: false, message: "Could not start the payment. Please try again." });
        }

        booking.razorpayOrderId = order.id;
        await booking.save();

        return res.json({
            success: true,
            bookingId: booking._id,
            amount: booking.amount,
            expiresAt,
            razorpay: {
                keyId: getRazorpayKeyId(),
                orderId: order.id,
                amount: order.amount,
                currency: order.currency
            }
        });
    } catch (error) {
        console.error("Failed to create booking:", error.message);
        return res.status(500).json({ success: false, message: "Could not create the booking." });
    }
};

// API to confirm a payment from Razorpay Checkout
export const verifyPayment = async (req, res) => {
    try {
        const {
            bookingId,
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature
        } = req.body || {};

        if (!mongoose.isValidObjectId(bookingId) || !orderId || !paymentId || !signature) {
            return res.status(400).json({ success: false, message: "Missing payment details." });
        }

        const booking = await Booking.findOne({ _id: bookingId, user: req.userId }).lean();

        if (!booking || booking.razorpayOrderId !== orderId) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
            return res.status(400).json({ success: false, message: "Payment could not be verified." });
        }

        const confirmed = await confirmBooking(booking, paymentId);

        if (confirmed.status === "refund_required") {
            return res.status(409).json({
                success: false,
                message: "Your payment went through, but the seats were released before it completed. You will be refunded.",
                status: confirmed.status
            });
        }

        return res.json({ success: true, bookingId: confirmed._id, status: confirmed.status });
    } catch (error) {
        console.error("Payment verification failed:", error.message);
        return res.status(500).json({ success: false, message: "Could not verify the payment." });
    }
};

// Razorpay webhook: confirms bookings even if the user closed the page after paying.
// Mounted with express.raw() so the signature can be checked on the exact body.
export const razorpayWebhook = async (req, res) => {
    try {
        if (!isWebhookConfigured()) {
            return res.status(503).json({ success: false, message: "Webhook not configured." });
        }

        const signature = req.headers["x-razorpay-signature"];

        if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
            return res.status(400).json({ success: false, message: "Invalid signature." });
        }

        const event = JSON.parse(req.body.toString("utf8"));

        if (event.event === "payment.captured" || event.event === "order.paid") {
            const payment = event.payload?.payment?.entity;
            const orderId = event.payload?.order?.entity?.id || payment?.order_id;

            if (orderId && payment?.id) {
                const booking = await Booking.findOne({ razorpayOrderId: orderId }).lean();
                if (booking) {
                    await confirmBooking(booking, payment.id);
                }
            }
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("Razorpay webhook failed:", error.message);
        return res.status(500).json({ success: false });
    }
};

// API to cancel an unpaid booking and release its seats
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!mongoose.isValidObjectId(bookingId)) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const booking = await Booking.findOneAndUpdate(
            { _id: bookingId, user: req.userId, status: "pending" },
            { status: "cancelled", $unset: { expiresAt: 1 } },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: "No unpaid booking to cancel." });
        }

        await releaseSeats(booking._id);

        return res.json({ success: true });
    } catch (error) {
        console.error("Cancel failed:", error.message);
        return res.status(500).json({ success: false, message: "Could not cancel the booking." });
    }
};

// API for the signed-in user's bookings
export const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({
            user: req.userId,
            status: { $ne: "cancelled" }
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const current = await Promise.all(bookings.map(expireIfNeeded));

        return res.json({ success: true, bookings: await withShowDetails(current) });
    } catch (error) {
        console.error("Failed to load bookings:", error.message);
        return res.status(500).json({ success: false, message: "Could not load your bookings." });
    }
};

// API for one booking (ticket page, or paying for a held booking)
export const getBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!mongoose.isValidObjectId(bookingId)) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const found = await Booking.findOne({ _id: bookingId, user: req.userId }).lean();

        if (!found) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const booking = await expireIfNeeded(found);
        const [withDetails] = await withShowDetails([booking]);

        return res.json({
            success: true,
            booking: withDetails,
            razorpayKeyId: booking.status === "pending" ? getRazorpayKeyId() : undefined
        });
    } catch (error) {
        console.error("Failed to load booking:", error.message);
        return res.status(500).json({ success: false, message: "Could not load the booking." });
    }
};
