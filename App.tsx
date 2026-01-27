
import React, { useState, useEffect, Suspense } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Activity,
  Loader2,
  Stethoscope,
  ClipboardList,
  Calendar,
  UserCheck,
  Trash2,
  Settings,
  Shield,
  LogOut,
  Package,
  Sparkles,
  MapPin,
  Menu,
  X
} from 'lucide-react';

import { Modal, Input, NavItem } from './components/Shared';
import { 
  Patient, 
  Appointment, 
  TreatmentType, 
  ClinicalRecord,
  PatientFile,
  Doctor,
  DoctorSchedule,
  User, 
  Medicine, 
  Location,
  LoyaltyRule,
  LoyaltyTransaction
} from './types';
import { TREATMENT_CATEGORIES } from './constants';
import { api } from './services/api';
import { formatCurrency, getCurrencySymbol, Currency } from './utils/currency';
import { auth } from './services/auth';
import { supabase } from './services/supabase';

// Lazy Load Views
const DashboardView = React.lazy(() => import('./components/DashboardView'));
const PatientsView = React.lazy(() => import('./components/PatientsView'));
const AppointmentsView = React.lazy(() => import('./components/AppointmentsView'));
const DoctorsView = React.lazy(() => import('./components/DoctorsView'));
const ClinicalView = React.lazy(() => import('./components/ClinicalView'));
const TreatmentConfigView = React.lazy(() => import('./components/TreatmentConfigView'));
const RecordsView = React.lazy(() => import('./components/RecordsView'));
const SettingsView = React.lazy(() => import('./components/SettingsView'));
const Receipt = React.lazy(() => import('./components/Receipt'));
const TreatmentSelectionModal = React.lazy(() => import('./components/TreatmentSelectionModal'));
const LoginView = React.lazy(() => import('./components/LoginView'));
const UsersView = React.lazy(() => import('./components/UsersView'));
const InventoryView = React.lazy(() => import('./components/InventoryView'));
const MedicineSelectionModal = React.lazy(() => import('./components/MedicineSelectionModal'));
const AIAssistantView = React.lazy(() => import('./components/AIAssistantView'));

