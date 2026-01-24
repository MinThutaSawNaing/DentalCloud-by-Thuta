import React from 'react';
import { Plus, Edit2, Trash2, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { Medicine } from '../types';
import { formatCurrency, Currency } from '../utils/currency';

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
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Medicine Inventory</h2>
          <p className="text-sm text-gray-500">Manage medicine stock and pricing</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Medicine
        </button>
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Medicine</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Unit</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Price</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Min Stock</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicines.map((medicine) => {
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
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {medicine.min_stock !== undefined ? `${medicine.min_stock} ${medicine.unit}` : '—'}
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
      )}
    </div>
  );
};

export default InventoryView;

