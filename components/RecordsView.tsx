import React, { useState, useMemo } from 'react';
import { Activity, Loader2, Download, Trash2, FileDown } from 'lucide-react';
import { ClinicalRecord } from '../types';
import { formatCurrency, Currency } from '../utils/currency';
import { exportClinicalRecordsToPDF } from '../utils/pdfExport';
import Pagination from './Pagination';

interface RecordsViewProps {
  records: ClinicalRecord[];
  loading: boolean;
  onRefresh: () => void;
  onDeleteAll: () => void;
  currency: Currency;
}

const RecordsView: React.FC<RecordsViewProps> = ({ records, loading, onRefresh, onDeleteAll, currency }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  // Filtered data based on search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const term = searchTerm.toLowerCase();
    return records.filter(record => 
      (record.patient_name || '').toLowerCase().includes(term) ||
      record.description.toLowerCase().includes(term) ||
      record.date.toLowerCase().includes(term) ||
      record.teeth.some(tooth => tooth.toString().includes(term))
    );
  }, [records, searchTerm]);

  // Paginated data
  const paginatedRecords = useMemo(() => {
    if (showAll) return filteredRecords;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, showAll]);

  // Reset to first page when records change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [records]);

  const handleDownloadPDF = () => {
    exportClinicalRecordsToPDF(records, currency);
  };

  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinic-audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // After download, ask if user wants to delete
    setTimeout(() => {
      if (confirm(`Download complete! Do you want to delete all ${records.length} audit log records from the database? This will free up space but cannot be undone.`)) {
        onDeleteAll();
      }
    }, 500);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
     <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Clinic Registry Audit</h2>
          <p className="text-sm text-gray-500">Master log of all performed clinical treatments</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search records..."
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
            disabled={records.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={16} /> Download PDF
          </button>
          <button 
            onClick={handleDownloadJSON} 
            disabled={records.length === 0}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> Download JSON
          </button>
          <button onClick={onRefresh} className="text-indigo-600 text-sm font-bold flex items-center gap-2 hover:underline">
            <Activity size={16} /> Refresh Log
          </button>
        </div>
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
          {records.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                No audit records found.
              </td>
            </tr>
          ) : (
            paginatedRecords.map((rec) => (
              <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-500">{rec.date}</td>
                <td className="px-6 py-4 font-bold text-gray-900">{rec.patient_name || "Unknown"}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{rec.description}</td>
                <td className="px-6 py-4 text-xs font-mono text-gray-500">
                  {rec.teeth && rec.teeth.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {rec.teeth.map(t => <span key={t} className="bg-gray-100 px-1 rounded">{t}</span>)}
                    </div>
                  ) : 'Gen.'}
                </td>
                <td className="px-6 py-4 text-right text-sm font-black text-gray-900">{formatCurrency(rec.cost || 0, currency)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    )}
    {!loading && records.length > 0 && (
      <Pagination
        totalItems={records.length}
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

export default RecordsView;
