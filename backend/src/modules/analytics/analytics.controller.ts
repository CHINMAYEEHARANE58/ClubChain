import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;

  const [totalMembers, activeProposals, closedOrFinalProposals, votesCount, treasury] = await Promise.all([
    prisma.clubMembership.count({ where: { clubId, status: "ACTIVE" } }),
    prisma.proposal.count({ where: { clubId, status: "ACTIVE" } }),
    prisma.proposal.count({
      where: {
        clubId,
        status: {
          in: ["CLOSED", "APPROVED", "REJECTED", "EXECUTED", "CANCELLED"]
        }
      }
    }),
    prisma.vote.count({ where: { clubId } }),
    prisma.treasuryAccount.findUnique({ where: { clubId } })
  ]);

  const avgParticipationPercent =
    totalMembers === 0 || closedOrFinalProposals === 0
      ? 0
      : (votesCount / (totalMembers * closedOrFinalProposals)) * 100;

  res.status(200).json({
    success: true,
    data: {
      totalMembers,
      activeProposals,
      closedProposals: closedOrFinalProposals,
      avgParticipationPercent,
      treasuryBalance: Number(treasury?.currentBalance ?? 0)
    }
  });
});

export const votingTrends = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const range = String(req.query.range ?? "30d");
  const days = Number(range.replace("d", "")) || 30;

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const votes = await prisma.vote.findMany({
    where: {
      clubId,
      castAt: {
        gte: from
      }
    },
    select: {
      castAt: true,
      choice: true
    },
    orderBy: {
      castAt: "asc"
    }
  });

  const trendMap = new Map<string, { date: string; FOR: number; AGAINST: number; ABSTAIN: number; total: number }>();

  for (const vote of votes) {
    const date = vote.castAt.toISOString().slice(0, 10);
    const current = trendMap.get(date) ?? { date, FOR: 0, AGAINST: 0, ABSTAIN: 0, total: 0 };
    current[vote.choice] += 1;
    current.total += 1;
    trendMap.set(date, current);
  }

  res.status(200).json({
    success: true,
    data: Array.from(trendMap.values())
  });
});

export const activityFeed = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;

  const data = await prisma.auditLog.findMany({
    where: { clubId },
    include: {
      actorUser: {
        select: {
          id: true,
          fullName: true,
          collegeEmail: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  });

  res.status(200).json({
    success: true,
    data
  });
});

export const auditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
  const action = req.query.action ? String(req.query.action) : undefined;

  const [total, data] = await Promise.all([
    prisma.auditLog.count({
      where: {
        clubId,
        ...(action ? { action } : {})
      }
    }),
    prisma.auditLog.findMany({
      where: {
        clubId,
        ...(action ? { action } : {})
      },
      include: {
        actorUser: {
          select: {
            id: true,
            fullName: true,
            collegeEmail: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.status(200).json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total
    }
  });
});
