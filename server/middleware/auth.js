import { clerkClient, getAuth } from '@clerk/express';

// Admins are users whose Clerk private metadata has { "role": "admin" }.
// Private metadata can only be set from the Clerk dashboard or backend,
// so users cannot make themselves admin.
export const isAdminUser = async (userId) => {
    if (!userId) return false;

    const user = await clerkClient.users.getUser(userId);
    return user.privateMetadata?.role === 'admin';
};

export const protectAdmin = async (req, res, next) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Please sign in.'
            });
        }

        if (!(await isAdminUser(userId))) {
            return res.status(403).json({
                success: false,
                message: 'Admin access only.'
            });
        }

        next();
    } catch (error) {
        console.error('Admin check failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Could not verify admin access.'
        });
    }
};

export const requireSignIn = (req, res, next) => {
    const { userId } = getAuth(req);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Please sign in.'
        });
    }

    req.userId = userId;
    next();
};
