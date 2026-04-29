import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return next(new ApiError(401, "UNAUTHENTICATED", "Missing bearer token"));
  }

  try {
    const token = auth.split(" ")[1];
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    return next();
  } catch {
    return next(new ApiError(401, "UNAUTHENTICATED", "Invalid or expired token"));
  }
};
