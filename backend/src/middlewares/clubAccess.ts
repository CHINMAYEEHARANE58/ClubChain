import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ApiError } from "../utils/apiError";

export const requireClubRole = (allowedRoles: UserRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.userId;
    const { clubId } = req.params;

    if (!userId) {
      return next(new ApiError(401, "UNAUTHENTICATED", "Authentication required"));
    }

    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId,
        status: "ACTIVE"
      }
    });

    if (!membership) {
      return next(new ApiError(403, "FORBIDDEN", "You are not an active member of this club"));
    }

    req.clubRole = membership.role;
    req.membershipId = membership.id;

    if (!allowedRoles.includes(membership.role)) {
      return next(new ApiError(403, "FORBIDDEN", "You do not have permission for this action"));
    }

    return next();
  };
};
