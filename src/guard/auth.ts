import Express from "express";
import { httpError } from "../errorMessage.js";
import jwt from "jsonwebtoken";
import { SECRET, type JWTClaim } from "../jwtclaim.js";

export type AuthenticatedRequest = Express.Request & { user?: JWTClaim };

export const RequiresAuth = (req: AuthenticatedRequest, res: Express.Response, next: Express.NextFunction) => {
   
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return next(new httpError(401, 'Unauthorized Request'));
    }
    else {
        const [scheme, token] = authHeader.split(' ');
        if(scheme !== 'Bearer') {
            return next(new httpError(401, 'Unauthorized Request'));
        }
        else if(!token) {
            return next(new httpError(401, 'Unauthorized Request'));
        }
        else {
            jwt.verify(token, SECRET, (err, decoded) => {
                if (err) {
                    return next(new httpError(401, 'Unauthorized Request'));
                }else {
                    req.user = decoded as unknown as JWTClaim;
                    next();
                }
            })
        }
    }
};

export const OptionalAuth = (req: AuthenticatedRequest, res: Express.Response, next: Express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        next();
    }
    else {
        const [scheme, token] = authHeader.split(' ');
        if(scheme !== 'Bearer') {
            return next(new httpError(401, 'Unauthorized Request'));
        }
        else if(!token) {
            return next(new httpError(401, 'Unauthorized Request'));
        }
        else {
            jwt.verify(token, SECRET, (err, decoded) => {
                if (err) {
                    return next(new httpError(401, 'Unauthorized Request'));
                }else {
                    req.user = decoded as unknown as JWTClaim;
                    next();
                }
            })
        }
    }
};