type ViewState = 'dashboard' | 'patients' | 'appointments' | 'doctors' | 'finance' | 'treatments' | 'records' | 'settings' | 'users' | 'inventory' | 'ai-assistant';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocationId, setCurrentLocationId] = useState<string>(() => {
    return localStorage.getItem('currentLocationId') || '';
  });
  
  // -- Data State --
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [treatmentHistory, setTreatmentHistory] = useState<ClinicalRecord[]>([]); 
  const [globalRecords, setGlobalRecords] = useState<ClinicalRecord[]>([]); 
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [patientFiles, setPatientFiles] = useState<PatientFile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loyaltyRules, setLoyaltyRules] = useState<LoyaltyRule[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // -- Selection State --
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [useFlatRate, setUseFlatRate] = useState(false);
  const [editingTreatmentType, setEditingTreatmentType] = useState<TreatmentType | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  
  // -- Modals State --
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showTreatmentTypeModal, setShowTreatmentTypeModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showTreatmentSelection, setShowTreatmentSelection] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [showMedicineSelectionModal, setShowMedicineSelectionModal] = useState(false);
  const [lastPaymentAmount, setLastPaymentAmount] = useState<number>(0);
  const [selectedTreatmentsForReceipt, setSelectedTreatmentsForReceipt] = useState<ClinicalRecord[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingAvailableTimes, setLoadingAvailableTimes] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'MMK'>(() => {
    const savedCurrency = localStorage.getItem('currency');
    return (savedCurrency === 'USD' || savedCurrency === 'MMK') ? savedCurrency : 'USD';
  });
  const [loyaltyEnabled, setLoyaltyEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('loyalty_enabled');
    return saved === null ? true : saved === 'true';
  });
  
  const handleCurrencyChange = (newCurrency: 'USD' | 'MMK') => {
    setCurrency(newCurrency);
    localStorage.setItem('currency', newCurrency);
  };

  const handleToggleLoyalty = (enabled: boolean) => {
    setLoyaltyEnabled(enabled);
    localStorage.setItem('loyalty_enabled', String(enabled));
  };
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // -- Form State --
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [newPatientData, setNewPatientData] = useState<Partial<Patient>>({ name: '', email: '', phone: '', medicalHistory: '' });
  const [newAppointmentData, setNewAppointmentData] = useState<Partial<Appointment>>({ date: '', time: '', type: 'Checkup', status: 'Scheduled', patient_id: '', doctor_id: '' });
  const [newTreatmentTypeData, setNewTreatmentTypeData] = useState<Partial<TreatmentType>>({ name: '', cost: 0, category: 'Preventative' });
  const [newDoctorData, setNewDoctorData] = useState<Partial<Doctor>>({ name: '', email: '', phone: '', specialization: '', schedules: [] });
  const [newUserData, setNewUserData] = useState<Partial<User>>({ username: '', password: '', role: 'normal' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newMedicineData, setNewMedicineData] = useState<Partial<Medicine>>({ name: '', description: '', unit: 'pack', price: 0, stock: 0, min_stock: 0, category: '' });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const session = auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        setIsAdmin(session.role === 'admin');
        setCurrentUser(session.username);
        // Initialize default admin and fetch data
        auth.initializeDefaultAdmin().then(() => {
          fetchInitialData();
          fetchUsers();
        });
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setCurrentUser('');
        // Still initialize default admin for first-time setup
        auth.initializeDefaultAdmin();
      }
    };
    
    checkAuth();
    
    // Set up periodic cleanup every 24 hours
    const cleanupInterval = setInterval(() => {
      if (isAuthenticated) {
        api.appointments.cleanupOld(4).catch(err => {
          console.warn('Periodic cleanup failed:', err);
        });
      }
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    
    return () => clearInterval(cleanupInterval);
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    const session = auth.getSession();
    if (session) {
      setIsAuthenticated(true);
      setIsAdmin(session.role === 'admin');
      setCurrentUser(session.username);
      
      // If user is restricted to a location, set it
      if (session.location_id) {
        setCurrentLocationId(session.location_id);
        localStorage.setItem('currentLocationId', session.location_id);
      }
      
      fetchInitialData();
      fetchUsers();
    }
  };

  const handleLogout = () => {
    auth.logout();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser('');
    setCurrentView('dashboard');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 400) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const usersData = await api.users.getAll();
      setUsers(usersData);
    } catch (err: any) {
      console.warn('Error fetching users:', err);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cleanup old appointments (older than 4 days) - run silently in background
      api.appointments.cleanupOld(4).catch(err => {
        console.warn('Failed to cleanup old appointments:', err);
        // Don't show error to user, just log it
      });
      
      const locData = await api.locations.getAll();
      setLocations(locData);
      
      // If no location selected but locations exist, select first one
      let locId = currentLocationId;
      if (!locId && locData.length > 0) {
        locId = locData[0].id;
        setCurrentLocationId(locId);
        localStorage.setItem('currentLocationId', locId);
      }
      
      const [patData, aptData, docData, typeData, recordsData, medData, loyaltyData] = await Promise.all([
        api.patients.getAll(locId),
        api.appointments.getAll(locId),
        api.doctors.getAll(locId),
        api.treatments.getTypes(locId),
        api.treatments.getAllRecords(locId),
        api.medicines.getAll(locId),
        api.loyalty.getRules(locId)
      ]);
      setPatients(patData);
      setAppointments(aptData);
      setDoctors(docData);
      setTreatmentTypes(typeData);
      setGlobalRecords(recordsData);
      setMedicines(medData);
      setLoyaltyRules(loyaltyData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to database. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (locId: string) => {
    setCurrentLocationId(locId);
    localStorage.setItem('currentLocationId', locId);
    fetchInitialData();
  };

  useEffect(() => {
    if (currentView === 'users' && isAdmin) {
      fetchUsers();
    }
    if (currentView === 'inventory') {
      fetchMedicines();
    }
  }, [currentView, isAdmin]);

  const fetchMedicines = async () => {
    try {
      const medData = await api.medicines.getAll();
      setMedicines(medData);
    } catch (err: any) {
      console.warn('Error fetching medicines:', err);
    }
  };

  const handlePatientSelect = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedTeeth([]); 
    try {
      const history = await api.treatments.getHistory(patient.id);
      setTreatmentHistory(history);
    } catch (e) {
      setTreatmentHistory([]);
    }
    try {
      const txs = await api.loyalty.getTransactions(patient.id);
      setLoyaltyTransactions(txs);
    } catch (e) {
      setLoyaltyTransactions([]);
    }
    try {
      const files = await api.files.list(patient.id);
      setPatientFiles(files);
    } catch (e) {
      setPatientFiles([]);
    }
    setCurrentView('finance');
  };

  const fetchGlobalRecords = async () => {
    setLoading(true);
    try {
      const records = await api.treatments.getAllRecords();
      setGlobalRecords(records);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'records') fetchGlobalRecords();
  }, [currentView]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.patients.create({ ...newPatientData, location_id: currentLocationId });
      setShowPatientModal(false);
      fetchInitialData(); 
      setNewPatientData({ name: '', email: '', phone: '', medicalHistory: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingAppointment) {
        await api.appointments.update(editingAppointment.id, newAppointmentData);
      } else {
        await api.appointments.create({ ...newAppointmentData, location_id: currentLocationId });
      }
      setShowAppointmentModal(false);
      fetchInitialData();
      setEditingAppointment(null);
      setNewAppointmentData({ date: '', time: '', type: 'Checkup', status: 'Scheduled', patient_id: '', doctor_id: '' });
      setAvailableTimes([]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDoctorChange = async (doctorId: string) => {
    setNewAppointmentData({ ...newAppointmentData, doctor_id: doctorId, time: '' });
    setAvailableTimes([]);
    
    if (doctorId && newAppointmentData.date) {
      await fetchAvailableTimes(doctorId, newAppointmentData.date);
    }
  };

  const handleDateChange = async (date: string) => {
    setNewAppointmentData({ ...newAppointmentData, date, time: '' });
    setAvailableTimes([]);
    
    if (date && newAppointmentData.doctor_id) {
      await fetchAvailableTimes(newAppointmentData.doctor_id, date);
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

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // Validate schedules before submitting
    const schedules = (newDoctorData.schedules || []).filter(sched => {
      // Filter out schedules with missing or invalid times
      if (!sched.start_time || !sched.end_time) return false;
      
      // Validate that end_time > start_time
      const start = new Date(`2000-01-01T${sched.start_time}`);
      const end = new Date(`2000-01-01T${sched.end_time}`);
      if (end <= start) {
        alert(`Invalid schedule: End time must be after start time for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][sched.day_of_week]}`);
        return false;
      }
      return true;
    });

    // Check for duplicate day_of_week entries
    const daySet = new Set(schedules.map(s => s.day_of_week));
    if (daySet.size !== schedules.length) {
      alert('Error: You cannot have multiple schedules for the same day. Please combine them into one schedule with a longer time range.');
      return;
    }

    try {
      const doctorDataToSave = {
        ...newDoctorData,
        location_id: currentLocationId,
        schedules: schedules
      };

      if (editingDoctor) {
        await api.doctors.update(editingDoctor.id, doctorDataToSave);
      } else {
        await api.doctors.create(doctorDataToSave);
      }
      setShowDoctorModal(false);
      fetchInitialData();
      setEditingDoctor(null);
      setNewDoctorData({ name: '', email: '', phone: '', specialization: '', schedules: [] });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    try {
      await api.doctors.delete(id);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAllRecords = async () => {
    try {
      await api.treatments.deleteAllRecords();
      fetchGlobalRecords();
      alert('All audit log records have been deleted successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete records');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await api.appointments.delete(id);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, newUserData);
      } else {
        if (!newUserData.password || newUserData.password === '') {
          alert('Password is required');
          setIsSubmitting(false);
          return;
        }
        await api.users.create(newUserData);
      }
      setShowUserModal(false);
      setEditingUser(null);
      setNewUserData({ username: '', password: '', role: 'normal' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.users.delete(id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingMedicine) {
        await api.medicines.update(editingMedicine.id, newMedicineData);
      } else {
        await api.medicines.create({ ...newMedicineData, location_id: currentLocationId });
      }
      setShowMedicineModal(false);
      setEditingMedicine(null);
      setNewMedicineData({ name: '', description: '', unit: 'pack', price: 0, stock: 0, min_stock: 0, category: '' });
      fetchMedicines();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMedicine = async (id: string) => {
    try {
      await api.medicines.delete(id);
      fetchMedicines();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: 'Scheduled' | 'Completed' | 'Cancelled') => {
    try {
      await api.appointments.updateStatus(id, status);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateLocation = async (locData: Partial<Location>) => {
    try {
      await api.locations.create(locData);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateLoyaltyRule = async (id: string, data: Partial<LoyaltyRule>) => {
    try {
      await api.loyalty.updateRule(id, data);
      const updated = await api.loyalty.getRules(currentLocationId);
      setLoyaltyRules(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateLoyaltyRule = async (data: Partial<LoyaltyRule>) => {
    try {
      await api.loyalty.createRule({ ...data, location_id: currentLocationId });
      const updated = await api.loyalty.getRules(currentLocationId);
      setLoyaltyRules(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteLoyaltyRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loyalty rule?')) return;
    try {
      await api.loyalty.deleteRule(id);
      const updated = await api.loyalty.getRules(currentLocationId);
      setLoyaltyRules(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetAllLoyaltyPoints = async () => {
    if (!confirm('CRITICAL ACTION: This will permanently reset ALL loyalty points for ALL patients across the entire system. Transaction history will also be cleared. Continue?')) return;
    
    setLoading(true);
    try {
      await api.loyalty.resetAllPoints();
      fetchInitialData();
      alert('System-wide loyalty reset successful.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemPoints = async (points: number, amount: number, patientObj?: Patient) => {
    const targetPatient = patientObj || selectedPatient;
    if (!targetPatient) return;
    try {
      const res = await api.loyalty.redeemPoints(targetPatient.id, currentLocationId, points, amount);
      if (patientObj) {
        // Update in list
        setPatients(prev => prev.map(p => p.id === targetPatient.id ? { ...p, balance: res.new_balance, loyalty_points: res.new_points } : p));
      }
      if (selectedPatient && targetPatient.id === selectedPatient.id) {
        setSelectedPatient({ ...selectedPatient, balance: res.new_balance, loyalty_points: res.new_points });
      }
      alert(`Redeemed ${points} points for ${amount} MMK discount!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTreatmentType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingTreatmentType) {
        await api.treatments.updateType(editingTreatmentType.id, newTreatmentTypeData);
      } else {
        await api.treatments.createType({ ...newTreatmentTypeData, location_id: currentLocationId });
      }
      const updatedTypes = await api.treatments.getTypes(currentLocationId);
      setTreatmentTypes(updatedTypes);
      setShowTreatmentTypeModal(false);
      setEditingTreatmentType(null);
      setNewTreatmentTypeData({ name: '', cost: 0, category: 'Preventative' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTreatmentType = async (id: string) => {
    if(!confirm("Are you sure you want to delete this service? History will be preserved.")) return;
    try {
      await api.treatments.deleteType(id);
      setTreatmentTypes(treatmentTypes.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTreatmentSubmit = async (treatment: TreatmentType) => {
    if (!selectedPatient) return;
    
    // If flat rate is enabled, use treatment cost as-is (not multiplied by teeth count)
    // Otherwise, multiply by number of selected teeth
    const totalCost = useFlatRate ? treatment.cost : (treatment.cost * (selectedTeeth.length || 1));
    
    try {
      const res = await api.treatments.record({
        location_id: currentLocationId,
        patient_id: selectedPatient.id,
        teeth: selectedTeeth,
        description: treatment.name,
        cost: totalCost
      });
      
      setSelectedPatient({ ...selectedPatient, balance: res.new_balance });
      
      setTreatmentHistory([res.record, ...treatmentHistory]);
      setSelectedTeeth([]);
      setUseFlatRate(false); // Reset flat rate after treatment
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUndoTreatment = async (record: ClinicalRecord) => {
    if (!selectedPatient) return;
    
    try {
      const res = await api.treatments.undoRecord(record.id, selectedPatient.id, record.cost);
      
      setSelectedPatient({ ...selectedPatient, balance: res.new_balance });
      setTreatmentHistory(treatmentHistory.filter(t => t.id !== record.id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddMedicines = () => {
    if (!selectedPatient) return;
    setShowMedicineSelectionModal(true);
  };

  const handleMedicineSelectionConfirm = async (selectedMedicines: { medicine: Medicine; quantity: number }[]) => {
    if (!selectedPatient) return;
    
    if (selectedMedicines.length === 0) {
      setShowMedicineSelectionModal(false);
      return;
    }
    
    setShowMedicineSelectionModal(false);
    
    // Calculate medicine cost
    const medicineCost = selectedMedicines.reduce((sum, item) => sum + (item.medicine.price * item.quantity), 0);
    
    try {
      // Record medicine sales
      for (const item of selectedMedicines) {
        await api.medicines.sell(
          selectedPatient.id,
          item.medicine.id,
          item.quantity,
          currentLocationId
        );
      }

      // Update patient balance (medicines already updated it in the sell function)
      const { data: patient } = await supabase
        .from('patients')
        .select('balance')
        .eq('id', selectedPatient.id)
        .single();

      if (patient) {
        setSelectedPatient({ ...selectedPatient, balance: patient.balance });
      }
      
      // Refresh medicines to update stock
      await fetchMedicines();
      
      // Show success message
      alert(`Successfully added ${selectedMedicines.length} medicine(s) to patient's bill. Total: ${formatCurrency(medicineCost, currency)}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      const res = await api.finance.processPayment(selectedPatient.id, paymentAmount);
      setSelectedPatient({ ...selectedPatient, balance: res.new_balance });
      setLastPaymentAmount(paymentAmount);
      setShowPaymentModal(false);
      // Show treatment selection first, then receipt
      setShowTreatmentSelection(true);
      fetchInitialData(); 
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateReceipt = () => {
    setLastPaymentAmount(0);
    setShowTreatmentSelection(true);
  };

  const handleTreatmentSelectionConfirm = (selectedTreatments: ClinicalRecord[]) => {
    setSelectedTreatmentsForReceipt(selectedTreatments);
    setShowTreatmentSelection(false);
    setShowReceipt(true);
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!selectedPatient) return;
    const uploadList = Array.from(files);
    if (uploadList.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(uploadList.map(f => api.files.upload(selectedPatient.id, f)));
      setPatientFiles(prev => [...uploaded, ...prev]);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!selectedPatient) return;
    try {
      await api.files.remove(path);
      setPatientFiles(prev => prev.filter(f => f.path !== path));
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleClosePatient = () => {
    setSelectedPatient(null);
    setSelectedTeeth([]);
    setTreatmentHistory([]);
    setPatientFiles([]);
    setUseFlatRate(false); // Reset flat rate when closing patient
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
        </div>
      }>
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-red-100">
          <Activity className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={fetchInitialData} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-gray-900 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <span className="text-lg font-black tracking-tight">DentalCloud<span className="text-indigo-400">Pro</span></span>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        style={{ width: `${sidebarWidth}px` }}
        className={`bg-gray-900 fixed md:sticky top-0 h-screen z-50 md:z-40 border-r border-gray-800 flex flex-col overflow-hidden transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-8 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-black text-white tracking-tight text-center">DentalCloud<span className="text-indigo-400">Pro</span></span>
        </div>
        
        <nav className="mt-2 px-6 space-y-2 flex-1 min-h-0 overflow-y-auto overscroll-contain pb-4">
          <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Users size={18} />} label="Patients" active={currentView === 'patients'} onClick={() => { setCurrentView('patients'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Calendar size={18} />} label="Appointments" active={currentView === 'appointments'} onClick={() => { setCurrentView('appointments'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<UserCheck size={18} />} label="Doctors" active={currentView === 'doctors'} onClick={() => { setCurrentView('doctors'); setIsMobileMenuOpen(false); }} />
          
          <div className="pt-8 pb-2">
             <p className="px-3 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Operations</p>
             {isAdmin && (
               <NavItem icon={<Stethoscope size={18} />} label="Service Menu" active={currentView === 'treatments'} onClick={() => { setCurrentView('treatments'); setIsMobileMenuOpen(false); }} />
             )}
             {isAdmin && (
               <NavItem icon={<ClipboardList size={18} />} label="Audit Log" active={currentView === 'records'} onClick={() => { setCurrentView('records'); setIsMobileMenuOpen(false); }} />
             )}
             <NavItem icon={<CreditCard size={18} />} label="Clinical Focus" active={currentView === 'finance'} onClick={() => { setCurrentView('finance'); setIsMobileMenuOpen(false); }} />
             {isAdmin && (
               <NavItem icon={<Package size={18} />} label="Inventory" active={currentView === 'inventory'} onClick={() => { setCurrentView('inventory'); setIsMobileMenuOpen(false); }} />
             )}
             <NavItem icon={<Sparkles size={18} />} label="AI Assistant" active={currentView === 'ai-assistant'} onClick={() => { setCurrentView('ai-assistant'); setIsMobileMenuOpen(false); }} />
          </div>
          
          <div className="pt-8 pb-2">
             <p className="px-3 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">System</p>
             {isAdmin && (
               <NavItem icon={<Shield size={18} />} label="Users" active={currentView === 'users'} onClick={() => { setCurrentView('users'); setIsMobileMenuOpen(false); }} />
             )}
             {isAdmin && (
               <NavItem icon={<Settings size={18} />} label="Settings" active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }} />
             )}
          </div>
        </nav>

        <div className="p-8 pt-4 flex-shrink-0 border-t border-gray-800">
           <div className="p-4 bg-gray-800 rounded-2xl border border-gray-700 mb-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Connected Database</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-xs text-gray-300 font-medium">Supabase Active</span>
              </div>
           </div>
           <div className="p-4 bg-gray-800 rounded-2xl border border-gray-700">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Logged in as</p>
              <div className="flex items-center justify-between">
                 <span className="text-xs text-gray-300 font-medium">{currentUser}</span>
                 {isAdmin && (
                   <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 uppercase">Admin</span>
                 )}
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
           </div>
        </div>
        
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500 transition-colors z-30"
          style={{ 
            backgroundColor: isResizing ? '#6366f1' : 'transparent'
          }}
        />
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>}>
            {currentView === 'dashboard' && <DashboardView patients={patients} appointments={appointments} treatmentRecords={globalRecords} currency={currency} />}
            {currentView === 'patients' && <PatientsView 
                patients={patients} 
                loading={loading} 
                currency={currency} 
                loyaltyEnabled={loyaltyEnabled} 
                loyaltyRules={loyaltyRules}
                onSelectPatient={handlePatientSelect} 
                onAddPatient={() => setShowPatientModal(true)} 
                onRedeemPoints={(patient, points, amount) => handleRedeemPoints(points, amount, patient)}
            />}
            {currentView === 'appointments' && <AppointmentsView appointments={appointments} loading={loading} onAddAppointment={() => {setEditingAppointment(null); setNewAppointmentData({ date: '', time: '', type: 'Checkup', status: 'Scheduled', patient_id: '', doctor_id: '' }); setAvailableTimes([]); setShowAppointmentModal(true)}} onEditAppointment={(apt) => {setEditingAppointment(apt); setNewAppointmentData({ date: apt.date, time: apt.time, type: apt.type || 'Checkup', status: apt.status, patient_id: apt.patient_id, doctor_id: apt.doctor_id, notes: apt.notes }); if (apt.doctor_id && apt.date) fetchAvailableTimes(apt.doctor_id, apt.date); setShowAppointmentModal(true)}} onDeleteAppointment={handleDeleteAppointment} onUpdateStatus={handleUpdateAppointmentStatus} />}
            {currentView === 'doctors' && <DoctorsView doctors={doctors} loading={loading} onAdd={() => {setEditingDoctor(null); setNewDoctorData({ name: '', email: '', phone: '', specialization: '', schedules: [] }); setShowDoctorModal(true)}} onEdit={(doc) => {setEditingDoctor(doc); setNewDoctorData(doc); setShowDoctorModal(true)}} onDelete={handleDeleteDoctor} />}
            {currentView === 'treatments' && isAdmin && <TreatmentConfigView treatmentTypes={treatmentTypes} currency={currency} onAdd={() => {setEditingTreatmentType(null); setShowTreatmentTypeModal(true)}} onEdit={(t) => {setEditingTreatmentType(t); setNewTreatmentTypeData(t); setShowTreatmentTypeModal(true)}} onDelete={handleDeleteTreatmentType} />}
            {currentView === 'records' && isAdmin && <RecordsView records={globalRecords} loading={loading} onRefresh={fetchGlobalRecords} onDeleteAll={handleDeleteAllRecords} currency={currency} />}
            {currentView === 'inventory' && isAdmin && <InventoryView medicines={medicines} loading={loading} currency={currency} onAdd={() => {setEditingMedicine(null); setNewMedicineData({ name: '', description: '', unit: 'pack', price: 0, stock: 0, min_stock: 0, category: '' }); setShowMedicineModal(true)}} onEdit={(med) => {setEditingMedicine(med); setNewMedicineData(med); setShowMedicineModal(true)}} onDelete={handleDeleteMedicine} />}
            {currentView === 'users' && isAdmin && <UsersView users={users} loading={loading} isAdmin={isAdmin} onAdd={() => {setEditingUser(null); setNewUserData({ username: '', password: '', role: 'normal' }); setShowUserModal(true)}} onEdit={(user) => {setEditingUser(user); setNewUserData({ username: user.username, password: '', role: user.role }); setShowUserModal(true)}} onDelete={handleDeleteUser} />}
            {currentView === 'settings' && isAdmin && <SettingsView 
                currency={currency} 
                onCurrencyChange={handleCurrencyChange} 
                locations={locations} 
                currentLocationId={currentLocationId}
                onLocationChange={handleLocationChange}
                onAddLocation={handleCreateLocation} 
                loyaltyRules={loyaltyRules} 
                onUpdateLoyaltyRule={handleUpdateLoyaltyRule} 
                onCreateLoyaltyRule={handleCreateLoyaltyRule} 
                onDeleteLoyaltyRule={handleDeleteLoyaltyRule}
                onResetAllLoyaltyPoints={handleResetAllLoyaltyPoints}
                loyaltyEnabled={loyaltyEnabled}
                onToggleLoyalty={handleToggleLoyalty}
                isAdmin={isAdmin} 
            />}
            {currentView === 'ai-assistant' && <AIAssistantView 
              patients={patients} 
              treatmentRecords={globalRecords} 
              appointments={appointments}
              doctors={doctors}
              treatmentTypes={treatmentTypes}
              users={users}
              medicines={medicines}
            />}
            {currentView === 'finance' && <ClinicalView 
                selectedPatient={selectedPatient} 
                selectedTeeth={selectedTeeth} 
                treatmentTypes={treatmentTypes} 
                treatmentHistory={treatmentHistory}
                patientFiles={patientFiles}
                uploadingFiles={uploading}
                useFlatRate={useFlatRate}
                currency={currency}
                onUploadFiles={handleUploadFiles}
                onDeleteFile={handleDeleteFile}
                onToggleTooth={(id) => setSelectedTeeth(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])}
                onDeselectAll={() => setSelectedTeeth([])}
                onTreatmentSubmit={handleTreatmentSubmit}
                onPaymentRequest={(amount) => { setPaymentAmount(amount); setShowPaymentModal(true); }}
                onClosePatient={handleClosePatient}
                onOpenDirectory={() => setCurrentView('patients')}
                onGenerateReceipt={handleGenerateReceipt}
                onAddMedicines={handleAddMedicines}
                onToggleFlatRate={setUseFlatRate}
                onUndoTreatment={handleUndoTreatment}
                onRedeemPoints={handleRedeemPoints}
                loyaltyEnabled={loyaltyEnabled}
                loyaltyRules={loyaltyRules}
                loyaltyTransactions={loyaltyTransactions}
            />}
          </Suspense>
        </div>
      </main>

      {/* Modals */}
      {showPatientModal && (
        <Modal title="Register Clinical Patient" onClose={() => setShowPatientModal(false)}>
          <form onSubmit={handleCreatePatient} className="space-y-5">
            <Input label="Full Patient Name" required value={newPatientData.name} onChange={(e: any) => setNewPatientData({...newPatientData, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
               <Input label="Primary Email" type="email" value={newPatientData.email} onChange={(e: any) => setNewPatientData({...newPatientData, email: e.target.value})} />
               <Input label="Mobile Contact" required value={newPatientData.phone} onChange={(e: any) => setNewPatientData({...newPatientData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Relevant Medical History</label>
              <textarea className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" rows={4}
                value={newPatientData.medicalHistory} onChange={e => setNewPatientData({...newPatientData, medicalHistory: e.target.value})} />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Finalize Registration'}
            </button>
          </form>
        </Modal>
      )}

      {showAppointmentModal && (
        <Modal title={editingAppointment ? "Edit Appointment" : "New Appointment"} onClose={() => {setShowAppointmentModal(false); setEditingAppointment(null); setAvailableTimes([]);}}>
          <form onSubmit={handleCreateAppointment} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Patient</label>
              <select 
                className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                required
                value={newAppointmentData.patient_id} 
                onChange={(e: any) => setNewAppointmentData({...newAppointmentData, patient_id: e.target.value})}
              >
                <option value="">Select a patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Doctor (Optional)</label>
              <select 
                className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newAppointmentData.doctor_id || ''} 
                onChange={(e: any) => handleDoctorChange(e.target.value)}
              >
                <option value="">No specific doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.specialization ? ` - ${doctor.specialization}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  label="Date" 
                  type="date" 
                  required 
                  value={newAppointmentData.date} 
                  onChange={(e: any) => handleDateChange(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Time</label>
                {availableTimes.length > 0 ? (
                  <select
                    className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                    value={newAppointmentData.time}
                    onChange={(e: any) => setNewAppointmentData({...newAppointmentData, time: e.target.value})}
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
                      value={newAppointmentData.time} 
                      onChange={(e: any) => setNewAppointmentData({...newAppointmentData, time: e.target.value})} 
                    />
                    {newAppointmentData.doctor_id && newAppointmentData.date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {loadingAvailableTimes ? 'Loading available times...' : 'No schedule set for this day or all times booked'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Type</label>
                <select 
                  className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newAppointmentData.type} 
                  onChange={(e: any) => setNewAppointmentData({...newAppointmentData, type: e.target.value})}
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
                  value={newAppointmentData.status} 
                  onChange={(e: any) => setNewAppointmentData({...newAppointmentData, status: e.target.value})}
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
                value={newAppointmentData.notes || ''} 
                onChange={(e: any) => setNewAppointmentData({...newAppointmentData, notes: e.target.value})}
                placeholder="Optional notes about this appointment..."
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">
              {editingAppointment ? 'Update Appointment' : 'Create Appointment'}
            </button>
          </form>
        </Modal>
      )}

      {showDoctorModal && (
        <Modal title={editingDoctor ? "Edit Doctor" : "New Doctor"} onClose={() => {setShowDoctorModal(false); setEditingDoctor(null);}}>
          <form onSubmit={handleCreateDoctor} className="space-y-5">
            <Input label="Doctor Name" required value={newDoctorData.name} onChange={(e: any) => setNewDoctorData({...newDoctorData, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email" type="email" value={newDoctorData.email} onChange={(e: any) => setNewDoctorData({...newDoctorData, email: e.target.value})} />
              <Input label="Phone" value={newDoctorData.phone} onChange={(e: any) => setNewDoctorData({...newDoctorData, phone: e.target.value})} />
            </div>
            <Input label="Specialization" value={newDoctorData.specialization} onChange={(e: any) => setNewDoctorData({...newDoctorData, specialization: e.target.value})} placeholder="e.g., Orthodontics, Oral Surgery" />
            
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Working Schedule</label>
              <div className="space-y-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
                {(newDoctorData.schedules || []).map((schedule, index) => (
                  <div key={index} className="flex gap-2 items-end bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Day</label>
                      <select
                        className="w-full border-gray-200 border rounded-lg p-2 text-sm"
                        value={schedule.day_of_week}
                        onChange={(e: any) => {
                          const updated = [...(newDoctorData.schedules || [])];
                          updated[index].day_of_week = parseInt(e.target.value);
                          setNewDoctorData({...newDoctorData, schedules: updated});
                        }}
                      >
                        <option value={0}>Sunday</option>
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        className="w-full border-gray-200 border rounded-lg p-2 text-sm"
                        value={schedule.start_time}
                        onChange={(e: any) => {
                          const updated = [...(newDoctorData.schedules || [])];
                          updated[index].start_time = e.target.value;
                          setNewDoctorData({...newDoctorData, schedules: updated});
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        className="w-full border-gray-200 border rounded-lg p-2 text-sm"
                        value={schedule.end_time}
                        onChange={(e: any) => {
                          const updated = [...(newDoctorData.schedules || [])];
                          updated[index].end_time = e.target.value;
                          setNewDoctorData({...newDoctorData, schedules: updated});
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(newDoctorData.schedules || [])];
                        updated.splice(index, 1);
                        setNewDoctorData({...newDoctorData, schedules: updated});
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setNewDoctorData({
                      ...newDoctorData,
                      schedules: [...(newDoctorData.schedules || []), { id: '', day_of_week: 1, start_time: '09:00', end_time: '17:00' }]
                    });
                  }}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  + Add Schedule
                </button>
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">
              {editingDoctor ? 'Update Doctor' : 'Create Doctor'}
            </button>
          </form>
        </Modal>
      )}

      {showTreatmentTypeModal && (
        <Modal title={editingTreatmentType ? "Update Service Definition" : "New Service Definition"} onClose={() => setShowTreatmentTypeModal(false)}>
          <form onSubmit={handleCreateTreatmentType} className="space-y-5">
            <Input label="Service Description" required value={newTreatmentTypeData.name} onChange={(e: any) => setNewTreatmentTypeData({...newTreatmentTypeData, name: e.target.value})} />
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Specialty Department</label>
              <select className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                 value={newTreatmentTypeData.category}
                 onChange={e => setNewTreatmentTypeData({...newTreatmentTypeData, category: e.target.value as any})}>
                 {TREATMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <Input label={`Standard Fee (${getCurrencySymbol(currency)})`} type="number" required min="0" value={newTreatmentTypeData.cost} onChange={(e: any) => setNewTreatmentTypeData({...newTreatmentTypeData, cost: parseFloat(e.target.value)})} />
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg">Save Configuration</button>
          </form>
        </Modal>
      )}

      {showUserModal && isAdmin && (
        <Modal title={editingUser ? "Edit User" : "New User"} onClose={() => {setShowUserModal(false); setEditingUser(null); setNewUserData({ username: '', password: '', role: 'normal' });}}>
          <form onSubmit={handleCreateUser} className="space-y-5">
            <Input 
              label="Username" 
              required 
              value={newUserData.username} 
              onChange={(e: any) => setNewUserData({...newUserData, username: e.target.value})} 
              placeholder="Enter username"
            />
            <Input 
              label={editingUser ? "New Password (leave blank to keep current)" : "Password"} 
              type="password"
              required={!editingUser}
              value={newUserData.password || ''} 
              onChange={(e: any) => setNewUserData({...newUserData, password: e.target.value})} 
              placeholder="Enter password"
            />
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Assign Location</label>
              <select 
                className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newUserData.location_id || ''} 
                onChange={(e: any) => setNewUserData({...newUserData, location_id: e.target.value})}
              >
                <option value="">All Locations (Global Admin)</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Role</label>
              <select 
                className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newUserData.role} 
                onChange={(e: any) => setNewUserData({...newUserData, role: e.target.value})}
              >
                <option value="normal">Normal</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">
              {editingUser ? 'Update User' : 'Create User'}
            </button>
          </form>
        </Modal>
      )}

      {showMedicineModal && (
        <Modal title={editingMedicine ? "Edit Medicine" : "New Medicine"} onClose={() => {setShowMedicineModal(false); setEditingMedicine(null); setNewMedicineData({ name: '', description: '', unit: 'pack', price: 0, stock: 0, min_stock: 0, category: '' });}}>
          <form onSubmit={handleCreateMedicine} className="space-y-5">
            <Input 
              label="Medicine Name" 
              required 
              value={newMedicineData.name} 
              onChange={(e: any) => setNewMedicineData({...newMedicineData, name: e.target.value})} 
              placeholder="e.g., Pain Killer, Antibiotics"
            />
            <Input 
              label="Description" 
              value={newMedicineData.description || ''} 
              onChange={(e: any) => setNewMedicineData({...newMedicineData, description: e.target.value})} 
              placeholder="Optional description"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Unit</label>
                <select 
                  className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newMedicineData.unit} 
                  onChange={(e: any) => setNewMedicineData({...newMedicineData, unit: e.target.value})}
                >
                  <option value="pack">Pack</option>
                  <option value="bottle">Bottle</option>
                  <option value="box">Box</option>
                  <option value="unit">Unit</option>
                  <option value="tablet">Tablet</option>
                </select>
              </div>
              <Input 
                label="Category" 
                value={newMedicineData.category || ''} 
                onChange={(e: any) => setNewMedicineData({...newMedicineData, category: e.target.value})} 
                placeholder="e.g., Pain Relief"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input 
                label={`Price (${getCurrencySymbol(currency)})`} 
                type="number" 
                required 
                min="0" 
                step="0.01"
                value={newMedicineData.price || 0} 
                onChange={(e: any) => setNewMedicineData({...newMedicineData, price: parseFloat(e.target.value) || 0})} 
              />
              <Input 
                label="Stock" 
                type="number" 
                required 
                min="0"
                value={newMedicineData.stock || 0} 
                onChange={(e: any) => setNewMedicineData({...newMedicineData, stock: parseInt(e.target.value) || 0})} 
              />
              <Input 
                label="Min Stock" 
                type="number" 
                min="0"
                value={newMedicineData.min_stock || 0} 
                onChange={(e: any) => setNewMedicineData({...newMedicineData, min_stock: parseInt(e.target.value) || 0})} 
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">
              {editingMedicine ? 'Update Medicine' : 'Create Medicine'}
            </button>
          </form>
        </Modal>
      )}

      {showMedicineSelectionModal && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-white w-10 h-10" /></div>}>
          <MedicineSelectionModal
            medicines={medicines}
            currency={currency}
            onConfirm={handleMedicineSelectionConfirm}
            onClose={() => {
              setShowMedicineSelectionModal(false);
            }}
          />
        </Suspense>
      )}

      {showPaymentModal && (
        <Modal title="Financial Processing" onClose={() => setShowPaymentModal(false)}>
          <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Outstanding Balance</p>
            <p className="text-3xl font-black text-gray-900">{formatCurrency(selectedPatient?.balance || 0, currency)}</p>
          </div>
          <form onSubmit={handlePaymentSubmit} className="space-y-5">
            <Input label={`Payment Amount Recieved (${getCurrencySymbol(currency)})`} type="number" required min="0.01" step="0.01" max={selectedPatient?.balance}
              value={paymentAmount} onChange={(e: any) => setPaymentAmount(parseFloat(e.target.value))} />
            <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-600/20">Post Payment & Clear Balance</button>
          </form>
        </Modal>
      )}

      {showTreatmentSelection && selectedPatient && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-white w-10 h-10" /></div>}>
          <TreatmentSelectionModal
            treatments={treatmentHistory}
            currency={currency}
            onConfirm={handleTreatmentSelectionConfirm}
            onClose={() => setShowTreatmentSelection(false)}
          />
        </Suspense>
      )}

      {showReceipt && selectedPatient && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-white w-10 h-10" /></div>}>
          <Receipt
            patient={selectedPatient}
            treatments={selectedTreatmentsForReceipt.length > 0 ? selectedTreatmentsForReceipt : treatmentHistory}
            paymentAmount={lastPaymentAmount}
            currency={currency}
            onClose={() => setShowReceipt(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
