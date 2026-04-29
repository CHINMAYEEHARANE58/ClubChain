import { Role } from "../../types";

export const RoleGuard = ({
  role,
  allowed,
  children
}: {
  role: Role | null;
  allowed: Role[];
  children: React.ReactNode;
}) => {
  if (!role || !allowed.includes(role)) {
    return null;
  }

  return <>{children}</>;
};
