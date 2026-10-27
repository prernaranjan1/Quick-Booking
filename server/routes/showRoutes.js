import express from "express";
import {
    getNowPlayingMovies,
    addShow,
    getNowShowing,
    getMovieShows,
    getShowSeats
} from "../controllers/showControllers.js";
import { protectAdmin } from "../middleware/auth.js";

const showRouter = express.Router();

// Admin
showRouter.get("/now-playing", protectAdmin, getNowPlayingMovies);
showRouter.post("/add", protectAdmin, addShow);

// Public
showRouter.get("/all", getNowShowing);
showRouter.get("/movie/:movieId", getMovieShows);
showRouter.get("/:showId/seats", getShowSeats);

export default showRouter;
