import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { clerkMiddleware } from '@clerk/express';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';
import showRouter from './routes/showRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import { razorpayWebhook } from './controllers/bookingControllers.js';

const app = express();

// Database
await connectDB();

// Razorpay webhook needs the raw body to check its signature,
// so it is registered before express.json()
app.post(
    '/api/booking/razorpay-webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    razorpayWebhook
);

// Middleware
app.use(express.json({ limit: '100kb' }));
app.use(cors());

// Inngest route
app.use(
    '/api/inngest',
    serve({
        client: inngest,
        functions,
    })
);

// Clerk middleware
app.use(clerkMiddleware());

// API Routes
app.get('/', (req, res) => {
    res.send('Server is Live!');
});
app.use('/api/show', showRouter);
app.use('/api/admin', adminRouter);
app.use('/api/booking', bookingRouter);

// Export for Vercel
export default app;

// Local development
if (process.env.NODE_ENV !== 'production') {
    const port = 3000;

    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}
app.get('/test', (req, res) => {
    res.send('TEST WORKING');
});