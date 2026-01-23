import React, { useState } from 'react';
import { X, Plus, Minus, Package, Loader2 } from 'lucide-react';
import { Medicine } from '../types';
import { Modal } from './Shared';

interface MedicineSelectionModalProps {
  medicines: Medicine[];
  onConfirm: (selectedMedicines: { medicine: Medicine; quantity: number }[]) => void;
  onClose: () => void;
}

const MedicineSelectionModal: React.FC<MedicineSelectionModalProps> = ({
  medicines,
  onConfirm,
  onClose
}) => {
  const [selectedMedicines, setSelectedMedicines] = useState<Map<string, number>>(new Map());

  const availableMedicines = medicines.filter(m => m.stock > 0);

  const handleQuantityChange = (medicineId: string, change: number) => {
    const current = selectedMedicines.get(medicineId) || 0;
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine) return;

    const newQuantity = Math.max(0, Math.min(medicine.stock, current + change));
    
    if (newQuantity === 0) {
      const updated = new Map(selectedMedicines);
      updated.delete(medicineId);
      setSelectedMedicines(updated);
    } else {
      setSelectedMedicines(new Map(selectedMedicines).set(medicineId, newQuantity));
    }
  };

  const handleConfirm = () => {
    const selected = Array.from(selectedMedicines.entries())
      .map(([id, quantity]) => {
        const medicine = medicines.find(m => m.id === id);
        return medicine ? { medicine, quantity } : null;
      })
      .filter((item): item is { medicine: Medicine; quantity: number } => item !== null);

    onConfirm(selected);
  };

  const totalPrice = Array.from(selectedMedicines.entries()).reduce((sum, [id, quantity]) => {
    const medicine = medicines.find(m => m.id === id);
    return sum + (medicine ? medicine.price * quantity : 0);
  }, 0);

  return (
    <Modal title="Select Medicines" onClose={onClose}>
      <div className="space-y-4">
        {availableMedicines.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No medicines available in stock.</p>
          </div>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-4">
              {availableMedicines.map((medicine) => {
                const quantity = selectedMedicines.get(medicine.id) || 0;
                const isLowStock = medicine.min_stock !== undefined && medicine.stock <= medicine.min_stock;
                
                return (
                  <div
                    key={medicine.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      quantity > 0
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-indigo-600" />
                          <h4 className="font-bold text-gray-900">{medicine.name}</h4>
                          {isLowStock && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">
                              Low Stock
                            </span>
                          )}
                        </div>
                        {medicine.description && (
                          <p className="text-xs text-gray-500 mb-2">{medicine.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            <span className="font-medium">${medicine.price.toFixed(2)}</span> per {medicine.unit}
                          </span>
                          <span className={`text-xs ${isLowStock ? 'text-yellow-600' : 'text-gray-500'}`}>
                            Stock: {medicine.stock} {medicine.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(medicine.id, -1)}
                        disabled={quantity === 0}
                        className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={medicine.stock}
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const clamped = Math.max(0, Math.min(medicine.stock, val));
                          if (clamped === 0) {
                            const updated = new Map(selectedMedicines);
                            updated.delete(medicine.id);
                            setSelectedMedicines(updated);
                          } else {
                            setSelectedMedicines(new Map(selectedMedicines).set(medicine.id, clamped));
                          }
                        }}
                        className="w-20 text-center border border-gray-300 rounded-lg py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(medicine.id, 1)}
                        disabled={quantity >= medicine.stock}
                        className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                      {quantity > 0 && (
                        <span className="ml-auto text-sm font-bold text-indigo-600">
                          ${(medicine.price * quantity).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedMedicines.size > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Total Medicine Cost:</span>
                  <span className="text-xl font-black text-indigo-600">${totalPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {Array.from(selectedMedicines.entries())
                    .map(([id, qty]) => {
                      const med = medicines.find(m => m.id === id);
                      return med ? `${qty} ${med.unit} ${med.name}` : '';
                    })
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selectedMedicines.size === 0}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
              >
                Add to Treatment
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default MedicineSelectionModal;

