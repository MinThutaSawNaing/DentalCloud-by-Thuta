import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';
import * as tus from 'tus-js-client';
import { Patient, Appointment, ClinicalRecord, TreatmentType, PatientFile, Doctor, DoctorSchedule, User, Medicine, MedicineSale, Location, LoyaltyRule, LoyaltyTransaction, Expense, BlogPost, Message, Conversation, Recall, ScheduledTask } from '../types';
import { FULL_ACCESS_TAB_PERMISSIONS } from '../constants';
import { resolveAllowedTabs } from '../utils/permissions';
import { loadEmailSettings } from '../utils/emailSettings';

let usersAllowedTabsSupport: boolean | null = null;

const isMissingColumnError = (error: any, columnName: string): boolean => {
  return typeof error?.message === 'string' && error.message.toLowerCase().includes(columnName.toLowerCase());
};

const detectUsersAllowedTabsSupport = async (): Promise<boolean> => {
  if (usersAllowedTabsSupport !== null) {
    return usersAllowedTabsSupport;
  }

  const { error } = await supabase
    .from('users')
    .select('allowed_tabs')
    .limit(1);

  if (error) {
    if (isMissingColumnError(error, 'allowed_tabs')) {
      usersAllowedTabsSupport = false;
      return false;
    }

    throw error;
  }

  usersAllowedTabsSupport = true;
  return true;
};

// Utility: map DB snake_case fields to app camelCase
const mapPatient = (row: any): Patient => ({
  ...row,
  loyalty_points: row?.loyalty_points ?? 0,
  medicalHistory: row?.medical_history ?? row?.medicalHistory,
  created_at: row?.created_at,
  has_account: Array.isArray(row?.patient_auth) ? row.patient_auth.length > 0 : !!row?.patient_auth
});

const isValidEmailAddress = (email?: string | null) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const truncateMessagePreview = (value: string, limit = 220) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
};

