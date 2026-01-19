import React from 'react';
import { User, X } from 'lucide-react';
import { ToothSelector } from './ToothSelector';
import { Patient, TreatmentType, ClinicalRecord } from '../types';

interface ClinicalViewProps {
  selectedPatient: Patient | null;
  selectedTeeth: number[];
  treatmentTypes: TreatmentType[];
  treatmentHistory: ClinicalRecord[];
  onToggleTooth: (id: number) => void;
  onTreatmentSubmit: (t: TreatmentType) => void;
  onPaymentRequest: (amount: number) => void;
  onClosePatient: () => void;
  onOpenDirectory: () => void;
}

const ClinicalView: React.FC<ClinicalViewProps> = ({
  selectedPatient,
  selectedTeeth,
  treatmentTypes,
  treatmentHistory,
  onToggleTooth,
  onTreatmentSubmit,
  onPaymentRequest,
  onClosePatient,
  onOpenDirectory
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Odontogram Interface</h2>
            <p className="text-sm text-gray-500">Interactive tooth mapping and service delivery</p>
          </div>
        </div>
        
        <div className="flex justify-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <ToothSelector 
            selectedTeeth={selectedTeeth} 
            onToggleTooth={onToggleTooth} 
          />
        </div>
        
        {selectedPatient && (
          <div className="mt-6 p-6 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-indigo-900">
                {selectedTeeth.length > 0 ? `Apply to Teeth: ${selectedTeeth.join(', ')}` : 'Select Teeth to Perform Treatment'}
              </h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {treatmentTypes.map(t => (
                 <button 
                  key={t.id}
                  disabled={selectedTeeth.length === 0}
                  onClick={() => onTreatmentSubmit(t)}
                  className="flex flex-col items-start bg-white hover:bg-indigo-600 hover:text-white p-3 rounded-xl border border-indigo-100 text-left transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   <span className="text-sm font-bold group-hover:text-white text-gray-900">{t.name}</span>
                   <span className="text-xs text-indigo-600 group-hover:text-indigo-100">${t.cost} / tooth</span>
                 </button>
               ))}
            </div>
          </div>
        )}
      </div>

      {selectedPatient && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Clinical Case History</h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Anatomy (Teeth)</th>
                  <th className="px-4 py-3">Service Provided</th>
                  <th className="px-4 py-3 text-right">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {treatmentHistory.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">No clinical history recorded for this patient.</td></tr>
                ) : (
                  treatmentHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{rec.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{rec.teeth.length > 0 ? rec.teeth.join(', ') : 'General'}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{rec.description}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">${rec.cost.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

    <div className="space-y-6 h-fit">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Patient Brief</h3>
        {selectedPatient ? (
          <div className="space-y-6">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 leading-tight">{selectedPatient.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{selectedPatient.phone}</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-3">
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Outstanding Balance</p>
                 <div className="flex justify-between items-baseline">
                    <p className={`text-3xl font-black ${selectedPatient.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${selectedPatient.balance.toFixed(2)}
                    </p>
                    {selectedPatient.balance > 0 && (
                      <button 
                        onClick={() => onPaymentRequest(selectedPatient.balance)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        Collect Payment
                      </button>
                    )}
                 </div>
               </div>

               <div className={`p-4 rounded-xl border ${selectedPatient.medicalHistory ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Medical Alerts</p>
                 <p className={`text-sm ${selectedPatient.medicalHistory ? 'text-orange-900 font-medium' : 'text-gray-500 italic'}`}>
                   {selectedPatient.medicalHistory || "No active medical alerts."}
                 </p>
               </div>
               
               <button 
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm mt-2 hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                onClick={onClosePatient}
               >
                 <X size={16} /> Close Patient File
               </button>
             </div>
          </div>
        ) : (
          <div className="text-center py-12 px-4 border-2 border-dashed border-gray-100 rounded-2xl">
            <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-5 font-medium">No patient currently active in focus.</p>
            <button 
              onClick={onOpenDirectory}
              className="bg-indigo-50 text-indigo-700 font-bold px-6 py-2 rounded-xl text-xs hover:bg-indigo-100"
            >
              Open Directory
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default ClinicalView;
