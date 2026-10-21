import axios from "axios";
import mongoose from "mongoose";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import SeatLock from "../models/SeatLock.js";
import {
    SEAT_ROWS,
    SEATS_PER_ROW,
    MAX_SEATS_PER_BOOKING,
    getCategoryPrices
} from "../config/pricing.js";

const tmdbApiKey = process.env.TMDB_API_KEY;
const tmdbOptions = {
    params: {
        api_key: tmdbApiKey
    }
};

const MAX_SHOW_PRICE = 10000;
const MAX_CAST = 15;

// Map of tmdbId (string) -> Movie for the given shows
export const getMoviesForShows = async (shows) => {
    const ids = [...new Set(shows.map((show) => Number(show.movie)))];
    const movies = await Movie.find({ tmdbId: { $in: ids } }).lean();
    return new Map(movies.map((movie) => [String(movie.tmdbId), movie]));
};

// Seats that are paid or currently held for a show
export const getTakenSeats = async (showId) => {
    const locks = await SeatLock.find({
        show: showId,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    }).lean();

    return {
        booked: locks.filter((lock) => !lock.expiresAt).map((lock) => lock.seat),
        held: locks.filter((lock) => lock.expiresAt).map((lock) => lock.seat)
    };
};

// API to get now playing movies (admin)
export const getNowPlayingMovies = async (req, res) => {
    try {
        if (!tmdbApiKey) {
            return res.status(500).json({
                success: false,
                message: "TMDB API key is not configured."
            });
        }

        const { data } = await axios.get(
            "https://api.themoviedb.org/3/movie/now_playing",
            tmdbOptions
        );

        return res.json({
            success: true,
            movies: data.results || []
        });
    } catch (error) {
        console.error(
            "Failed to fetch now playing movies:",
            error.response?.data || error.message
        );

        return res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.status_message || error.message
        });
    }
};

// API to add shows for a movie (admin)
// Body: { movieId, showPrice, showDateTimes: ["2026-11-01T13:30:00.000Z", ...] }
export const addShow = async (req, res) => {
    try {
        const { movieId, showDateTimes, showPrice } = req.body;
        const tmdbMovieId = Number(movieId);
        const price = Number(showPrice);

        if (!Number.isInteger(tmdbMovieId) || tmdbMovieId <= 0) {
            return res.status(400).json({ success: false, message: "A valid movieId is required." });
        }

        if (!Number.isFinite(price) || price <= 0 || price > MAX_SHOW_PRICE) {
            return res.status(400).json({
                success: false,
                message: `showPrice must be between 1 and ${MAX_SHOW_PRICE}.`
            });
        }

        if (!Array.isArray(showDateTimes) || showDateTimes.length === 0 || showDateTimes.length > 50) {
            return res.status(400).json({ success: false, message: "Add between 1 and 50 show times." });
        }

        const now = Date.now();
        const times = [];

        for (const value of showDateTimes) {
            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return res.status(400).json({ success: false, message: `Invalid show time: ${value}` });
            }

            if (date.getTime() <= now) {
                return res.status(400).json({ success: false, message: "Show times must be in the future." });
            }

            times.push(date.getTime());
        }

        let movie = await Movie.findOne({ tmdbId: tmdbMovieId });

        if (!movie) {
            if (!tmdbApiKey) {
                return res.status(500).json({ success: false, message: "TMDB API key is not configured." });
            }

            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${tmdbMovieId}`, tmdbOptions),
                axios.get(`https://api.themoviedb.org/3/movie/${tmdbMovieId}/credits`, tmdbOptions)
            ]);

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            movie = await Movie.create({
                tmdbId: tmdbMovieId,
                title: movieApiData.title,
                overview: movieApiData.overview || "",
                poster_path: movieApiData.poster_path || "",
                backdrop_path: movieApiData.backdrop_path || "",
                genres: movieApiData.genres || [],
                casts: (movieCreditsData.cast || []).slice(0, MAX_CAST).map((cast) => ({
                    name: cast.name,
                    character: cast.character,
                    profile_path: cast.profile_path
                })),
                release_date: movieApiData.release_date || "",
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || "",
                vote_average: movieApiData.vote_average || 0,
                vote_count: movieApiData.vote_count || 0,
                runtime: movieApiData.runtime || 0
            });
        }

        // Skip times that already have a show for this movie
        const uniqueTimes = [...new Set(times)];
        const existing = await Show.find({
            movie: String(movie.tmdbId),
            showDateTime: { $in: uniqueTimes.map((time) => new Date(time)) }
        }).lean();
        const existingTimes = new Set(existing.map((show) => show.showDateTime.getTime()));

        const showsToCreate = uniqueTimes
            .filter((time) => !existingTimes.has(time))
            .map((time) => ({
                movie: String(movie.tmdbId),
                showDateTime: new Date(time),
                showPrice: price,
                occupiedSeats: {}
            }));

        if (showsToCreate.length > 0) {
            await Show.insertMany(showsToCreate);
        }

        return res.json({
            success: true,
            message: showsToCreate.length > 0
                ? `Added ${showsToCreate.length} show(s).`
                : "These shows already exist.",
            added: showsToCreate.length,
            skipped: uniqueTimes.length - showsToCreate.length
        });
    } catch (error) {
        console.error("Failed to add show:", error.response?.data || error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.status_message || error.message
        });
    }
};

