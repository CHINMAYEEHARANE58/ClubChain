import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  createTreasuryTransactionApi,
  getTreasuryApi,
  listTreasuryTransactionsApi
} from "../api/treasury.api";
import { RoleGuard } from "../components/common/RoleGuard";
import { useCurrentRole } from "../hooks/useCurrentRole";

export const TreasuryPage = () => {
  const { clubId = "" } = useParams();
  const role = useCurrentRole(clubId);
  const queryClient = useQueryClient();

  const [txnType, setTxnType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const treasuryQuery = useQuery({
    queryKey: ["treasury", clubId],
    queryFn: () => getTreasuryApi(clubId)
  });

  const transactionsQuery = useQuery({
    queryKey: ["treasury-transactions", clubId],
    queryFn: () => listTreasuryTransactionsApi(clubId)
  });

  const transactionMutation = useMutation({
    mutationFn: () => createTreasuryTransactionApi(clubId, { txnType, amount, note: note || undefined }),
    onSuccess: async () => {
      setError("");
      setAmount(0);
      setNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["treasury", clubId] }),
        queryClient.invalidateQueries({ queryKey: ["treasury-transactions", clubId] })
      ]);
    },
    onError: (err: any) => setError(err?.response?.data?.error?.message || "Could not create transaction")
  });

  return (
    <div className="app-shell">
      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Treasury</h3>
            <p className="section-subtitle">Monitor funds and record every transaction transparently.</p>
          </div>
        </div>

        {treasuryQuery.isLoading ? (
          <p className="helper">Loading treasury...</p>
        ) : (
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-value">{String(treasuryQuery.data?.currentBalance ?? 0)}</div>
              <div className="metric-label">Current Balance</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{treasuryQuery.data?.currencyCode || "INR"}</div>
              <div className="metric-label">Currency</div>
            </div>
          </div>
        )}
      </div>

      <RoleGuard role={role} allowed={["ADMIN"]}>
        <div className="card">
          <div className="section-header">
            <div>
              <h4 className="section-title">Add Transaction</h4>
              <p className="section-subtitle">Only admins can submit treasury credits and debits.</p>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div>
              <label>Type</label>
              <select value={txnType} onChange={(e) => setTxnType(e.target.value as "CREDIT" | "DEBIT")}>
                <option value="CREDIT">CREDIT</option>
                <option value="DEBIT">DEBIT</option>
              </select>
            </div>
            <div>
              <label>Amount</label>
              <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <label>Note</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context" />
            </div>
          </div>

          <button onClick={() => transactionMutation.mutate()} disabled={transactionMutation.isPending || amount <= 0}>
            {transactionMutation.isPending ? "Saving..." : "Save Transaction"}
          </button>
        </div>
      </RoleGuard>

      <div className="card">
        <h4 className="section-title" style={{ marginBottom: "0.8rem" }}>Transactions</h4>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Note</th>
                <th>By</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {transactionsQuery.data?.data?.map((txn: any) => (
                <tr key={txn.id}>
                  <td>
                    <span className="badge">{txn.txnType}</span>
                  </td>
                  <td>{String(txn.amount)}</td>
                  <td>{txn.note || "-"}</td>
                  <td>{txn.performedBy?.fullName || "System"}</td>
                  <td>{new Date(txn.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};
