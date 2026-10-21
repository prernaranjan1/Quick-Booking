import { Inngest, NonRetriableError } from "inngest";
import User from "../models/user.js";

// Create an Inngest client
export const inngest = new Inngest({
    id: "movie-ticket-booking",
});

// Build the MongoDB user document from a Clerk user payload
const buildUserData = (data) => {
    const {
        id,
        first_name,
        last_name,
        email_addresses = [],
        primary_email_address_id,
        image_url,
    } = data;

    const primaryEmail = (
        email_addresses.find((email) => email.id === primary_email_address_id) ??
        email_addresses[0]
    )?.email_address;

    // email is required on the model, so retrying would fail forever
    if (!primaryEmail) {
        throw new NonRetriableError(`Clerk user ${id} has no email address`);
    }

    return {
        _id: id,
        email: primaryEmail,
        name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "Clerk User",
        image: image_url ?? "",
    };
};

// Upsert so retries and duplicate/out-of-order webhooks don't fail
const upsertUser = (data) => {
    const userData = buildUserData(data);

    return User.findByIdAndUpdate(userData._id, userData, {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
    });
};

// Create user in MongoDB when Clerk creates a user
const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-from-clerk",
        triggers: [{ event: "clerk/user.created" }],
    },
    async ({ event }) => {
        await upsertUser(event.data);
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
        await upsertUser(event.data);
    }
);

// Export all Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
];
