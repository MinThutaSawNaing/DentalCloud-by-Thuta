import React, { useState, useEffect } from 'react';
import { Home, Calendar, FileText, User, LogOut, Settings, Plus, Trash2, Download, Eye, EyeOff, MessageCircle, X, Info, BookOpen } from 'lucide-react';
import { auth } from '../services/auth';
import { api } from '../services/api';
import { otpService } from '../services/otp';
import { Patient, Appointment, ClinicalRecord, Doctor, BlogPost } from '../types';
import { Modal, Input } from './Shared';
import Receipt from './Receipt';
import PatientMessagingView from './PatientMessagingView';

interface PatientDashboardProps {
  onLogout: () => void;
  messagingEnabled?: boolean;
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ onLogout, messagingEnabled = true }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'appointments' | 'records' | 'blog' | 'profile' | 'messages'>('home');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatmentRecords, setTreatmentRecords] = useState<ClinicalRecord[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for appointment management
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    date: '',
    time: '',
    type: 'Checkup',
    status: 'Scheduled',
    notes: ''
  });
  
  // State for doctor selection and available times
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingAvailableTimes, setLoadingAvailableTimes] = useState(false);
  
  // State for profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileChanges, setProfileChanges] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  // State for treatment details modal
  const [showTreatmentDetails, setShowTreatmentDetails] = useState(false);
  const [selectedTreatmentDetails, setSelectedTreatmentDetails] = useState<ClinicalRecord | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  
  // State for password change
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // State for receipts
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<ClinicalRecord | null>(null);
  
  // State for showing/hiding passwords
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // State for cancellation
  const [cancellingAppointment, setCancellingAppointment] = useState<string | null>(null);
  
  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const patientId = auth.getCurrentPatientId();
      if (!patientId) {
        throw new Error('No patient session found');
      }

      const sessionLocationId = auth.getCurrentUser()?.location_id || undefined;
      
      // Fetch patient profile
      const allPatients = await api.patients.getAll(sessionLocationId);
      const patientData = allPatients.find(p => p.id === patientId);
      if (!patientData) {
        throw new Error('Patient data not found');
      }
      setPatient(patientData);
      
      // Initialize profile changes with current values
      setProfileChanges({
        name: patientData.name,
        email: patientData.email,
        phone: patientData.phone || ''
      });
      
      // Fetch appointments
      const allAppointments = await api.appointments.getAll(patientData.location_id);
      const patientAppointments = allAppointments.filter(apt => apt.patient_id === patientId);
      setAppointments(patientAppointments);
      
      // Fetch treatment records
      const records = await api.treatments.getHistory(patientId);
      setTreatmentRecords(records);
      
      // Fetch doctors
      const allDoctors = await api.doctors.getAll(patientData.location_id);
      setDoctors(allDoctors);

      // Fetch published blog posts
      const blogs = await api.blogs.getPublished(patientData.location_id);
      setBlogPosts(blogs);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    onLogout();
  };
  
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    
    try {
      await api.appointments.create({
        patient_id: patient.id,
        doctor_id: selectedDoctor || undefined,
        date: newAppointment.date,
        time: newAppointment.time,
        type: newAppointment.type,
        status: newAppointment.status as 'Scheduled' | 'Completed' | 'Cancelled',
        notes: newAppointment.notes,
        location_id: patient.location_id
      });
      
      setShowCreateAppointment(false);
      setNewAppointment({
        date: '',
        time: '',
        type: 'Checkup',
        status: 'Scheduled',
        notes: ''
      });
      setSelectedDoctor('');
      setAvailableTimes([]);
      
      // Refresh appointments
      fetchPatientData();
    } catch (err: any) {
      setError(err.message || 'Failed to create appointment');
    }
  };
  
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await api.appointments.delete(appointmentId);
      
      // Refresh appointments
      fetchPatientData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment');
    }
  };
  
  const handleUpdateProfile = async () => {
    if (!patient) return;
    
    try {
      const updatedPatient = await api.patients.update(patient.id, {
        name: profileChanges.name,
        email: profileChanges.email,
        phone: profileChanges.phone
      });
      
      setPatient(updatedPatient);
      setEditingProfile(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  };
  
  const handleChangePassword = async () => {
    if (!patient) return;
    
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordChange.newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    
    try {
      // First authenticate with current password
      const authenticated = await api.patients.authenticate(
        patient.email || patient.phone || patient.name, 
        passwordChange.currentPassword
      );
      
      if (!authenticated) {
        setError('Current password is incorrect');
        return;
      }

      const nextPassword = passwordChange.newPassword.trim();
      const supabaseUser = await otpService.getCurrentUser();
      const canSyncSupabase =
        !!supabaseUser &&
        !!supabaseUser.email &&
        !!patient.email &&
        supabaseUser.email.toLowerCase() === patient.email.toLowerCase();

      if (canSyncSupabase) {
        const updateResult = await otpService.updatePassword(nextPassword);
        if (!updateResult.success) {
          throw new Error(updateResult.message || 'Failed to update Supabase password');
        }

        await api.patients.updatePasswordByEmail(
          supabaseUser.email!,
          nextPassword,
          supabaseUser.id
        );
      } else {
        // Legacy-only patient accounts still rely on the local patient_auth password.
        await api.patients.updateAccount(
          patient.id,
          patient.email || null,
          nextPassword,
          patient.phone || null
        );
      }
      
      // Reset password change form
      setChangingPassword(false);
      setPasswordChange({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  };
  
  const handleDownloadReceipt = (treatment: ClinicalRecord) => {
    setSelectedTreatmentDetails(treatment);
    setShowTreatmentDetails(true);
  };

  const formatBlogDate = (value?: string) => {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getBlogExcerpt = (value: string, limit = 140) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit).trimEnd()}...`;
  };

  const openBlogPost = (post: BlogPost) => {
    setSelectedBlog(post);
    setShowBlogModal(true);
  };

  const closeBlogPost = () => {
    setShowBlogModal(false);
    setSelectedBlog(null);
  };
  
  const handleDoctorChange = async (doctorId: string) => {
    setSelectedDoctor(doctorId);
    setNewAppointment({...newAppointment, time: ''});
    setAvailableTimes([]);
    
    if (doctorId && newAppointment.date) {
      await fetchAvailableTimes(doctorId, newAppointment.date);
    }
  };
  
  const handleDateChange = async (date: string) => {
    setNewAppointment({...newAppointment, date, time: ''});
    setAvailableTimes([]);
    
    if (date && selectedDoctor) {
      await fetchAvailableTimes(selectedDoctor, date);
    }
  };
  
  const fetchAvailableTimes = async (doctorId: string, date: string) => {
    if (!doctorId || !date) return;
    
    setLoadingAvailableTimes(true);
    try {
      const times = await api.doctors.getAvailableTimes(doctorId, date);
      setAvailableTimes(times);
    } catch (err: any) {
      console.error('Error fetching available times:', err);
      setAvailableTimes([]);
    } finally {
      setLoadingAvailableTimes(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPatientData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Patient data not available</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const nextScheduledAppointment = appointments
    .filter((apt) => apt.status === 'Scheduled')
    .filter((apt) => {
      const aptDate = new Date(`${apt.date}T00:00:00`);
      return aptDate >= todayDateOnly;
    })
    .sort((a, b) => {
      const aDate = new Date(`${a.date}T${a.time || '00:00'}:00`).getTime();
      const bDate = new Date(`${b.date}T${b.time || '00:00'}:00`).getTime();
      return aDate - bDate;
    })[0];

  const daysLeft = nextScheduledAppointment
    ? Math.ceil(
        (new Date(`${nextScheduledAppointment.date}T00:00:00`).getTime() - todayDateOnly.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Hello, {patient.name}</h1>
            <p className="text-sm text-gray-500">Patient Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('profile')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Profile"
            >
              <User className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 pt-4">
        {error && patient && (
          <div className="px-4 mb-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start justify-between gap-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 transition-colors"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="px-4 space-y-6">
            {/* Recall / Countdown Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 shadow-lg shadow-indigo-300/40">
              <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-white/10" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold tracking-wider uppercase text-indigo-100">Countdown</p>
                  <Calendar className="w-5 h-5 text-indigo-100" />
                </div>

                {nextScheduledAppointment && daysLeft !== null ? (
                  <>
                    <p className="text-white/90 text-sm">Next appointment in</p>
                    <div className="flex items-end gap-2 mt-1">
                      <span className="text-4xl font-black text-white leading-none">{daysLeft}</span>
                      <span className="text-lg font-bold text-indigo-100 pb-1">{daysLeft === 1 ? 'day left' : 'days left'}</span>
                    </div>
                    <p className="text-xs text-indigo-100 mt-3">
                      {nextScheduledAppointment.date} at {nextScheduledAppointment.time} • {nextScheduledAppointment.type}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white/90 text-sm">No upcoming appointment</p>
                    <p className="text-xl font-bold text-white mt-1">Book your next check-up</p>
                    <button
                      onClick={() => setShowCreateAppointment(true)}
                      className="mt-4 px-4 py-2 rounded-xl bg-white text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition-colors"
                    >
                      Schedule now
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Stats - Mobile optimized */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="text-xl font-bold text-indigo-600">{appointments.length}</div>
                <div className="text-xs text-gray-600 mt-1">Appointments</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="text-xl font-bold text-green-600">{treatmentRecords.length}</div>
                <div className="text-xs text-gray-600 mt-1">Treatments</div>
              </div>
            </div>

            {/* Upcoming Appointments - Mobile optimized */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-semibold text-gray-900 text-sm">Upcoming Appointments</h2>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="text-indigo-600 text-xs font-medium hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="p-4">
                {appointments.filter(apt => apt.status === 'Scheduled').length > 0 ? (
                  <div className="space-y-3">
                    {appointments
                      .filter(apt => apt.status === 'Scheduled')
                      .slice(0, 3)
                      .map(apt => (
                        <div key={apt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{apt.date}</p>
                            <p className="text-xs text-gray-600 truncate">{apt.time} • {apt.type}</p>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex-shrink-0">
                            {apt.status}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No upcoming appointments</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Treatments - Mobile optimized */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-semibold text-gray-900 text-sm">Recent Treatments</h2>
                <button
                  onClick={() => setActiveTab('records')}
                  className="text-indigo-600 text-xs font-medium hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="p-4">
                {treatmentRecords.length > 0 ? (
                  <div className="space-y-3">
                    {treatmentRecords
                      .slice(0, 3)
                      .map(record => (
                        <div key={record.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{record.description}</p>
                            <p className="text-xs text-gray-600 truncate">{record.date}</p>
                          </div>
                          <button
                            onClick={() => handleDownloadReceipt(record)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 flex-shrink-0"
                            title="View Details"
                          >
                            <span className="text-xs font-medium">Details</span>
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No treatment records yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-semibold text-gray-900 text-sm">My Appointments</h2>
                <button
                  onClick={() => setShowCreateAppointment(true)}
                  className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-xs"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>
              <div className="p-4">
                {appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.map(apt => (
                      <div key={apt.id} className="p-4 border border-gray-200 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900 text-sm">{apt.type}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            apt.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                            apt.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {apt.date} at {apt.time}
                        </p>
                        {apt.doctor_name && (
                          <p className="text-xs text-gray-600 mb-2">
                            <User className="w-3 h-3 inline mr-1" />
                            Dr. {apt.doctor_name}
                          </p>
                        )}
                        {apt.notes && (
                          <p className="text-xs text-gray-500 mt-2 truncate">{apt.notes}</p>
                        )}
                        {apt.status === 'Scheduled' && (
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this appointment?')) {
                                  handleCancelAppointment(apt.id);
                                }
                              }}
                              className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">No Appointments</h3>
                    <p className="text-gray-500 text-sm">You don't have any appointments scheduled.</p>
                    <button
                      onClick={() => setShowCreateAppointment(true)}
                      className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-xs"
                    >
                      Schedule Appointment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Treatment Records</h2>
              </div>
              <div className="p-4">
                {treatmentRecords.length > 0 ? (
                  <div className="space-y-4">
                    {treatmentRecords.map(record => (
                      <div key={record.id} className="p-4 border border-gray-200 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900 text-sm">{record.description}</h3>
                          <button
                            onClick={() => handleDownloadReceipt(record)}
                            className="p-2 text-indigo-600 hover:text-indigo-800"
                            title="View Details"
                          >
                            <span className="text-xs font-medium">Details</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          <FileText className="w-3 h-3 inline mr-1" />
                          Date: {record.date}
                        </p>
                        {record.teeth && record.teeth.length > 0 && (
                          <p className="text-xs text-gray-500 mb-2">
                            Teeth: {record.teeth.join(', ')}
                          </p>
                        )}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-base font-semibold text-green-600">
                            {record.cost.toLocaleString()} MMK
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">No Treatment Records</h3>
                    <p className="text-gray-500 text-sm">You don't have any treatment records yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'blog' && (
          <div className="px-4 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="font-semibold text-gray-900 text-sm">Clinic Blog</h2>
              <p className="text-xs text-gray-500 mt-1">Latest updates from your dental team.</p>
            </div>
            {blogPosts.length > 0 ? (
              <div className="space-y-4">
                {blogPosts.map(post => (
                  <button
                    key={post.id}
                    onClick={() => openBlogPost(post)}
                    className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full max-h-40 rounded-2xl object-cover border border-gray-100 mb-3"
                      />
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900">{post.title}</h3>
                      <span className="text-[10px] font-semibold text-gray-500">{formatBlogDate(post.published_at || post.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{post.author ? `By ${post.author}` : 'Clinic Team'}</p>
                    <p className="text-sm text-gray-600 mt-3">{getBlogExcerpt(post.content)}</p>
                    <span className="inline-flex items-center gap-1 text-indigo-600 text-xs font-semibold mt-3">
                      Read more
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">No blog posts yet</h3>
                <p className="text-gray-500 text-sm">Check back soon for clinic updates.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-semibold text-gray-900 text-sm">My Profile</h2>
                <button
                  onClick={() => setEditingProfile(true)}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors text-xs"
                >
                  Edit
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{patient.name}</h3>
                    <p className="text-xs text-gray-600">Patient ID: {patient.id.substring(0, 8)}...</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="font-medium text-gray-900 text-sm">{patient.email}</p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <p className="font-medium text-gray-900 text-sm">{patient.phone || 'Not provided'}</p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Debt</p>
                    <p className="font-medium text-gray-900 text-sm">{patient.balance.toLocaleString()} MMK</p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Loyalty Points</p>
                    <p className="font-medium text-gray-900 text-sm">{patient.loyalty_points} points</p>
                  </div>
                </div>
                
                {patient.medicalHistory && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Medical History</p>
                    <p className="text-gray-900 text-sm">{patient.medicalHistory}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setChangingPassword(true)}
                    className="w-full bg-gray-100 text-gray-800 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && messagingEnabled && (
          <div className="px-4">
            <PatientMessagingView currentUser={auth.getCurrentUser()} messagingEnabled={messagingEnabled} />
          </div>
        )}
      </div>

      {/* Mobile Optimized Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-2 px-2 rounded-xl transition-colors flex-1 max-w-[80px] ${
              activeTab === 'home' 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Home"
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px]">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex flex-col items-center py-2 px-2 rounded-xl transition-colors flex-1 max-w-[80px] ${
              activeTab === 'appointments' 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Appointments"
          >
            <Calendar className="w-6 h-6 mb-1" />
            <span className="text-[10px]">Appointments</span>
          </button>
          
          <button
            onClick={() => setActiveTab('records')}
            className={`flex flex-col items-center py-2 px-2 rounded-xl transition-colors flex-1 max-w-[80px] ${
              activeTab === 'records' 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Records"
          >
            <FileText className="w-6 h-6 mb-1" />
            <span className="text-[10px]">Records</span>
          </button>

          <button
            onClick={() => setActiveTab('blog')}
            className={`flex flex-col items-center py-2 px-2 rounded-xl transition-colors flex-1 max-w-[80px] ${
              activeTab === 'blog' 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Blog"
          >
            <BookOpen className="w-6 h-6 mb-1" />
            <span className="text-[10px]">Blog</span>
          </button>

          {messagingEnabled && (
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex flex-col items-center py-2 px-2 rounded-xl transition-colors flex-1 max-w-[80px] ${
                activeTab === 'messages' 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Messages"
            >
              <MessageCircle className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Messages</span>
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center py-2 px-2 rounded-xl transition-colors flex-1 max-w-[80px] ${
              activeTab === 'profile' 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Profile"
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </div>
      
      {/* Create Appointment Modal */}
      {showCreateAppointment && (
        <Modal title="Schedule New Appointment" onClose={() => setShowCreateAppointment(false)}>
          <form onSubmit={handleCreateAppointment} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Doctor (Optional)</label>
              <select 
                className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                value={selectedDoctor} 
                onChange={(e: any) => handleDoctorChange(e.target.value)}
              >
                <option value="">No specific doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.specialization ? ` - ${doctor.specialization}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Input 
                  label="Date" 
                  type="date" 
                  required 
                  value={newAppointment.date} 
                  onChange={(e: any) => handleDateChange(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Time</label>
                {availableTimes.length > 0 ? (
                  <select
                    className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                    value={newAppointment.time}
                    onChange={(e: any) => setNewAppointment({...newAppointment, time: e.target.value})}
                  >
                    <option value="">Select available time</option>
                    {availableTimes.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <Input 
                      type="time" 
                      required 
                      value={newAppointment.time} 
                      onChange={(e: any) => setNewAppointment({...newAppointment, time: e.target.value})} 
                    />
                    {selectedDoctor && newAppointment.date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {loadingAvailableTimes ? 'Loading available times...' : 'No schedule set for this day or all times booked'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Type</label>
                <select 
                  className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newAppointment.type} 
                  onChange={(e: any) => setNewAppointment({...newAppointment, type: e.target.value})}
                >
                  <option value="Checkup">Checkup</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Treatment">Treatment</option>
                  <option value="Follow-up">Follow-up</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Status</label>
                <select 
                  className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newAppointment.status} 
                  onChange={(e: any) => setNewAppointment({...newAppointment, status: e.target.value})}
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Notes</label>
              <textarea 
                className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                rows={3}
                value={newAppointment.notes || ''} 
                onChange={(e: any) => setNewAppointment({...newAppointment, notes: e.target.value})}
                placeholder="Optional notes about this appointment..."
              />
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateAppointment(false)}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
              >
                Schedule Appointment
              </button>
            </div>
          </form>
        </Modal>
      )}
      
      {/* Edit Profile Modal */}
      {editingProfile && (
        <Modal title="Edit Profile" onClose={() => setEditingProfile(false)}>
          <div className="space-y-4">
            <Input
              label="Name"
              value={profileChanges.name}
              onChange={(e) => setProfileChanges({...profileChanges, name: e.target.value})}
            />
            <Input
              label="Email"
              type="email"
              value={profileChanges.email}
              onChange={(e) => setProfileChanges({...profileChanges, email: e.target.value})}
            />
            <Input
              label="Phone"
              value={profileChanges.phone}
              onChange={(e) => setProfileChanges({...profileChanges, phone: e.target.value})}
            />
            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={() => setEditingProfile(false)}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfile}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Change Password Modal */}
      {changingPassword && (
        <Modal title="Change Password" onClose={() => setChangingPassword(false)}>
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Current Password</label>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordChange.currentPassword}
                onChange={(e) => setPasswordChange({...passwordChange, currentPassword: e.target.value})}
                className="w-full border-gray-200 border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300"
                placeholder="Enter current password"
              />
              <button
                type="button"
                className="absolute right-3 top-10 text-gray-500"
                onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="relative">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordChange.newPassword}
                onChange={(e) => setPasswordChange({...passwordChange, newPassword: e.target.value})}
                className="w-full border-gray-200 border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300"
                placeholder="Enter new password"
              />
              <button
                type="button"
                className="absolute right-3 top-10 text-gray-500"
                onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="relative">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordChange.confirmPassword}
                onChange={(e) => setPasswordChange({...passwordChange, confirmPassword: e.target.value})}
                className="w-full border-gray-200 border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                className="absolute right-3 top-10 text-gray-500"
                onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={() => setChangingPassword(false)}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Treatment Details Modal */}
      {showTreatmentDetails && selectedTreatmentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Treatment Details</h3>
                <button 
                  onClick={() => {
                    setShowTreatmentDetails(false);
                    setSelectedTreatmentDetails(null);
                  }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-700 mb-2">Treatment Description</h4>
                <p className="text-gray-900">{selectedTreatmentDetails.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Date</h4>
                  <p className="text-gray-900">{new Date(selectedTreatmentDetails.date).toLocaleDateString()}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Cost</h4>
                  <p className="text-gray-900 font-semibold">{selectedTreatmentDetails.cost.toLocaleString()} MMK</p>
                </div>
              </div>
              
              {/* Debt Information Section */}
              <div className="grid grid-cols-1 gap-4">
                <div className={`rounded-xl p-4 ${patient.balance > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <h4 className="font-medium text-gray-700 mb-2">Current Debt Status</h4>
                  <p className={`font-semibold ${patient.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {patient.balance.toLocaleString()} MMK
                    {patient.balance > 0 ? ' (Outstanding Balance)' : ' (No Outstanding Balance)'}
                  </p>
                  {patient.balance > 0 && (
                    <p className="text-xs text-red-500 mt-2">
                      This is your current outstanding balance across all treatments.
                    </p>
                  )}
                </div>
                
                <div className="rounded-xl p-4 bg-blue-50 border border-blue-200">
                  <h4 className="font-medium text-gray-700 mb-2">Treatment Cost</h4>
                  <p className="font-semibold text-blue-600">
                    {selectedTreatmentDetails.cost.toLocaleString()} MMK
                  </p>
                  <p className="text-xs text-blue-500 mt-2">
                    Cost of this specific treatment: {selectedTreatmentDetails.description}
                  </p>
                </div>
              </div>
              
              {selectedTreatmentDetails.teeth && selectedTreatmentDetails.teeth.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Teeth Treated</h4>
                  <p className="text-gray-900">{selectedTreatmentDetails.teeth.join(', ')}</p>
                </div>
              )}
              
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <h4 className="font-medium text-indigo-700 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Patient Information
                </h4>
                <p className="text-indigo-600 text-sm">
                  This treatment record is available for your reference. 
                  Contact the clinic if you have any questions about this procedure.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowTreatmentDetails(false);
                  setSelectedTreatmentDetails(null);
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showBlogModal && selectedBlog && (
        <Modal title={selectedBlog.title} onClose={closeBlogPost}>
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              {selectedBlog.author ? `By ${selectedBlog.author}` : 'Clinic Team'} • {formatBlogDate(selectedBlog.published_at || selectedBlog.created_at)}
            </p>
            {selectedBlog.image_url && (
              <img
                src={selectedBlog.image_url}
                alt={selectedBlog.title}
                className="w-full rounded-2xl border border-gray-100 object-cover max-h-64"
              />
            )}
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedBlog.content}</div>
          </div>
        </Modal>
      )}
      
      {/* Receipt Modal */}
      {showReceipt && selectedTreatment && (
        <Receipt 
          patient={patient}
          treatments={[selectedTreatment]}
          currency={'MMK'}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};

export default PatientDashboard;
