import { supabase } from './supabase';
import { Patient, Appointment, ClinicalRecord, TreatmentType, PatientFile } from '../types';

// Utility: map DB snake_case fields to app camelCase
const mapPatient = (row: any): Patient => ({
  ...row,
  medicalHistory: row?.medical_history ?? row?.medicalHistory,
  created_at: row?.created_at
});

// Storage bucket for patient uploads
const PATIENT_FILES_BUCKET = 'patient_files';

export const api = {
  patients: {
    getAll: async (): Promise<Patient[]> => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, name, email, phone, balance, medical_history, created_at')
          .order('name');
        
        if (error) throw error;
        return (data || []).map(mapPatient);
      } catch (err) {
        console.warn("Error fetching patients:", err);
        return []; // Return empty array instead of crashing
      }
    },
    create: async (data: Partial<Patient>): Promise<Patient> => {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        balance: data.balance ?? 0,
        medical_history: data.medicalHistory || null
      };

      const { data: result, error } = await supabase
        .from('patients')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapPatient(result);
    },
    update: async (id: string, data: Partial<Patient>): Promise<Patient> => {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        balance: data.balance,
        medical_history: data.medicalHistory
      };

      const { data: result, error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapPatient(result);
    }
  },

  appointments: {
    getAll: async (): Promise<Appointment[]> => {
      try {
        // Fetch appointments and join with patients to get the name
        const { data, error } = await supabase
          .from('appointments')
          .select('*, patients(name)')
          .order('date');

        if (error) throw error;

        // Flatten the response to match the Appointment interface
        return (data || []).map((apt: any) => ({
          ...apt,
          patient_name: apt.patients?.name || 'Unknown'
        }));
      } catch (err) {
        console.warn("Error fetching appointments:", err);
        return [];
      }
    },
    create: async (data: Partial<Appointment>): Promise<Appointment> => {
      const { data: result, error } = await supabase
        .from('appointments')
        .insert(data)
        .select('*, patients(name)')
        .single();

      if (error) throw new Error(error.message);
      
      // Flatten the response
      return {
        ...result,
        patient_name: result.patients?.name || 'Unknown'
      };
    },
    updateStatus: async (id: string, status: string): Promise<void> => {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    update: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
      const { data: result, error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id)
        .select('*, patients(name)')
        .single();

      if (error) throw new Error(error.message);
      
      // Flatten the response
      return {
        ...result,
        patient_name: result.patients?.name || 'Unknown'
      };
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    }
  },

  treatments: {
    // Configuration
    getTypes: async (): Promise<TreatmentType[]> => {
       try {
         const { data, error } = await supabase
           .from('treatment_types')
           .select('*')
           .order('category', { ascending: true });
         
         if (error) throw error;
         return data || [];
       } catch (err) {
         console.warn("Error fetching treatment types:", err);
         return [];
       }
    },
    createType: async (data: Partial<TreatmentType>): Promise<TreatmentType> => {
      const { data: result, error } = await supabase
        .from('treatment_types')
        .insert(data)
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      return result;
    },
    updateType: async (id: string, data: Partial<TreatmentType>): Promise<TreatmentType> => {
      const { data: result, error } = await supabase
        .from('treatment_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      return result;
    },
    deleteType: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('treatment_types')
        .delete()
        .eq('id', id);
        
      if (error) throw new Error(error.message);
    },

    // Execution
    getHistory: async (patientId: string): Promise<ClinicalRecord[]> => {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    },
    getAllRecords: async (): Promise<ClinicalRecord[]> => {
      try {
        const { data, error } = await supabase
          .from('treatments')
          .select('*, patients(name)')
          .order('date', { ascending: false })
          .limit(50);

        if (error) throw error;

        return (data || []).map((rec: any) => ({
          ...rec,
          patient_name: rec.patients?.name || 'Unknown'
        }));
      } catch (err) {
        console.warn("Error fetching records:", err);
        return [];
      }
    },
    record: async (data: { patient_id: string; teeth: number[]; description: string; cost: number }) => {
      // 1. Insert Treatment Record
      const treatmentData = {
        patient_id: data.patient_id,
        teeth: data.teeth,
        description: data.description,
        cost: data.cost,
        date: new Date().toISOString().split('T')[0]
      };
      
      const { error: insertError } = await supabase
        .from('treatments')
        .insert(treatmentData);
      
      if (insertError) throw new Error(insertError.message);

      // 2. Update Patient Balance (Read -> Calculate -> Write)
      // Note: In a production environment with high concurrency, this should be a Database Function (RPC)
      const { data: patient, error: fetchError } = await supabase
        .from('patients')
        .select('balance')
        .eq('id', data.patient_id)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const newBalance = (patient?.balance || 0) + data.cost;

      const { error: updateError } = await supabase
        .from('patients')
        .update({ balance: newBalance })
        .eq('id', data.patient_id);

      if (updateError) throw new Error(updateError.message);
      
      return { status: "success", new_balance: newBalance };
    }
  },

  finance: {
    processPayment: async (patientId: string, amount: number) => {
      // Fetch current balance
      const { data: patient, error: fetchError } = await supabase
        .from('patients')
        .select('balance')
        .eq('id', patientId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const currentBal = patient?.balance || 0;
      const newBal = Math.max(0, currentBal - amount);

      const { error: updateError } = await supabase
        .from('patients')
        .update({ balance: newBal })
        .eq('id', patientId);

      if (updateError) throw new Error(updateError.message);
      
      return { status: "success", new_balance: newBal };
    }
  },

  files: {
    list: async (patientId: string): Promise<PatientFile[]> => {
      const { data, error } = await supabase.storage
        .from(PATIENT_FILES_BUCKET)
        .list(patientId, { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw new Error(error.message);

      return (data || []).map((file) => {
        const path = `${patientId}/${file.name}`;
        const { data: publicData } = supabase.storage.from(PATIENT_FILES_BUCKET).getPublicUrl(path);
        return {
          path,
          name: file.name,
          size: file.metadata?.size ?? 0,
          type: file.metadata?.mimetype ?? '',
          uploaded_at: file.created_at,
          url: publicData?.publicUrl || ''
        };
      });
    },
    upload: async (patientId: string, file: File): Promise<PatientFile> => {
      const path = `${patientId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(PATIENT_FILES_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicData } = supabase.storage.from(PATIENT_FILES_BUCKET).getPublicUrl(path);

      return {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        uploaded_at: new Date().toISOString(),
        url: publicData?.publicUrl || ''
      };
    },
    remove: async (path: string): Promise<void> => {
      const { error } = await supabase.storage
        .from(PATIENT_FILES_BUCKET)
        .remove([path]);

      if (error) throw new Error(error.message);
    }
  }
};