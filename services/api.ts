import { supabase } from './supabase';
import { Patient, Appointment, ClinicalRecord, TreatmentType, PatientFile, Doctor, DoctorSchedule, User, Medicine, MedicineSale, Location, LoyaltyRule, LoyaltyTransaction } from '../types';

// Utility: map DB snake_case fields to app camelCase
const mapPatient = (row: any): Patient => ({
  ...row,
  loyalty_points: row?.loyalty_points ?? 0,
  medicalHistory: row?.medical_history ?? row?.medicalHistory,
  created_at: row?.created_at
});

// Storage bucket for patient uploads
const PATIENT_FILES_BUCKET = 'patient_files';

export const api = {
  locations: {
    getAll: async (): Promise<Location[]> => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .order('name');
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Error fetching locations:", err);
        return [];
      }
    },
    create: async (data: Partial<Location>): Promise<Location> => {
      const { data: result, error } = await supabase
        .from('locations')
        .insert(data)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    }
  },

  patients: {
    getAll: async (locationId?: string): Promise<Patient[]> => {
      try {
        let query = supabase
          .from('patients')
          .select('id, location_id, name, email, phone, balance, loyalty_points, medical_history, created_at')
          .order('name');
        
        if (locationId) {
          query = query.eq('location_id', locationId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return (data || []).map(mapPatient);
      } catch (err) {
        console.warn("Error fetching patients:", err);
        return []; // Return empty array instead of crashing
      }
    },
    create: async (data: Partial<Patient>): Promise<Patient> => {
      const payload = {
        location_id: data.location_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        balance: data.balance ?? 0,
        loyalty_points: 0,
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
    getAll: async (locationId?: string): Promise<Appointment[]> => {
      try {
        let query = supabase
          .from('appointments')
          .select('*, patients(name), doctors(name)')
          .order('date');

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Flatten the response to match the Appointment interface
        return (data || []).map((apt: any) => ({
          ...apt,
          patient_name: apt.patients?.name || 'Unknown',
          doctor_name: apt.doctors?.name || undefined
        }));
      } catch (err) {
        console.warn("Error fetching appointments:", err);
        return [];
      }
    },
    create: async (data: Partial<Appointment>): Promise<Appointment> => {
      const payload = {
        location_id: data.location_id,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        date: data.date,
        time: data.time,
        type: data.type,
        status: data.status || 'Scheduled',
        notes: data.notes
      };

      const { data: result, error } = await supabase
        .from('appointments')
        .insert(payload)
        .select('*, patients(name), doctors(name)')
        .single();

      if (error) throw new Error(error.message);
      
      // Flatten the response
      return {
        ...result,
        patient_name: result.patients?.name || 'Unknown',
        doctor_name: result.doctors?.name || undefined
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
        .select('*, patients(name), doctors(name)')
        .single();

      if (error) throw new Error(error.message);
      
      // Flatten the response
      return {
        ...result,
        patient_name: result.patients?.name || 'Unknown',
        doctor_name: result.doctors?.name || undefined
      };
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    cleanupOld: async (daysOld: number = 4): Promise<number> => {
      // Calculate the cutoff date (4 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      // Delete appointments older than the cutoff date
      const { data, error } = await supabase
        .from('appointments')
        .delete()
        .lt('date', cutoffDateStr)
        .select();

      if (error) throw new Error(error.message);
      
      // Return count of deleted records
      return data?.length || 0;
    }
  },

  treatments: {
    // Configuration
    getTypes: async (locationId?: string): Promise<TreatmentType[]> => {
       try {
         let query = supabase
           .from('treatment_types')
           .select('*')
           .order('category', { ascending: true });
         
         if (locationId) {
           query = query.eq('location_id', locationId);
         }

         const { data, error } = await query;
         
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
    getAllRecords: async (locationId?: string): Promise<ClinicalRecord[]> => {
      try {
        let query = supabase
          .from('treatments')
          .select('*, patients(name)')
          .order('date', { ascending: false })
          .limit(50);

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;

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
    deleteAllRecords: async (): Promise<void> => {
      const { error } = await supabase
        .from('treatments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)

      if (error) throw new Error(error.message);
    },
    record: async (data: { location_id: string; patient_id: string; teeth: number[]; description: string; cost: number }) => {
      // 1. Insert Treatment Record
      const treatmentData = {
        location_id: data.location_id,
        patient_id: data.patient_id,
        teeth: data.teeth,
        description: data.description,
        cost: data.cost,
        date: new Date().toISOString().split('T')[0]
      };
      
      const { data: result, error: insertError } = await supabase
        .from('treatments')
        .insert(treatmentData)
        .select()
        .single();
      
      if (insertError) throw new Error(insertError.message);

      // 2. Update Patient Balance and Points
      const { data: patient, error: fetchError } = await supabase
        .from('patients')
        .select('balance, loyalty_points')
        .eq('id', data.patient_id)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const newBalance = (patient?.balance || 0) + data.cost;
      
      // Calculate points based on active rules
      const rules = await api.loyalty.getRules(data.location_id);
      const treatmentRule = rules.find(r => r.event_type === 'TREATMENT' && r.active);
      const pointsPerUnit = treatmentRule ? treatmentRule.points_per_unit : 0.001;
      const minAmount = treatmentRule?.min_amount || 0;
      
      let earnedPoints = 0;
      if (data.cost >= minAmount) {
        earnedPoints = Math.floor(data.cost * pointsPerUnit);
      }
      
      const newPoints = (patient?.loyalty_points || 0) + earnedPoints;

      const { error: updateError } = await supabase
        .from('patients')
        .update({ balance: newBalance, loyalty_points: newPoints })
        .eq('id', data.patient_id);

      if (updateError) throw new Error(updateError.message);

      if (earnedPoints > 0) {
        await api.loyalty.addTransaction({
          patient_id: data.patient_id,
          location_id: data.location_id,
          points: earnedPoints,
          type: 'EARNED',
          description: `Earned from treatment: ${data.description}`
        });
      }
      
      return { status: "success", new_balance: newBalance, record: result };
    },
    undoRecord: async (recordId: string, patientId: string, cost: number) => {
      // 1. Delete the record
      const { error: deleteError } = await supabase
        .from('treatments')
        .delete()
        .eq('id', recordId);
      
      if (deleteError) throw new Error(deleteError.message);

      // 2. Fetch current balance
      const { data: patient, error: fetchError } = await supabase
        .from('patients')
        .select('balance')
        .eq('id', patientId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      // 3. Deduct the cost (revert balance)
      const newBalance = Math.max(0, (patient?.balance || 0) - cost);

      const { error: updateError } = await supabase
        .from('patients')
        .update({ balance: newBalance })
        .eq('id', patientId);

      if (updateError) throw new Error(updateError.message);

      return { status: "success", new_balance: newBalance };
    }
  },

  doctors: {
    getAll: async (locationId?: string): Promise<Doctor[]> => {
      try {
        let query = supabase
          .from('doctors')
          .select('*, doctor_schedules(*)')
          .order('name');
        
        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        // Transform the data to match Doctor interface
        return (data || []).map((doc: any) => ({
          id: doc.id,
          location_id: doc.location_id,
          name: doc.name,
          email: doc.email,
          phone: doc.phone,
          specialization: doc.specialization,
          schedules: (doc.doctor_schedules || []).map((sched: any) => ({
            id: sched.id,
            day_of_week: sched.day_of_week,
            start_time: sched.start_time,
            end_time: sched.end_time
          })),
          created_at: doc.created_at
        }));
      } catch (err) {
        console.warn("Error fetching doctors:", err);
        return [];
      }
    },
    create: async (data: Partial<Doctor>): Promise<Doctor> => {
      // First create the doctor
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .insert({
          location_id: data.location_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          specialization: data.specialization
        })
        .select()
        .single();

      if (doctorError) throw new Error(doctorError.message);

      // Then create schedules if provided (filter and validate)
      if (data.schedules && data.schedules.length > 0) {
        const validSchedules = data.schedules
          .filter(sched => {
            // Filter out schedules with missing data
            if (!sched.start_time || !sched.end_time || sched.day_of_week === undefined) {
              return false;
            }
            // Validate that end_time > start_time
            const start = new Date(`2000-01-01T${sched.start_time}`);
            const end = new Date(`2000-01-01T${sched.end_time}`);
            return end > start;
          })
          .map(sched => ({
            doctor_id: doctorData.id,
            day_of_week: sched.day_of_week,
            start_time: sched.start_time,
            end_time: sched.end_time
          }));

        if (validSchedules.length > 0) {
          const { error: scheduleError } = await supabase
            .from('doctor_schedules')
            .insert(validSchedules);

          if (scheduleError) throw new Error(scheduleError.message);
        }
      }

      // Fetch the complete doctor with schedules
      const { data: completeDoctor, error: fetchError } = await supabase
        .from('doctors')
        .select('*, doctor_schedules(*)')
        .eq('id', doctorData.id)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      return {
        id: completeDoctor.id,
        location_id: completeDoctor.location_id,
        name: completeDoctor.name,
        email: completeDoctor.email,
        phone: completeDoctor.phone,
        specialization: completeDoctor.specialization,
        schedules: (completeDoctor.doctor_schedules || []).map((sched: any) => ({
          id: sched.id,
          day_of_week: sched.day_of_week,
          start_time: sched.start_time,
          end_time: sched.end_time
        })),
        created_at: completeDoctor.created_at
      };
    },
    update: async (id: string, data: Partial<Doctor>): Promise<Doctor> => {
      // Update doctor info
      const { error: doctorError } = await supabase
        .from('doctors')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone,
          specialization: data.specialization
        })
        .eq('id', id);

      if (doctorError) throw new Error(doctorError.message);

      // Update schedules if provided
      if (data.schedules !== undefined) {
        // Delete existing schedules
        await supabase
          .from('doctor_schedules')
          .delete()
          .eq('doctor_id', id);

        // Insert new schedules (filter and validate)
        if (data.schedules.length > 0) {
          const validSchedules = data.schedules
            .filter(sched => {
              // Filter out schedules with missing data
              if (!sched.start_time || !sched.end_time || sched.day_of_week === undefined) {
                return false;
              }
              // Validate that end_time > start_time
              const start = new Date(`2000-01-01T${sched.start_time}`);
              const end = new Date(`2000-01-01T${sched.end_time}`);
              return end > start;
            })
            .map(sched => ({
              doctor_id: id,
              day_of_week: sched.day_of_week,
              start_time: sched.start_time,
              end_time: sched.end_time
            }));

          if (validSchedules.length > 0) {
            const { error: scheduleError } = await supabase
              .from('doctor_schedules')
              .insert(validSchedules);

            if (scheduleError) throw new Error(scheduleError.message);
          }
        }
      }

      // Fetch updated doctor
      const { data: updatedDoctor, error: fetchError } = await supabase
        .from('doctors')
        .select('*, doctor_schedules(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      return {
        id: updatedDoctor.id,
        location_id: updatedDoctor.location_id,
        name: updatedDoctor.name,
        email: updatedDoctor.email,
        phone: updatedDoctor.phone,
        specialization: updatedDoctor.specialization,
        schedules: (updatedDoctor.doctor_schedules || []).map((sched: any) => ({
          id: sched.id,
          day_of_week: sched.day_of_week,
          start_time: sched.start_time,
          end_time: sched.end_time
        })),
        created_at: updatedDoctor.created_at
      };
    },
    delete: async (id: string): Promise<void> => {
      // Delete schedules first (cascade should handle this, but being explicit)
      await supabase
        .from('doctor_schedules')
        .delete()
        .eq('doctor_id', id);

      // Delete doctor
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    getAvailableTimes: async (doctorId: string, date: string): Promise<string[]> => {
      // Get doctor's schedules
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('*, doctor_schedules(*)')
        .eq('id', doctorId)
        .single();

      if (doctorError) throw new Error(doctorError.message);

      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const appointmentDate = new Date(date);
      const dayOfWeek = appointmentDate.getDay();

      // Find schedules for this day
      const daySchedules = (doctor.doctor_schedules || []).filter(
        (sched: any) => sched.day_of_week === dayOfWeek
      );

      if (daySchedules.length === 0) return [];

      // Get existing appointments for this doctor on this date
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('time')
        .eq('doctor_id', doctorId)
        .eq('date', date)
        .eq('status', 'Scheduled');

      const bookedTimes = new Set((existingAppointments || []).map((apt: any) => apt.time));

      // Generate available time slots (30-minute intervals)
      const availableTimes: string[] = [];
      
      daySchedules.forEach((schedule: any) => {
        const start = new Date(`2000-01-01T${schedule.start_time}`);
        const end = new Date(`2000-01-01T${schedule.end_time}`);
        
        let current = new Date(start);
        while (current < end) {
          const timeStr = current.toTimeString().slice(0, 5); // HH:MM format
          if (!bookedTimes.has(timeStr)) {
            availableTimes.push(timeStr);
          }
          current.setMinutes(current.getMinutes() + 30);
        }
      });

      return availableTimes.sort();
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
  },

  users: {
    getAll: async (): Promise<User[]> => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, location_id, username, role, created_at, updated_at')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return (data || []).map((u: any) => ({
          id: u.id,
          location_id: u.location_id,
          username: u.username,
          role: u.role,
          created_at: u.created_at,
          updated_at: u.updated_at
        }));
      } catch (err) {
        console.warn("Error fetching users:", err);
        return [];
      }
    },
    authenticate: async (username: string, password: string): Promise<User | null> => {
      try {
        const trimmedUsername = username.trim();
        console.log('Attempting to authenticate user:', trimmedUsername);

        const { data, error } = await supabase
          .from('users')
          .select('id, location_id, username, password, role')
          .eq('username', trimmedUsername);

        console.log('Supabase response:', { data, error });

        if (error) {
          console.error('Supabase error:', error);
          return null;
        }

        if (!data || data.length === 0) {
          console.log('No user found with username:', trimmedUsername);
          return null;
        }

        const user = data[0];

        // Simple password comparison (in production, use hashed passwords)
        if (user.password === password) {
          console.log('Authentication successful for user:', trimmedUsername);
          return {
            id: user.id,
            location_id: user.location_id,
            username: user.username,
            role: user.role
          };
        }

        console.log('Password mismatch for user:', trimmedUsername);
        return null;
      } catch (err) {
        console.error("Error authenticating user:", err);
        return null;
      }
    },
    create: async (data: Partial<User>): Promise<User> => {
      const trimmedUsername = data.username?.trim();
      if (!trimmedUsername) {
        throw new Error('Username is required');
      }

      // Check if username already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', trimmedUsername)
        .single();

      if (existing) {
        throw new Error('Username already exists');
      }

      const payload = {
        location_id: data.location_id,
        username: trimmedUsername,
        password: data.password, // In production, hash this
        role: data.role || 'normal'
      };

      const { data: result, error } = await supabase
        .from('users')
        .insert(payload)
        .select('id, location_id, username, role, created_at, updated_at')
        .single();

      if (error) throw new Error(error.message);
      return {
        id: result.id,
        location_id: result.location_id,
        username: result.username,
        role: result.role,
        created_at: result.created_at,
        updated_at: result.updated_at
      };
    },
    update: async (id: string, data: Partial<User>): Promise<User> => {
      const payload: any = {};

      if (data.username !== undefined) {
        const trimmedUsername = data.username.trim();
        if (!trimmedUsername) {
          throw new Error('Username cannot be empty');
        }

        // Check if username already exists (excluding current user)
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('username', trimmedUsername)
          .neq('id', id)
          .single();

        if (existing) {
          throw new Error('Username already exists');
        }
        payload.username = trimmedUsername;
      }
      
      if (data.password !== undefined && data.password !== '') {
        payload.password = data.password; // In production, hash this
      }
      
      if (data.role !== undefined) {
        payload.role = data.role;
      }

      payload.updated_at = new Date().toISOString();

      const { data: result, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', id)
        .select('id, location_id, username, role, created_at, updated_at')
        .single();

      if (error) throw new Error(error.message);
      return {
        id: result.id,
        location_id: result.location_id,
        username: result.username,
        role: result.role,
        created_at: result.created_at,
        updated_at: result.updated_at
      };
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    }
  },

  medicines: {
    getAll: async (locationId?: string): Promise<Medicine[]> => {
      try {
        let query = supabase
          .from('medicines')
          .select('*')
          .order('name');
        
        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        return (data || []).map((m: any) => ({
          id: m.id,
          location_id: m.location_id,
          name: m.name,
          description: m.description,
          unit: m.unit,
          price: m.price,
          stock: m.stock,
          min_stock: m.min_stock,
          category: m.category,
          created_at: m.created_at,
          updated_at: m.updated_at
        }));
      } catch (err) {
        console.warn("Error fetching medicines:", err);
        return [];
      }
    },
    getById: async (id: string): Promise<Medicine | null> => {
      try {
        const { data, error } = await supabase
          .from('medicines')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        if (!data) return null;
        
        return {
          id: data.id,
          location_id: data.location_id,
          name: data.name,
          description: data.description,
          unit: data.unit,
          price: data.price,
          stock: data.stock,
          min_stock: data.min_stock,
          category: data.category,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
      } catch (err) {
        console.warn("Error fetching medicine:", err);
        return null;
      }
    },
    create: async (data: Partial<Medicine>): Promise<Medicine> => {
      const payload = {
        location_id: data.location_id,
        name: data.name,
        description: data.description || null,
        unit: data.unit || 'pack',
        price: data.price || 0,
        stock: data.stock || 0,
        min_stock: data.min_stock || 0,
        category: data.category || null
      };

      const { data: result, error } = await supabase
        .from('medicines')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return {
        id: result.id,
        location_id: result.location_id,
        name: result.name,
        description: result.description,
        unit: result.unit,
        price: result.price,
        stock: result.stock,
        min_stock: result.min_stock,
        category: result.category,
        created_at: result.created_at,
        updated_at: result.updated_at
      };
    },
    update: async (id: string, data: Partial<Medicine>): Promise<Medicine> => {
      const payload: any = {};
      
      if (data.name !== undefined) payload.name = data.name;
      if (data.description !== undefined) payload.description = data.description;
      if (data.unit !== undefined) payload.unit = data.unit;
      if (data.price !== undefined) payload.price = data.price;
      if (data.stock !== undefined) payload.stock = data.stock;
      if (data.min_stock !== undefined) payload.min_stock = data.min_stock;
      if (data.category !== undefined) payload.category = data.category;
      
      payload.updated_at = new Date().toISOString();

      const { data: result, error } = await supabase
        .from('medicines')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return {
        id: result.id,
        location_id: result.location_id,
        name: result.name,
        description: result.description,
        unit: result.unit,
        price: result.price,
        stock: result.stock,
        min_stock: result.min_stock,
        category: result.category,
        created_at: result.created_at,
        updated_at: result.updated_at
      };
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('medicines')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    sell: async (patientId: string, medicineId: string, quantity: number, locationId: string, treatmentId?: string): Promise<{ sale: MedicineSale; new_stock: number }> => {
      // Get medicine details
      const medicine = await api.medicines.getById(medicineId);
      if (!medicine) {
        throw new Error('Medicine not found');
      }

      if (medicine.stock < quantity) {
        throw new Error(`Insufficient stock. Available: ${medicine.stock} ${medicine.unit}`);
      }

      const totalPrice = medicine.price * quantity;
      const newStock = medicine.stock - quantity;

      // Create sale record
      const saleData = {
        location_id: locationId,
        patient_id: patientId,
        medicine_id: medicineId,
        quantity: quantity,
        unit_price: medicine.price,
        total_price: totalPrice,
        date: new Date().toISOString().split('T')[0],
        treatment_id: treatmentId || null
      };

      const { data: saleResult, error: saleError } = await supabase
        .from('medicine_sales')
        .insert(saleData)
        .select('*, patients(name), medicines(name)')
        .single();

      if (saleError) throw new Error(saleError.message);

      // Update stock
      await api.medicines.update(medicineId, { stock: newStock });

      // Update patient balance and points
      const { data: patient } = await supabase
        .from('patients')
        .select('balance, loyalty_points')
        .eq('id', patientId)
        .single();

      if (patient) {
        const newBalance = (patient.balance || 0) + totalPrice;
        
        // Calculate points based on active rules
        const rules = await api.loyalty.getRules(locationId);
        const purchaseRule = rules.find(r => r.event_type === 'PURCHASE' && r.active);
        const pointsPerUnit = purchaseRule ? purchaseRule.points_per_unit : 0.001;
        const minAmount = purchaseRule?.min_amount || 0;
        
        let earnedPoints = 0;
        if (totalPrice >= minAmount) {
          earnedPoints = Math.floor(totalPrice * pointsPerUnit);
        }
        
        const newPoints = (patient.loyalty_points || 0) + earnedPoints;
        
        await supabase
          .from('patients')
          .update({ balance: newBalance, loyalty_points: newPoints })
          .eq('id', patientId);
          
        if (earnedPoints > 0) {
          await api.loyalty.addTransaction({
            patient_id: patientId,
            location_id: locationId,
            points: earnedPoints,
            type: 'EARNED',
            description: `Earned from medicine purchase: ${medicine.name}`
          });
        }
      }

      return {
        sale: {
          id: saleResult.id,
          location_id: saleResult.location_id,
          patient_id: saleResult.patient_id,
          patient_name: saleResult.patients?.name || 'Unknown',
          medicine_id: saleResult.medicine_id,
          medicine_name: saleResult.medicines?.name || 'Unknown',
          quantity: saleResult.quantity,
          unit_price: saleResult.unit_price,
          total_price: saleResult.total_price,
          date: saleResult.date,
          treatment_id: saleResult.treatment_id
        },
        new_stock: newStock
      };
    },
    getSales: async (locationId?: string, patientId?: string): Promise<MedicineSale[]> => {
      try {
        let query = supabase
          .from('medicine_sales')
          .select('*, patients(name), medicines(name)')
          .order('date', { ascending: false });

        if (locationId) {
          query = query.eq('location_id', locationId);
        }
        if (patientId) {
          query = query.eq('patient_id', patientId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map((sale: any) => ({
          id: sale.id,
          location_id: sale.location_id,
          patient_id: sale.patient_id,
          patient_name: sale.patients?.name || 'Unknown',
          medicine_id: sale.medicine_id,
          medicine_name: sale.medicines?.name || 'Unknown',
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          total_price: sale.total_price,
          date: sale.date,
          treatment_id: sale.treatment_id
        }));
      } catch (err) {
        console.warn("Error fetching medicine sales:", err);
        return [];
      }
    }
  },

  loyalty: {
    getTransactions: async (patientId: string, locationId?: string): Promise<LoyaltyTransaction[]> => {
      try {
        let query = supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('patient_id', patientId)
          .order('date', { ascending: false });
        if (locationId) {
          query = query.eq('location_id', locationId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Error fetching loyalty transactions:", err);
        return [];
      }
    },
    addTransaction: async (data: Partial<LoyaltyTransaction>): Promise<LoyaltyTransaction> => {
      const payload = {
        patient_id: data.patient_id,
        location_id: data.location_id,
        points: data.points,
        type: data.type,
        description: data.description,
        date: new Date().toISOString()
      };
      const { data: result, error } = await supabase
        .from('loyalty_transactions')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    redeemPoints: async (patientId: string, locationId: string, points: number, amount: number) => {
      // Fetch current points
      const { data: patient, error: fetchError } = await supabase
        .from('patients')
        .select('loyalty_points, balance')
        .eq('id', patientId)
        .single();

      if (fetchError) throw new Error(fetchError.message);
      if ((patient?.loyalty_points || 0) < points) {
        throw new Error('Insufficient loyalty points');
      }

      const newPoints = patient.loyalty_points - points;
      const newBalance = Math.max(0, (patient.balance || 0) - amount);

      const { error: updateError } = await supabase
        .from('patients')
        .update({ loyalty_points: newPoints, balance: newBalance })
        .eq('id', patientId);

      if (updateError) throw new Error(updateError.message);

      await api.loyalty.addTransaction({
        patient_id: patientId,
        location_id: locationId,
        points: -points,
        type: 'REDEEMED',
        description: `Redeemed ${points} points for discount of ${amount}`
      });

      return { status: 'success', new_points: newPoints, new_balance: newBalance };
    },
    getRules: async (locationId?: string): Promise<LoyaltyRule[]> => {
      try {
        let query = supabase.from('loyalty_rules').select('*').order('name');
        if (locationId) {
          query = query.eq('location_id', locationId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Error fetching loyalty rules:", err);
        return [];
      }
    },
    updateRule: async (id: string, data: Partial<LoyaltyRule>): Promise<LoyaltyRule> => {
      const { data: result, error } = await supabase
        .from('loyalty_rules')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    createRule: async (data: Partial<LoyaltyRule>): Promise<LoyaltyRule> => {
      const { data: result, error } = await supabase
        .from('loyalty_rules')
        .insert(data)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    }
  }
};