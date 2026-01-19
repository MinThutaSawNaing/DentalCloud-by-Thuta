import React from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { ClinicalRecord } from '../types';

interface RecordsViewProps {
  records: ClinicalRecord[];
  loading: boolean;
  onRefresh: () => void;
}

const RecordsView: React.FC<RecordsViewProps> = ({ records, loading, onRefresh }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
     <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Clinic Registry Audit</h2>
          <p className="text-sm text-gray-500">Master log of all performed clinical treatments</p>
        </div>
        <button onClick={onRefresh} className="text-indigo-600 text-sm font-bold flex items-center gap-2 hover:underline">
          <Activity size={16} /> Refresh Log
        </button>
    </div>
    {loading ? (
      <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
    ) : (
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Patient File</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Clinical Event</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Anatomy</th>
            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Billed Amt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((rec) => (
            <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-500">{rec.date}</td>
              <td className="px-6 py-4 font-bold text-gray-900">{rec.patient_name || "Unknown"}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{rec.description}</td>
              <td className="px-6 py-4 text-xs font-mono text-gray-500">
                {rec.teeth.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {rec.teeth.map(t => <span key={t} className="bg-gray-100 px-1 rounded">{t}</span>)}
                  </div>
                ) : 'Gen.'}
              </td>
              <td className="px-6 py-4 text-right text-sm font-black text-gray-900">${rec.cost.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
   </div>
);

export default RecordsView;
