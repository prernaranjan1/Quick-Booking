import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        // Clerk user id
        user: {
            type: String,
            required: true,
            ref: "User"
        },
        show: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Show"
        },
        // TMDB id of the movie, for display without an extra lookup
        movie: {
            type: String,
            required: true
        },
        seats: [
            {
                _id: false,
                seat: { type: String, required: true },
                category: { type: String, required: true },
                price: { type: Number, required: true }
            }
        ],
        snacks: [
            {
                _id: false,
                id: { type: String, required: true },
                name: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true }
            }
        ],
        // Amounts in whole rupees
        ticketAmount: { type: Number, required: true },
        snackAmount: { type: Number, default: 0 },
        amount: { type: Number, required: true },
        currency: { type: String, default: "INR" },
        // pending: seats held, waiting for payment
        // refund_required: paid after the hold expired and the seats were gone
        status: {
            type: String,
            enum: ["pending", "paid", "expired", "cancelled", "refund_required"],
            default: "pending"
        },
        expiresAt: { type: Date },
        razorpayOrderId: { type: String, index: true },
        razorpayPaymentId: { type: String },
        paidAt: { type: Date }
    },
    {
        timestamps: true
    }
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
