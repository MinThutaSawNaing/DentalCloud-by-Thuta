import React from 'react';
import { DollarSign, Activity, Users, Calendar as CalendarIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { StatsCard } from './Shared';
import { Patient, Appointment } from '../types';
import { mockRevenueData } from '../constants';

interface DashboardViewProps {
  patients: Patient[];
  appointments: Appointment[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ patients, appointments }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatsCard title="Daily Revenue" value={`$2,450`} icon={<DollarSign className="text-green-600" />} trend="+12%" />
      <StatsCard title="Monthly Revenue" value={`$34,200`} icon={<Activity className="text-blue-600" />} trend="+5%" />
      <StatsCard title="Active Patients" value={patients.length.toString()} icon={<Users className="text-indigo-600" />} trend="Stable" />
      <StatsCard title="Appointments Today" value={appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length.toString()} icon={<CalendarIcon className="text-orange-600" />} trend="Busy" />
    </div>

    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Revenue Performance</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockRevenueData}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export default DashboardView;
