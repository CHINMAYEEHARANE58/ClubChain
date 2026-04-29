import { Prisma, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";

const transactionSchema = z.object({
  txnType: z.enum(["CREDIT", "DEBIT"]),
  amount: z.number().positive(),
  note: z.string().max(1000).optional(),
  proposalId: z.string().uuid().optional()
});

const ensureAccount = async (clubId: string) => {
  const account = await prisma.treasuryAccount.findUnique({ where: { clubId } });
  if (!account) {
    throw new ApiError(404, "NOT_FOUND", "Treasury account not found");
  }
  return account;
};

const doTransaction = async (
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  params: {
    clubId: string;
    actorId: string;
    txnType: "CREDIT" | "DEBIT";
    amount: number;
    note?: string;
    proposalId?: string;
  }
) => {
  const account = await tx.treasuryAccount.findUnique({ where: { clubId: params.clubId } });
  if (!account) {
    throw new ApiError(404, "NOT_FOUND", "Treasury account not found");
  }

  const current = Number(account.currentBalance);
  if (params.txnType === "DEBIT" && params.amount > current) {
    throw new ApiError(422, "INSUFFICIENT_BALANCE", "Debit amount exceeds available treasury balance");
  }

  const updatedBalance = params.txnType === "CREDIT" ? current + params.amount : current - params.amount;

  const [transaction, updatedAccount] = await Promise.all([
    tx.treasuryTransaction.create({
      data: {
        treasuryAccountId: account.id,
        clubId: params.clubId,
        proposalId: params.proposalId,
        txnType: params.txnType,
        amount: new Prisma.Decimal(params.amount),
        note: params.note,
        performedById: params.actorId
      }
    }),
    tx.treasuryAccount.update({
      where: { id: account.id },
      data: {
        currentBalance: new Prisma.Decimal(updatedBalance)
      }
    })
  ]);

  await tx.auditLog.create({
    data: {
      clubId: params.clubId,
      actorUserId: params.actorId,
      action: params.txnType === "CREDIT" ? "TREASURY_CREDIT" : "TREASURY_DEBIT",
      entityType: "treasury_transaction",
      entityId: transaction.id,
      metadata: {
        amount: params.amount,
        updatedBalance,
        proposalId: params.proposalId ?? null,
        note: params.note ?? null
      }
    }
  });

  return {
    transaction,
    updatedAccount
  };
};

export const getTreasury = asyncHandler(async (req: Request, res: Response) => {
  const account = await ensureAccount(req.params.clubId);

  res.status(200).json({
    success: true,
    data: account
  });
});

export const listTreasuryTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

  const [total, data] = await Promise.all([
    prisma.treasuryTransaction.count({
      where: { clubId }
    }),
    prisma.treasuryTransaction.findMany({
      where: { clubId },
      include: {
        performedBy: {
          select: {
            id: true,
            fullName: true,
            collegeEmail: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
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

export const createTreasuryTransaction = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  const { txnType, amount, note, proposalId } = transactionSchema.parse(req.body);
  const { clubId } = req.params;

  const result = await prisma.$transaction(
    async (tx) =>
      doTransaction(tx as never, {
        clubId,
        actorId: req.userId as string,
        txnType,
        amount,
        note,
        proposalId
      }),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  res.status(201).json({
    success: true,
    data: {
      transaction: result.transaction,
      newBalance: result.updatedAccount.currentBalance
    }
  });
});
