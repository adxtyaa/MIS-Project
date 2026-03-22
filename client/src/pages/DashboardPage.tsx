import React, { useState, useRef } from "react";
import { useAuth } from "../contexts/auth-context";
import { useWindowStatus } from "../hooks/use-window-status";
import {
  uploadCv,
  getActiveCv,
  submitDemand,
  submitSupply,
  retractSupply,
  getUserMatches,
} from "../lib/mock-api";
import type { CvUpload, Match } from "../lib/mock-data";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, logout, refreshUser } = useAuth();
  const { status, loading: statusLoading, refresh: refreshStatus } = useWindowStatus();
  const [cv, setCv] = useState<CvUpload | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getActiveCv(user.id).then(setCv);
    getUserMatches(user.id).then(setMatches);
  }, [user]);

  if (!user) return null;

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    try {
      const result = await uploadCv(user.id, file);
      setCv(result);
      setMsg(`CV uploaded! Score: ${result.cvScore ?? "scoring..."}`);
      // Poll for score update
      const poll = setInterval(async () => {
        const updated = await getActiveCv(user.id);
        if (updated?.cvScore !== null && updated?.cvScore !== undefined) {
          setCv(updated);
          setMsg(`CV scored: ${updated.cvScore}`);
          clearInterval(poll);
        }
      }, 3000);
      setTimeout(() => clearInterval(poll), 30000);
    } catch (err: any) {
      setMsg(`Upload failed: ${err.message}`);
    }
    setUploading(false);
  };

  const handleDemand = async () => {
    setMsg("");
    const result = await submitDemand(user.id);
    if (result.success) {
      setMsg("Demand form submitted!");
      refreshStatus();
    } else {
      setMsg(`Error: ${result.error}`);
    }
  };

  const handleSupply = async () => {
    setMsg("");
    const result = await submitSupply(user.id);
    if (result.success) {
      setMsg("Supply form submitted!");
      refreshStatus();
    } else {
      setMsg(`Error: ${result.error}`);
    }
  };

  const handleRetract = async () => {
    setMsg("");
    const result = await retractSupply(user.id);
    if (result.success) {
      setMsg("Supply retracted.");
      refreshStatus();
    } else {
      setMsg(`Error: ${result.error}`);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <p><strong>{user.name}</strong> ({user.email})</p>
        <p>Role: {user.role} | PGP ID: {user.pgpId} {user.isAdmin && "| ADMIN"}</p>
        {user.isAdmin && (
          <p>
            <a href="/admin">Go to Admin Panel</a>
          </p>
        )}
      </div>

      {msg && (
        <div style={{ padding: 12, background: "#e8f5e9", borderRadius: 4, marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {/* Window Status */}
      {!statusLoading && status && (
        <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3>Booking Window: {status.windowOpen ? "OPEN" : "CLOSED"}</h3>
          <p>Today: {status.today}</p>
          {status.demandForm && <p>Demand form: submitted</p>}
          {status.supplyForm && (
            <p>Supply form: {status.supplyForm.retracted ? "retracted" : "submitted"}</p>
          )}
          {status.todaysMatches.length > 0 && (
            <p>Today's matches: {status.todaysMatches.length}</p>
          )}
        </div>
      )}

      {/* PGP1: CV Upload + Demand */}
      {user.role === "PGP1" && (
        <>
          <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3>CV Upload</h3>
            {cv && (
              <p>
                Active CV: {cv.fileName} | Score: {cv.cvScore ?? "pending"}
              </p>
            )}
            <input type="file" ref={fileRef} accept=".pdf" />
            <button onClick={handleUpload} disabled={uploading} style={{ marginLeft: 8 }}>
              {uploading ? "Uploading..." : "Upload CV"}
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <button
              onClick={handleDemand}
              disabled={!status?.windowOpen || !!status?.demandForm}
              style={{ padding: "8px 24px" }}
            >
              Submit Demand Form
            </button>
            {status?.demandForm && <span style={{ marginLeft: 8, color: "green" }}>Already submitted today</span>}
          </div>
        </>
      )}

      {/* PGP2: Supply */}
      {user.role === "PGP2" && (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={handleSupply}
            disabled={!status?.windowOpen || (!!status?.supplyForm && !status.supplyForm.retracted)}
            style={{ padding: "8px 24px", marginRight: 8 }}
          >
            Submit Supply Form
          </button>
          {status?.supplyForm && !status.supplyForm.retracted && (
            <button onClick={handleRetract} style={{ padding: "8px 24px" }}>
              Retract Supply
            </button>
          )}
        </div>
      )}

      {/* Matches */}
      <div style={{ marginBottom: 24 }}>
        <h3>Your Matches</h3>
        {matches.length === 0 ? (
          <p>No matches yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Date</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Counterpart</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const counterpart = user.role === "PGP1" ? m.pgp2 : m.pgp1;
                return (
                  <tr key={m.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {new Date(m.windowDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {counterpart?.name || "N/A"} ({counterpart?.email || ""})
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
