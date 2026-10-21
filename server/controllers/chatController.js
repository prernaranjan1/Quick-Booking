import Show from "../models/Show.js";
import { SEAT_CATEGORIES, THEATRE_TIMEZONE, MAX_SEATS_PER_BOOKING } from "../config/pricing.js";
import { SNACKS } from "../config/snacks.js";
import { HOLD_MINUTES } from "../services/seatLocks.js";
import { getMoviesForShows } from "./showControllers.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 10;
const MAX_HISTORY_TEXT_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;
const CONTEXT_CACHE_MS = 60 * 1000;

// Simple per-IP limiter. On serverless hosts each instance keeps its own
// counts, so this is best effort; it still stops one client hammering an instance.
const requestLog = new Map();

const isRateLimited = (ip) => {
    const now = Date.now();
    const recent = (requestLog.get(ip) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);

    recent.push(now);
    requestLog.set(ip, recent);

    // Drop idle entries so the map doesn't grow forever
    if (requestLog.size > 1000) {
        for (const [key, times] of requestLog) {
            if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) {
                requestLog.delete(key);
            }
        }
    }

    return recent.length > RATE_LIMIT_MAX_REQUESTS;
};

const getClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) return String(forwarded).split(",")[0].trim();
    return req.socket?.remoteAddress || "unknown";
};

// Keep only well-formed user/model text turns from the client's history
const cleanHistory = (history) => {
    if (!Array.isArray(history)) return [];

    return history
        .filter((turn) =>
            turn &&
            (turn.role === "user" || turn.role === "model") &&
            Array.isArray(turn.parts) &&
            typeof turn.parts[0]?.text === "string"
        )
        .slice(-MAX_HISTORY_TURNS)
        .map((turn) => ({
            role: turn.role,
            parts: [{ text: turn.parts[0].text.slice(0, MAX_HISTORY_TEXT_LENGTH) }]
        }));
};

const formatShowTime = (date) =>
    new Intl.DateTimeFormat("en-IN", {
        timeZone: THEATRE_TIMEZONE,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit"
    }).format(date);

// Live movie, show and price info for the assistant, cached briefly
let cachedContext = { text: "", builtAt: 0 };

const buildContext = async () => {
    if (Date.now() - cachedContext.builtAt < CONTEXT_CACHE_MS) return cachedContext.text;

    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const shows = await Show.find({ showDateTime: { $gte: new Date(), $lte: weekAhead } })
        .sort({ showDateTime: 1 })
        .limit(150)
        .lean();
    const movies = await getMoviesForShows(shows);

    const byMovie = new Map();
    shows.forEach((show) => {
        const movie = movies.get(show.movie);
        if (!movie) return;
        if (!byMovie.has(show.movie)) byMovie.set(show.movie, { movie, shows: [] });
        byMovie.get(show.movie).shows.push(show);
    });

    const movieLines = [...byMovie.values()].map(({ movie, shows: movieShows }) => {
        const genres = (movie.genres || []).map((genre) => genre.name).join(", ");
        const times = movieShows.map((show) => `${formatShowTime(show.showDateTime)} (base ₹${show.showPrice})`).join("; ");
        return `- ${movie.title} [${genres}; rating ${(movie.vote_average || 0).toFixed(1)}/10; ${movie.runtime || "?"} min]: ${times}`;
    });

    const text = `
Shows in the next 7 days (times in ${THEATRE_TIMEZONE}):
${movieLines.length ? movieLines.join("\n") : "- No shows are scheduled right now."}

Seat categories (multiplier on the show's base price):
${SEAT_CATEGORIES.map((category) => `- ${category.label}: rows ${category.rows.join(", ")}, ${category.multiplier}x`).join("\n")}

Dynamic pricing surcharges: weekend +15%, shows from 6 PM +10%, more than 50% full +10%, more than 80% full +20%.
Exact prices are shown on the seat selection page.

Snacks: ${SNACKS.map((snack) => `${snack.name} ₹${snack.price}`).join(", ")}.

Booking: choose a movie, date and show time, pick up to ${MAX_SEATS_PER_BOOKING} seats, add snacks at checkout,
then pay with Razorpay. Seats are held for ${HOLD_MINUTES} minutes while paying; unpaid bookings can be paid or
cancelled from My Bookings. Paid tickets can be printed from the ticket page. Sign-in is needed to book.
`.trim();

    cachedContext = { text, builtAt: Date.now() };
    return text;
};

// API for the AI assistant
export const chat = async (req, res) => {
    try {
        if (isRateLimited(getClientIp(req))) {
            return res.status(429).json({
                success: false,
                message: "Too many messages. Please wait a minute and try again."
            });
        }

        const { message, history } = req.body || {};

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ success: false, message: "Message is required." });
        }

        if (message.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Message must be ${MAX_MESSAGE_LENGTH} characters or less.`
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(503).json({ success: false, message: "The assistant is not configured yet." });
        }

        const context = await buildContext();

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{
                            text: `You are the Quick Booking Assistant for a movie ticket booking website.
Help users with movie recommendations, show times, seat categories, prices, snacks and how to book.
Keep answers short, clear and friendly.

Only use the information below for movies, show times, prices and snacks. Never invent shows,
seat availability or prices. If you don't know something, say so.
You cannot book, pay, cancel or refund; tell the user how to do it on the website.
If asked about something unrelated to movies or this website, politely say you can only help
with movies and bookings here.

${context}`
                        }]
                    },
                    contents: [
                        ...cleanHistory(history),
                        { role: "user", parts: [{ text: message }] }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API error:", data);
            return res.status(502).json({ success: false, message: "The assistant is unavailable right now." });
        }

        const reply =
            data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() ||
            "Sorry, I couldn't come up with an answer. Please try rephrasing.";

        return res.json({ success: true, reply });
    } catch (error) {
        console.error("Chat error:", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};
