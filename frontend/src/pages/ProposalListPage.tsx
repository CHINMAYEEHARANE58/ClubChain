import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { listProposalsApi } from "../api/proposals.api";
import { RoleGuard } from "../components/common/RoleGuard";
import { useCurrentRole } from "../hooks/useCurrentRole";

export const ProposalListPage = () => {
  const { clubId = "" } = useParams();
  const role = useCurrentRole(clubId);

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
          <RoleGuard role={role} allowed={["ADMIN", "CORE_MEMBER"]}>
            <Link className="action-link" to={"/clubs/" + clubId + "/proposals/new"}>
              Create Proposal
            </Link>
          </RoleGuard>
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
    </div>
  );
};
