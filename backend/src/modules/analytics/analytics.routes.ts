import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { requireClubRole } from "../../middlewares/clubAccess";
import { activityFeed, auditLogs, overview, votingTrends } from "./analytics.controller";

export const analyticsRoutes = Router();

analyticsRoutes.get(
  "/:clubId/analytics/overview",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  overview
);
analyticsRoutes.get(
  "/:clubId/analytics/voting-trends",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  votingTrends
);
analyticsRoutes.get(
  "/:clubId/activity-feed",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  activityFeed
);
analyticsRoutes.get(
  "/:clubId/audit-logs",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER"]),
  auditLogs
);