const syncRecallStatusFromAppointment = async (params: {
  appointmentId: string;
  patientId?: string;
  locationId?: string;
  status?: string;
}) => {
  const { appointmentId, patientId, locationId, status } = params;
  if (!appointmentId || !status) return;

  const now = new Date().toISOString();

  const linkFirstOpenRecall = async (targetStatus: 'SCHEDULED' | 'COMPLETED') => {
    if (!patientId || !locationId) return;

    const { data: openRecall, error: openRecallError } = await supabase
      .from('recalls')
      .select('id')
      .eq('patient_id', patientId)
      .eq('location_id', locationId)
      .is('appointment_id', null)
      .in('status', ['PENDING', 'OVERDUE', 'SCHEDULED'])
      .order('due_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (openRecallError) throw new Error(openRecallError.message);
    if (!openRecall) return;

    const { error: linkError } = await supabase
      .from('recalls')
      .update({
        appointment_id: appointmentId,
        status: targetStatus,
        updated_at: now
      })
      .eq('id', openRecall.id);

    if (linkError) throw new Error(linkError.message);
  };

  if (status === 'Scheduled') {
    const { data: linkedRecalls, error: linkedRecallsError } = await supabase
      .from('recalls')
      .update({ status: 'SCHEDULED', updated_at: now })
      .eq('appointment_id', appointmentId)
      .in('status', ['PENDING', 'OVERDUE'])
      .select('id');

    if (linkedRecallsError) throw new Error(linkedRecallsError.message);
    if (!linkedRecalls || linkedRecalls.length === 0) {
      await linkFirstOpenRecall('SCHEDULED');
    }
    return;
  }

  if (status === 'Completed') {
    const { data: completedLinked, error: completedLinkedError } = await supabase
      .from('recalls')
      .update({ status: 'COMPLETED', updated_at: now })
      .eq('appointment_id', appointmentId)
      .in('status', ['PENDING', 'SCHEDULED', 'OVERDUE'])
      .select('id');

    if (completedLinkedError) throw new Error(completedLinkedError.message);
    if (!completedLinked || completedLinked.length === 0) {
      await linkFirstOpenRecall('COMPLETED');
    }
    return;
  }

  if (status === 'Cancelled') {
    const { error: cancelSyncError } = await supabase
      .from('recalls')
      .update({
        status: 'PENDING',
        appointment_id: null,
        updated_at: now
      })
      .eq('appointment_id', appointmentId)
      .eq('status', 'SCHEDULED');

    if (cancelSyncError) throw new Error(cancelSyncError.message);
  }
};

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
          .select('id, location_id, name, email, phone, balance, loyalty_points, medical_history, created_at, patient_auth(id)')
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
    create: async (data: Partial<Patient> & { password?: string; username?: string }): Promise<Patient> => {
      // First, check if the patients table exists
      try {
        const { error: tableError } = await supabase
          .from('patients')
          .select('id')
          .limit(1);
        
        if (tableError) throw new Error(`Patients table access failed: ${tableError.message}`);
      } catch (tableCheckError: any) {
        console.error('Table check error:', tableCheckError);
        throw new Error(`Database table error: ${tableCheckError.message || 'Failed to connect to database'}`);
      }
      
      // Handle location assignment
      let finalLocationId = data.location_id;
      
      // If no location_id provided or it's 'main', get or create default location
      if (!finalLocationId || finalLocationId === 'main') {
        try {
          // Try to get existing locations
          const { data: locations, error: locationsError } = await supabase
            .from('locations')
            .select('id')
            .limit(1);
          
          if (locationsError) {
            console.warn('Failed to fetch locations:', locationsError.message);
            // Create default location if none exist
            const { data: newLocation, error: createError } = await supabase
              .from('locations')
              .insert({
                name: 'Main Clinic',
                address: 'Default Address',
                phone: '000-000-0000'
              })
              .select()
              .single();
            
            if (createError) throw new Error(`Failed to create default location: ${createError.message}`);
            finalLocationId = newLocation.id;
          } else if (locations && locations.length > 0) {
            finalLocationId = locations[0].id;
          } else {
            // No locations exist, create one
            const { data: newLocation, error: createError } = await supabase
              .from('locations')
              .insert({
                name: 'Main Clinic',
                address: 'Default Address',
                phone: '000-000-0000'
              })
              .select()
              .single();
            
            if (createError) throw new Error(`Failed to create default location: ${createError.message}`);
            finalLocationId = newLocation.id;
          }
        } catch (locationHandlingError: any) {
          console.error('Location handling error:', locationHandlingError);
          throw new Error(`Location handling error: ${locationHandlingError.message}`);
        }
      } else {
        // Check if the provided location exists
        try {
          const { error: locationError } = await supabase
            .from('locations')
            .select('id')
            .eq('id', finalLocationId)
            .single();
          
          if (locationError) throw new Error(`Location not found: ${finalLocationId}`);
        } catch (locationCheckError: any) {
          console.error('Location check error:', locationCheckError);
          throw new Error(`Location validation error: ${locationCheckError.message}`);
        }
      }
      
      const normalizedEmail = data.email ? data.email.toLowerCase().trim() : data.email;
      const normalizedPhone = data.phone ? data.phone.trim() : data.phone;
      const payload = {
        location_id: finalLocationId,
        name: data.name,
        email: normalizedEmail,
        phone: normalizedPhone,
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

      // If password is provided, create auth record
      if (data.password) {
        const { error: authError } = await supabase
          .from('patient_auth')
          .insert({
            patient_id: result.id,
            username: data.username ? data.username.trim().toLowerCase() : null,
            email: normalizedEmail || null,
            phone: normalizedPhone || null,
            password: data.password,
            is_verified: true
          });
        
        if (authError) {
          console.warn('Patient created but auth record failed:', authError.message);
        }
      }

      return mapPatient(result);
    },
    update: async (id: string, data: Partial<Patient>): Promise<Patient> => {
      const normalizedEmail = data.email ? data.email.toLowerCase().trim() : data.email;
      const normalizedPhone = data.phone ? data.phone.trim() : data.phone;
      const payload = {
        name: data.name,
        email: normalizedEmail,
        phone: normalizedPhone,
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
      
      // If phone number or email was updated, also update it in patient_auth table
      if (data.phone !== undefined || data.email !== undefined) {
        const authUpdateData: any = {};
        if (data.phone !== undefined) authUpdateData.phone = normalizedPhone;
        if (data.email !== undefined) authUpdateData.email = normalizedEmail;
        
        const { error: authError } = await supabase
          .from('patient_auth')
          .update(authUpdateData)
          .eq('patient_id', id);
          
        if (authError) {
          console.warn('Email/phone updated in patients table but failed to update in patient_auth table:', authError.message);
        }
      }
      
      return mapPatient(result);
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    // Update or create patient auth record
    updateAccount: async (
      patientId: string, 
      email: string | null, 
      password: string, 
      phone?: string | null,
      username?: string | null
    ): Promise<void> => {
      const normalizedEmail = email ? email.toLowerCase().trim() : email;
      const normalizedPhone = phone ? phone.trim() : phone;
      const normalizedUsername = username ? username.trim().toLowerCase() : username;
      // Check if auth record exists
      const { data: existing } = await supabase
        .from('patient_auth')
        .select('id')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (existing) {
        // Update
        const updateData: any = { password, email: normalizedEmail };
        if (phone !== undefined) updateData.phone = normalizedPhone;
        if (username !== undefined) updateData.username = normalizedUsername ?? null;
        
        const { error } = await supabase
          .from('patient_auth')
          .update(updateData)
          .eq('patient_id', patientId);
        if (error) throw new Error(error.message);
      } else {
        // Create
        const { error } = await supabase
          .from('patient_auth')
          .insert({
            patient_id: patientId,
            username: normalizedUsername ?? null,
            email: normalizedEmail,
            phone: normalizedPhone || null,
            password: password,
            is_verified: true
          });
        if (error) throw new Error(error.message);
      }
    },

    updatePasswordByEmail: async (
      email: string,
      password: string,
      supabaseUserId?: string
    ): Promise<void> => {
      const normalizedEmail = email.toLowerCase().trim();
      if (!normalizedEmail) {
        throw new Error('Email is required to update the patient password.');
      }

      const updateData: Record<string, any> = {
        password,
        is_verified: true
      };

      if (supabaseUserId) {
        updateData.supabase_user_id = supabaseUserId;
      }

      const { data: existingAuth, error: fetchError } = await supabase
        .from('patient_auth')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!existingAuth?.id) {
        throw new Error('No patient account was found for that email address.');
      }

      const { error: updateError } = await supabase
        .from('patient_auth')
        .update(updateData)
        .eq('id', existingAuth.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    },
    
    // Authenticate patient with email, phone, username, or name + password
    authenticate: async (identifier: string, password: string): Promise<Patient | null> => {
      try {
        const trimmedIdentifier = identifier.trim();
        const normalizedIdentifier = trimmedIdentifier.toLowerCase();
        const safeIdentifier = trimmedIdentifier.replace(/"/g, '');
        const safeNormalized = normalizedIdentifier.replace(/"/g, '');
        
        // 1. Try to find patient_auth by email, phone, or username
        const { data: authMatch, error: authMatchError } = await supabase
          .from('patient_auth')
          .select('patient_id, password')
          .or(`email.eq."${safeNormalized}",phone.eq."${safeIdentifier}",username.eq."${safeNormalized}"`)
          .maybeSingle();

        if (authMatchError) {
          console.warn('Patient auth lookup error:', authMatchError.message);
        }

        if (authMatch?.patient_id) {
          if (authMatch.password !== password) {
            console.log('Password mismatch for patient_auth record.');
            return null;
          }

          const { data: patientData, error: pError } = await supabase
            .from('patients')
            .select('id, location_id, name, email, phone, balance, loyalty_points, medical_history, created_at')
            .eq('id', authMatch.patient_id)
            .maybeSingle();

          if (pError || !patientData) {
            console.log('No patient found for auth record:', authMatch.patient_id);
            return null;
          }

          console.log('Patient authentication successful for:', patientData.name);
          return mapPatient(patientData);
        }

        // 2. Fallback: allow legacy login by patient name
        const { data: patientData, error: pError } = await supabase
          .from('patients')
          .select('id, location_id, name, email, phone, balance, loyalty_points, medical_history, created_at')
          .eq('name', trimmedIdentifier)
          .maybeSingle();

        if (pError || !patientData) {
          console.log('No patient found with identifier:', trimmedIdentifier);
          return null;
        }

        const { data: authData, error: aError } = await supabase
          .from('patient_auth')
          .select('password')
          .eq('patient_id', patientData.id)
          .maybeSingle();

        if (aError || !authData) {
          console.log('No auth record found for patient:', patientData.name);
          return null;
        }

        if (password === authData.password) {
          console.log('Patient authentication successful for:', patientData.name);
          return mapPatient(patientData);
        }

        console.log('Password mismatch for patient:', patientData.name);
        return null;
      } catch (err) {
        console.error('Error authenticating patient:', err);
        return null;
      }
    },

    // Register patient with password
    register: async (email: string, password: string, username?: string): Promise<Patient> => {
      // 1. Get first location as default
      const { data: locations } = await supabase.from('locations').select('id').limit(1);
      const defaultLocationId = locations && locations.length > 0 ? locations[0].id : null;

      if (!defaultLocationId) throw new Error('No clinic location found. Please contact admin.');
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedUsername = username?.trim() ? username.trim().toLowerCase() : null;

      // 2. Check if patient already exists
      let { data: existingPatient, error: fetchError } = await supabase
        .from('patients')
        .select('id, name, email, phone')
        .eq('email', normalizedEmail)
        .single();

      let patient;
      if (fetchError || !existingPatient) {
        // Patient doesn't exist, create new one
        const { data: newPatient, error: pError } = await supabase
          .from('patients')
          .insert({ 
            name: normalizedUsername || normalizedEmail.split('@')[0], 
            email: normalizedEmail,
            location_id: defaultLocationId
          })
          .select()
          .single();

        if (pError) throw new Error(pError.message);
        patient = newPatient;
      } else {
        // Patient already exists, use existing one
        patient = existingPatient;
      }

      // 3. Create or update auth record with user-defined password
      const { error: aError } = await supabase
        .from('patient_auth')
        .upsert({
          patient_id: patient.id,
          username: normalizedUsername,
          email: normalizedEmail,
          phone: patient.phone || null,
          password: password,
          is_verified: true
        });

      if (aError) throw new Error(aError.message);

      return mapPatient(patient);
    },

    // Register patient with Supabase Auth integration
    registerWithSupabase: async (
      email: string, 
      password: string, 
      supabaseUserId?: string,
      username?: string,
      phone?: string
    ): Promise<Patient> => {
      // 1. Get first location as default
      const { data: locations } = await supabase.from('locations').select('id').limit(1);
      const defaultLocationId = locations && locations.length > 0 ? locations[0].id : null;

      if (!defaultLocationId) throw new Error('No clinic location found. Please contact admin.');

      const normalizedEmail = email.toLowerCase().trim();
      const normalizedUsername = username?.trim() ? username.trim().toLowerCase() : null;
      const normalizedPhone = phone?.trim() ? phone.trim() : null;

      // 2. Check if patient already exists by email
      let { data: existingPatient, error: fetchError } = await supabase
        .from('patients')
        .select('id, name, email, phone')
        .eq('email', normalizedEmail)
        .single();

      let patient;
      if (fetchError || !existingPatient) {
        // Patient doesn't exist, create new one
        const { data: newPatient, error: pError } = await supabase
          .from('patients')
          .insert({ 
            name: normalizedUsername || normalizedEmail.split('@')[0], 
            email: normalizedEmail,
            phone: normalizedPhone,
            location_id: defaultLocationId
          })
          .select()
          .single();

        if (pError) {
          console.error('Error creating patient record:', pError);
          throw new Error(`Failed to create patient: ${pError.message}`);
        }
        patient = newPatient;
      } else {
        // Patient already exists, use existing one
        patient = existingPatient;
      }

      // 3. Check if patient_auth record already exists
      const { data: existingAuth } = await supabase
        .from('patient_auth')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (existingAuth) {
        // Update existing auth record
        const updateData: any = {
          patient_id: patient.id,
          is_verified: true
        };
        if (supabaseUserId) {
          updateData.supabase_user_id = supabaseUserId;
        }
        if (normalizedUsername) {
          updateData.username = normalizedUsername;
        }
        if (normalizedPhone) {
          updateData.phone = normalizedPhone;
        }

        const { error: updateError } = await supabase
          .from('patient_auth')
          .update(updateData)
          .eq('email', normalizedEmail);

        if (updateError) {
          console.error('Error updating patient auth record:', updateError);
          throw new Error(`Failed to update authentication: ${updateError.message}`);
        }
      } else {
        // Create new auth record
        const authData: any = {
          patient_id: patient.id,
          username: normalizedUsername,
          email: normalizedEmail,
          phone: normalizedPhone || patient.phone || null,
          is_verified: true,
          password: password || null // May be empty for Supabase Auth users
        };

        if (supabaseUserId) {
          authData.supabase_user_id = supabaseUserId;
        }

        const { error: insertError } = await supabase
          .from('patient_auth')
          .insert(authData);

        if (insertError) {
          console.error('Error creating patient auth record:', insertError);
          throw new Error(`Failed to create authentication record: ${insertError.message}`);
        }
      }

      console.log('Patient registration completed successfully:', { patientId: patient.id, email: normalizedEmail });
      return mapPatient(patient);
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
      if (!data.location_id) throw new Error('location_id is required');
      if (!data.date) throw new Error('date is required');
      if (!data.time) throw new Error('time is required');

      // 1. Validate Doctor Availability only when a doctor is selected
      if (data.doctor_id) {
        const availableTimes = await api.doctors.getAvailableTimes(data.doctor_id, data.date);
        const requestedTime = data.time.slice(0, 5); // Ensure HH:MM
        if (!availableTimes.includes(requestedTime)) {
          throw new Error(`Doctor is not available at ${requestedTime} on ${data.date}. Available times: ${availableTimes.join(', ')}`);
        }
      }

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

      if (error) {
        if (error.code === '23503') throw new Error('Invalid Patient or Doctor ID');
        throw new Error(error.message);
      }

      try {
        await syncRecallStatusFromAppointment({
          appointmentId: result.id,
          patientId: result.patient_id,
          locationId: result.location_id,
          status: result.status
        });
      } catch (syncErr) {
        console.warn('Recall automation sync failed on appointment create:', syncErr);
      }
      
      // Flatten the response
      return {
        ...result,
        patient_name: result.patients?.name || 'Unknown',
        doctor_name: result.doctors?.name || undefined
      };
    },
    updateStatus: async (id: string, status: string): Promise<void> => {
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('id, patient_id, location_id')
        .eq('id', id)
        .single();

      if (fetchError || !appointment) throw new Error(fetchError?.message || 'Appointment not found');

      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw new Error(error.message);

      try {
        await syncRecallStatusFromAppointment({
          appointmentId: id,
          patientId: appointment.patient_id,
          locationId: appointment.location_id,
          status
        });
      } catch (syncErr) {
        console.warn('Recall automation sync failed on appointment status update:', syncErr);
      }
    },
    update: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
      const { data: result, error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id)
        .select('*, patients(name), doctors(name)')
        .single();

      if (error) throw new Error(error.message);

      try {
        await syncRecallStatusFromAppointment({
          appointmentId: result.id,
          patientId: result.patient_id,
          locationId: result.location_id,
          status: result.status
        });
      } catch (syncErr) {
        console.warn('Recall automation sync failed on appointment edit:', syncErr);
      }
      
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
        .select('*, doctors(name)')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map((rec: any) => ({
        ...rec,
        doctor_name: rec.doctors?.name || undefined
      }));
    },
    getAllRecords: async (locationId?: string): Promise<ClinicalRecord[]> => {
      try {
        let query = supabase
          .from('treatments')
          .select('*, patients(name), doctors(name)')
          .order('date', { ascending: false })
          .limit(50);

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map((rec: any) => ({
          ...rec,
          patient_name: rec.patients?.name || 'Unknown',
          doctor_name: rec.doctors?.name || undefined
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
    record: async (data: { 
      location_id: string; 
      patient_id: string; 
      doctor_id?: string;
      teeth: number[]; 
      description: string; 
      cost: number;
      medications?: { id: string; qty: number }[] 
    }) => {
      if (!data.location_id) throw new Error('location_id is required');
      
      // 1. Validate Tooth Numbers
      // Supports:
      // - Universal permanent teeth: 1-32
      // - FDI primary teeth: 51-85 (used by react-teeth-selector for baby teeth)
      const isValidToothNumber = (t: number) => {
        const isUniversalPermanent = t >= 1 && t <= 32;
        const isFDIPrimary =
          (t >= 51 && t <= 55) ||
          (t >= 61 && t <= 65) ||
          (t >= 71 && t <= 75) ||
          (t >= 81 && t <= 85);

        return isUniversalPermanent || isFDIPrimary;
      };

      if (data.teeth && data.teeth.length > 0) {
        const invalidTeeth = data.teeth.filter(t => !isValidToothNumber(t));
        if (invalidTeeth.length > 0) {
          throw new Error(`Invalid tooth numbers: ${invalidTeeth.join(', ')}. Must be Universal 1-32 or primary 51-85.`);
        }
      }

      // 2. Fetch patient state
      const { data: patient, error: fetchError } = await supabase
        .from('patients')
        .select('id, name, balance, loyalty_points')
        .eq('id', data.patient_id)
        .eq('location_id', data.location_id)
        .single();

      if (fetchError || !patient) throw new Error('Patient not found in this location');

      // 3. Handle Medications (Constraint Validation)
      let medicationTotal = 0;
      const medicationResults = [];
      if (data.medications && data.medications.length > 0) {
        for (const med of data.medications) {
          const { data: medicine, error: mError } = await supabase
            .from('medicines')
            .select('*')
            .eq('id', med.id)
            .single();
          
          if (mError || !medicine) throw new Error(`Medicine with ID ${med.id} not found`);
          if (medicine.stock < med.qty) throw new Error(`Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`);
          
          medicationTotal += Number(medicine.price) * med.qty;
          medicationResults.push({ med, medicine });
        }
      }

      // 4. Insert Treatment Record
      const treatmentData = {
        location_id: data.location_id,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id || null,
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
      
      if (insertError) throw new Error(`Treatment recording failed: ${insertError.message}`);

      // 5. Execute Medication Sales & Stock Updates
      for (const res of medicationResults) {
        await api.medicines.sell(data.patient_id, res.med.id, res.med.qty, data.location_id, result.id);
      }

      // 6. Update Patient Balance and Points (Total = Treatment Cost + Medication Cost)
      // Note: api.medicines.sell already updates balance and points. 
      // We only need to update the balance/points for the TREATMENT cost here if not already handled.
      // Actually, to keep it simple and avoid double counting, we'll let api.medicines.sell handle its part
      // and we handle the treatment cost part here.
      
      const treatmentBalance = (patient.balance || 0) + data.cost;
      
      // Calculate points for TREATMENT only
      const rules = await api.loyalty.getRules(data.location_id);
      const treatmentRule = rules.find(r => r.event_type === 'TREATMENT' && r.active);
      const pointsPerUnit = treatmentRule ? treatmentRule.points_per_unit : 0.001;
      const minAmount = treatmentRule?.min_amount || 0;
      
      let earnedPoints = 0;
      if (data.cost >= minAmount) {
        earnedPoints = Math.floor(data.cost * pointsPerUnit);
      }
      
      const newPoints = (patient.loyalty_points || 0) + earnedPoints;

      const { error: updateError } = await supabase
        .from('patients')
        .update({ balance: treatmentBalance, loyalty_points: newPoints })
        .eq('id', data.patient_id);

      if (updateError) throw new Error(`Patient balance update failed: ${updateError.message}`);

      if (earnedPoints > 0) {
        await api.loyalty.addTransaction({
          patient_id: data.patient_id,
          location_id: data.location_id,
          points: earnedPoints,
          type: 'EARNED',
          description: `Earned from treatment: ${data.description}`
        });
      }
      
      // Fetch final state for return
      const { data: finalPatient } = await supabase.from('patients').select('balance').eq('id', data.patient_id).single();

      let doctorName: string | undefined;
      if (result?.doctor_id) {
        const { data: doctorRow } = await supabase
          .from('doctors')
          .select('name')
          .eq('id', result.doctor_id)
          .maybeSingle();
        doctorName = doctorRow?.name || undefined;
      }
      
      return {
        status: "success",
        new_balance: finalPatient?.balance,
        record: {
          ...result,
          doctor_name: doctorName
        }
      };
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
    create: async (data: Partial<Doctor> | any): Promise<Doctor> => {
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
    update: async (id: string, data: Partial<Doctor> | any): Promise<Doctor> => {
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

    /**
     * Calculate optimal chunk size based on file size to bypass Cloudflare 150MB limit.
     * Uses adaptive chunking: smaller chunks for larger files to ensure reliable uploads.
     * 
     * @param fileSize - File size in bytes
     * @returns Optimal chunk size in bytes
     */
    calculateOptimalChunkSize: (fileSize: number): number => {
      // For files < 100MB: 10MB chunks
      if (fileSize < 100 * 1024 * 1024) {
        return 10 * 1024 * 1024;
      }
      // For files 100MB - 500MB: 5MB chunks
      if (fileSize < 500 * 1024 * 1024) {
        return 5 * 1024 * 1024;
      }
      // For files 500MB - 1GB: 2MB chunks
      if (fileSize < 1024 * 1024 * 1024) {
        return 2 * 1024 * 1024;
      }
      // For files 1GB - 5GB: 1MB chunks
      if (fileSize < 5 * 1024 * 1024 * 1024) {
        return 1 * 1024 * 1024;
      }
      // For files > 5GB: 512KB chunks (very small for maximum reliability)
      return 512 * 1024;
    },

    /**
     * Upload a file using TUS resumable upload protocol with smart adaptive chunking.
     * Automatically adjusts chunk size based on file size to bypass Cloudflare 150MB limit.
     * Supports pause, resume, and cancel operations.
     * Includes automatic retry with smaller chunks if upload fails.
     * 
     * This is ideal for large files and unreliable network connections.
     * Works with both authenticated and public (anon key) uploads based on storage policies.
     *
     * @param patientId - The patient ID to associate the file with
     * @param file - The file to upload
     * @param onProgress - Callback for upload progress (bytesUploaded, bytesTotal)
     * @param onChunkComplete - Callback when a chunk is successfully uploaded
     * @param options - Optional configuration (chunkSize, parallelUploads, etc.)
     * @returns Promise that resolves with the PatientFile when upload is complete
     */
    uploadWithTus: async (
      patientId: string,
      file: File,
      onProgress?: (bytesUploaded: number, bytesTotal: number) => void,
      onChunkComplete?: (chunkSize: number, bytesAccepted: number, bytesTotal: number) => void,
      options?: {
        chunkSize?: number;
        maxRetries?: number;
        metadata?: Record<string, string>;
        attempt?: number;
      }
    ): Promise<PatientFile> => {
      const path = `${patientId}/${Date.now()}-${file.name}`;

      // Get session if available, but don't require it for public uploads
      const { data: { session } } = await supabase.auth.getSession();

      // Use session token if available, otherwise use anon key for public uploads
      // The anon key is used when storage policies allow public access
      const authToken = session?.access_token || supabaseAnonKey;

      // Calculate optimal chunk size if not provided
      const calculatedChunkSize = api.files.calculateOptimalChunkSize(file.size);
      const chunkSize = options?.chunkSize || calculatedChunkSize;
      const maxRetries = options?.maxRetries || 10;
      const attempt = options?.attempt || 1;

      console.log(`[Smart Upload] File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Chunk Size: ${(chunkSize / 1024 / 1024).toFixed(2)}MB, Attempt: ${attempt}`);

      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: Array.from({ length: maxRetries }, (_, i) => {
            // Exponential backoff: 0s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, ...
            if (i === 0) return 0;
            if (i <= 5) return Math.pow(2, i) * 1000;
            return 60000; // Cap at 60 seconds
          }),
          headers: {
            authorization: `Bearer ${authToken}`,
            'x-upsert': 'false',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: PATIENT_FILES_BUCKET,
            objectName: path,
            contentType: file.type,
            cacheControl: '3600',
            ...options?.metadata,
          },
          chunkSize,
          onError: async (error) => {
            console.error(`[Smart Upload] TUS upload error (attempt ${attempt}):`, error);
            const errorMsg = error.message || 'Unknown error';
            
            // If this is not the first attempt and chunk size is still large, retry with smaller chunks
            if (attempt < 3 && chunkSize > 1 * 1024 * 1024) {
              const smallerChunkSize = Math.max(Math.floor(chunkSize / 2), 512 * 1024);
              console.log(`[Smart Upload] Retrying with smaller chunk size: ${(smallerChunkSize / 1024 / 1024).toFixed(2)}MB`);
              
              try {
                const result = await api.files.uploadWithTus(
                  patientId,
                  file,
                  onProgress,
                  onChunkComplete,
                  {
                    ...options,
                    chunkSize: smallerChunkSize,
                    attempt: attempt + 1
                  }
                );
                resolve(result);
                return;
              } catch (retryError) {
                console.error('[Smart Upload] Retry failed:', retryError);
              }
            }
            
            // Handle specific error types
            if (errorMsg.includes('413') || errorMsg.includes('too large')) {
              reject(new Error('File too large for upload. Please try a smaller file or contact support to increase the limit.'));
            } else if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
              reject(new Error('Network timeout. Please check your connection and try again.'));
            } else if (errorMsg.includes('403') || errorMsg.includes('permission')) {
              reject(new Error('Permission denied. Please check storage bucket permissions.'));
            } else {
              reject(new Error(`Upload failed: ${errorMsg}`));
            }
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            if (onProgress) {
              onProgress(bytesUploaded, bytesTotal);
            }
          },
          onChunkComplete: (chunkSize, bytesAccepted, bytesTotal) => {
            if (onChunkComplete) {
              onChunkComplete(chunkSize, bytesAccepted, bytesTotal);
            }
          },
          onSuccess: () => {
            console.log(`[Smart Upload] Successfully uploaded: ${file.name}`);
            const { data: publicData } = supabase.storage.from(PATIENT_FILES_BUCKET).getPublicUrl(path);

            resolve({
              path,
              name: file.name,
              size: file.size,
              type: file.type,
              uploaded_at: new Date().toISOString(),
              url: publicData?.publicUrl || ''
            });
          },
        });

        // Check for previous uploads to resume
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length > 0) {
            console.log('[Smart Upload] Resuming previous upload');
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        }).catch((err) => {
          console.warn('[Smart Upload] Failed to find previous uploads:', err);
          upload.start();
        });
      });
    },

    /**
     * Upload multiple files in parallel with smart chunking.
     * Automatically manages concurrency to optimize upload speed.
     * 
     * @param patientId - The patient ID to associate the files with
     * @param files - Array of files to upload
     * @param onFileProgress - Callback for individual file progress
     * @param onFileComplete - Callback when a file upload completes
     * @param maxConcurrent - Maximum number of concurrent uploads (default: 3)
     * @returns Promise that resolves with array of PatientFile when all uploads complete
     */
    uploadMultipleWithTus: async (
      patientId: string,
      files: File[],
      onFileProgress?: (index: number, fileName: string, bytesUploaded: number, bytesTotal: number) => void,
      onFileComplete?: (index: number, fileName: string, patientFile: any) => void,
      maxConcurrent: number = 3
    ): Promise<any[]> => {
      const results: any[] = [];
      const queue = [...files];
      let index = 0;

      const uploadNext = async (): Promise<void> => {
        if (queue.length === 0) return;

        const file = queue.shift()!;
        const currentIndex = index++;

        console.log(`[Batch Upload] Starting upload ${currentIndex + 1}/${files.length}: ${file.name}`);

        const patientFile = await api.files.uploadWithTus(
          patientId,
          file,
          (bytesUploaded, bytesTotal) => {
            if (onFileProgress) {
              onFileProgress(currentIndex, file.name, bytesUploaded, bytesTotal);
            }
          },
          undefined,
          { chunkSize: api.files.calculateOptimalChunkSize(file.size) }
        );

        results[currentIndex] = patientFile;

        if (onFileComplete) {
          onFileComplete(currentIndex, file.name, patientFile);
        }

        console.log(`[Batch Upload] Completed upload ${currentIndex + 1}/${files.length}: ${file.name}`);

        // Continue with next file in queue
        if (queue.length > 0) {
          await uploadNext();
        }
      };

      // Start concurrent uploads (up to maxConcurrent)
      const workers = Array.from({ length: Math.min(maxConcurrent, files.length) }, () => uploadNext());
      await Promise.all(workers);

      return results;
    },
    remove: async (path: string): Promise<void> => {
      const { error } = await supabase.storage
        .from(PATIENT_FILES_BUCKET)
        .remove([path]);

      if (error) throw new Error(error.message);
    }
  },

  expenses: {
    getAll: async (locationId?: string): Promise<Expense[]> => {
      try {
        let query = supabase
          .from('expenses')
          .select('*')
          .order('date', { ascending: false });
        
        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Error fetching expenses:", err);
        return [];
      }
    },
    create: async (data: Partial<Expense>): Promise<Expense> => {
      const { data: result, error } = await supabase
        .from('expenses')
        .insert(data)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    update: async (id: string, data: Partial<Expense>): Promise<Expense> => {
      const { data: result, error } = await supabase
        .from('expenses')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  blogs: {
    uploadImage: async (file: File, locationId: string): Promise<string> => {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `${locationId}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from('blog_images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('blog_images').getPublicUrl(path);
      return data.publicUrl;
    },
    getAll: async (locationId?: string): Promise<BlogPost[]> => {
      try {
        let query = supabase
          .from('blog_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Error fetching blog posts:', err);
        return [];
      }
    },
    getPublished: async (locationId?: string): Promise<BlogPost[]> => {
      try {
        let query = supabase
          .from('blog_posts')
          .select('*')
          .eq('published', true)
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false });

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Error fetching published blog posts:', err);
        return [];
      }
    },
    create: async (data: Partial<BlogPost>): Promise<BlogPost> => {
      const payload = {
        ...data,
        updated_at: new Date().toISOString()
      };
      const { data: result, error } = await supabase
        .from('blog_posts')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    update: async (id: string, data: Partial<BlogPost>): Promise<BlogPost> => {
      const payload = {
        ...data,
        updated_at: new Date().toISOString()
      };
      const { data: result, error } = await supabase
        .from('blog_posts')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  users: {
    getAll: async (): Promise<User[]> => {
      try {
        const supportsAllowedTabs = await detectUsersAllowedTabsSupport();
        const { data, error } = await supabase
          .from('users')
          .select(supportsAllowedTabs
            ? 'id, location_id, username, role, allowed_tabs, created_at, updated_at'
            : 'id, location_id, username, role, created_at, updated_at')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return (data || []).map((u: any) => ({
          id: u.id,
          location_id: u.location_id,
          username: u.username,
          role: u.role,
          allowed_tabs: resolveAllowedTabs(u.role, supportsAllowedTabs ? u.allowed_tabs : undefined),
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
        const supportsAllowedTabs = await detectUsersAllowedTabsSupport();

        const { data, error } = await supabase
          .from('users')
          .select(supportsAllowedTabs
            ? 'id, location_id, username, password, role, allowed_tabs'
            : 'id, location_id, username, password, role')
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
            role: user.role,
            allowed_tabs: resolveAllowedTabs(user.role, supportsAllowedTabs ? user.allowed_tabs : undefined)
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
      const supportsAllowedTabs = await detectUsersAllowedTabsSupport();
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
        location_id: data.location_id || null,
        username: trimmedUsername,
        password: data.password, // In production, hash this
        role: data.role || 'normal'
      };

      if (supportsAllowedTabs) {
        (payload as any).allowed_tabs = data.role === 'admin'
          ? FULL_ACCESS_TAB_PERMISSIONS
          : resolveAllowedTabs(data.role || 'normal', data.allowed_tabs);
      }

      const { data: result, error } = await supabase
        .from('users')
        .insert(payload)
        .select(supportsAllowedTabs
          ? 'id, location_id, username, role, allowed_tabs, created_at, updated_at'
          : 'id, location_id, username, role, created_at, updated_at')
        .single();

      if (error) throw new Error(error.message);
      return {
        id: result.id,
        location_id: result.location_id,
        username: result.username,
        role: result.role,
        allowed_tabs: resolveAllowedTabs(result.role, supportsAllowedTabs ? result.allowed_tabs : undefined),
        created_at: result.created_at,
        updated_at: result.updated_at
      };
    },
    update: async (id: string, data: Partial<User>): Promise<User> => {
      const supportsAllowedTabs = await detectUsersAllowedTabsSupport();
      const payload: any = {};
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select(supportsAllowedTabs ? 'role, allowed_tabs' : 'role')
        .eq('id', id)
        .single();

      if (currentUserError) {
        throw new Error(currentUserError.message);
      }

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

      if (data.location_id !== undefined) {
        payload.location_id = data.location_id || null;
      }

      if (supportsAllowedTabs && (data.allowed_tabs !== undefined || data.role !== undefined)) {
        const nextRole = (data.role || currentUser.role) as User['role'];
        const nextAllowedTabs = nextRole === 'admin'
          ? FULL_ACCESS_TAB_PERMISSIONS
          : resolveAllowedTabs(nextRole, data.allowed_tabs ?? currentUser.allowed_tabs);
        payload.allowed_tabs = nextAllowedTabs;
      }

      payload.updated_at = new Date().toISOString();

      const { data: result, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', id)
        .select(supportsAllowedTabs
          ? 'id, location_id, username, role, allowed_tabs, created_at, updated_at'
          : 'id, location_id, username, role, created_at, updated_at')
        .single();

      if (error) throw new Error(error.message);
      return {
        id: result.id,
        location_id: result.location_id,
        username: result.username,
        role: result.role,
        allowed_tabs: resolveAllowedTabs(result.role, supportsAllowedTabs ? result.allowed_tabs : undefined),
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
      if (!locationId) throw new Error('locationId is required for medicine sales');
      if (quantity <= 0) throw new Error('Quantity must be greater than 0');

      // 1. Get medicine and patient state (Planning/State Fetching)
      const { data: medicine, error: mError } = await supabase
        .from('medicines')
        .select('*')
        .eq('id', medicineId)
        .eq('location_id', locationId)
        .single();

      if (mError || !medicine) throw new Error('Medicine not found in this location');
      if (medicine.stock < quantity) {
        throw new Error(`Insufficient stock. Available: ${medicine.stock} ${medicine.unit}`);
      }

      const { data: patient, error: pError } = await supabase
        .from('patients')
        .select('id, name, balance, loyalty_points')
        .eq('id', patientId)
        .eq('location_id', locationId)
        .single();

      if (pError || !patient) throw new Error('Patient not found in this location');

      const totalPrice = Number(medicine.price) * quantity;
      const newStock = medicine.stock - quantity;

      // 2. Create sale record
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

      if (saleError) throw new Error(`Sale failed: ${saleError.message}`);

      // 3. Update stock (decrement)
      const { error: stockError } = await supabase
        .from('medicines')
        .update({ stock: newStock })
        .eq('id', medicineId)
        .gte('stock', quantity); // Atomicity check: ensure stock hasn't changed

      if (stockError) throw new Error(`Stock update failed: ${stockError.message}`);

      // 4. Update patient balance and points
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
      
      const { error: pUpdateError } = await supabase
        .from('patients')
        .update({ balance: newBalance, loyalty_points: newPoints })
        .eq('id', patientId);

      if (pUpdateError) throw new Error(`Patient update failed: ${pUpdateError.message}`);
          
      if (earnedPoints > 0) {
        await api.loyalty.addTransaction({
          patient_id: patientId,
          location_id: locationId,
          points: earnedPoints,
          type: 'EARNED',
          description: `Earned from medicine purchase: ${medicine.name} (Qty: ${quantity})`
        });
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
    },
    getTopSelling: async (locationId?: string, limit: number = 10): Promise<{ medicine_id: string; medicine_name: string; total_quantity: number; total_revenue: number }[]> => {
      try {
        let query = supabase
          .from('medicine_sales')
          .select('medicine_id, medicines(name), quantity, total_price');

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Aggregate sales by medicine
        const salesMap = new Map<string, { medicine_id: string; medicine_name: string; total_quantity: number; total_revenue: number }>();

        (data || []).forEach((sale: any) => {
          const medId = sale.medicine_id;
          const medName = sale.medicines?.name || 'Unknown';
          
          if (!salesMap.has(medId)) {
            salesMap.set(medId, {
              medicine_id: medId,
              medicine_name: medName,
              total_quantity: 0,
              total_revenue: 0
            });
          }
          
          const entry = salesMap.get(medId)!;
          entry.total_quantity += sale.quantity || 0;
          entry.total_revenue += sale.total_price || 0;
        });

        // Convert to array, sort by quantity sold, and limit
        return Array.from(salesMap.values())
          .sort((a, b) => b.total_quantity - a.total_quantity)
          .slice(0, limit);
      } catch (err) {
        console.warn("Error fetching top selling medicines:", err);
        return [];
      }
    }
  },

  // Doctor Schedules API
  doctorSchedules: {
    getByDoctorId: async (doctorId: string): Promise<DoctorSchedule[]> => {
      try {
        const { data, error } = await supabase
          .from('doctor_schedules')
          .select('*')
          .eq('doctor_id', doctorId)
          .order('day_of_week');
        
        if (error) throw error;
        return (data || []).map((sched: any) => ({
          id: sched.id,
          doctor_id: sched.doctor_id,
          day_of_week: sched.day_of_week,
          start_time: sched.start_time,
          end_time: sched.end_time
        }));
      } catch (err) {
        console.warn("Error fetching doctor schedules:", err);
        return [];
      }
    },
    create: async (data: Partial<DoctorSchedule>): Promise<DoctorSchedule> => {
      const { data: result, error } = await supabase
        .from('doctor_schedules')
        .insert(data)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return {
        id: result.id,
        doctor_id: result.doctor_id,
        day_of_week: result.day_of_week,
        start_time: result.start_time,
        end_time: result.end_time
      };
    },
    update: async (id: string, data: Partial<DoctorSchedule>): Promise<DoctorSchedule> => {
      const { data: result, error } = await supabase
        .from('doctor_schedules')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return {
        id: result.id,
        doctor_id: result.doctor_id,
        day_of_week: result.day_of_week,
        start_time: result.start_time,
        end_time: result.end_time
      };
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('doctor_schedules')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
    }
  },

  // Treatment Types API
  treatmentTypes: {
    getAll: async (locationId?: string): Promise<TreatmentType[]> => {
      try {
        let query = supabase
          .from('treatment_types')
          .select('*')
          .order('name');
        
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
    create: async (data: Partial<TreatmentType>): Promise<TreatmentType> => {
      const { data: result, error } = await supabase
        .from('treatment_types')
        .insert(data)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return result;
    },
    update: async (id: string, data: Partial<TreatmentType>): Promise<TreatmentType> => {
      const { data: result, error } = await supabase
        .from('treatment_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return result;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('treatment_types')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
    }
  },

  // Loyalty API
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

      const redeemDescription = amount > 0
        ? `Redeemed ${points} points for discount of ${amount}`
        : `Redeemed ${points} points`;

      await api.loyalty.addTransaction({
        patient_id: patientId,
        location_id: locationId,
        points: -points,
        type: 'REDEEMED',
        description: redeemDescription
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
    },
    deleteRule: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('loyalty_rules')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    resetAllPoints: async (): Promise<void> => {
      // 1. Reset points on all patients
      // We add a dummy filter to satisfy the "WHERE clause" requirement for bulk updates
      const { error: patientError } = await supabase
        .from('patients')
        .update({ loyalty_points: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (patientError) throw new Error(patientError.message);

      // 2. Clear transaction history
      const { error: txError } = await supabase
        .from('loyalty_transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (txError) throw new Error(txError.message);
    }
  },
  
  // Planning & Audit Utilities
  planning: {
    getPatientState: async (patientId: string, locationId: string) => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, balance, loyalty_points, medical_history')
        .eq('id', patientId)
        .eq('location_id', locationId)
        .single();
      if (error) throw new Error(`Planning error: ${error.message}`);
      return data;
    },
    getMedicineState: async (medicineId: string, locationId: string) => {
      const { data, error } = await supabase
        .from('medicines')
        .select('id, name, stock, price, min_stock')
        .eq('id', medicineId)
        .eq('location_id', locationId)
        .single();
      if (error) throw new Error(`Planning error: ${error.message}`);
      return data;
    },
    getDoctorAvailability: async (doctorId: string, date: string) => {
      const dayOfWeek = new Date(date).getDay();
      const { data: schedules, error: sError } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek);
      
      if (sError) throw new Error(`Planning error: ${sError.message}`);
      
      const { data: appointments, error: aError } = await supabase
        .from('appointments')
        .select('time')
        .eq('doctor_id', doctorId)
        .eq('date', date)
        .eq('status', 'Scheduled');
      
      if (aError) throw new Error(`Planning error: ${aError.message}`);
      
      return { schedules, appointments };
    }
  },

  recalls: {
    getAll: async (locationId?: string, patientId?: string): Promise<Recall[]> => {
      try {
        let query = supabase
          .from('recalls')
          .select('*, patients(name)')
          .order('due_date', { ascending: true });

        if (locationId) query = query.eq('location_id', locationId);
        if (patientId) query = query.eq('patient_id', patientId);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((r: any) => ({
          ...r,
          patient_name: r.patients?.name || 'Unknown'
        }));
      } catch (err) {
        console.warn('Error fetching recalls:', err);
        return [];
      }
    },

    create: async (data: Partial<Recall>): Promise<Recall> => {
      const payload = {
        location_id: data.location_id,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id || null,
        title: data.title,
        due_date: data.due_date,
        reminder_days_before: data.reminder_days_before ?? 7,
        status: data.status || 'PENDING',
        notes: data.notes || null
      };

      const { data: result, error } = await supabase
        .from('recalls')
        .insert(payload)
        .select('*, patients(name)')
        .single();

      if (error) throw new Error(error.message);
      return {
        ...result,
        patient_name: result.patients?.name || 'Unknown'
      };
    },

    updateStatus: async (id: string, status: Recall['status']): Promise<void> => {
      const { error } = await supabase
        .from('recalls')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('recalls')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    deleteAll: async (locationId?: string): Promise<void> => {
      let query = supabase
        .from('recalls')
        .delete();

      if (locationId) {
        query = query.eq('location_id', locationId);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await query;
      if (error) throw new Error(error.message);
    },

    markReminded: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('recalls')
        .update({ last_reminded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    updateOverdueStatus: async (locationId?: string): Promise<void> => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('recalls')
        .update({ status: 'OVERDUE', updated_at: new Date().toISOString() })
        .lt('due_date', today)
        .in('status', ['PENDING', 'SCHEDULED']);

      if (locationId) query = query.eq('location_id', locationId);

      const { error } = await query;
      if (error) throw new Error(error.message);
    }
  },

  messages: {
    mapConversationRow: (conv: any, unreadCount = 0): Conversation => ({
      id: conv.id,
      patient_id: conv.patient_id,
      patient_name: conv.patients?.name || (Array.isArray(conv.patients) ? conv.patients[0]?.name : 'Unknown Patient'),
      admin_id: conv.admin_id,
      admin_name: conv.users?.username || (Array.isArray(conv.users) ? conv.users[0]?.username : 'Unknown Admin'),
      last_message: conv.last_message,
      last_message_time: conv.last_message_time,
      unread_count: unreadCount,
      created_at: conv.created_at
    }),

    // Get conversations for a user
    getConversations: async (userId: string, userType: 'patient' | 'admin'): Promise<Conversation[]> => {
      // Perform automatic cleanup before fetching conversations
      await api.messages.performAutomaticCleanup();
      
      // Validate userId is a proper UUID (not 'undefined' or 'admin-default')
      if (!userId || userId === 'undefined' || userId === 'admin-default') {
        console.warn('Invalid user ID for conversations:', userId);
        return [];
      }
      
      let query = supabase
        .from('conversations')
        .select(`
          id,
          patient_id,
          patients!inner(name),
          admin_id,
          users!inner(username),
          last_message,
          last_message_time,
          created_at
        `)
        .order('last_message_time', { ascending: false });

      if (userType === 'patient') {
        query = query.eq('patient_id', userId);
      } else {
        query = query.eq('admin_id', userId);
      }

      const { data: conversations, error } = await query;
      
      if (error) throw new Error(error.message);

      if (!conversations || conversations.length === 0) {
        return [];
      }
      
      // Get unread message counts for each conversation
      const conversationIds = conversations.map((conv: any) => conv.id);
      let unreadQuery = supabase
        .from('messages')
        .select('conversation_id, recipient_id, recipient_type, read')
        .in('conversation_id', conversationIds)
        .eq('recipient_id', userId)
        .eq('recipient_type', userType)
        .eq('read', false);

      const { data: unreadMessages, error: unreadError } = await unreadQuery;
      
      if (unreadError) {
        console.warn('Error fetching unread message counts:', unreadError.message);
        // Return conversations with 0 unread count if unread query fails
        return conversations.map((conv: any) => api.messages.mapConversationRow(conv, 0));
      }
      
      // Create a map of conversation_id to unread count
      const unreadCountMap = unreadMessages.reduce((acc: Record<string, number>, msg: any) => {
        acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return conversations.map((conv: any) => api.messages.mapConversationRow(conv, unreadCountMap[conv.id] || 0));
    },
    
    // Get messages for a conversation
    getMessages: async (conversationId: string): Promise<Message[]> => {
      // Perform automatic cleanup before fetching messages
      await api.messages.performAutomaticCleanup();
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    
    // Create new message
    createMessage: async (message: Omit<Message, 'id' | 'timestamp' | 'read'>): Promise<Message> => {
      // Validate required UUID fields
      if (!message.conversation_id || message.conversation_id === 'undefined' ||
          !message.sender_id || message.sender_id === 'undefined' || message.sender_id === 'admin-default' ||
          !message.recipient_id || message.recipient_id === 'undefined' || message.recipient_id === 'admin-default') {
        throw new Error('Invalid UUID fields in message data');
      }
      
      const newMessage = {
        ...message,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();
      
      if (messageError) throw new Error(messageError.message);
      
      return messageData;
    },

    sendAdminReplyNotification: async (params: {
      message: Message;
      patientName?: string;
      adminName?: string;
    }): Promise<void> => {
      const { message, patientName, adminName } = params;

      if (message.sender_type !== 'admin' || message.recipient_type !== 'patient') {
        return;
      }

      const emailSettings = loadEmailSettings();
      if (!emailSettings.enabled || !emailSettings.messageNotificationsEnabled) {
        return;
      }

      if (!emailSettings.senderEmail || !isValidEmailAddress(emailSettings.senderEmail)) {
        console.warn('Skipping patient reply notification because the sender email is not configured.');
        return;
      }

      const { data: patientRecord, error: patientError } = await supabase
        .from('patients')
        .select('name, email, location_id')
        .eq('id', message.recipient_id)
        .maybeSingle();

      if (patientError) {
        throw new Error(patientError.message);
      }

      const patientEmail = patientRecord?.email?.trim();
      if (!isValidEmailAddress(patientEmail)) {
        return;
      }

      let clinicName = 'DentalCloud';
      if (patientRecord?.location_id) {
        const { data: locationRecord, error: locationError } = await supabase
          .from('locations')
          .select('name')
          .eq('id', patientRecord.location_id)
          .maybeSingle();

        if (locationError) {
          console.warn('Unable to load clinic name for patient notification:', locationError.message);
        } else if (locationRecord?.name?.trim()) {
          clinicName = locationRecord.name.trim();
        }
      }

      const resolvedPatientName = patientName || patientRecord?.name?.trim() || 'there';
      const resolvedAdminName = adminName?.trim() || 'our clinic team';
      const preview = truncateMessagePreview(message.content);
      const safePreview = escapeHtml(preview);
      const safePatientName = escapeHtml(resolvedPatientName);
      const safeAdminName = escapeHtml(resolvedAdminName);
      const safeClinicName = escapeHtml(clinicName);

      await api.email.sendManagerEmail({
        to: patientEmail!,
        fromName: emailSettings.senderName || clinicName,
        fromEmail: emailSettings.senderEmail,
        subject: `New message from ${clinicName}`,
        body: `Hi ${resolvedPatientName},\n\n${resolvedAdminName} sent you a new message in ${clinicName}.\n\n"${preview}"\n\nOpen the patient portal to read and reply.`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
              <div style="padding: 24px; border-bottom: 1px solid #e2e8f0; background: #eef2ff;">
                <div style="font-size: 20px; font-weight: 700;">New Message Reply</div>
                <div style="margin-top: 6px; font-size: 13px; color: #475569;">${safeClinicName}</div>
              </div>
              <div style="padding: 24px;">
                <p style="margin: 0 0 16px;">Hi ${safePatientName},</p>
                <p style="margin: 0 0 16px;">${safeAdminName} sent you a new message in your patient chat.</p>
                <div style="margin: 0 0 20px; padding: 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
                  ${safePreview}
                </div>
                <p style="margin: 0; font-size: 13px; color: #475569;">Open the patient portal to read the full message and reply.</p>
              </div>
            </div>
          </div>
        `
      });
    },
    
    // Create new conversation
    createConversation: async (patientId: string, adminId: string): Promise<Conversation> => {
      // Perform automatic cleanup before creating new conversation
      await api.messages.performAutomaticCleanup();
      
      // Validate UUIDs
      if (!patientId || patientId === 'undefined' || !adminId || adminId === 'undefined' || adminId === 'admin-default') {
        throw new Error('Invalid patient or admin ID for conversation creation');
      }

      const selectClause = `
        id,
        patient_id,
        patients!inner(name),
        admin_id,
        users!inner(username),
        last_message,
        last_message_time,
        created_at
      `;

      const { data: existingConversation, error: existingError } = await supabase
        .from('conversations')
        .select(selectClause)
        .eq('patient_id', patientId)
        .eq('admin_id', adminId)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      if (existingConversation) {
        return api.messages.mapConversationRow(existingConversation, 0);
      }

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          patient_id: patientId,
          admin_id: adminId,
          last_message: null,
          last_message_time: null
        })
        .select(selectClause)
        .single();
      
      if (error) throw new Error(error.message);

      return api.messages.mapConversationRow(conversation, 0);
    },
    
    // Mark messages as read
    markAsRead: async (conversationId: string, userId: string, userType: 'patient' | 'admin'): Promise<void> => {
      let updateQuery = supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('read', false);
      
      if (userType === 'patient') {
        updateQuery = updateQuery.eq('recipient_id', userId).eq('recipient_type', 'patient');
      } else {
        updateQuery = updateQuery.eq('recipient_id', userId).eq('recipient_type', 'admin');
      }
      
      const { error } = await updateQuery;
      if (error) throw new Error(error.message);
    },
    
    // Toggle messaging feature state
    toggleMessagingFeature: (enabled: boolean): void => {
      // This is primarily handled in App.tsx state, but we provide this hook for API-level side effects if needed
      console.log(`Messaging feature ${enabled ? 'enabled' : 'disabled'}`);
    },
    
    // Remove all messages and conversations (for maintenance)
    removeAllMessages: async (): Promise<void> => {
      // Delete all messages
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all using always-true condition
      
      if (msgError) throw new Error(msgError.message);
      
      // Delete all conversations
      const { error: convError } = await supabase
        .from('conversations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (convError) throw new Error(convError.message);
    },
    
    // Automatic cleanup function - removes messages older than 2 months
    performAutomaticCleanup: async (): Promise<void> => {
      try {
        // Check if cleanup was performed recently (within last 24 hours)
        const lastCleanup = localStorage.getItem('messaging_last_cleanup');
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (lastCleanup && (now - parseInt(lastCleanup)) < oneDay) {
          return; // Skip cleanup if performed recently
        }
        
        // Delete messages older than 2 months
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        
        const { error: messageError } = await supabase
          .from('messages')
          .delete()
          .lt('timestamp', twoMonthsAgo.toISOString());
        
        if (messageError) {
          console.warn('Message cleanup error:', messageError.message);
          // Continue with conversation cleanup even if message cleanup has issues
        }
        
        // Clean up conversations that have no messages and are older than 2 months
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id, created_at')
          .lt('created_at', twoMonthsAgo.toISOString());
        
        if (conversations && conversations.length > 0) {
          // Check which conversations have no messages
          const conversationIds = conversations.map(conv => conv.id);
          const { data: messages } = await supabase
            .from('messages')
            .select('conversation_id')
            .in('conversation_id', conversationIds);
          
          const messageConversationIds = new Set(messages?.map(msg => msg.conversation_id) || []);
          const emptyConversations = conversations
            .filter(conv => !messageConversationIds.has(conv.id))
            .map(conv => conv.id);
          
          if (emptyConversations.length > 0) {
            const { error: convError } = await supabase
              .from('conversations')
              .delete()
              .in('id', emptyConversations);
            
            if (convError) {
              console.warn('Conversation cleanup error:', convError.message);
            }
          }
        }
        
        // Update last cleanup timestamp
        localStorage.setItem('messaging_last_cleanup', now.toString());
        
      } catch (error) {
        console.warn('Automatic cleanup failed:', error);
        // Don't throw error to prevent blocking normal operations
      }
    }
  },

  email: {
    sendManagerEmail: async (payload: { 
      to: string; 
      subject?: string; 
      body?: string; 
      html?: string;
      fromName?: string; 
      fromEmail?: string;
      replyTo?: string;
    }): Promise<{ id: string; messageId: string }> => {
      const { data, error } = await supabase.functions.invoke('send-manager-email', {
        body: payload
      });
      if (error) {
        console.error('Supabase email function error:', error);
        throw new Error(error.message || 'Failed to send email');
      }
      if (data?.error) {
        console.error('Supabase email function response error:', data.error);
        throw new Error(data.error);
      }
      const deliveryId = data?.id || data?.messageId;
      if (!deliveryId) {
        throw new Error('Email provider did not confirm delivery acceptance.');
      }
      return {
        id: deliveryId,
        messageId: deliveryId
      };
    }
  },
  scheduledTasks: {
    getAll: async (locationId?: string, adminId?: string): Promise<ScheduledTask[]> => {
      try {
        let query = supabase
          .from('scheduled_tasks')
          .select('*')
          .order('run_at', { ascending: true });

        if (locationId) {
          query = query.eq('location_id', locationId);
        }
        if (adminId) {
          query = query.eq('admin_id', adminId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Error fetching scheduled tasks:', err);
        return [];
      }
    },
    getDue: async (beforeIso: string, locationId?: string): Promise<ScheduledTask[]> => {
      try {
        let query = supabase
          .from('scheduled_tasks')
          .select('*')
          .eq('status', 'PENDING')
          .lte('run_at', beforeIso)
          .order('run_at', { ascending: true });

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Error fetching due scheduled tasks:', err);
        return [];
      }
    },
    create: async (data: Partial<ScheduledTask>): Promise<ScheduledTask> => {
      const payload = {
        location_id: data.location_id,
        admin_id: data.admin_id || null,
        task_type: data.task_type,
        status: data.status || 'PENDING',
        run_at: data.run_at,
        payload: data.payload || {},
        last_error: data.last_error || null,
        sent_at: data.sent_at || null
      };

      const { data: result, error } = await supabase
        .from('scheduled_tasks')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result;
    },
    update: async (id: string, data: Partial<ScheduledTask>): Promise<ScheduledTask> => {
      const { data: result, error } = await supabase
        .from('scheduled_tasks')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result;
    },
    markProcessing: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'PENDING');

      if (error) throw new Error(error.message);
    },
    markCompleted: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({
          status: 'COMPLETED',
          sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    markFailed: async (id: string, message: string): Promise<void> => {
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({
          status: 'FAILED',
          last_error: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    cancel: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    }
  },
  assistantMemory: {
    get: async (adminId: string, locationId?: string) => {
      if (!adminId) throw new Error('Admin ID is required.');
      const query = supabase
        .from('assistant_memory')
        .select('profile')
        .eq('admin_id', adminId)
        .limit(1)
        .maybeSingle();

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data?.profile || null;
    },
    upsert: async (adminId: string, locationId: string, profile: any) => {
      if (!adminId) throw new Error('Admin ID is required.');
      const payload = {
        admin_id: adminId,
        location_id: locationId,
        profile,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('assistant_memory')
        .upsert(payload, { onConflict: 'admin_id' });
      if (error) throw new Error(error.message);
    }
  }
};
