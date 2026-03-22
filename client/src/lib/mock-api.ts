import type {
  User,
  CvUpload,
  Match,
  WindowStatus,
  AdminDashboard,
} from "./mock-data";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem("mc_access_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function jsonAuthHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...authHeaders() };
}

async function extractError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message || body?.message || res.statusText;
  } catch {
    return res.statusText;
  }
}

// ─── 1. login ───────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      return { error: await extractError(res) };
    }

    const data = await res.json();
    localStorage.setItem("mc_access_token", data.accessToken);
    localStorage.setItem("mc_refresh_token", data.refreshToken);
    return { user: data.user };
  } catch (err: any) {
    return { error: err.message || "Network error" };
  }
}

// ─── 2. register ────────────────────────────────────────────────────────────

export async function register(params: {
  email: string;
  password: string;
  pgpId: string;
  name: string;
}): Promise<{ user?: User; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      return { error: await extractError(res) };
    }

    const data = await res.json();
    localStorage.setItem("mc_access_token", data.accessToken);
    localStorage.setItem("mc_refresh_token", data.refreshToken);
    return { user: data.user };
  } catch (err: any) {
    return { error: err.message || "Network error" };
  }
}

// ─── 3. getProfile ──────────────────────────────────────────────────────────

export async function getProfile(_userId?: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: authHeaders(),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── 4. updateProfile ───────────────────────────────────────────────────────

export async function updateProfile(
  _userId: string,
  data: Partial<Pick<User, "name" | "phone" | "linkedin" | "bio">>
): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      method: "PATCH",
      headers: jsonAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── 5. uploadCv ────────────────────────────────────────────────────────────

export async function uploadCv(
  _userId: string,
  file: File
): Promise<CvUpload> {
  const formData = new FormData();
  formData.append("cv", file);

  const res = await fetch(`${API_URL}/api/cv/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const msg = await extractError(res);
    throw new Error(msg);
  }

  return await res.json();
}

// ─── 6. getActiveCv ─────────────────────────────────────────────────────────

export async function getActiveCv(_userId?: string): Promise<CvUpload | null> {
  try {
    const res = await fetch(`${API_URL}/api/cv/me`, {
      headers: authHeaders(),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── 7. submitDemand ────────────────────────────────────────────────────────

export async function submitDemand(
  _userId: string,
  preferredSlots?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/forms/demand`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ preferredSlots }),
    });

    if (!res.ok) {
      return { success: false, error: await extractError(res) };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

// ─── 8. submitSupply ────────────────────────────────────────────────────────

export async function submitSupply(
  _userId: string,
  availableSlots?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/forms/supply`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ availableSlots }),
    });

    if (!res.ok) {
      return { success: false, error: await extractError(res) };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

// ─── 9. retractSupply ───────────────────────────────────────────────────────

export async function retractSupply(
  _userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/forms/supply/retract`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!res.ok) {
      return { success: false, error: await extractError(res) };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

// ─── 10. submitFeedback ─────────────────────────────────────────────────────

export async function submitFeedback(
  _userId: string,
  ratings: { matchId: string; rating: number; comment?: string }[]
): Promise<{ success: boolean; submitted?: number; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/forms/feedback`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ feedbacks: ratings }),
    });

    if (!res.ok) {
      return { success: false, error: await extractError(res) };
    }

    const data = await res.json();
    return { success: true, submitted: Array.isArray(data) ? data.length : 1 };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

// ─── 11. runMatching ────────────────────────────────────────────────────────

export async function runMatching(): Promise<{
  matched: number;
  unmatched: number;
}> {
  const res = await fetch(`${API_URL}/api/matching/run`, {
    method: "POST",
    headers: jsonAuthHeaders(),
  });

  if (!res.ok) {
    const msg = await extractError(res);
    throw new Error(msg);
  }

  const data = await res.json();
  return { matched: data.matchesCreated || 0, unmatched: 0 };
}

// ─── 12. updateMatchStatus ──────────────────────────────────────────────────

export async function updateMatchStatus(
  matchId: string,
  status: string
): Promise<Match> {
  const res = await fetch(`${API_URL}/api/admin/matches/${matchId}`, {
    method: "PATCH",
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const msg = await extractError(res);
    throw new Error(msg);
  }

  return await res.json();
}

// ─── 13. getUserMatches ─────────────────────────────────────────────────────

export async function getUserMatches(_userId?: string): Promise<Match[]> {
  try {
    const res = await fetch(`${API_URL}/api/users/me/matches`, {
      headers: authHeaders(),
    });

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ─── 14. getWindowStatus ────────────────────────────────────────────────────

export async function getWindowStatus(): Promise<WindowStatus | null> {
  try {
    const res = await fetch(`${API_URL}/api/forms/status`, {
      headers: authHeaders(),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Admin extras ───────────────────────────────────────────────────────────

export async function getAdminDashboard(): Promise<AdminDashboard | null> {
  try {
    const res = await fetch(`${API_URL}/api/admin/dashboard`, {
      headers: authHeaders(),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
