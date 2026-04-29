import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../utils/apiError";
import { compareHash, hashValue } from "../../utils/hash";
import { asyncHandler } from "../../utils/asyncHandler";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";

const signupSchema = z.object({
  collegeEmail: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  collegeEmail: z.string().email(),
  password: z.string().min(8).max(72)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

const emailDomainAllowed = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return false;
  }

  const allowedSuffixes = env.ALLOWED_EMAIL_DOMAIN.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => (value.startsWith("@") ? value.slice(1) : value));

  return allowedSuffixes.some((suffix) => domain === suffix || domain.endsWith("." + suffix));
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const uniqueSlug = async (base: string): Promise<string> => {
  const cleaned = slugify(base) || "club";
  let candidate = cleaned;
  let i = 1;

  while (await prisma.club.findUnique({ where: { slug: candidate } })) {
    candidate = `${cleaned}-${i}`;
    i += 1;
  }

  return candidate;
};

const issueAuthTokens = async (userId: string, collegeEmail: string) => {
  const payload = { sub: userId, email: collegeEmail };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: await hashValue(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  return { accessToken, refreshToken };
};

const ensureStarterClub = async (userId: string, fullName: string) => {
  const activeMemberships = await prisma.clubMembership.count({
    where: {
      userId,
      status: "ACTIVE"
    }
  });

  if (activeMemberships > 0) {
    return;
  }

  const starterName = `${fullName.split(" ")[0] || "Student"} Club`;
  const starterSlug = await uniqueSlug(starterName);

  await prisma.$transaction(async (tx) => {
    const club = await tx.club.create({
      data: {
        name: starterName,
        slug: starterSlug,
        description: "Starter club created automatically. Customize from the Members and Proposal modules.",
        createdById: userId
      }
    });

    await tx.clubMembership.create({
      data: {
        clubId: club.id,
        userId,
        role: "ADMIN",
        status: "ACTIVE"
      }
    });

    await tx.treasuryAccount.create({
      data: {
        clubId: club.id,
        currencyCode: "INR",
        currentBalance: 5000
      }
    });

    await tx.auditLog.create({
      data: {
        clubId: club.id,
        actorUserId: userId,
        action: "STARTER_CLUB_CREATED",
        entityType: "club",
        entityId: club.id,
        metadata: {
          auto: true,
          clubName: starterName
        }
      }
    });
  });
};

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { collegeEmail, fullName, password } = signupSchema.parse(req.body);

  if (!emailDomainAllowed(collegeEmail)) {
    throw new ApiError(400, "INVALID_EMAIL_DOMAIN", "Only approved college email addresses are allowed");
  }

  const normalizedEmail = collegeEmail.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { collegeEmail: normalizedEmail } });

  if (existingUser?.passwordHash) {
    throw new ApiError(409, "ACCOUNT_EXISTS", "An account already exists for this email");
  }

  const passwordHash = await hashValue(password);

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName,
          passwordHash,
          isEmailVerified: true,
          isActive: true,
          lastLoginAt: new Date()
        }
      })
    : await prisma.user.create({
        data: {
          collegeEmail: normalizedEmail,
          fullName,
          passwordHash,
          isEmailVerified: true,
          lastLoginAt: new Date()
        }
      });

  await ensureStarterClub(user.id, fullName);

  const { accessToken, refreshToken } = await issueAuthTokens(user.id, user.collegeEmail);

  res.status(201).json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        collegeEmail: user.collegeEmail,
        fullName: user.fullName
      }
    }
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { collegeEmail, password } = loginSchema.parse(req.body);
  const normalizedEmail = collegeEmail.toLowerCase();

  const user = await prisma.user.findUnique({ where: { collegeEmail: normalizedEmail } });
  if (!user?.passwordHash) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "ACCOUNT_INACTIVE", "Your account is inactive. Contact admin.");
  }

  const validPassword = await compareHash(password, user.passwordHash);
  if (!validPassword) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      isEmailVerified: true
    }
  });

  const { accessToken, refreshToken } = await issueAuthTokens(user.id, user.collegeEmail);

  res.status(200).json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        collegeEmail: user.collegeEmail,
        fullName: user.fullName
      }
    }
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "UNAUTHENTICATED", "Invalid refresh token");
  }

  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId: decoded.sub,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  let matchedTokenId: string | null = null;
  for (const tokenRecord of tokens) {
    if (await compareHash(refreshToken, tokenRecord.tokenHash)) {
      matchedTokenId = tokenRecord.id;
      break;
    }
  }

  if (!matchedTokenId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Refresh token not recognized");
  }

  const nextPayload = { sub: decoded.sub, email: decoded.email };
  const newAccessToken = signAccessToken(nextPayload);
  const newRefreshToken = signRefreshToken(nextPayload);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: matchedTokenId },
      data: { revokedAt: new Date() }
    }),
    prisma.refreshToken.create({
      data: {
        userId: decoded.sub,
        tokenHash: await hashValue(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })
  ]);

  res.status(200).json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);

  if (parsed.success) {
    const { refreshToken } = parsed.data;
    const tokens = await prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    for (const tokenRecord of tokens) {
      const matched = await compareHash(refreshToken, tokenRecord.tokenHash);
      if (matched) {
        await prisma.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() }
        });
      }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      message: "Logged out"
    }
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { club: true }
      }
    }
  });

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found");
  }

  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      fullName: user.fullName,
      collegeEmail: user.collegeEmail,
      memberships: user.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        clubId: m.clubId,
        clubName: m.club.name,
        clubSlug: m.club.slug
      }))
    }
  });
});
