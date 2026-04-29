import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";

const createClubSchema = z.object({
  name: z.string().min(3).max(120),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(2000).optional()
});

const updateClubSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional()
});

const addMemberSchema = z.object({
  collegeEmail: z.string().email(),
  role: z.nativeEnum(UserRole)
});

const updateMemberSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(["ACTIVE", "LEFT", "REMOVED"]).optional()
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const emailToName = (email: string) => {
  const username = email.split("@")[0];
  return username.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const uniqueSlug = async (base: string): Promise<string> => {
  const cleaned = slugify(base);
  let candidate = cleaned;
  let i = 1;

  while (await prisma.club.findUnique({ where: { slug: candidate } })) {
    candidate = `${cleaned}-${i}`;
    i += 1;
  }

  return candidate;
};

export const createClub = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  const parsed = createClubSchema.parse(req.body);
  const slug = await uniqueSlug(parsed.slug ?? parsed.name);

  const result = await prisma.$transaction(async (tx) => {
    const club = await tx.club.create({
      data: {
        name: parsed.name,
        slug,
        description: parsed.description,
        createdById: req.userId as string
      }
    });

    await tx.clubMembership.create({
      data: {
        clubId: club.id,
        userId: req.userId as string,
        role: "ADMIN",
        status: "ACTIVE"
      }
    });

    await tx.treasuryAccount.create({
      data: {
        clubId: club.id,
        currencyCode: "INR",
        currentBalance: 0
      }
    });

    await tx.auditLog.create({
      data: {
        clubId: club.id,
        actorUserId: req.userId,
        action: "CLUB_CREATED",
        entityType: "club",
        entityId: club.id,
        metadata: {
          name: club.name,
          slug: club.slug
        }
      }
    });

    return club;
  });

  res.status(201).json({
    success: true,
    data: result
  });
});

export const listMyClubs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  const memberships = await prisma.clubMembership.findMany({
    where: {
      userId: req.userId,
      status: "ACTIVE"
    },
    include: {
      club: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  res.status(200).json({
    success: true,
    data: memberships.map((m) => ({
      clubId: m.clubId,
      role: m.role,
      club: m.club
    }))
  });
});

export const getClubById = asyncHandler(async (req: Request, res: Response) => {
  const club = await prisma.club.findUnique({
    where: { id: req.params.clubId },
    include: {
      treasuryAccount: true,
      _count: {
        select: {
          memberships: true,
          proposals: true
        }
      }
    }
  });

  if (!club) {
    throw new ApiError(404, "NOT_FOUND", "Club not found");
  }

  res.status(200).json({
    success: true,
    data: club
  });
});

export const updateClub = asyncHandler(async (req: Request, res: Response) => {
  const body = updateClubSchema.parse(req.body);

  const club = await prisma.club.update({
    where: {
      id: req.params.clubId
    },
    data: body
  });

  await prisma.auditLog.create({
    data: {
      clubId: req.params.clubId,
      actorUserId: req.userId,
      action: "CLUB_UPDATED",
      entityType: "club",
      entityId: req.params.clubId,
      metadata: body
    }
  });

  res.status(200).json({
    success: true,
    data: club
  });
});

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const members = await prisma.clubMembership.findMany({
    where: {
      clubId: req.params.clubId,
      status: "ACTIVE"
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          collegeEmail: true,
          createdAt: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  res.status(200).json({
    success: true,
    data: members
  });
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const { collegeEmail, role } = addMemberSchema.parse(req.body);
  const normalizedEmail = collegeEmail.toLowerCase();

  const user =
    (await prisma.user.findUnique({ where: { collegeEmail: normalizedEmail } })) ||
    (await prisma.user.create({
      data: {
        collegeEmail: normalizedEmail,
        fullName: emailToName(normalizedEmail)
      }
    }));

  const activeMembership = await prisma.clubMembership.findFirst({
    where: {
      clubId: req.params.clubId,
      userId: user.id,
      status: "ACTIVE"
    }
  });

  if (activeMembership) {
    throw new ApiError(409, "CONFLICT", "User is already an active member");
  }

  const previousMembership = await prisma.clubMembership.findFirst({
    where: {
      clubId: req.params.clubId,
      userId: user.id,
      status: {
        in: ["LEFT", "REMOVED"]
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const membership = previousMembership
    ? await prisma.clubMembership.update({
        where: { id: previousMembership.id },
        data: {
          role,
          status: "ACTIVE",
          leftAt: null,
          joinedAt: new Date()
        }
      })
    : await prisma.clubMembership.create({
        data: {
          clubId: req.params.clubId,
          userId: user.id,
          role,
          status: "ACTIVE"
        }
      });

  await prisma.auditLog.create({
    data: {
      clubId: req.params.clubId,
      actorUserId: req.userId,
      action: "MEMBER_ADDED",
      entityType: "membership",
      entityId: membership.id,
      metadata: {
        userId: user.id,
        role
      }
    }
  });

  res.status(201).json({
    success: true,
    data: membership
  });
});

export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const body = updateMemberSchema.parse(req.body);
  const { clubId, userId } = req.params;

  const membership = await prisma.clubMembership.findFirst({
    where: {
      clubId,
      userId,
      status: "ACTIVE"
    }
  });

  if (!membership) {
    throw new ApiError(404, "NOT_FOUND", "Active membership not found");
  }

  const updated = await prisma.clubMembership.update({
    where: { id: membership.id },
    data: {
      ...body,
      ...(body.status && body.status !== "ACTIVE" ? { leftAt: new Date() } : {})
    }
  });

  await prisma.auditLog.create({
    data: {
      clubId,
      actorUserId: req.userId,
      action: "MEMBER_UPDATED",
      entityType: "membership",
      entityId: updated.id,
      metadata: body
    }
  });

  res.status(200).json({
    success: true,
    data: updated
  });
});
