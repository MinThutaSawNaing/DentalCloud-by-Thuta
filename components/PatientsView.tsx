import React, { useState, useMemo } from 'react';
import { Search, Plus, Loader2, ChevronRight, FileDown, Award } from 'lucide-react';
import { Patient, LoyaltyRule } from '../types';
import { formatCurrency, Currency } from '../utils/currency';
import { exportPatientsToPDF } from '../utils/pdfExport';
import Pagination from './Pagination';

interface PatientsViewProps {
  patients: Patient[];
  loading: boolean;
  currency: Currency;
  onSelectPatient: (patient: Patient) => void;
  onAddPatient: () => void;
  onRedeemPoints?: (patient: Patient, points: number, amount: number) => void;
  loyaltyEnabled: boolean;
  loyaltyRules?: LoyaltyRule[];
}

const PatientsView: React.FC<PatientsViewProps> = ({ patients, loading, currency, onSelectPatient, onAddPatient, onRedeemPoints, loyaltyEnabled, loyaltyRules = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  // Filtered data based on search term
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    const term = searchTerm.toLowerCase();
    return patients.filter(patient => 
      patient.name.toLowerCase().includes(term) ||
      patient.email?.toLowerCase().includes(term) ||
      patient.phone.toLowerCase().includes(term) ||
      patient.medicalHistory?.toLowerCase().includes(term)
    );
  }, [patients, searchTerm]);

  // Paginated data
  const paginatedPatients = useMemo(() => {
    if (showAll) return filteredPatients;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatients, currentPage, showAll]);

  // Reset to first page when patients change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [patients]);

  const handleDownloadPDF = () => {
    exportPatientsToPDF(patients, currency);
  };

  // Get redemption rule
  const redeemRule = useMemo(() => {
    return loyaltyRules.find(r => r.event_type === 'REDEEM' && r.active);
  }, [loyaltyRules]);

  const redemptionRate = redeemRule ? redeemRule.points_per_unit : 1; // Default 1 MMK per point
  const minRedeemPoints = redeemRule ? (redeemRule.min_amount || 0) : 500;

  return (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Patient Directory</h2>
        <p className="text-sm text-gray-500">Manage all registered clinical patients</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <div className="relative flex-1 sm:flex-initial">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search patients..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"/>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadPDF}
            disabled={patients.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Export PDF</span>
          </button>
          <button onClick={onAddPatient} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Patient</span>
          </button>
        </div>
      </div>
    </div>
    {loading ? (
      <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
    ) : patients.length === 0 ? (
      <div className="p-12 text-center text-gray-400 italic">No patients found. Add your first patient to begin.</div>
    ) : (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Medical Status</th>
                {loyaltyEnabled && <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Loyalty Points</th>}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Balance</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPatients.map((patient) => (
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
                  {loyaltyEnabled && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                        <Award size={14} />
                        {patient.loyalty_points || 0}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {patient.balance > 0 ? (
                      <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-100">{formatCurrency(patient.balance || 0, currency)}</span>
                    ) : (
                      <span className="text-green-600 font-medium">Clear</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {loyaltyEnabled && onRedeemPoints && (patient.loyalty_points >= minRedeemPoints) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const input = prompt(`Redeem points for ${patient.name} (Available: ${patient.loyalty_points}, Min: ${minRedeemPoints}):`, Math.min(patient.loyalty_points, 1000).toString());
                            if (input) {
                              const points = parseInt(input);
                              if (isNaN(points) || points < minRedeemPoints || points > patient.loyalty_points) {
                                alert(`Please enter a valid amount between ${minRedeemPoints} and ${patient.loyalty_points}.`);
                                return;
                              }
                              const amount = points * redemptionRate;
                              if(confirm(`Redeem ${points} points for ${formatCurrency(amount, currency)} discount?`)) {
                                onRedeemPoints(patient, points, amount);
                              }
                            }
                          }}
                          className="text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                          <Award size={14} /> Redeem
                        </button>
                      )}
                      <button className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1">
                        View Chart <ChevronRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {paginatedPatients.map((patient) => (
            <div 
              key={patient.id} 
              className="p-4 hover:bg-gray-50 active:bg-indigo-50 transition-colors"
              onClick={() => onSelectPatient(patient)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                    {patient.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{patient.name}</div>
                    <div className="text-xs text-gray-500">{patient.phone}</div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              
              <div className={`grid ${loyaltyEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-4`}>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Balance</p>
                  <p className={`text-sm font-bold ${patient.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(patient.balance || 0, currency)}
                  </p>
                </div>
                {loyaltyEnabled && (
                  <div className="bg-amber-50 p-2 rounded-lg">
                    <p className="text-[10px] text-amber-600 uppercase font-bold tracking-wider mb-0.5">Points</p>
                    <p className="text-sm font-bold text-amber-700 flex items-center gap-1">
                      <Award size={12} /> {patient.loyalty_points || 0}
                    </p>
                  </div>
                )}
              </div>
              
              {patient.medicalHistory && (
                <div className="mt-3 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-lg text-[11px] text-orange-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  Medical Review Required
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    )}
    {!loading && patients.length > 0 && (
      <Pagination
        totalItems={patients.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        showAll={showAll}
        onToggleShowAll={() => setShowAll(!showAll)}
      />
    )}
  </div>
  );
};

export default PatientsView;
