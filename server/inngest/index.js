import { Inngest } from "inngest";
import User from "../models/user.js";

// Create an Inngest client
export const inngest = new Inngest({
    id: "movie-ticket-booking",
});

// Create user in MongoDB when Clerk creates a user
const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-from-clerk",
        triggers: [{ event: "clerk/user.created" }],
    },
    async ({ event }) => {
        const {
            id,
            first_name,
            last_name,
            email_addresses,
            image_url,
        } = event.data;

        const primaryEmail = email_addresses?.[0]?.email_address ?? "";

        const userData = {
            _id: id,
            email: primaryEmail,
            name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "Clerk User",
            image: image_url ?? "",
        };

        await User.create(userData);
    }
);

// Delete user from MongoDB when Clerk deletes a user
const syncUserDeletion = inngest.createFunction(
    {
        id: "delete-user-with-clerk",
        triggers: [{ event: "clerk/user.deleted" }],
    },
    async ({ event }) => {
        const { id } = event.data;

        await User.findByIdAndDelete(id);
    }
);

// Update user in MongoDB when Clerk updates a user
const syncUserUpdation = inngest.createFunction(
    {
        id: "update-user-from-clerk",
        triggers: [{ event: "clerk/user.updated" }],
    },
    async ({ event }) => {
        const {
            id,
            first_name,
            last_name,
            email_addresses,
            image_url,
        } = event.data;

        const primaryEmail = email_addresses?.[0]?.email_address ?? "";

        const userData = {
            _id: id,
            email: primaryEmail,
            name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "Clerk User",
            image: image_url ?? "",
        };

        await User.findByIdAndUpdate(id, userData, { new: true, runValidators: true });
    }
);

// Export all Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
];