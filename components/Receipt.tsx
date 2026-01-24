import React from 'react';
import { X, Printer } from 'lucide-react';
import { Patient, ClinicalRecord } from '../types';
import { formatCurrency, Currency } from '../utils/currency';

interface ReceiptProps {
  patient: Patient;
  treatments: ClinicalRecord[];
  paymentAmount?: number;
  currency: Currency;
  onClose: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({ patient, treatments, paymentAmount, currency, onClose }) => {
  const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const totalTreatmentCost = treatments.reduce((sum, treatment) => sum + (treatment.cost || 0), 0);
  const totalPaid = paymentAmount || 0;
  const remainingBalance = patient.balance || 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 print:hidden">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          {/* Header with controls */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800">Receipt Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content - A4 Size */}
        <div className="p-8 md:p-12 print:p-12" style={{ 
          width: '210mm', 
          minHeight: '297mm',
          margin: '0 auto',
          background: 'white'
        }}>
          {/* Clinic Header */}
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
            <h1 className="text-4xl font-black text-gray-900 mb-2">DentalCloud<span className="text-indigo-600">Pro</span></h1>
            <p className="text-sm text-gray-600">Professional Dental Care Services</p>
            <p className="text-xs text-gray-500 mt-2">Email: info@dentflowpro.com | Phone: (555) 123-4567</p>
          </div>

          {/* Receipt Info */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">BILL TO:</p>
              <p className="text-base font-bold text-gray-900">{patient.name}</p>
              <p className="text-sm text-gray-600">{patient.email}</p>
              <p className="text-sm text-gray-600">{patient.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Receipt #: <span className="font-semibold">{receiptNumber}</span></p>
              <p className="text-sm text-gray-600">Date: <span className="font-semibold">{today}</span></p>
            </div>
          </div>

          {/* Services Table */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">Services Provided</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-900">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-900">Teeth</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-gray-900">Amount</th>
                </tr>
              </thead>
              <tbody>
                {treatments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500 italic">
                      No treatments recorded
                    </td>
                  </tr>
                ) : (
                  treatments.map((treatment, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {new Date(treatment.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{treatment.description}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {treatment.teeth && treatment.teeth.length > 0 
                          ? treatment.teeth.join(', ') 
                          : 'General'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right font-semibold">
                        {formatCurrency(treatment.cost || 0, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mb-8">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2 border-b border-gray-300">
                  <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(totalTreatmentCost, currency)}
                  </span>
                </div>
                {totalPaid > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-300">
                    <span className="text-sm font-semibold text-gray-700">Payment Received:</span>
                    <span className="text-sm font-semibold text-green-600">
                      -{formatCurrency(totalPaid, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-3 mt-2 border-t-2 border-gray-800">
                  <span className="text-base font-bold text-gray-900">Balance Due:</span>
                  <span className={`text-base font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(remainingBalance, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details (if payment was made) */}
          {totalPaid > 0 && (
            <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-2">Payment Details:</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Amount:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalPaid, currency)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Payment Date:</span>
                <span className="font-semibold text-gray-900">{today}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Payment Status:</span>
                <span className="font-semibold text-green-600">Paid</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t-2 border-gray-800 text-center">
            <p className="text-xs text-gray-600 mb-2">
              Thank you for choosing DentalCloud Pro for your dental care needs.
            </p>
            <p className="text-xs text-gray-500">
              This is a computer-generated receipt. No signature required.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Please retain this receipt for your records.
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* Receipt for Printing */}
      <div className="receipt-print hidden print:block">
        <div className="receipt-content" style={{ 
          width: '210mm', 
          minHeight: '297mm',
          margin: '0 auto',
          padding: '12mm',
          background: 'white',
          fontSize: '12pt',
          fontFamily: 'system-ui, sans-serif'
        }}>
          {/* Clinic Header */}
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
            <h1 className="text-4xl font-black text-gray-900 mb-2">DentalCloud<span className="text-indigo-600">Pro</span></h1>
            <p className="text-sm text-gray-600">Professional Dental Care Services</p>
            <p className="text-xs text-gray-500 mt-2">Email: info@dentflowpro.com | Phone: (555) 123-4567</p>
          </div>

          {/* Receipt Info */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">BILL TO:</p>
              <p className="text-base font-bold text-gray-900">{patient.name}</p>
              <p className="text-sm text-gray-600">{patient.email}</p>
              <p className="text-sm text-gray-600">{patient.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Receipt #: <span className="font-semibold">{receiptNumber}</span></p>
              <p className="text-sm text-gray-600">Date: <span className="font-semibold">{today}</span></p>
            </div>
          </div>

          {/* Services Table */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">Services Provided</h3>
            <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-900" style={{ borderBottom: '2px solid #1f2937' }}>Date</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-900" style={{ borderBottom: '2px solid #1f2937' }}>Description</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-900" style={{ borderBottom: '2px solid #1f2937' }}>Teeth</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-gray-900" style={{ borderBottom: '2px solid #1f2937' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {treatments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500 italic" style={{ padding: '24px 16px' }}>
                      No treatments recorded
                    </td>
                  </tr>
                ) : (
                  treatments.map((treatment, index) => (
                    <tr key={index} className="border-b border-gray-200" style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td className="py-3 px-4 text-sm text-gray-700" style={{ padding: '12px 16px' }}>
                        {new Date(treatment.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium" style={{ padding: '12px 16px' }}>{treatment.description}</td>
                      <td className="py-3 px-4 text-sm text-gray-600" style={{ padding: '12px 16px' }}>
                        {treatment.teeth && treatment.teeth.length > 0 
                          ? treatment.teeth.join(', ') 
                          : 'General'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right font-semibold" style={{ padding: '12px 16px' }}>
                        ${(treatment.cost || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mb-8">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2 border-b border-gray-300" style={{ borderBottom: '1px solid #d1d5db', padding: '8px 0' }}>
                  <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    ${totalTreatmentCost.toFixed(2)}
                  </span>
                </div>
                {totalPaid > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-300" style={{ borderBottom: '1px solid #d1d5db', padding: '8px 0' }}>
                    <span className="text-sm font-semibold text-gray-700">Payment Received:</span>
                    <span className="text-sm font-semibold text-green-600">
                      -${totalPaid.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-3 mt-2 border-t-2 border-gray-800" style={{ borderTop: '2px solid #1f2937', padding: '12px 0' }}>
                  <span className="text-base font-bold text-gray-900">Balance Due:</span>
                  <span className={`text-base font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details (if payment was made) */}
          {totalPaid > 0 && (
            <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg" style={{ padding: '16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <p className="text-sm font-semibold text-gray-900 mb-2">Payment Details:</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Amount:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalPaid, currency)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Payment Date:</span>
                <span className="font-semibold text-gray-900">{today}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Payment Status:</span>
                <span className="font-semibold text-green-600">Paid</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t-2 border-gray-800 text-center" style={{ marginTop: '48px', paddingTop: '24px', borderTop: '2px solid #1f2937' }}>
            <p className="text-xs text-gray-600 mb-2">
              Thank you for choosing DentalCloud Pro for your dental care needs.
            </p>
            <p className="text-xs text-gray-500">
              This is a computer-generated receipt. No signature required.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Please retain this receipt for your records.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print,
          .receipt-print * {
            visibility: visible;
          }
          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .receipt-content {
            position: relative;
            margin: 0 auto;
          }
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </>
  );
};

export default Receipt;

