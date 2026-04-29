import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, me, logout, refresh, signup } from "./auth.controller";
import { requireAuth } from "../../middlewares/auth";

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many auth requests, try again later"
    }
  }
});

export const authRoutes = Router();

authRoutes.post("/signup", authLimiter, signup);
authRoutes.post("/login", authLimiter, login);
authRoutes.post("/refresh", authLimiter, refresh);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requireAuth, me);
