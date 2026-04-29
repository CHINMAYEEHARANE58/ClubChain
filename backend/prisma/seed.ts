import bcrypt from "bcrypt";
import { PrismaClient, ProposalStatus, UserRole, VoteChoice } from "@prisma/client";

const prisma = new PrismaClient();

type SeedUser = {
  fullName: string;
  collegeEmail: string;
  password: string;
  role: UserRole;
};

const USERS: SeedUser[] = [
  {
    fullName: "Aarav Admin",
    collegeEmail: "aarav.admin@students.mituniversity.edu.in",
    password: "Admin@123",
    role: "ADMIN"
  },
  {
    fullName: "Ciya Core",
    collegeEmail: "ciya.core@students.mituniversity.edu.in",
    password: "Core@1234",
    role: "CORE_MEMBER"
  },
  {
    fullName: "Mohan Member",
    collegeEmail: "mohan.member@students.mituniversity.edu.in",
    password: "Member@123",
    role: "MEMBER"
  }
];

async function ensureMembership(clubId: string, userId: string, role: UserRole) {
  const membership = await prisma.clubMembership.findFirst({
    where: { clubId, userId, status: "ACTIVE" }
  });

  if (!membership) {
    await prisma.clubMembership.create({
      data: { clubId, userId, role, status: "ACTIVE" }
    });
  }
}

async function ensureProposal(
  clubId: string,
  createdById: string,
  title: string,
  status: ProposalStatus,
  treasuryImpactAmount: number,
  startTime?: Date,
  endTime?: Date
) {
  const existing = await prisma.proposal.findFirst({ where: { clubId, title } });
  if (existing) return existing;

  const proposal = await prisma.proposal.create({
    data: {
      clubId,
      createdById,
      title,
      description:
        "Detailed proposal created for demo data. Includes timeline, expected outcomes, and budget notes.",
      status,
      startTime,
      endTime,
      quorumPercent: 25,
      passThresholdPercent: 50,
      treasuryImpactAmount
    }
  });

  await prisma.proposalStatusHistory.create({
    data: {
      proposalId: proposal.id,
      previousStatus: "DRAFT",
      newStatus: status,
      changedById: createdById,
      reason: "Seeded lifecycle status"
    }
  });

  return proposal;
}

async function ensureVote(proposalId: string, clubId: string, voterUserId: string, choice: VoteChoice, comment: string) {
  const existing = await prisma.vote.findFirst({ where: { proposalId, voterUserId } });
  if (existing) return;

  await prisma.vote.create({
    data: {
      proposalId,
      clubId,
      voterUserId,
      choice,
      comment
    }
  });
}

