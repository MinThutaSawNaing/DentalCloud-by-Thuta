import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { TreatmentType } from '../types';

interface TreatmentConfigViewProps {
  treatmentTypes: TreatmentType[];
  onAdd: () => void;
  onEdit: (t: TreatmentType) => void;
  onDelete: (id: string) => void;
}

const TreatmentConfigView: React.FC<TreatmentConfigViewProps> = ({ treatmentTypes, onAdd, onEdit, onDelete }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
     <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Treatment Catalogue</h2>
        <p className="text-sm text-gray-500">Configure clinical services and standard pricing</p>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
        <Plus className="w-4 h-4" /> Add New Service
      </button>
    </div>
    <table className="w-full">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Service Name</th>
          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Specialty Category</th>
          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Standard Fee</th>
          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Management</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {treatmentTypes.map(t => (
          <tr key={t.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4 font-bold text-gray-900">{t.name}</td>
            <td className="px-6 py-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                t.category === 'Surgery' ? 'bg-red-50 text-red-700 border-red-100' :
                t.category === 'Preventative' ? 'bg-green-50 text-green-700 border-green-100' :
                'bg-blue-50 text-blue-700 border-blue-100'
              }`}>{t.category}</span>
            </td>
            <td className="px-6 py-4 text-gray-900 font-black">${t.cost.toFixed(2)}</td>
            <td className="px-6 py-4 text-right space-x-2">
              <button 
                onClick={() => onEdit(t)}
                className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
              >
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDelete(t.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                <Trash2 size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TreatmentConfigView;
