import express from "express";
import { getAuth } from "@clerk/express";
import { isAdminUser } from "../middleware/auth.js";

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

export default adminRouter;
