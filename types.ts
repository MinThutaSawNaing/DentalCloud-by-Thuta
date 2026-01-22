export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit?: string;
  balance: number;
  medicalHistory?: string;
  created_at?: string;
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
  name: string; // Display name (e.g., "Root Canal")
  cost: number;
  category: 'Restorative' | 'Cosmetic' | 'Preventative' | 'Surgery' | 'Orthodontics';
}

export interface ClinicalRecord {
  id: string;
  patient_id: string;
  patient_name?: string; // Joined field for global view
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
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
}

export interface Doctor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  schedules: DoctorSchedule[]; // Array of schedules for different days/times
  created_at?: string;
}

export interface Appointment {
  id: string;
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