async function main() {
  const userByEmail = new Map<string, { id: string; role: UserRole }>();

  for (const entry of USERS) {
    const passwordHash = await bcrypt.hash(entry.password, 10);
    const user = await prisma.user.upsert({
      where: { collegeEmail: entry.collegeEmail },
      create: {
        collegeEmail: entry.collegeEmail,
        fullName: entry.fullName,
        passwordHash,
        isEmailVerified: true,
        isActive: true
      },
      update: {
        fullName: entry.fullName,
        passwordHash,
        isEmailVerified: true,
        isActive: true
      }
    });

    userByEmail.set(entry.collegeEmail, { id: user.id, role: entry.role });
  }

  const admin = userByEmail.get("aarav.admin@students.mituniversity.edu.in");
  const core = userByEmail.get("ciya.core@students.mituniversity.edu.in");
  const member = userByEmail.get("mohan.member@students.mituniversity.edu.in");

  if (!admin || !core || !member) {
    throw new Error("Seed users are missing");
  }

  const roboticsClub = await prisma.club.upsert({
    where: { slug: "robotics-innovators" },
    create: {
      name: "Robotics Innovators Club",
      slug: "robotics-innovators",
      description: "Builds robotics projects and hosts hardware hackathons.",
      createdById: admin.id
    },
    update: {
      description: "Builds robotics projects and hosts hardware hackathons."
    }
  });

  const aiClub = await prisma.club.upsert({
    where: { slug: "ai-research-forum" },
    create: {
      name: "AI Research Forum",
      slug: "ai-research-forum",
      description: "Explores ML systems, papers, and model experimentation.",
      createdById: core.id
    },
    update: {
      description: "Explores ML systems, papers, and model experimentation."
    }
  });

  await ensureMembership(roboticsClub.id, admin.id, "ADMIN");
  await ensureMembership(roboticsClub.id, core.id, "CORE_MEMBER");
  await ensureMembership(roboticsClub.id, member.id, "MEMBER");

  await ensureMembership(aiClub.id, admin.id, "CORE_MEMBER");
  await ensureMembership(aiClub.id, core.id, "ADMIN");

  const roboticsTreasury = await prisma.treasuryAccount.upsert({
    where: { clubId: roboticsClub.id },
    create: { clubId: roboticsClub.id, currencyCode: "INR", currentBalance: 125000 },
    update: { currentBalance: 125000 }
  });

  const aiTreasury = await prisma.treasuryAccount.upsert({
    where: { clubId: aiClub.id },
    create: { clubId: aiClub.id, currencyCode: "INR", currentBalance: 84000 },
    update: { currentBalance: 84000 }
  });

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  const activeProposal = await ensureProposal(
    roboticsClub.id,
    admin.id,
    "Approve budget for Inter-College Robotics Hackathon",
    "ACTIVE",
    30000,
    new Date(now.getTime() - oneDay),
    new Date(now.getTime() + 3 * oneDay)
  );

  const approvedProposal = await ensureProposal(
    roboticsClub.id,
    core.id,
    "Purchase 3D printer for rapid prototyping",
    "APPROVED",
    45000,
    new Date(now.getTime() - 12 * oneDay),
    new Date(now.getTime() - 8 * oneDay)
  );

  const closedProposal = await ensureProposal(
    aiClub.id,
    core.id,
    "Fund cloud GPU credits for semester projects",
    "CLOSED",
    20000,
    new Date(now.getTime() - 9 * oneDay),
    new Date(now.getTime() - 5 * oneDay)
  );

  await ensureVote(activeProposal.id, roboticsClub.id, admin.id, "FOR", "Essential for club outreach");
  await ensureVote(activeProposal.id, roboticsClub.id, core.id, "FOR", "Strong ROI and sponsorship potential");
  await ensureVote(activeProposal.id, roboticsClub.id, member.id, "ABSTAIN", "Need more event logistics details");

  await ensureVote(approvedProposal.id, roboticsClub.id, admin.id, "FOR", "Required for prototype pipeline");
  await ensureVote(approvedProposal.id, roboticsClub.id, core.id, "FOR", "Supports all sub-teams");
  await ensureVote(approvedProposal.id, roboticsClub.id, member.id, "AGAINST", "Prefer renting equipment first");

  await ensureVote(closedProposal.id, aiClub.id, admin.id, "ABSTAIN", "No direct budget ownership");
  await ensureVote(closedProposal.id, aiClub.id, core.id, "FOR", "Necessary for project completion");

  const roboticsTxn = await prisma.treasuryTransaction.findFirst({
    where: { clubId: roboticsClub.id, note: "Seed: Annual sponsorship credit" }
  });

  if (!roboticsTxn) {
    await prisma.treasuryTransaction.create({
      data: {
        treasuryAccountId: roboticsTreasury.id,
        clubId: roboticsClub.id,
        txnType: "CREDIT",
        amount: 50000,
        note: "Seed: Annual sponsorship credit",
        performedById: admin.id
      }
    });

    await prisma.treasuryTransaction.create({
      data: {
        treasuryAccountId: roboticsTreasury.id,
        clubId: roboticsClub.id,
        proposalId: approvedProposal.id,
        txnType: "DEBIT",
        amount: 45000,
        note: "Seed: 3D printer procurement",
        performedById: core.id
      }
    });
  }

  const aiTxn = await prisma.treasuryTransaction.findFirst({
    where: { clubId: aiClub.id, note: "Seed: Department innovation grant" }
  });

  if (!aiTxn) {
    await prisma.treasuryTransaction.create({
      data: {
        treasuryAccountId: aiTreasury.id,
        clubId: aiClub.id,
        txnType: "CREDIT",
        amount: 35000,
        note: "Seed: Department innovation grant",
        performedById: core.id
      }
    });
  }

  const existingAudit = await prisma.auditLog.findFirst({
    where: { clubId: roboticsClub.id, action: "SEED_DATA_CREATED" }
  });

  if (!existingAudit) {
    await prisma.auditLog.createMany({
      data: [
        {
          clubId: roboticsClub.id,
          actorUserId: admin.id,
          action: "SEED_DATA_CREATED",
          entityType: "system",
          entityId: null,
          metadata: { scope: "robotics" }
        },
        {
          clubId: aiClub.id,
          actorUserId: core.id,
          action: "SEED_DATA_CREATED",
          entityType: "system",
          entityId: null,
          metadata: { scope: "ai" }
        }
      ]
    });
  }

  console.log("Seed data ready: users, 2 clubs, memberships, proposals, votes, treasury, activity.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
