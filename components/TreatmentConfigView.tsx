import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, FileDown } from 'lucide-react';
import { TreatmentType } from '../types';
import { formatCurrency, Currency } from '../utils/currency';
import Pagination from './Pagination';

interface TreatmentConfigViewProps {
  treatmentTypes: TreatmentType[];
  currency: Currency;
  onAdd: () => void;
  onEdit: (t: TreatmentType) => void;
  onDelete: (id: string) => void;
}

const TreatmentConfigView: React.FC<TreatmentConfigViewProps> = ({ treatmentTypes, currency, onAdd, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  // Filtered data based on search term
  const filteredTypes = useMemo(() => {
    if (!searchTerm) return treatmentTypes;
    const term = searchTerm.toLowerCase();
    return treatmentTypes.filter(type => 
      type.name.toLowerCase().includes(term) ||
      type.category.toLowerCase().includes(term)
    );
  }, [treatmentTypes, searchTerm]);

  // Paginated data
  const paginatedTypes = useMemo(() => {
    if (showAll) return filteredTypes;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTypes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTypes, currentPage, showAll]);

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [treatmentTypes]);

  const handleDownloadPDF = () => {
    // Simple CSV export for treatments
    const csv = ['Service Name,Category,Standard Fee',
      ...treatmentTypes.map(t => `"${t.name}","${t.category}","${formatCurrency(t.cost || 0, currency)}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `treatment-catalogue-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
     <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Treatment Catalogue</h2>
        <p className="text-sm text-gray-500">Configure clinical services and standard pricing</p>
      </div>
      <div className="flex gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search treatments..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button 
          onClick={handleDownloadPDF}
          disabled={treatmentTypes.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="w-4 h-4" /> Export CSV
        </button>
        <button onClick={onAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add New Service
        </button>
      </div>
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
        {treatmentTypes.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
              No treatment types configured. Add your first service to begin.
            </td>
          </tr>
        ) : (
          paginatedTypes.map(t => (
          <tr key={t.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4 font-bold text-gray-900">{t.name}</td>
            <td className="px-6 py-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                t.category === 'Surgery' ? 'bg-red-50 text-red-700 border-red-100' :
                t.category === 'Preventative' ? 'bg-green-50 text-green-700 border-green-100' :
                'bg-blue-50 text-blue-700 border-blue-100'
              }`}>{t.category}</span>
            </td>
            <td className="px-6 py-4 text-gray-900 font-black">{formatCurrency(t.cost || 0, currency)}</td>
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
          ))
        )}
      </tbody>
    </table>
    {treatmentTypes.length > 0 && (
      <Pagination
        totalItems={treatmentTypes.length}
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

export default TreatmentConfigView;
