import React from 'react';
import { Search, Plus, Loader2, ChevronRight } from 'lucide-react';
import { Patient } from '../types';
import { formatCurrency, Currency } from '../utils/currency';

interface PatientsViewProps {
  patients: Patient[];
  loading: boolean;
  currency: Currency;
  onSelectPatient: (patient: Patient) => void;
  onAddPatient: () => void;
}

const PatientsView: React.FC<PatientsViewProps> = ({ patients, loading, currency, onSelectPatient, onAddPatient }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Patient Directory</h2>
        <p className="text-sm text-gray-500">Manage all registered clinical patients</p>
      </div>
      <div className="flex gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search name, phone..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"/>
        </div>
        <button onClick={onAddPatient} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Patient
        </button>
      </div>
    </div>
    {loading ? (
      <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
    ) : patients.length === 0 ? (
      <div className="p-12 text-center text-gray-400 italic">No patients found. Add your first patient to begin.</div>
    ) : (
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient Name</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Info</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Medical Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Balance</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {patients.map((patient) => (
            <tr key={patient.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer" onClick={() => onSelectPatient(patient)}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3">
                    {patient.name?.charAt(0) || '?'}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">{patient.name}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700">{patient.email}</span>
                  <span className="text-xs text-gray-400">{patient.phone}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                 <span className={`px-2 py-0.5 rounded text-xs ${patient.medicalHistory ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                   {patient.medicalHistory ? 'Review Required' : 'No Alerts'}
                 </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {patient.balance > 0 ? (
                  <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-100">{formatCurrency(patient.balance || 0, currency)}</span>
                ) : (
                  <span className="text-green-600 font-medium">Clear</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 ml-auto">
                  View Chart <ChevronRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default PatientsView;
