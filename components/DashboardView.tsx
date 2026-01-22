import React, { useMemo } from 'react';
import { DollarSign, Activity, Users, Calendar as CalendarIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { StatsCard } from './Shared';
import { Patient, Appointment, ClinicalRecord } from '../types';
import { formatCurrency, Currency } from '../utils/currency';

interface DashboardViewProps {
  patients: Patient[];
  appointments: Appointment[];
  treatmentRecords: ClinicalRecord[];
  currency: Currency;
}

const DashboardView: React.FC<DashboardViewProps> = ({ patients, appointments, treatmentRecords, currency }) => {
  // Calculate Daily Revenue (today's treatments)
  const dailyRevenue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return treatmentRecords
      .filter(record => record.date === today)
      .reduce((sum, record) => sum + (record.cost || 0), 0);
  }, [treatmentRecords]);

  // Calculate Monthly Revenue (this month's treatments)
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return treatmentRecords
      .filter(record => record.date >= startOfMonth && record.date <= endOfMonth)
      .reduce((sum, record) => sum + (record.cost || 0), 0);
  }, [treatmentRecords]);

  // Weekly Revenue Data (last 7 days)
  const weeklyRevenueData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];
      
      const revenue = treatmentRecords
        .filter(record => record.date === dateStr)
        .reduce((sum, record) => sum + (record.cost || 0), 0);
      
      weekData.push({ name: dayName, value: revenue, date: dateStr });
    }
    
    return weekData;
  }, [treatmentRecords]);

  // Appointment Revenue Performance (revenue by day over last 14 days)
  const appointmentRevenueData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfMonth = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      
      const revenue = treatmentRecords
        .filter(record => record.date === dateStr)
        .reduce((sum, record) => sum + (record.cost || 0), 0);
      
      const appointmentsCount = appointments.filter(apt => apt.date === dateStr).length;
      
      data.push({ 
        name: `${month} ${dayOfMonth}`, 
        revenue: revenue,
        appointments: appointmentsCount 
      });
    }
    
    return data;
  }, [treatmentRecords, appointments]);

  // Patient Revenue Performance (top 10 patients by total revenue)
  const patientRevenueData = useMemo(() => {
    const patientMap = new Map<string, { name: string; revenue: number }>();
    
    treatmentRecords.forEach(record => {
      const patientId = record.patient_id;
      const patientName = record.patient_name || 'Unknown';
      
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, { name: patientName, revenue: 0 });
      }
      
      const patient = patientMap.get(patientId)!;
      patient.revenue += record.cost || 0;
    });
    
    return Array.from(patientMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((patient, index) => ({
        name: patient.name.length > 15 ? patient.name.substring(0, 15) + '...' : patient.name,
        revenue: patient.revenue
      }));
  }, [treatmentRecords]);

  // Calculate trend for daily revenue (compare to yesterday)
  const dailyTrend = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const yesterdayRevenue = treatmentRecords
      .filter(record => record.date === yesterdayStr)
      .reduce((sum, record) => sum + (record.cost || 0), 0);
    
    if (yesterdayRevenue === 0) return 'N/A';
    const change = ((dailyRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  }, [dailyRevenue, treatmentRecords]);

  // Calculate trend for monthly revenue (compare to last month)
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    
    const lastMonthRevenue = treatmentRecords
      .filter(record => record.date >= lastMonthStart && record.date <= lastMonthEnd)
      .reduce((sum, record) => sum + (record.cost || 0), 0);
    
    if (lastMonthRevenue === 0) return 'N/A';
    const change = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  }, [monthlyRevenue, treatmentRecords]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Daily Revenue" value={formatCurrency(dailyRevenue, currency)} icon={<DollarSign className="text-green-600" />} trend={dailyTrend} />
        <StatsCard title="Monthly Revenue" value={formatCurrency(monthlyRevenue, currency)} icon={<Activity className="text-blue-600" />} trend={monthlyTrend} />
        <StatsCard title="Active Patients" value={patients.length.toString()} icon={<Users className="text-indigo-600" />} trend="Stable" />
        <StatsCard title="Appointments Today" value={appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length.toString()} icon={<CalendarIcon className="text-orange-600" />} trend="Busy" />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Weekly Revenue Performance</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyRevenueData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value, currency), 'Revenue']}
              />
              <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Appointment Revenue Performance</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointmentRevenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 10}} 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'revenue') {
                      return [formatCurrency(value, currency), 'Revenue'];
                    }
                    return [value, 'Appointments'];
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                <Bar dataKey="appointments" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Patient Revenue Performance</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patientRevenueData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 10}} 
                  width={120}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value, currency), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#10B981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
