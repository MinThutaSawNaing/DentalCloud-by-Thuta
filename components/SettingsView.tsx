import React from 'react';
import { Settings as SettingsIcon, DollarSign } from 'lucide-react';

interface SettingsViewProps {
  currency: 'USD' | 'MMK';
  onCurrencyChange: (currency: 'USD' | 'MMK') => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currency, onCurrencyChange }) => {
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
      </div>
    </div>
  );
};

export default SettingsView;

