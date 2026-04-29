import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { requireClubRole } from "../../middlewares/clubAccess";
import {
  activateProposal,
  closeProposal,
  createProposal,
  executeProposal,
  getProposalById,
  listProposals,
  proposalHistory,
  updateProposal
} from "./proposals.controller";

export const proposalRoutes = Router();

proposalRoutes.post(
  "/:clubId/proposals",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER"]),
  createProposal
);
proposalRoutes.get(
  "/:clubId/proposals",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  listProposals
);
proposalRoutes.get(
  "/:clubId/proposals/:proposalId",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  getProposalById
);
proposalRoutes.patch(
  "/:clubId/proposals/:proposalId",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER"]),
  updateProposal
);
proposalRoutes.post(
  "/:clubId/proposals/:proposalId/activate",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER"]),
  activateProposal
);
proposalRoutes.post(
  "/:clubId/proposals/:proposalId/close",
  requireAuth,
  requireClubRole(["ADMIN"]),
  closeProposal
);
proposalRoutes.post(
  "/:clubId/proposals/:proposalId/execute",
  requireAuth,
  requireClubRole(["ADMIN"]),
  executeProposal
);
proposalRoutes.get(
  "/:clubId/proposals/:proposalId/history",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  proposalHistory
);
