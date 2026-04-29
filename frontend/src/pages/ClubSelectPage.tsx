import { useMutation } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { createClubApi } from "../api/clubs.api";
import { meApi } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { useClubContext } from "../context/ClubContext";

export const ClubSelectPage = () => {
  const { user, setUser } = useAuth();
  const { setSelectedClubId } = useClubContext();
  const [clubName, setClubName] = useState("");
  const [clubDescription, setClubDescription] = useState("");
  const [error, setError] = useState("");

  const createClubMutation = useMutation({
    mutationFn: createClubApi,
    onSuccess: async () => {
      const me = await meApi();
      setUser(me);
      setClubName("");
      setClubDescription("");
      setError("");
    },
    onError: (err: any) => setError(err?.response?.data?.error?.message || "Could not create club")
  });

  if (!user) {
    return null;
  }

  const onCreateClub = (e: FormEvent) => {
    e.preventDefault();
    createClubMutation.mutate({
      name: clubName,
      description: clubDescription || undefined
    });
  };

  return (
    <div className="container app-shell">
      <div className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Your Clubs</h2>
            <p className="section-subtitle">Choose a workspace to view proposals, votes, and treasury activity.</p>
          </div>
        </div>
      </div>

      {(user.memberships ?? []).length === 0 ? (
        <div className="card">
          <div className="section-header">
            <div>
              <h3 className="section-title">Create your first club</h3>
              <p className="section-subtitle">You are not in any club yet. Create one and start governance now.</p>
            </div>
          </div>
          <form onSubmit={onCreateClub}>
            <label>Club Name</label>
            <input value={clubName} onChange={(e) => setClubName(e.target.value)} required placeholder="Robotics Club" />
            <label>Description (optional)</label>
            <textarea
              value={clubDescription}
              onChange={(e) => setClubDescription(e.target.value)}
              placeholder="What does your club do?"
            />
            <button type="submit" disabled={createClubMutation.isPending}>
              {createClubMutation.isPending ? "Creating..." : "Create Club"}
            </button>
          </form>
          {error && <div className="error-banner">{error}</div>}
        </div>
      ) : (
        <>
          <div className="grid grid-3">
            {(user.memberships ?? []).map((membership) => (
              <div className="card" key={membership.clubId}>
                <div className="section-header">
                  <h3 className="section-title">{membership.clubName}</h3>
                  <span className="badge" data-status={membership.role}>{membership.role}</span>
                </div>
                <p className="helper" style={{ marginBottom: "0.9rem" }}>
                  Open club dashboard and manage governance actions based on your role.
                </p>
                <Link
                  className="action-link"
                  to={"/clubs/" + membership.clubId + "/dashboard"}
                  onClick={() => setSelectedClubId(membership.clubId)}
                >
                  Open Workspace
                </Link>
              </div>
            ))}
          </div>

          <div className="card card-flat">
            <div className="section-header">
              <div>
                <h3 className="section-title">Create Another Club</h3>
                <p className="section-subtitle">Multi-club support is enabled. Spin up a new club workspace.</p>
              </div>
            </div>
            <form onSubmit={onCreateClub}>
              <label>Club Name</label>
              <input value={clubName} onChange={(e) => setClubName(e.target.value)} required placeholder="Design Guild" />
              <label>Description (optional)</label>
              <input
                value={clubDescription}
                onChange={(e) => setClubDescription(e.target.value)}
                placeholder="Community design and events"
              />
              <button type="submit" disabled={createClubMutation.isPending}>
                {createClubMutation.isPending ? "Creating..." : "Add Club"}
              </button>
            </form>
            {error && <div className="error-banner">{error}</div>}
          </div>
        </>
      )}
    </div>
  );
};
