import { api } from "./axiosClient";

export const getTreasuryApi = async (clubId: string) => {
  const { data } = await api.get("/clubs/" + clubId + "/treasury");
  return data.data;
};

export const listTreasuryTransactionsApi = async (clubId: string, page = 1, limit = 20) => {
  const { data } = await api.get("/clubs/" + clubId + "/treasury/transactions", {
    params: { page, limit }
  });
  return data;
};

export const createTreasuryTransactionApi = async (
  clubId: string,
  payload: { txnType: "CREDIT" | "DEBIT"; amount: number; note?: string; proposalId?: string }
) => {
  const { data } = await api.post("/clubs/" + clubId + "/treasury/transactions", payload);
  return data.data;
};
