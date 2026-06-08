import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    clientId: process.env.COGNITO_CLIENT_ID!,
    tokenUse: 'access',
})

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const payload = await verifier.verify(token);
        (req as any).user = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    await requireAuth(req, res, async () => {
        const groups = (req as any).user['cognito:groups'] || [];
        if (!groups.includes('admins')) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}