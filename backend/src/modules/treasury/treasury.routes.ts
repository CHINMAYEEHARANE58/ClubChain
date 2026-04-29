import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { requireClubRole } from "../../middlewares/clubAccess";
import {
  createTreasuryTransaction,
  getTreasury,
  listTreasuryTransactions
} from "./treasury.controller";

export const treasuryRoutes = Router();

treasuryRoutes.get(
  "/:clubId/treasury",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  getTreasury
);
treasuryRoutes.get(
  "/:clubId/treasury/transactions",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  listTreasuryTransactions
);
treasuryRoutes.post(
  "/:clubId/treasury/transactions",
  requireAuth,
  requireClubRole(["ADMIN"]),
  createTreasuryTransaction
);
