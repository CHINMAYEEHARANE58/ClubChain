import { useAuth } from "../context/AuthContext";
import { Role } from "../types";

export const useCurrentRole = (clubId: string | undefined): Role | null => {
  const { user } = useAuth();
  if (!clubId || !user) {
    return null;
  }

  const membership = user.memberships.find((m) => m.clubId === clubId);
  return membership?.role ?? null;
};
