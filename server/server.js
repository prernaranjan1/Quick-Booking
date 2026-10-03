import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { clerkMiddleware } from '@clerk/express';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';

const app = express();

// Database
await connectDB();

// Middleware
app.use(express.json());
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

// Export for Vercel
export default app;

// Local development
if (process.env.NODE_ENV !== 'production') {
    const port = 3000;

    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}