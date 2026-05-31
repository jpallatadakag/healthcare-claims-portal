export type UserRole = "patient" | "provider" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Patient {
  id: number;
  user_id: number;
  date_of_birth: string;
  insurance_id: string;
  insurance_provider: string;
  phone: string;
  address: string;
}

export interface Provider {
  id: number;
  user_id: number;
  npi: string;
  specialty: string;
  facility_name: string;
  phone: string;
  address: string;
}

export type ClaimStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "denied"
  | "appealed";

export interface Claim {
  id: number;
  claim_number: string;
  patient_id: number;
  provider_id: number;
  service_date: string;
  diagnosis_codes: string; // comma-separated ICD-10
  procedure_codes: string; // comma-separated CPT
  billed_amount: number;
  approved_amount: number | null;
  status: ClaimStatus;
  notes: string | null;
  submitted_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface ClaimWithDetails extends Claim {
  patient_name: string;
  patient_insurance_id: string;
  provider_name: string;
  provider_npi: string;
  facility_name: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
}
