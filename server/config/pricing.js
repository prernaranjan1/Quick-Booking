// Seat layout, seat categories and dynamic pricing rules.
// Prices are always calculated here on the server; the client only displays them.

export const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const SEATS_PER_ROW = 9;
export const TOTAL_SEATS = SEAT_ROWS.length * SEATS_PER_ROW;
export const MAX_SEATS_PER_BOOKING = 10;

// Shows are scheduled in this time zone (used for weekend/evening pricing)
export const THEATRE_TIMEZONE = process.env.THEATRE_TIMEZONE || 'Asia/Kolkata';

export const SEAT_CATEGORIES = [
    { id: 'PREMIUM', label: 'Premium', rows: ['A', 'B'], multiplier: 1.5 },
    { id: 'GOLD', label: 'Gold', rows: ['C', 'D', 'E', 'F'], multiplier: 1.2 },
    { id: 'SILVER', label: 'Silver', rows: ['G', 'H', 'I', 'J'], multiplier: 1 }
];

const SEAT_PATTERN = new RegExp(
    `^([${SEAT_ROWS[0]}-${SEAT_ROWS[SEAT_ROWS.length - 1]}])([1-${SEATS_PER_ROW}])$`
);

export const isValidSeat = (seat) => typeof seat === 'string' && SEAT_PATTERN.test(seat);

export const getSeatCategory = (seat) =>
    SEAT_CATEGORIES.find((category) => category.rows.includes(seat[0]));

// Weekday and hour of a date in the theatre's time zone
const getLocalTime = (date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: THEATRE_TIMEZONE,
        weekday: 'short',
        hour: 'numeric',
        hourCycle: 'h23'
    }).formatToParts(date);

    return {
        weekday: parts.find((part) => part.type === 'weekday').value,
        hour: Number(parts.find((part) => part.type === 'hour').value)
    };
};

// Surcharges that apply to a show right now, e.g. [{ label: 'Weekend', percent: 15 }]
export const getPriceFactors = (showDateTime, bookedSeatCount) => {
    const factors = [];
    const { weekday, hour } = getLocalTime(new Date(showDateTime));

    if (weekday === 'Sat' || weekday === 'Sun') {
        factors.push({ label: 'Weekend', percent: 15 });
    }

    if (hour >= 18) {
        factors.push({ label: 'Evening show', percent: 10 });
    }

    const occupancy = bookedSeatCount / TOTAL_SEATS;

    if (occupancy > 0.8) {
        factors.push({ label: 'Almost full', percent: 20 });
    } else if (occupancy > 0.5) {
        factors.push({ label: 'Filling fast', percent: 10 });
    }

    return factors;
};

// Price of each category for a show, in whole rupees
export const getCategoryPrices = (show, bookedSeatCount) => {
    const factors = getPriceFactors(show.showDateTime, bookedSeatCount);
    const surcharge = factors.reduce((sum, factor) => sum + factor.percent, 0);

    const categories = SEAT_CATEGORIES.map((category) => ({
        id: category.id,
        label: category.label,
        rows: category.rows,
        price: Math.round(show.showPrice * category.multiplier * (1 + surcharge / 100))
    }));

    return { categories, factors };
};
