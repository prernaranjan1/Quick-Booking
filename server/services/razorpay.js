import axios from "axios";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

export const isRazorpayConfigured = () => Boolean(keyId && keySecret);

export const getRazorpayKeyId = () => keyId;

// Creates a Razorpay order. Amount is in whole rupees.
export const createOrder = async ({ amount, receipt, notes }) => {
    const { data } = await axios.post(
        "https://api.razorpay.com/v1/orders",
        {
            amount: Math.round(amount * 100), // paise
            currency: "INR",
            receipt,
            notes
        },
        { auth: { username: keyId, password: keySecret } }
    );

    return data;
};

const safeEqual = (a, b) => {
    const bufferA = Buffer.from(String(a));
    const bufferB = Buffer.from(String(b));
    return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
};

// Checks the signature Razorpay Checkout returns after a payment
export const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
    const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

    return safeEqual(expected, signature);
};

export const isWebhookConfigured = () => Boolean(webhookSecret);

// Checks the X-Razorpay-Signature header on a webhook's raw body
export const verifyWebhookSignature = (rawBody, signature) => {
    const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

    return safeEqual(expected, signature || "");
};
