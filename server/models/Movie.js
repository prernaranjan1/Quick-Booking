import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
    {
        tmdbId: {
            type: Number,
            required: true,
            unique: true
        },
        title: {
            type: String,
            required: true
        },
        overview: {
            type: String,
            default: ""
        },
        poster_path: {
            type: String,
            default: ""
        },
        backdrop_path: {
            type: String,
            default: ""
        },
        release_date: {
            type: String,
            default: ""
        },
        original_language: {
            type: String
        },
        tagline: {
            type: String
        },
        genres: {
            type: Array,
            required: true
        },
        casts: {
            type: Array,
            default: []
        },
        vote_average: {
            type: Number,
            default: 0
        },
        vote_count: {
            type: Number,
            default: 0
        },
        runtime: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;