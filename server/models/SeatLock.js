import mongoose from "mongoose";

// One document per taken seat. The unique (show, seat) index makes seat
// locking safe: if two users try to take the same seat, only one insert wins.
// Temporary holds have expiresAt set and are removed by MongoDB once it passes;
// paid seats have no expiresAt and stay forever.
const seatLockSchema = new mongoose.Schema({
    show: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Show",
        required: true
    },
    seat: {
        type: String,
        required: true
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true
    },
    user: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date
    }
});

seatLockSchema.index({ show: 1, seat: 1 }, { unique: true });
seatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
seatLockSchema.index({ booking: 1 });

const SeatLock = mongoose.model("SeatLock", seatLockSchema);

export default SeatLock;
