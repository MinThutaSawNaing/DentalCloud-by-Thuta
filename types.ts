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

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string; 
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  patientId: string;
  amount: number;
  date: string;
  type: 'FULL' | 'PARTIAL';
  remainingBalance: number;
}
