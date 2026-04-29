import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      clubRole?: UserRole;
      membershipId?: string;
    }
  }
}

export {};
