import express from "express";
import { getNowPlayingMovies, addShow } from "../controllers/showControllers.js";

const showRouter = express.Router();

showRouter.get("/now-playing", getNowPlayingMovies);
showRouter.post("/add", addShow);

export default showRouter;