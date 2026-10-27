import SeatLock from "../models/SeatLock.js";

// How long seats stay reserved while the user pays
export const HOLD_MINUTES = 10;

const isDuplicateKeyError = (error) =>
    error?.code === 11000 ||
    error?.writeErrors?.some?.((writeError) => (writeError.code ?? writeError.err?.code) === 11000);

// Locks seats for a booking. Returns { ok: true } or { ok: false, takenSeats }.
// Pass expiresAt for a temporary hold, or null to lock permanently.
export const lockSeats = async ({ showId, seats, bookingId, userId, expiresAt }) => {
    // MongoDB removes expired holds about once a minute; clear them now so
    // a seat whose hold just ran out can be taken straight away
    await SeatLock.deleteMany({
        show: showId,
        seat: { $in: seats },
        expiresAt: { $lte: new Date() }
    });

    try {
        await SeatLock.insertMany(
            seats.map((seat) => ({
                show: showId,
                seat,
                booking: bookingId,
                user: userId,
                ...(expiresAt ? { expiresAt } : {})
            })),
            { ordered: false }
        );

        return { ok: true };
    } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;

        // Another booking got at least one seat first: undo our partial locks
        await SeatLock.deleteMany({ booking: bookingId, seat: { $in: seats } });

        const taken = await SeatLock.find({
            show: showId,
            seat: { $in: seats },
            booking: { $ne: bookingId }
        }).lean();

        return { ok: false, takenSeats: taken.map((lock) => lock.seat) };
    }
};

// Turns a booking's temporary hold into permanent locks.
// Re-locks seats whose hold already expired, if they are still free.
export const confirmSeatLocks = async (booking) => {
    await SeatLock.updateMany(
        { booking: booking._id },
        { $unset: { expiresAt: 1 } }
    );

    const locked = await SeatLock.find({ booking: booking._id }).lean();
    const lockedSeats = new Set(locked.map((lock) => lock.seat));
    const missing = booking.seats.map((item) => item.seat).filter((seat) => !lockedSeats.has(seat));

    if (missing.length === 0) return { ok: true };

    return lockSeats({
        showId: booking.show,
        seats: missing,
        bookingId: booking._id,
        userId: booking.user,
        expiresAt: null
    });
};

export const releaseSeats = (bookingId) => SeatLock.deleteMany({ booking: bookingId });
