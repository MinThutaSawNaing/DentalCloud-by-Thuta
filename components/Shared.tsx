import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ title, children, onClose }: { title: string, children?: React.ReactNode, onClose: () => void }) => (
  <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col relative animate-scale-up">
      <div className="flex-shrink-0 p-10 pb-6 border-b border-gray-100 relative">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-300 hover:text-gray-900 transition-colors">
          <X size={24} />
        </button>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight pr-12">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-10 pt-6">
        {children}
      </div>
    </div>
  </div>
);

export const Input = ({ label, ...props }: any) => (
  <div>
    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
    <input 
      {...props} 
      className="w-full border-gray-200 border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300" 
    />
  </div>
);

export const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
    }`}
  >
    <span className={active ? 'text-white' : 'text-gray-500'}>{icon}</span>
    {label}
  </button>
);

export const StatsCard = ({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-indigo-200 transition-colors">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">{icon}</div>
        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-green-50 text-green-700 uppercase tracking-wider">
          {trend}
        </span>
      </div>
      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
    </div>
  );
};
