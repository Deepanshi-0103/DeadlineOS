export type OpportunityCategory =
  | "Job"
  | "Internship"
  | "Hackathon"
  | "Conference"
  | "Workshop"
  | "Scholarship"
  | "Competition"
  | "Fellowship"
  | "Event"
  | "Grant";

export type OpportunityStatus =
  | "Urgent"
  | "Saved"
  | "Submitted"
  | "Under Review"
  | "In Progress"
  | "Not Started"
  | "Completed"
  | "Needs Review";

export type OpportunityPriority = "HIGH" | "MEDIUM" | "LOW" | "High" | "Medium" | "Low";

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory | string;
  organizer: string;
  deadline: string; // ISO date string
  daysLeft: number;
  priority: any;
  status: any;
  reward?: string;
  link?: string;
  sourceUrl?: string;
  summary?: string;
  eligibility?: string;
  registrationUrl?: string;
  confidence?: number;
  needsReview?: boolean;
  notes?: string;
}

export interface StatsData {
  total: number;
  urgent: number;
  submitted: number;
  saved: number;
}

export interface DashboardStat {
  label: string;
  value: number;
  tone: "critical" | "warning" | "safe" | "brand";
}

export type CaptureMode = "text" | "link" | "upload";
