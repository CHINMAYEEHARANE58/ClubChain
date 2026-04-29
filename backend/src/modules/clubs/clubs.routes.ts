import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { requireClubRole } from "../../middlewares/clubAccess";
import {
  addMember,
  createClub,
  getClubById,
  listMembers,
  listMyClubs,
  updateClub,
  updateMember
} from "./clubs.controller";

export const clubRoutes = Router();

clubRoutes.post("/", requireAuth, createClub);
clubRoutes.get("/", requireAuth, listMyClubs);
clubRoutes.get("/:clubId", requireAuth, requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]), getClubById);
clubRoutes.patch("/:clubId", requireAuth, requireClubRole(["ADMIN"]), updateClub);

clubRoutes.get(
  "/:clubId/members",
  requireAuth,
  requireClubRole(["ADMIN", "CORE_MEMBER", "MEMBER"]),
  listMembers
);
clubRoutes.post("/:clubId/members", requireAuth, requireClubRole(["ADMIN"]), addMember);
clubRoutes.patch("/:clubId/members/:userId", requireAuth, requireClubRole(["ADMIN"]), updateMember);
