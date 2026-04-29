import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listProposalsApi } from "../api/proposals.api";
import { RestrictionModal } from "../components/common/RestrictionModal";
import { useCurrentRole } from "../hooks/useCurrentRole";

export const ProposalListPage = () => {
  const { clubId = "" } = useParams();
  const role = useCurrentRole(clubId);
  const [showRestricted, setShowRestricted] = useState(false);
  const canCreate = role === "ADMIN" || role === "CORE_MEMBER";

  const proposalsQuery = useQuery({
    queryKey: ["proposals", clubId],
    queryFn: () => listProposalsApi(clubId)
  });

  return (
    <div className="app-shell">
      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Proposals</h3>
            <p className="section-subtitle">Track active and historical governance decisions.</p>
          </div>
          {canCreate ? (
            <Link className="action-link" to={"/clubs/" + clubId + "/proposals/new"}>
              Create Proposal
            </Link>
          ) : (
            <button className="secondary" onClick={() => setShowRestricted(true)}>
              Create Proposal (Restricted)
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {proposalsQuery.isLoading && <p className="helper">Loading proposals...</p>}

        {proposalsQuery.data?.data?.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Votes</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {proposalsQuery.data.data.map((proposal: any) => (
                  <tr key={proposal.id}>
                    <td>
                      <Link to={"/clubs/" + clubId + "/proposals/" + proposal.id}>{proposal.title}</Link>
                    </td>
                    <td>
                      <span className="badge" data-status={proposal.status}>{proposal.status}</span>
                    </td>
                    <td>{proposal._count?.votes ?? 0}</td>
                    <td>{new Date(proposal.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !proposalsQuery.isLoading && <div className="empty-state">No proposals yet.</div>
        )}
      </div>

      <RestrictionModal
        open={showRestricted}
        onClose={() => setShowRestricted(false)}
        title="Create Proposal Restricted"
        reasons={[
          "Only Admin and Core Member roles can create proposals.",
          "You can still review and vote on active proposals with your current permissions.",
          "Ask a club admin to upgrade your role if needed."
        ]}
      />
    </div>
  );
};
