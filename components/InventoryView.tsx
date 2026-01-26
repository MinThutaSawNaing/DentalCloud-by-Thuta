import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Package, AlertTriangle, Loader2, FileDown } from 'lucide-react';
import { Medicine } from '../types';
import { formatCurrency, Currency } from '../utils/currency';
import { exportInventoryToPDF } from '../utils/pdfExport';
import Pagination from './Pagination';

interface InventoryViewProps {
  medicines: Medicine[];
  loading: boolean;
  currency: Currency;
  onAdd: () => void;
  onEdit: (medicine: Medicine) => void;
  onDelete: (id: string) => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({
  medicines,
  loading,
  currency,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  // Filtered data based on search term
  const filteredMedicines = useMemo(() => {
    if (!searchTerm) return medicines;
    const term = searchTerm.toLowerCase();
    return medicines.filter(medicine => 
      medicine.name.toLowerCase().includes(term) ||
      medicine.description?.toLowerCase().includes(term) ||
      medicine.category?.toLowerCase().includes(term) ||
      medicine.unit.toLowerCase().includes(term)
    );
  }, [medicines, searchTerm]);

  // Paginated data
  const paginatedMedicines = useMemo(() => {
    if (showAll) return filteredMedicines;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMedicines.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMedicines, currentPage, showAll]);

  // Reset to first page when medicines change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [medicines]);

  const handleDownloadPDF = () => {
    exportInventoryToPDF(medicines, currency);
  };

  const getStockStatus = (stock: number, minStock?: number) => {
    if (minStock !== undefined && stock <= minStock) {
      return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: <AlertTriangle size={14} /> };
    }
    if (stock === 0) {
      return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: <AlertTriangle size={14} /> };
    }
    if (minStock !== undefined && stock <= minStock * 1.5) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: <AlertTriangle size={14} /> };
    }
    return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: null };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Medicine Inventory</h2>
        <p className="text-sm text-gray-500">Manage medicine stock and pricing</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <div className="relative flex-1 sm:flex-initial">
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={medicines.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Export PDF</span>
          </button>
          <button
            onClick={onAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Medicine</span>
          </button>
        </div>
      </div>
    </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="animate-spin text-indigo-600" />
        </div>
      ) : medicines.length === 0 ? (
        <div className="p-12 text-center text-gray-400 italic">
          No medicines in inventory. Add your first medicine to begin.
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Medicine</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Unit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedMedicines.map((medicine) => {
                  const status = getStockStatus(medicine.stock, medicine.min_stock);
                  return (
                    <tr key={medicine.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Package className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{medicine.name}</div>
                            {medicine.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{medicine.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {medicine.category ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {medicine.category}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{medicine.unit}</td>
                      <td className="px-6 py-4 text-gray-900 font-black">{formatCurrency(medicine.price || 0, currency)}</td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${status.bg} ${status.color} ${status.border}`}>
                          {status.icon}
                          {medicine.stock} {medicine.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => onEdit(medicine)}
                          className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                          title="Edit medicine"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${medicine.name}"?`)) {
                              onDelete(medicine.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Delete medicine"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {paginatedMedicines.map((medicine) => {
              const status = getStockStatus(medicine.stock, medicine.min_stock);
              return (
                <div key={medicine.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Package className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{medicine.name}</div>
                        <div className="text-xs text-gray-500">{medicine.category || 'No Category'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(medicine)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDelete(medicine.id)} className="p-2 text-red-600 bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Price / Unit</p>
                      <p className="text-sm font-black text-gray-900">{formatCurrency(medicine.price || 0, currency)} / {medicine.unit}</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${status.bg} ${status.border}`}>
                      <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${status.color}`}>Stock Level</p>
                      <div className={`text-sm font-black flex items-center gap-1.5 ${status.color}`}>
                        {status.icon}
                        {medicine.stock} {medicine.unit}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {!loading && medicines.length > 0 && (
        <Pagination
          totalItems={medicines.length}
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

export default InventoryView;

