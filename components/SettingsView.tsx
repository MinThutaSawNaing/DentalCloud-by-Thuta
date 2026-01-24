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
    </div>
  );
};

export default SettingsView;

