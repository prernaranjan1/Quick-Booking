import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
    {
        // TMDB id of the movie (matches Movie.tmdbId)
        movie: {
            type: String,
            required: true,
            ref: "Movie"
        },
        showDateTime: {
            type: Date,
            required: true
        },
        // Base price; seat categories and dynamic pricing are applied on top
        showPrice: {
            type: Number,
            required: true
        },
        // Paid seats: { "A1": "<clerk user id>" }. Kept for quick counts;
        // SeatLock is the source of truth for availability.
        occupiedSeats: {
            type: Object,
            default: {}
        }
    },
    {
        minimize: false
    }
);

showSchema.index({ movie: 1, showDateTime: 1 });

const Show = mongoose.model("Show", showSchema);

export default Show;