// API to list movies that have upcoming shows
export const getNowShowing = async (req, res) => {
    try {
        const ids = await Show.distinct("movie", { showDateTime: { $gte: new Date() } });
        const movies = await Movie.find({ tmdbId: { $in: ids.map(Number) } })
            .sort({ release_date: -1 })
            .lean();

        return res.json({ success: true, movies });
    } catch (error) {
        console.error("Failed to list movies:", error.message);
        return res.status(500).json({ success: false, message: "Could not load movies." });
    }
};

// API to get a movie and its upcoming show times
export const getMovieShows = async (req, res) => {
    try {
        const tmdbMovieId = Number(req.params.movieId);

        if (!Number.isInteger(tmdbMovieId)) {
            return res.status(404).json({ success: false, message: "Movie not found." });
        }

        const movie = await Movie.findOne({ tmdbId: tmdbMovieId }).lean();

        if (!movie) {
            return res.status(404).json({ success: false, message: "Movie not found." });
        }

        const shows = await Show.find({
            movie: String(tmdbMovieId),
            showDateTime: { $gte: new Date() }
        })
            .sort({ showDateTime: 1 })
            .lean();

        return res.json({
            success: true,
            movie,
            shows: shows.map((show) => ({
                showId: show._id,
                showDateTime: show.showDateTime
            }))
        });
    } catch (error) {
        console.error("Failed to load movie shows:", error.message);
        return res.status(500).json({ success: false, message: "Could not load shows." });
    }
};

// API to get the seat map and current prices for a show
export const getShowSeats = async (req, res) => {
    try {
        const { showId } = req.params;

        if (!mongoose.isValidObjectId(showId)) {
            return res.status(404).json({ success: false, message: "Show not found." });
        }

        const show = await Show.findById(showId).lean();

        if (!show) {
            return res.status(404).json({ success: false, message: "Show not found." });
        }

        const taken = await getTakenSeats(show._id);
        const pricing = getCategoryPrices(show, taken.booked.length + taken.held.length);

        return res.json({
            success: true,
            show: {
                showId: show._id,
                movie: show.movie,
                showDateTime: show.showDateTime,
                isPast: show.showDateTime.getTime() <= Date.now()
            },
            layout: {
                rows: SEAT_ROWS,
                seatsPerRow: SEATS_PER_ROW,
                maxSeats: MAX_SEATS_PER_BOOKING
            },
            booked: taken.booked,
            held: taken.held,
            categories: pricing.categories,
            factors: pricing.factors
        });
    } catch (error) {
        console.error("Failed to load seats:", error.message);
        return res.status(500).json({ success: false, message: "Could not load seats." });
    }
};
