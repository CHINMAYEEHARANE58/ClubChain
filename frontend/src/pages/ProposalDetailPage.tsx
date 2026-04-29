import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  activateProposalApi,
  closeProposalApi,
  executeProposalApi,
  getProposalApi,
  proposalHistoryApi
} from "../api/proposals.api";
import { castVoteApi, listVotesApi, voteSummaryApi } from "../api/votes.api";
import { RoleGuard } from "../components/common/RoleGuard";
import { useCurrentRole } from "../hooks/useCurrentRole";

export const ProposalDetailPage = () => {
  const { clubId = "", proposalId = "" } = useParams();
  const role = useCurrentRole(clubId);
  const queryClient = useQueryClient();

  const [voteChoice, setVoteChoice] = useState<"FOR" | "AGAINST" | "ABSTAIN">("FOR");
  const [voteComment, setVoteComment] = useState("");
  const [error, setError] = useState("");

  const proposalQuery = useQuery({
    queryKey: ["proposal", clubId, proposalId],
    queryFn: () => getProposalApi(clubId, proposalId)
  });

  const summaryQuery = useQuery({
    queryKey: ["proposal-summary", clubId, proposalId],
    queryFn: () => voteSummaryApi(clubId, proposalId)
  });

  const votesQuery = useQuery({
    queryKey: ["votes", clubId, proposalId],
    queryFn: () => listVotesApi(clubId, proposalId)
  });

  const historyQuery = useQuery({
    queryKey: ["proposal-history", clubId, proposalId],
    queryFn: () => proposalHistoryApi(clubId, proposalId)
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["proposal", clubId, proposalId] }),
      queryClient.invalidateQueries({ queryKey: ["proposal-summary", clubId, proposalId] }),
      queryClient.invalidateQueries({ queryKey: ["votes", clubId, proposalId] }),
      queryClient.invalidateQueries({ queryKey: ["proposal-history", clubId, proposalId] }),
      queryClient.invalidateQueries({ queryKey: ["proposals", clubId] })
    ]);
  };

  const voteMutation = useMutation({
    mutationFn: () => castVoteApi(clubId, proposalId, { choice: voteChoice, comment: voteComment || undefined }),
    onSuccess: () => {
      setError("");
      setVoteComment("");
      refreshAll();
    },
    onError: (err: any) => setError(err?.response?.data?.error?.message || "Could not cast vote")
  });

  const activateMutation = useMutation({
    mutationFn: () => activateProposalApi(clubId, proposalId),
    onSuccess: refreshAll,
    onError: (err: any) => setError(err?.response?.data?.error?.message || "Could not activate proposal")
  });

  const closeMutation = useMutation({
    mutationFn: () => closeProposalApi(clubId, proposalId),
    onSuccess: refreshAll,
    onError: (err: any) => setError(err?.response?.data?.error?.message || "Could not close proposal")
  });

  const executeMutation = useMutation({
    mutationFn: () => executeProposalApi(clubId, proposalId),
    onSuccess: refreshAll,
    onError: (err: any) => setError(err?.response?.data?.error?.message || "Could not execute proposal")
  });

  const proposal = proposalQuery.data;

  return (
    <div className="app-shell">
      {proposalQuery.isLoading && <div className="card helper">Loading proposal...</div>}

      {proposal && (
        <>
          <div className="card">
            <div className="section-header">
              <div>
                <h3 className="section-title">{proposal.title}</h3>
                <p className="section-subtitle">{proposal.description}</p>
              </div>
              <span className="badge" data-status={proposal.status}>{proposal.status}</span>
            </div>

            <div className="metric-grid" style={{ marginBottom: "0.9rem" }}>
              <div className="metric-card">
                <div className="metric-label">Voting Window</div>
                <div className="helper" style={{ marginTop: "0.4rem" }}>
                  {proposal.startTime ? new Date(proposal.startTime).toLocaleString() : "-"}
                  <br />
                  {proposal.endTime ? new Date(proposal.endTime).toLocaleString() : "-"}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{String(proposal.quorumPercent)}%</div>
                <div className="metric-label">Quorum</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{String(proposal.passThresholdPercent)}%</div>
                <div className="metric-label">Pass Threshold</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{String(proposal.treasuryImpactAmount)}</div>
                <div className="metric-label">Treasury Impact</div>
              </div>
            </div>

            <div className="row">
              <RoleGuard role={role} allowed={["ADMIN", "CORE_MEMBER"]}>
                {proposal.status === "DRAFT" && (
                  <button onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
                    Activate Proposal
                  </button>
                )}
              </RoleGuard>

              <RoleGuard role={role} allowed={["ADMIN"]}>
                {proposal.status === "ACTIVE" && (
                  <button className="secondary" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
                    Close Proposal
                  </button>
                )}
                {proposal.status === "APPROVED" && (
                  <button onClick={() => executeMutation.mutate()} disabled={executeMutation.isPending}>
                    Execute Proposal
                  </button>
                )}
              </RoleGuard>
            </div>
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <h4 className="section-title">Vote Summary</h4>
                <p className="section-subtitle">Real-time vote distribution and participation.</p>
              </div>
            </div>

            {summaryQuery.isLoading ? (
              <p className="helper">Loading summary...</p>
            ) : (
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-value">{summaryQuery.data?.for ?? 0}</div>
                  <div className="metric-label">FOR</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{summaryQuery.data?.against ?? 0}</div>
                  <div className="metric-label">AGAINST</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{summaryQuery.data?.abstain ?? 0}</div>
                  <div className="metric-label">ABSTAIN</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{summaryQuery.data?.totalVotesCast ?? 0}</div>
                  <div className="metric-label">Total Votes</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{(summaryQuery.data?.participationPercent ?? 0).toFixed(1)}%</div>
                  <div className="metric-label">Participation</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{String(summaryQuery.data?.passed ?? false)}</div>
                  <div className="metric-label">Passed</div>
                </div>
              </div>
            )}
          </div>

          {proposal.status === "ACTIVE" && (
            <div className="card">
              <div className="section-header">
                <div>
                  <h4 className="section-title">Cast Your Vote</h4>
                  <p className="section-subtitle">Each member can vote once per proposal.</p>
                </div>
              </div>
              <label>Choice</label>
              <select value={voteChoice} onChange={(e) => setVoteChoice(e.target.value as "FOR" | "AGAINST" | "ABSTAIN")}>
                <option value="FOR">FOR</option>
                <option value="AGAINST">AGAINST</option>
                <option value="ABSTAIN">ABSTAIN</option>
              </select>
              <label>Comment (optional)</label>
              <textarea value={voteComment} onChange={(e) => setVoteComment(e.target.value)} />
              <button onClick={() => voteMutation.mutate()} disabled={voteMutation.isPending}>
                {voteMutation.isPending ? "Submitting..." : "Submit Vote"}
              </button>
            </div>
          )}

          <div className="card">
            <h4 className="section-title" style={{ marginBottom: "0.8rem" }}>Vote Records</h4>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Voter</th>
                    <th>Choice</th>
                    <th>Comment</th>
                    <th>Cast At</th>
                  </tr>
                </thead>
                <tbody>
                  {votesQuery.data?.map((vote: any) => (
                    <tr key={vote.id}>
                      <td>{vote.voter?.fullName || vote.voter?.collegeEmail}</td>
                      <td>
                        <span className="badge">{vote.choice}</span>
                      </td>
                      <td>{vote.comment || "-"}</td>
                      <td>{new Date(vote.castAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h4 className="section-title" style={{ marginBottom: "0.8rem" }}>Status History</h4>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Changed By</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {historyQuery.data?.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.previousStatus || "-"}</td>
                      <td>
                        <span className="badge" data-status={item.newStatus}>{item.newStatus}</span>
                      </td>
                      <td>{item.changedBy?.fullName || "System"}</td>
                      <td>{new Date(item.changedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};
