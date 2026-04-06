import type { AppTabPermission } from './constants';

export interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  created_at?: string;
}

export interface Patient {
  id: string;
  location_id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit?: string;
  balance: number;
  loyalty_points: number;
  medicalHistory?: string;
  created_at?: string;
  has_account?: boolean;
}

export interface PatientFile {
  path: string;           // storage path e.g. patientId/filename.ext
  name: string;           // file name
  size: number;           // bytes
  type: string;           // mime type
  uploaded_at?: string;   // storage timestamp
  url: string;            // public URL for download/view
}

export interface TreatmentType {
  id: string; // Database ID
  location_id: string;
  name: string; // Display name (e.g., "Root Canal")
  cost: number;
  category: 'Restorative' | 'Cosmetic' | 'Preventative' | 'Surgery' | 'Orthodontics';
}

export interface ClinicalRecord {
  id: string;
  location_id: string;
  patient_id: string;
  patient_name?: string; // Joined field for global view
  doctor_id?: string;
  doctor_name?: string; // Joined field for clinical ownership
  teeth: number[];
  description: string;
  cost: number;
  date: string;
}

export interface PaymentRecord {
  id: string;
  patientId: string;
  amount: number;
  date: string;
  type: 'FULL' | 'PARTIAL';
  remainingBalance: number;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
}

// For creating/updating doctors - schedule without doctor_id since it's not known yet
export interface DoctorScheduleInput {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Doctor {
  id: string;
  location_id: string;
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  schedules: DoctorSchedule[]; // Array of schedules for different days/times
  created_at?: string;
}

// For creating/updating doctors
export interface DoctorInput {
  id?: string;
  location_id: string;
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  schedules?: DoctorScheduleInput[];
  created_at?: string;
}

export interface Appointment {
  id: string;
  location_id: string;
  patient_id: string;
  patient_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface User {
  id: string;
  location_id: string | null; // null for global admins
  username: string;
  password?: string; // Only for creation/update, not returned in queries
  role: 'admin' | 'normal';
  allowed_tabs?: AppTabPermission[];
  created_at?: string;
  updated_at?: string;
}

export interface Medicine {
  id: string;
  location_id: string;
  name: string;
  description?: string;
  unit: string; // e.g., "pack", "bottle", "box"
  price: number;
  stock: number; // Current stock quantity
  min_stock?: number; // Minimum stock level for alerts
  category?: string; // e.g., "Pain Relief", "Antibiotics", "Supplements"
  created_at?: string;
  updated_at?: string;
}

export interface MedicineSale {
  id: string;
  location_id: string;
  patient_id: string;
  patient_name?: string;
  medicine_id: string;
  medicine_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  date: string;
  treatment_id?: string; // Optional: link to treatment if sold with treatment
}

export interface ClinicSettings {
  loyalty_enabled: boolean;
}

export interface S3Settings {
  url: string;
  accessKey: string;
  secretKey: string;
  region: string;
  updated_at?: string;
}

export interface LoyaltyRule {
  id: string;
  location_id: string;
  name: string;
  event_type: 'TREATMENT' | 'PURCHASE' | 'VISIT' | 'REDEEM';
  points_per_unit: number; // For earned: points per unit of currency. For redeem: units of currency per 1 point.
  min_amount?: number; // Minimum amount to earn or minimum points to redeem
  active: boolean;
}

export interface LoyaltyTransaction {
  id: string;
  patient_id: string;
  location_id: string;
  points: number; // positive for earned, negative for redeemed
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED';
  description: string;
  date: string;
}

export interface Expense {
  id: string;
  location_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface BlogPost {
  id: string;
  location_id: string;
  title: string;
  content: string;
  author?: string;
  image_url?: string;
  published: boolean;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_type: 'patient' | 'admin';
  recipient_id: string;
  recipient_type: 'patient' | 'admin';
  content: string;
  timestamp: string;
  read: boolean;
  conversation_id: string;
}

export interface Conversation {
  id: string;
  patient_id: string;
  patient_name: string;
  admin_id: string;
  admin_name: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  created_at: string;
}

export interface Recall {
  id: string;
  location_id: string;
  patient_id: string;
  patient_name?: string;
  appointment_id?: string | null;
  title: string;
  due_date: string; // YYYY-MM-DD
  reminder_days_before: number;
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  notes?: string | null;
  last_reminded_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledTask {
  id: string;
  location_id: string;
  admin_id?: string | null;
  task_type: 'EMAIL' | 'DAILY_REPORT_EMAIL';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  run_at: string;
  payload: Record<string, any>;
  last_error?: string | null;
  sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
}
