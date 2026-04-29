import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useClubContext } from "../../context/ClubContext";
import { useCurrentRole } from "../../hooks/useCurrentRole";

const links = [
  { label: "Dashboard", path: "dashboard" },
  { label: "Proposals", path: "proposals" },
  { label: "Treasury", path: "treasury" },
  { label: "Members", path: "members" },
  { label: "Activity", path: "activity" }
];

export const AppLayout = () => {
  const { clubId } = useParams();
  const role = useCurrentRole(clubId);
  const { setSelectedClubId } = useClubContext();
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (clubId) {
      setSelectedClubId(clubId);
    }
  }, [clubId, setSelectedClubId]);

  const base = "/clubs/" + clubId;

  return (
    <div className="container app-shell">
      <div className="card app-hero">
        <div>
          <h2 className="app-title">ClubChain DAO Governance</h2>
          <p>Transparent student-club proposals, voting, and treasury activity.</p>
        </div>

        <div>
          <div className="user-chip">
            <strong>{user?.fullName}</strong>
            <span>{user?.collegeEmail}</span>
          </div>
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <NavLink className="nav-link" to="/clubs">
              Switch Club
            </NavLink>
            <button className="secondary" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Club Workspace</h3>
            <p className="section-subtitle">
              Role: <span className="badge" data-status={role || "MEMBER"}>{role || "MEMBER"}</span>
            </p>
          </div>
          <div className="route-hint">
            <small>{location.pathname}</small>
          </div>
        </div>

        <div className="app-nav">
          {links.map((item) => (
            <NavLink
              key={item.path}
              to={base + "/" + item.path}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
};
