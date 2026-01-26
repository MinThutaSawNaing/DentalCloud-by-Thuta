import React, { useState } from 'react';
import { Settings as SettingsIcon, DollarSign, MapPin, Award, Plus, Trash2 } from 'lucide-react';
import { Location, LoyaltyRule } from '../types';
import { Modal, Input } from './Shared';

interface SettingsViewProps {
  currency: 'USD' | 'MMK';
  onCurrencyChange: (currency: 'USD' | 'MMK') => void;
  locations: Location[];
  onAddLocation: (loc: Partial<Location>) => void;
  loyaltyRules: LoyaltyRule[];
  onUpdateLoyaltyRule: (id: string, data: Partial<LoyaltyRule>) => void;
  onCreateLoyaltyRule: (data: Partial<LoyaltyRule>) => void;
  isAdmin: boolean;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  currency, 
  onCurrencyChange, 
  locations, 
  onAddLocation, 
  loyaltyRules,
  onUpdateLoyaltyRule,
  onCreateLoyaltyRule,
  isAdmin 
}) => {
  const [showLocModal, setShowLocModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newLoc, setNewLoc] = useState<Partial<Location>>({ name: '', address: '', phone: '' });
  const [newRule, setNewRule] = useState<Partial<LoyaltyRule>>({ 
    name: '', 
    event_type: 'TREATMENT', 
    points_per_unit: 0.001, 
    active: true 
  });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const handleAddLoc = (e: React.FormEvent) => {
    e.preventDefault();
    onAddLocation(newLoc);
    setShowLocModal(false);
    setNewLoc({ name: '', address: '', phone: '' });
  };

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRuleId) {
      onUpdateLoyaltyRule(editingRuleId, newRule);
    } else {
      onCreateLoyaltyRule(newRule);
    }
    setShowRuleModal(false);
    setEditingRuleId(null);
    setNewRule({ name: '', event_type: 'TREATMENT', points_per_unit: 0.001, active: true });
  };
  const currencySymbols = {
    USD: '$',
    MMK: 'Ks'
  };

  const currencyNames = {
    USD: 'US Dollar',
    MMK: 'Myanmar Kyat'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">System Settings</h2>
            <p className="text-sm text-gray-500">Customize your clinic management system</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Currency Settings */}
        <div className="border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">Currency Settings</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Select the currency to display throughout the system for all financial transactions and reports.
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
              style={{ borderColor: currency === 'USD' ? '#4F46E5' : '#E5E7EB' }}>
              <input
                type="radio"
                name="currency"
                value="USD"
                checked={currency === 'USD'}
                onChange={() => onCurrencyChange('USD')}
                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{currencyNames.USD}</div>
                <div className="text-sm text-gray-500">Symbol: {currencySymbols.USD}</div>
              </div>
              {currency === 'USD' && (
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
              )}
            </label>

            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
              style={{ borderColor: currency === 'MMK' ? '#4F46E5' : '#E5E7EB' }}>
              <input
                type="radio"
                name="currency"
                value="MMK"
                checked={currency === 'MMK'}
                onChange={() => onCurrencyChange('MMK')}
                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{currencyNames.MMK}</div>
                <div className="text-sm text-gray-500">Symbol: {currencySymbols.MMK}</div>
              </div>
              {currency === 'MMK' && (
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
              )}
            </label>
          </div>

          <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <p className="text-xs text-indigo-700">
              <strong>Note:</strong> Currency changes will be applied immediately across all views including receipts, invoices, and financial reports.
            </p>
          </div>
        </div>

        {/* Location Management */}
        {isAdmin && (
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-800">Clinic Locations</h3>
              </div>
              <button 
                onClick={() => setShowLocModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={14} /> Add Location
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map(loc => (
                <div key={loc.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900">{loc.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{loc.address}</p>
                    <p className="text-xs text-gray-500">{loc.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loyalty Program Settings */}
        <div className="border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-800">Loyalty Rewards Program</h3>
            </div>
            {isAdmin && (
              <button 
                onClick={() => {
                  setEditingRuleId(null);
                  setNewRule({ name: '', event_type: 'TREATMENT', points_per_unit: 0.001, active: true });
                  setShowRuleModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={14} /> Add Rule
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Configure how patients earn points for treatments and purchases.
          </p>
          
          <div className="space-y-4">
            {loyaltyRules.length === 0 ? (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
                  <Award size={16} /> No Custom Rules Defined
                </div>
                <p className="text-xs text-amber-700">
                  The system is using the default rate: 1 Point per 1,000 MMK spent.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loyaltyRules.map(rule => (
                  <div key={rule.id} className={`p-4 border rounded-xl flex justify-between items-start ${rule.active ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{rule.name}</h4>
                        {!rule.active && <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded uppercase font-bold text-gray-500">Inactive</span>}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Event: <span className="font-semibold">{rule.event_type}</span></p>
                      <p className="text-xs text-amber-700 font-bold mt-1">
                        {rule.event_type === 'REDEEM' 
                          ? `Rate: 1 Point = ${rule.points_per_unit} units discount (Min ${rule.min_amount || 0} points)`
                          : `Rate: ${rule.points_per_unit * 1000} Points / 1000 units`
                        }
                      </p>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          setEditingRuleId(rule.id);
                          setNewRule(rule);
                          setShowRuleModal(true);
                        }}
                        className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-700 transition-colors"
                      >
                        <SettingsIcon size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* About Us Section */}
        <div className="border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800">About DentalCloud Pro</h3>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed">
              This is the product developed by <span className="font-semibold text-indigo-600">WinterArc Myanmar Company Limited</span>. 
              If there is any issues, renew or upgrade the software, contact us:
            </p>
            
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Phone:</span>
                <a href="tel:+959977144320" className="text-sm text-indigo-600 hover:underline">+959977144320</a>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Email:</span>
                <a href="mailto:winterarcmyanmar@yahoo.com" className="text-sm text-indigo-600 hover:underline">winterarcmyanmar@yahoo.com</a>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                © {new Date().getFullYear()} WinterArc Myanmar Company Limited. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showLocModal && (
        <Modal title="Add New Clinic Location" onClose={() => setShowLocModal(false)}>
          <form onSubmit={handleAddLoc} className="space-y-4">
            <Input label="Location Name" required value={newLoc.name} onChange={e => setNewLoc({...newLoc, name: e.target.value})} placeholder="e.g. Downtown Branch" />
            <Input label="Address" required value={newLoc.address} onChange={e => setNewLoc({...newLoc, address: e.target.value})} />
            <Input label="Phone" required value={newLoc.phone} onChange={e => setNewLoc({...newLoc, phone: e.target.value})} />
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">Create Location</button>
          </form>
        </Modal>
      )}

      {showRuleModal && (
        <Modal title={editingRuleId ? "Edit Loyalty Rule" : "Create Loyalty Rule"} onClose={() => setShowRuleModal(false)}>
          <form onSubmit={handleRuleSubmit} className="space-y-4">
            <Input label="Rule Name" required value={newRule.name} onChange={e => setNewRule({...newRule, name: e.target.value})} placeholder="e.g. Standard Treatment Points" />
            
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Event Type</label>
              <select 
                className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newRule.event_type}
                onChange={e => setNewRule({...newRule, event_type: e.target.value as any})}
              >
                <option value="TREATMENT">Clinical Treatment (Earn)</option>
                <option value="PURCHASE">Medicine Purchase (Earn)</option>
                <option value="VISIT">Clinic Visit (Earn)</option>
                <option value="REDEEM">Points Redemption (Spend)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                   {newRule.event_type === 'REDEEM' ? 'Currency Value per Point' : 'Points per 1000 MMK'}
                 </label>
                 <input 
                   type="number" 
                   step={newRule.event_type === 'REDEEM' ? "1" : "0.1"}
                   className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                   value={newRule.event_type === 'REDEEM' ? (newRule.points_per_unit || 0) : (newRule.points_per_unit || 0) * 1000}
                   onChange={e => {
                     const val = parseFloat(e.target.value);
                     setNewRule({
                       ...newRule, 
                       points_per_unit: newRule.event_type === 'REDEEM' ? val : val / 1000
                     });
                   }}
                 />
               </div>
               <div>
                 <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                   {newRule.event_type === 'REDEEM' ? 'Min Points to Redeem' : 'Min Amount to Earn'}
                 </label>
                 <input 
                   type="number" 
                   className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                   value={newRule.min_amount || 0}
                   onChange={e => setNewRule({...newRule, min_amount: parseFloat(e.target.value)})}
                 />
               </div>
            </div>

            <div className="flex items-center mt-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="checkbox"
                     checked={newRule.active}
                     onChange={e => setNewRule({...newRule, active: e.target.checked})}
                     className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                   />
                   <span className="text-sm font-medium text-gray-700">Active Rule</span>
                 </label>
               </div>

            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">
              {editingRuleId ? "Update Rule" : "Create Rule"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SettingsView;

