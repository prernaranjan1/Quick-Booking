import express from "express";
import {
    getSnacks,
    createBooking,
    verifyPayment,
    cancelBooking,
    getMyBookings,
    getBooking
} from "../controllers/bookingControllers.js";
import { requireSignIn } from "../middleware/auth.js";

const bookingRouter = express.Router();

bookingRouter.get("/snacks", getSnacks);
bookingRouter.post("/create", requireSignIn, createBooking);
bookingRouter.post("/verify", requireSignIn, verifyPayment);
bookingRouter.get("/my", requireSignIn, getMyBookings);
bookingRouter.get("/:bookingId", requireSignIn, getBooking);
bookingRouter.post("/:bookingId/cancel", requireSignIn, cancelBooking);

export default bookingRouter;
