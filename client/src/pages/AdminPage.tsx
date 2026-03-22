import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/auth-context";
import {
  getAdminDashboard,
  runMatching,
  updateMatchStatus,
  getUserMatches,
} from "../lib/mock-api";
import type { AdminDashboard, Match } from "../lib/mock-data";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getAdminDashboard().then(setDashboard);
    getUserMatches().then(setMatches);
  }, []);

  if (!user?.isAdmin) {
    return <div style={{ padding: 40 }}>Access denied. Admin only.</div>;
  }

  const handleRunMatching = async () => {
    setMsg("");
    try {
      const result = await runMatching();
      setMsg(`Matching complete: ${result.matched} matched, ${result.unmatched} unmatched`);
      getAdminDashboard().then(setDashboard);
      getUserMatches().then(setMatches);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleStatusChange = async (matchId: string, status: string) => {
    try {
      await updateMatchStatus(matchId, status);
      getUserMatches().then(setMatches);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Admin Panel</h1>
        <div>
          <a href="/dashboard" style={{ marginRight: 16 }}>Dashboard</a>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: 12, background: "#e8f5e9", borderRadius: 4, marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {dashboard && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
            <h4>Users</h4>
            <p>Total: {dashboard.users.total}</p>
            <p>PGP1: {dashboard.users.pgp1} | PGP2: {dashboard.users.pgp2}</p>
          </div>
          <div style={{ padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
            <h4>Matches</h4>
            <p>Total: {dashboard.matches.total}</p>
            <p>Pending: {dashboard.matches.pending} | Done: {dashboard.matches.completed}</p>
          </div>
          <div style={{ padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
            <h4>Today ({dashboard.today.date})</h4>
            <p>Supply: {dashboard.today.supply}</p>
            <p>Demand: {dashboard.today.demand}</p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <button onClick={handleRunMatching} style={{ padding: "8px 24px" }}>
          Run Matching Algorithm
        </button>
      </div>

      <h3>All Matches</h3>
      {matches.length === 0 ? (
        <p>No matches found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Date</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>PGP1</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>PGP2</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Status</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {new Date(m.windowDate).toLocaleDateString()}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {m.pgp1?.name || m.pgp1Id}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {m.pgp2?.name || m.pgp2Id}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.status}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  <select
                    value={m.status}
                    onChange={(e) => handleStatusChange(m.id, e.target.value)}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
