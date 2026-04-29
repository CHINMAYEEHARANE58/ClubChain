import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";

const createProposalSchema = z.object({
  title: z.string().min(5).max(180),
  description: z.string().min(20),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  quorumPercent: z.number().min(0).max(100).optional(),
  passThresholdPercent: z.number().min(0).max(100).optional(),
  treasuryImpactAmount: z.number().min(0).optional()
});

const updateProposalSchema = z.object({
  title: z.string().min(5).max(180).optional(),
  description: z.string().min(20).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  quorumPercent: z.number().min(0).max(100).optional(),
  passThresholdPercent: z.number().min(0).max(100).optional(),
  treasuryImpactAmount: z.number().min(0).optional()
});

const ensureProposalInClub = async (clubId: string, proposalId: string) => {
  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, clubId } });
  if (!proposal) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }
  return proposal;
};

const toDecimal = (value: number | undefined, fallback: number) => new Prisma.Decimal(value ?? fallback);

export const createProposal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  const body = createProposalSchema.parse(req.body);
  const { clubId } = req.params;

  const proposal = await prisma.proposal.create({
    data: {
      clubId,
      createdById: req.userId,
      title: body.title,
      description: body.description,
      startTime: body.startTime ? new Date(body.startTime) : null,
      endTime: body.endTime ? new Date(body.endTime) : null,
      quorumPercent: toDecimal(body.quorumPercent, 20),
      passThresholdPercent: toDecimal(body.passThresholdPercent, 50),
      treasuryImpactAmount: toDecimal(body.treasuryImpactAmount, 0)
    }
  });

  await prisma.auditLog.create({
    data: {
      clubId,
      actorUserId: req.userId,
      action: "PROPOSAL_CREATED",
      entityType: "proposal",
      entityId: proposal.id,
      metadata: {
        title: proposal.title
      }
    }
  });

  res.status(201).json({
    success: true,
    data: proposal
  });
});

export const listProposals = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
  const status = req.query.status ? String(req.query.status) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const where: Prisma.ProposalWhereInput = {
    clubId,
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [total, items] = await Promise.all([
    prisma.proposal.count({ where }),
    prisma.proposal.findMany({
      where,
      include: {
        _count: {
          select: { votes: true }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.status(200).json({
    success: true,
    data: items,
    meta: {
      page,
      limit,
      total
    }
  });
});

export const getProposalById = asyncHandler(async (req: Request, res: Response) => {
  const { clubId, proposalId } = req.params;

  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, clubId },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          collegeEmail: true
        }
      },
      _count: {
        select: {
          votes: true
        }
      }
    }
  });

  if (!proposal) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }

  res.status(200).json({
    success: true,
    data: proposal
  });
});

export const updateProposal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  const { clubId, proposalId } = req.params;
  const body = updateProposalSchema.parse(req.body);
  const proposal = await ensureProposalInClub(clubId, proposalId);

  const canEdit = req.clubRole === "ADMIN" || proposal.createdById === req.userId;
  if (!canEdit) {
    throw new ApiError(403, "FORBIDDEN", "Only the author or admin can edit this proposal");
  }

  if (proposal.status !== "DRAFT") {
    throw new ApiError(422, "INVALID_STATE", "Only draft proposals can be edited");
  }

  const updated = await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      ...(body.title ? { title: body.title } : {}),
      ...(body.description ? { description: body.description } : {}),
      ...(body.startTime ? { startTime: new Date(body.startTime) } : {}),
      ...(body.endTime ? { endTime: new Date(body.endTime) } : {}),
      ...(body.quorumPercent !== undefined ? { quorumPercent: new Prisma.Decimal(body.quorumPercent) } : {}),
      ...(body.passThresholdPercent !== undefined
        ? { passThresholdPercent: new Prisma.Decimal(body.passThresholdPercent) }
        : {}),
      ...(body.treasuryImpactAmount !== undefined
        ? { treasuryImpactAmount: new Prisma.Decimal(body.treasuryImpactAmount) }
        : {})
    }
  });

  await prisma.auditLog.create({
    data: {
      clubId,
      actorUserId: req.userId,
      action: "PROPOSAL_UPDATED",
      entityType: "proposal",
      entityId: proposalId,
      metadata: body
    }
  });

  res.status(200).json({
    success: true,
    data: updated
  });
});

export const activateProposal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  const { clubId, proposalId } = req.params;
  const proposal = await ensureProposalInClub(clubId, proposalId);

  if (proposal.status !== "DRAFT") {
    throw new ApiError(422, "INVALID_STATE", "Only draft proposals can be activated");
  }

  if (!proposal.startTime || !proposal.endTime) {
    throw new ApiError(422, "INVALID_STATE", "startTime and endTime are required before activation");
  }

  if (proposal.endTime <= proposal.startTime) {
    throw new ApiError(422, "INVALID_STATE", "endTime must be greater than startTime");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.proposal.update({
      where: { id: proposalId },
      data: { status: "ACTIVE" }
    });

    await tx.proposalStatusHistory.create({
      data: {
        proposalId,
        previousStatus: proposal.status,
        newStatus: "ACTIVE",
        changedById: req.userId
      }
    });

    await tx.auditLog.create({
      data: {
        clubId,
        actorUserId: req.userId,
        action: "PROPOSAL_ACTIVATED",
        entityType: "proposal",
        entityId: proposalId,
        metadata: {}
      }
    });

    return next;
  });

  res.status(200).json({
    success: true,
    data: updated
  });
});

