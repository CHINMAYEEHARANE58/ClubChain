import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler, notFound } from "./middlewares/errorHandler";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { clubRoutes } from "./modules/clubs/clubs.routes";
import { proposalRoutes } from "./modules/proposals/proposals.routes";
import { treasuryRoutes } from "./modules/treasury/treasury.routes";
import { voteRoutes } from "./modules/votes/votes.routes";

export const app = express();

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok"
    }
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/clubs", clubRoutes);
app.use("/api/v1/clubs", proposalRoutes);
app.use("/api/v1/clubs", voteRoutes);
app.use("/api/v1/clubs", treasuryRoutes);
app.use("/api/v1/clubs", analyticsRoutes);

app.use(notFound);
app.use(errorHandler);
