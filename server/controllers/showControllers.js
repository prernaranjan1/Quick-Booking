import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

const tmdbApiKey = process.env.TMDB_API_KEY;
const tmdbOptions = {
    params: {
        api_key: tmdbApiKey
    }
};

// API to get now playing movies
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

// API to add a new show to the database
export const addShow = async (req, res) => {
    try {
        const { movieId, showsInput, showPrice } = req.body;

        if (!movieId || !Array.isArray(showsInput) || !showPrice) {
            return res.status(400).json({
                success: false,
                message: "movieId, showsInput, and showPrice are required."
            });
        }

        if (!tmdbApiKey) {
            return res.status(500).json({
                success: false,
                message: "TMDB API key is not configured."
            });
        }

        const tmdbMovieId = Number(movieId);
        let movie = await Movie.findOne({ tmdbId: tmdbMovieId });

        if (!movie) {
            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${tmdbMovieId}`, tmdbOptions),
                axios.get(`https://api.themoviedb.org/3/movie/${tmdbMovieId}/credits`, tmdbOptions)
            ]);

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            const movieDetails = {
                tmdbId: tmdbMovieId,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                genres: movieApiData.genres,
                casts: movieCreditsData.cast,
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || "",
                vote_average: movieApiData.vote_average,
                runtime: movieApiData.runtime,
            };

            movie = await Movie.create(movieDetails);
        }

        const showsToCreate = [];

        showsInput.forEach((show) => {
            const showDate = show.date;

            (show.time || []).forEach((time) => {
                const dateTimeString = `${showDate}T${time}`;

                showsToCreate.push({
                    movie: String(movie.tmdbId),
                    showDateTime: new Date(dateTimeString),
                    showPrice,
                    occupiedSeats: {}
                });
            });
        });

        if (showsToCreate.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No show times were provided."
            });
        }

        await Show.insertMany(showsToCreate);

        return res.json({
            success: true,
            message: "Show added successfully"
        });
    } catch (error) {
        console.error("Failed to add show:", error.response?.data || error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.status_message || error.message
        });
    }
};