export const closeProposal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  const { clubId, proposalId } = req.params;
  const proposal = await ensureProposalInClub(clubId, proposalId);

  if (proposal.status !== "ACTIVE") {
    throw new ApiError(422, "INVALID_STATE", "Only active proposals can be closed");
  }

  const [eligibleVoters, votes] = await Promise.all([
    prisma.clubMembership.count({
      where: {
        clubId,
        status: "ACTIVE"
      }
    }),
    prisma.vote.findMany({
      where: {
        proposalId
      },
      select: {
        choice: true
      }
    })
  ]);

  const totalVotes = votes.length;
  const forVotes = votes.filter((v) => v.choice === "FOR").length;
  const againstVotes = votes.filter((v) => v.choice === "AGAINST").length;
  const participation = eligibleVoters === 0 ? 0 : (totalVotes / eligibleVoters) * 100;
  const decisiveVotes = forVotes + againstVotes;
  const forPercent = decisiveVotes === 0 ? 0 : (forVotes / decisiveVotes) * 100;

  const passed =
    participation >= Number(proposal.quorumPercent) && forPercent >= Number(proposal.passThresholdPercent);
  const finalStatus = passed ? "APPROVED" : "REJECTED";

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.proposal.update({
      where: { id: proposalId },
      data: {
        status: finalStatus,
        ...(proposal.endTime && proposal.endTime > new Date() ? { endTime: new Date() } : {})
      }
    });

    await tx.proposalStatusHistory.create({
      data: {
        proposalId,
        previousStatus: proposal.status,
        newStatus: finalStatus,
        changedById: req.userId,
        reason: "Proposal closed and evaluated"
      }
    });

    await tx.auditLog.create({
      data: {
        clubId,
        actorUserId: req.userId,
        action: "PROPOSAL_CLOSED",
        entityType: "proposal",
        entityId: proposalId,
        metadata: {
          finalStatus,
          eligibleVoters,
          totalVotes,
          participation,
          forVotes,
          againstVotes
        }
      }
    });

    return next;
  });

  res.status(200).json({
    success: true,
    data: {
      ...updated,
      summary: {
        eligibleVoters,
        totalVotes,
        participation,
        forVotes,
        againstVotes,
        passed
      }
    }
  });
});

export const executeProposal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  const { clubId, proposalId } = req.params;
  const proposal = await ensureProposalInClub(clubId, proposalId);

  if (proposal.status !== "APPROVED") {
    throw new ApiError(422, "INVALID_STATE", "Only approved proposals can be executed");
  }

  const impactAmount = Number(proposal.treasuryImpactAmount ?? 0);

  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.treasuryAccount.findUnique({
      where: { clubId }
    });

    if (!account) {
      throw new ApiError(404, "NOT_FOUND", "Treasury account not found");
    }

    if (impactAmount > Number(account.currentBalance)) {
      throw new ApiError(422, "INSUFFICIENT_BALANCE", "Treasury balance is insufficient for execution");
    }

    if (impactAmount > 0) {
      await tx.treasuryTransaction.create({
        data: {
          treasuryAccountId: account.id,
          clubId,
          proposalId,
          txnType: "DEBIT",
          amount: new Prisma.Decimal(impactAmount),
          note: `Auto-debit for proposal execution: ${proposal.title}`,
          performedById: req.userId
        }
      });

      await tx.treasuryAccount.update({
        where: { id: account.id },
        data: {
          currentBalance: new Prisma.Decimal(Number(account.currentBalance) - impactAmount)
        }
      });
    }

    const executed = await tx.proposal.update({
      where: { id: proposalId },
      data: {
        status: "EXECUTED"
      }
    });

    await tx.proposalStatusHistory.create({
      data: {
        proposalId,
        previousStatus: proposal.status,
        newStatus: "EXECUTED",
        changedById: req.userId,
        reason: "Proposal execution completed"
      }
    });

    await tx.auditLog.create({
      data: {
        clubId,
        actorUserId: req.userId,
        action: "PROPOSAL_EXECUTED",
        entityType: "proposal",
        entityId: proposalId,
        metadata: {
          impactAmount
        }
      }
    });

    return executed;
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

export const proposalHistory = asyncHandler(async (req: Request, res: Response) => {
  const { clubId, proposalId } = req.params;

  await ensureProposalInClub(clubId, proposalId);

  const history = await prisma.proposalStatusHistory.findMany({
    where: { proposalId },
    include: {
      changedBy: {
        select: {
          id: true,
          fullName: true,
          collegeEmail: true
        }
      }
    },
    orderBy: {
      changedAt: "desc"
    }
  });

  res.status(200).json({
    success: true,
    data: history
  });
});
