import express from "express";
import { getAuth } from "@clerk/express";
import { isAdminUser, protectAdmin } from "../middleware/auth.js";
import { getDashboardData, getAllShows, getAllBookings } from "../controllers/adminControllers.js";

const adminRouter = express.Router();

// Lets the client decide whether to show the admin panel
adminRouter.get("/is-admin", async (req, res) => {
    try {
        const { userId } = getAuth(req);

        return res.json({
            success: true,
            isAdmin: await isAdminUser(userId)
        });
    } catch (error) {
        console.error("Admin check failed:", error.message);

        return res.status(500).json({
            success: false,
            isAdmin: false
        });
    }
});

adminRouter.get("/dashboard", protectAdmin, getDashboardData);
adminRouter.get("/all-shows", protectAdmin, getAllShows);
adminRouter.get("/all-bookings", protectAdmin, getAllBookings);

export default adminRouter;
