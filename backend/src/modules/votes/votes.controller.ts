import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";

const castVoteSchema = z.object({
  choice: z.enum(["FOR", "AGAINST", "ABSTAIN"]),
  comment: z.string().max(1000).optional()
});

const ensureProposal = async (clubId: string, proposalId: string) => {
  const proposal = await prisma.proposal.findFirst({
    where: {
      id: proposalId,
      clubId
    }
  });

  if (!proposal) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }

  return proposal;
};

export const castVote = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  const { choice, comment } = castVoteSchema.parse(req.body);
  const { clubId, proposalId } = req.params;

  const proposal = await ensureProposal(clubId, proposalId);
  const now = new Date();

  if (proposal.status !== "ACTIVE") {
    throw new ApiError(422, "INVALID_STATE", "Voting is only allowed on active proposals");
  }

  if (!proposal.startTime || !proposal.endTime || now < proposal.startTime || now > proposal.endTime) {
    throw new ApiError(422, "VOTING_WINDOW_CLOSED", "Voting window is closed");
  }

  const vote = await prisma.$transaction(async (tx) => {
    const created = await tx.vote.create({
      data: {
        proposalId,
        clubId,
        voterUserId: req.userId as string,
        choice,
        comment
      }
    });

    await tx.auditLog.create({
      data: {
        clubId,
        actorUserId: req.userId,
        action: "VOTE_CAST",
        entityType: "vote",
        entityId: created.id,
        metadata: {
          proposalId,
          choice
        }
      }
    });

    return created;
  });

  res.status(201).json({
    success: true,
    data: vote
  });
});

export const votesSummary = asyncHandler(async (req: Request, res: Response) => {
  const { clubId, proposalId } = req.params;
  const proposal = await ensureProposal(clubId, proposalId);

  const [eligibleVoters, votes] = await Promise.all([
    prisma.clubMembership.count({
      where: {
        clubId,
        status: "ACTIVE"
      }
    }),
    prisma.vote.findMany({
      where: { proposalId },
      select: { choice: true }
    })
  ]);

  const totalVotesCast = votes.length;
  const forVotes = votes.filter((v) => v.choice === "FOR").length;
  const againstVotes = votes.filter((v) => v.choice === "AGAINST").length;
  const abstainVotes = votes.filter((v) => v.choice === "ABSTAIN").length;

  const participationPercent = eligibleVoters === 0 ? 0 : (totalVotesCast / eligibleVoters) * 100;
  const decisiveVotes = forVotes + againstVotes;
  const approvalPercent = decisiveVotes === 0 ? 0 : (forVotes / decisiveVotes) * 100;
  const passed =
    participationPercent >= Number(proposal.quorumPercent) &&
    approvalPercent >= Number(proposal.passThresholdPercent);

  res.status(200).json({
    success: true,
    data: {
      proposalId,
      totalEligibleVoters: eligibleVoters,
      totalVotesCast,
      participationPercent,
      for: forVotes,
      against: againstVotes,
      abstain: abstainVotes,
      passed
    }
  });
});

export const listVotes = asyncHandler(async (req: Request, res: Response) => {
  const { clubId, proposalId } = req.params;
  await ensureProposal(clubId, proposalId);

  const votes = await prisma.vote.findMany({
    where: {
      proposalId,
      clubId
    },
    include: {
      voter: {
        select: {
          id: true,
          fullName: true,
          collegeEmail: true
        }
      }
    },
    orderBy: {
      castAt: "desc"
    }
  });

  res.status(200).json({
    success: true,
    data: votes
  });
});
