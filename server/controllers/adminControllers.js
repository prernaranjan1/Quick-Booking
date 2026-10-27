import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/user.js";
import { getMoviesForShows } from "./showControllers.js";

const withMovies = async (shows) => {
    const movies = await getMoviesForShows(shows);
    return shows
        .map((show) => ({ ...show, movie: movies.get(show.movie) || null }))
        .filter((show) => show.movie);
};

// API for dashboard totals and upcoming shows
export const getDashboardData = async (req, res) => {
    try {
        const [paidSummary, upcomingShows, totalUser] = await Promise.all([
            Booking.aggregate([
                { $match: { status: "paid" } },
                { $group: { _id: null, totalBookings: { $sum: 1 }, totalRevenue: { $sum: "$amount" } } }
            ]),
            Show.find({ showDateTime: { $gte: new Date() } }).sort({ showDateTime: 1 }).lean(),
            User.countDocuments()
        ]);

        return res.json({
            success: true,
            dashboardData: {
                totalBookings: paidSummary[0]?.totalBookings || 0,
                totalRevenue: paidSummary[0]?.totalRevenue || 0,
                activeShows: await withMovies(upcomingShows),
                totalUser
            }
        });
    } catch (error) {
        console.error("Failed to load dashboard:", error.message);
        return res.status(500).json({ success: false, message: "Could not load dashboard." });
    }
};

// API for all shows with booking counts and earnings
export const getAllShows = async (req, res) => {
    try {
        const shows = await Show.find({}).sort({ showDateTime: -1 }).limit(200).lean();

        const earnings = await Booking.aggregate([
            { $match: { status: "paid", show: { $in: shows.map((show) => show._id) } } },
            { $group: { _id: "$show", earnings: { $sum: "$amount" } } }
        ]);
        const earningsByShow = new Map(earnings.map((item) => [String(item._id), item.earnings]));

        const result = (await withMovies(shows)).map((show) => ({
            ...show,
            totalBookings: Object.keys(show.occupiedSeats || {}).length,
            earnings: earningsByShow.get(String(show._id)) || 0
        }));

        return res.json({ success: true, shows: result });
    } catch (error) {
        console.error("Failed to load shows:", error.message);
        return res.status(500).json({ success: false, message: "Could not load shows." });
    }
};

// API for all paid bookings
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ status: "paid" })
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();

        const [shows, users] = await Promise.all([
            Show.find({ _id: { $in: bookings.map((booking) => booking.show) } }).lean(),
            User.find({ _id: { $in: bookings.map((booking) => booking.user) } }).lean()
        ]);
        const movies = await getMoviesForShows(shows);
        const showsById = new Map(shows.map((show) => [String(show._id), show]));
        const usersById = new Map(users.map((user) => [user._id, user]));

        return res.json({
            success: true,
            bookings: bookings.map((booking) => {
                const show = showsById.get(String(booking.show));
                return {
                    ...booking,
                    user: { name: usersById.get(booking.user)?.name || "Unknown user" },
                    show: show
                        ? { ...show, movie: movies.get(show.movie) || { title: "Unknown movie" } }
                        : null
                };
            })
        });
    } catch (error) {
        console.error("Failed to load bookings:", error.message);
        return res.status(500).json({ success: false, message: "Could not load bookings." });
    }
};
