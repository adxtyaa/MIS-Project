// TypeScript interfaces matching the Prisma schema

export interface User {
  id: string;
  email: string;
  name: string;
  pgpId: string;
  role: "PGP1" | "PGP2";
  isAdmin: boolean;
  phone: string | null;
  linkedin: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  activeCv?: CvUpload | null;
  recentMatches?: Match[];
}

export interface CvUpload {
  id: string;
  userId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  cvScore: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  pgp1Id: string;
  pgp2Id: string;
  windowDate: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  cvScoreSnap: number | null;
  slotScore: number | null;
  createdAt: string;
  updatedAt: string;
  pgp1?: Pick<User, "id" | "name" | "email" | "pgpId">;
  pgp2?: Pick<User, "id" | "name" | "email" | "pgpId">;
}

export interface SupplyForm {
  id: string;
  userId: string;
  windowDate: string;
  isRetracted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DemandForm {
  id: string;
  userId: string;
  windowDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSubmission {
  id: string;
  userId: string;
  matchId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface WindowStatus {
  windowOpen: boolean;
  today: string;
  supplyForm: { submitted: boolean; retracted: boolean } | null;
  demandForm: { submitted: boolean } | null;
  todaysMatches: Match[];
  pendingFeedback: Match[];
  activeCv: CvUpload | null;
}

export interface AdminDashboard {
  users: { total: number; pgp1: number; pgp2: number };
  matches: { total: number; pending: number; completed: number };
  today: { supply: number; demand: number; date: string };
  cvUploads: number;
  feedbackCount: number;
}
