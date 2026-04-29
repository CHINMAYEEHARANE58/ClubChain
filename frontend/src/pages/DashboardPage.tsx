import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { analyticsOverviewApi, votingTrendsApi } from "../api/analytics.api";
import { listProposalsApi } from "../api/proposals.api";

export const DashboardPage = () => {
  const { clubId = "" } = useParams();

  const overviewQuery = useQuery({
    queryKey: ["analytics-overview", clubId],
    queryFn: () => analyticsOverviewApi(clubId)
  });

  const trendsQuery = useQuery({
    queryKey: ["analytics-trends", clubId],
    queryFn: () => votingTrendsApi(clubId, "30d")
  });

  const proposalsQuery = useQuery({
    queryKey: ["dashboard-proposals", clubId],
    queryFn: () => listProposalsApi(clubId, { limit: 6 })
  });

  const overview = overviewQuery.data;

  return (
    <div className="app-shell">
      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Active Proposals First</h3>
            <p className="section-subtitle">Latest proposals and live vote count so members can take action immediately.</p>
          </div>
        </div>

        {proposalsQuery.isLoading && <p className="helper">Loading proposals...</p>}

        {proposalsQuery.data?.data?.length ? (
          <div className="proposal-grid">
            {proposalsQuery.data.data.map((proposal: any) => (
              <Link
                key={proposal.id}
                to={"/clubs/" + clubId + "/proposals/" + proposal.id}
                className="proposal-card"
              >
                <div className="proposal-card-top">
                  <span className="badge" data-status={proposal.status}>{proposal.status}</span>
                  <strong>{proposal._count?.votes ?? 0} votes</strong>
                </div>
                <h4>{proposal.title}</h4>
                <p>{proposal.description.slice(0, 108)}...</p>
              </Link>
            ))}
          </div>
        ) : (
          !proposalsQuery.isLoading && <div className="empty-state">No proposals yet for this club.</div>
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Analytics Overview</h3>
            <p className="section-subtitle">Live governance and participation indicators.</p>
          </div>
        </div>

        {overviewQuery.isLoading && <p className="helper">Loading analytics...</p>}

        {overview && (
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-value">{overview.totalMembers}</div>
              <div className="metric-label">Total Members</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{overview.activeProposals}</div>
              <div className="metric-label">Active Proposals</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{overview.closedProposals}</div>
              <div className="metric-label">Closed Proposals</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{overview.avgParticipationPercent.toFixed(1)}%</div>
              <div className="metric-label">Participation</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{overview.treasuryBalance}</div>
              <div className="metric-label">Treasury Balance</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Voting Trends</h3>
            <p className="section-subtitle">FOR vs AGAINST vs ABSTAIN in the last 30 days.</p>
          </div>
        </div>

        {trendsQuery.isLoading && <p className="helper">Loading trends...</p>}
        {trendsQuery.data && trendsQuery.data.length > 0 ? (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={trendsQuery.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe9e5" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="FOR" stroke="#0f766e" strokeWidth={2.5} />
                <Line type="monotone" dataKey="AGAINST" stroke="#be123c" strokeWidth={2.5} />
                <Line type="monotone" dataKey="ABSTAIN" stroke="#334155" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          !trendsQuery.isLoading && <div className="empty-state">No vote trend data yet.</div>
        )}
      </div>
    </div>
  );
};
