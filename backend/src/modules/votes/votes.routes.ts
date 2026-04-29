import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { requireClubRole } from "../../middlewares/clubAccess";
import { castVote, listVotes, votesSummary } from "./votes.controller";

export const voteRoutes = Router();

voteRoutes.post(
  "/:clubId/proposals/:proposalId/votes",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  castVote
);
voteRoutes.get(
  "/:clubId/proposals/:proposalId/votes/summary",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  votesSummary
);
voteRoutes.get(
  "/:clubId/proposals/:proposalId/votes",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  listVotes
);
