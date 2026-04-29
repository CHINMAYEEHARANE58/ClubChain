import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { activityFeedApi, auditLogsApi } from "../api/analytics.api";
import { useCurrentRole } from "../hooks/useCurrentRole";

export const ActivityPage = () => {
  const { clubId = "" } = useParams();
  const role = useCurrentRole(clubId);

  const activityQuery = useQuery({
    queryKey: ["activity", clubId],
    queryFn: () => activityFeedApi(clubId)
  });

  const auditsQuery = useQuery({
    queryKey: ["audits", clubId],
    queryFn: () => auditLogsApi(clubId),
    enabled: role === "ADMIN" || role === "CORE_MEMBER"
  });

  return (
    <div className="app-shell">
      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Activity Feed</h3>
            <p className="section-subtitle">Latest governance events visible to members.</p>
          </div>
        </div>

        {activityQuery.isLoading && <p className="helper">Loading activity...</p>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {activityQuery.data?.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.action}</td>
                  <td>{item.entityType}</td>
                  <td>{item.actorUser?.fullName || "System"}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(role === "ADMIN" || role === "CORE_MEMBER") && (
        <div className="card">
          <div className="section-header">
            <div>
              <h3 className="section-title">Audit Logs</h3>
              <p className="section-subtitle">Detailed audit trail for elevated roles.</p>
            </div>
          </div>

          {auditsQuery.isLoading && <p className="helper">Loading audit logs...</p>}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Actor</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {auditsQuery.data?.data?.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.action}</td>
                    <td>{item.entityType}</td>
                    <td>{item.actorUser?.fullName || "System"}</td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
