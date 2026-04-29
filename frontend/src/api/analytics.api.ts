import { api } from "./axiosClient";

export const analyticsOverviewApi = async (clubId: string) => {
  const { data } = await api.get("/clubs/" + clubId + "/analytics/overview");
  return data.data;
};

export const votingTrendsApi = async (clubId: string, range = "30d") => {
  const { data } = await api.get("/clubs/" + clubId + "/analytics/voting-trends", {
    params: { range }
  });
  return data.data;
};

export const activityFeedApi = async (clubId: string) => {
  const { data } = await api.get("/clubs/" + clubId + "/activity-feed");
  return data.data;
};

export const auditLogsApi = async (clubId: string, page = 1, limit = 20) => {
  const { data } = await api.get("/clubs/" + clubId + "/audit-logs", {
    params: { page, limit }
  });
  return data;
};
