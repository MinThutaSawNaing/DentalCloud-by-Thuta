
import React, { useState, useEffect, Suspense } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Activity,
  Loader2,
  Stethoscope,
  ClipboardList,
  Calendar
} from 'lucide-react';

import { Modal, Input, NavItem } from './components/Shared';
import { 
  Patient, 
  Appointment, 
  TreatmentType, 
  ClinicalRecord,
  PatientFile
} from './types';
import { TREATMENT_CATEGORIES } from './constants';
import { api } from './services/api';

// Lazy Load Views
const DashboardView = React.lazy(() => import('./components/DashboardView'));
const PatientsView = React.lazy(() => import('./components/PatientsView'));
const AppointmentsView = React.lazy(() => import('./components/AppointmentsView'));
const ClinicalView = React.lazy(() => import('./components/ClinicalView'));
const TreatmentConfigView = React.lazy(() => import('./components/TreatmentConfigView'));
const RecordsView = React.lazy(() => import('./components/RecordsView'));

type ViewState = 'dashboard' | 'patients' | 'appointments' | 'finance' | 'treatments' | 'records';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // -- Data State --
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatmentHistory, setTreatmentHistory] = useState<ClinicalRecord[]>([]); 
  const [globalRecords, setGlobalRecords] = useState<ClinicalRecord[]>([]); 
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [patientFiles, setPatientFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // -- Selection State --
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [editingTreatmentType, setEditingTreatmentType] = useState<TreatmentType | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  
  // -- Modals State --
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showTreatmentTypeModal, setShowTreatmentTypeModal] = useState(false);
  
  // -- Form State --
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [newPatientData, setNewPatientData] = useState<Partial<Patient>>({ name: '', email: '', phone: '', medicalHistory: '' });
  const [newAppointmentData, setNewAppointmentData] = useState<Partial<Appointment>>({ date: '', time: '', type: 'Checkup', status: 'Scheduled', patient_id: '' });
  const [newTreatmentTypeData, setNewTreatmentTypeData] = useState<Partial<TreatmentType>>({ name: '', cost: 0, category: 'Preventative' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [patData, aptData, typeData, recordsData] = await Promise.all([
        api.patients.getAll(),
        api.appointments.getAll(),
        api.treatments.getTypes(),
        api.treatments.getAllRecords()
      ]);
      setPatients(patData);
      setAppointments(aptData);
      setTreatmentTypes(typeData);
      setGlobalRecords(recordsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to database. Please check your network.");
    } finally {
      setLoading(false);
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
    try {
      await api.patients.create(newPatientData);
      setShowPatientModal(false);
      fetchInitialData(); 
      setNewPatientData({ name: '', email: '', phone: '', medicalHistory: '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAppointment) {
        await api.appointments.update(editingAppointment.id, newAppointmentData);
      } else {
        await api.appointments.create(newAppointmentData);
      }
      setShowAppointmentModal(false);
      fetchInitialData();
      setEditingAppointment(null);
      setNewAppointmentData({ date: '', time: '', type: 'Checkup', status: 'Scheduled', patient_id: '' });
    } catch (err: any) {
      alert(err.message);
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

  const handleUpdateAppointmentStatus = async (id: string, status: 'Scheduled' | 'Completed' | 'Cancelled') => {
    try {
      await api.appointments.updateStatus(id, status);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTreatmentType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTreatmentType) {
        await api.treatments.updateType(editingTreatmentType.id, newTreatmentTypeData);
      } else {
        await api.treatments.createType(newTreatmentTypeData);
      }
      const updatedTypes = await api.treatments.getTypes();
      setTreatmentTypes(updatedTypes);
      setShowTreatmentTypeModal(false);
      setEditingTreatmentType(null);
      setNewTreatmentTypeData({ name: '', cost: 0, category: 'Preventative' });
    } catch (err: any) {
      alert(err.message);
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
    const count = selectedTeeth.length || 1;
    const totalCost = treatment.cost * count;
    
    try {
      const res = await api.treatments.record({
        patient_id: selectedPatient.id,
        teeth: selectedTeeth,
        description: treatment.name,
        cost: totalCost
      });
      
      setSelectedPatient({ ...selectedPatient, balance: res.new_balance });
      
      const newRecord: ClinicalRecord = {
        id: Math.random().toString(), 
        patient_id: selectedPatient.id,
        teeth: selectedTeeth,
        description: treatment.name,
        cost: totalCost,
        date: new Date().toISOString().split('T')[0]
      };
      setTreatmentHistory([newRecord, ...treatmentHistory]);
      setSelectedTeeth([]);
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
      setShowPaymentModal(false);
      fetchInitialData(); 
    } catch (err: any) {
      alert(err.message);
    }
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
  };

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
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-gray-900 fixed h-full z-20 hidden md:block border-r border-gray-800">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-indigo-500 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Activity className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">DentFlow<span className="text-indigo-400">Pro</span></span>
        </div>
        
        <nav className="mt-8 px-6 space-y-2">
          <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <NavItem icon={<Users size={18} />} label="Patients" active={currentView === 'patients'} onClick={() => setCurrentView('patients')} />
          <NavItem icon={<Calendar size={18} />} label="Appointments" active={currentView === 'appointments'} onClick={() => setCurrentView('appointments')} />
          
          <div className="pt-8 pb-2">
             <p className="px-3 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Operations</p>
             <NavItem icon={<Stethoscope size={18} />} label="Service Menu" active={currentView === 'treatments'} onClick={() => setCurrentView('treatments')} />
             <NavItem icon={<ClipboardList size={18} />} label="Audit Log" active={currentView === 'records'} onClick={() => setCurrentView('records')} />
             <NavItem icon={<CreditCard size={18} />} label="Clinical Focus" active={currentView === 'finance'} onClick={() => setCurrentView('finance')} />
          </div>
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-8">
           <div className="p-4 bg-gray-800 rounded-2xl border border-gray-700">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Connected Database</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-xs text-gray-300 font-medium">Supabase Active</span>
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>}>
            {currentView === 'dashboard' && <DashboardView patients={patients} appointments={appointments} treatmentRecords={globalRecords} />}
            {currentView === 'patients' && <PatientsView patients={patients} loading={loading} onSelectPatient={handlePatientSelect} onAddPatient={() => setShowPatientModal(true)} />}
            {currentView === 'appointments' && <AppointmentsView appointments={appointments} loading={loading} onAddAppointment={() => {setEditingAppointment(null); setNewAppointmentData({ date: '', time: '', type: 'Checkup', status: 'Scheduled', patient_id: '' }); setShowAppointmentModal(true)}} onEditAppointment={(apt) => {setEditingAppointment(apt); setNewAppointmentData({ date: apt.date, time: apt.time, type: apt.type || 'Checkup', status: apt.status, patient_id: apt.patient_id, notes: apt.notes }); setShowAppointmentModal(true)}} onDeleteAppointment={handleDeleteAppointment} onUpdateStatus={handleUpdateAppointmentStatus} />}
            {currentView === 'treatments' && <TreatmentConfigView treatmentTypes={treatmentTypes} onAdd={() => {setEditingTreatmentType(null); setShowTreatmentTypeModal(true)}} onEdit={(t) => {setEditingTreatmentType(t); setNewTreatmentTypeData(t); setShowTreatmentTypeModal(true)}} onDelete={handleDeleteTreatmentType} />}
            {currentView === 'records' && <RecordsView records={globalRecords} loading={loading} onRefresh={fetchGlobalRecords} />}
            {currentView === 'finance' && <ClinicalView 
                selectedPatient={selectedPatient} 
                selectedTeeth={selectedTeeth} 
                treatmentTypes={treatmentTypes} 
                treatmentHistory={treatmentHistory}
                patientFiles={patientFiles}
                uploadingFiles={uploading}
                onUploadFiles={handleUploadFiles}
                onDeleteFile={handleDeleteFile}
                onToggleTooth={(id) => selectedTeeth.includes(id) ? setSelectedTeeth(selectedTeeth.filter(t => t !== id)) : setSelectedTeeth([...selectedTeeth, id])}
                onTreatmentSubmit={handleTreatmentSubmit}
                onPaymentRequest={(amount) => { setPaymentAmount(amount); setShowPaymentModal(true); }}
                onClosePatient={handleClosePatient}
                onOpenDirectory={() => setCurrentView('patients')}
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
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">Finalize Registration</button>
          </form>
        </Modal>
      )}

      {showAppointmentModal && (
        <Modal title={editingAppointment ? "Edit Appointment" : "New Appointment"} onClose={() => {setShowAppointmentModal(false); setEditingAppointment(null);}}>
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
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Date" 
                type="date" 
                required 
                value={newAppointmentData.date} 
                onChange={(e: any) => setNewAppointmentData({...newAppointmentData, date: e.target.value})} 
              />
              <Input 
                label="Time" 
                type="time" 
                required 
                value={newAppointmentData.time} 
                onChange={(e: any) => setNewAppointmentData({...newAppointmentData, time: e.target.value})} 
              />
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
            <Input label="Standard Fee ($)" type="number" required min="0" value={newTreatmentTypeData.cost} onChange={(e: any) => setNewTreatmentTypeData({...newTreatmentTypeData, cost: parseFloat(e.target.value)})} />
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg">Save Configuration</button>
          </form>
        </Modal>
      )}

      {showPaymentModal && (
        <Modal title="Financial Processing" onClose={() => setShowPaymentModal(false)}>
          <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Outstanding Balance</p>
            <p className="text-3xl font-black text-gray-900">${(selectedPatient?.balance || 0).toFixed(2)}</p>
          </div>
          <form onSubmit={handlePaymentSubmit} className="space-y-5">
            <Input label="Payment Amount Recieved ($)" type="number" required min="0.01" step="0.01" max={selectedPatient?.balance}
              value={paymentAmount} onChange={(e: any) => setPaymentAmount(parseFloat(e.target.value))} />
            <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-600/20">Post Payment & Clear Balance</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default App;
