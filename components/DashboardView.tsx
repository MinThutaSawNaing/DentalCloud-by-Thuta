import React, { useMemo } from 'react';
import { DollarSign, Activity, Users, Calendar as CalendarIcon, PieChart as PieIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
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

  // Appointment Status Distribution (today)
  const appointmentStatusData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysAppointments = appointments.filter(a => a.date === todayStr);
    const statusCounts: Record<string, number> = { Scheduled: 0, Completed: 0, Cancelled: 0 };

    todaysAppointments.forEach(apt => {
      statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
    });

    return Object.entries(statusCounts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [appointments]);

  const appointmentStatusColors: Record<string, string> = {
    Scheduled: '#4F46E5',
    Completed: '#10B981',
    Cancelled: '#EF4444'
  };

  // Treatment Mix (top 8 procedures by count, last 30 days)
  const treatmentMixData = useMemo(() => {
    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(today.getDate() - 29);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const map = new Map<string, number>();

    treatmentRecords
      .filter(rec => rec.date >= cutoffStr)
      .forEach(rec => {
        const key = rec.description || 'Unknown';
        map.set(key, (map.get(key) || 0) + 1);
      });

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({
        name: name.length > 18 ? name.substring(0, 18) + '...' : name,
        count
      }));
  }, [treatmentRecords]);

  // New Patients by Month (last 6 months)
  const newPatientsMonthlyData = useMemo(() => {
    const now = new Date();
    const data: { name: string; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      const count = patients.filter(p => {
        if (!p.created_at) return false;
        const created = new Date(p.created_at);
        const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
        return key === monthKey;
      }).length;

      data.push({ name: label, count });
    }

    return data;
  }, [patients]);

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
        <div className="h-[300px] w-full min-h-[300px]">
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
          <div className="h-[300px] w-full min-h-[300px]">
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
          <div className="h-[300px] w-full min-h-[300px]">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Today's Appointment Status</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
              <PieIcon className="w-3 h-3" /> Distribution
            </span>
          </div>
          <div className="h-[260px] w-full min-h-[260px] flex items-center justify-center">
            {appointmentStatusData.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No appointments scheduled today.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appointmentStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {appointmentStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={appointmentStatusColors[entry.name] || '#4B5563'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} appointments`, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Treatment Mix (Last 30 Days)</h3>
          <p className="text-xs text-gray-500 mb-4">Top procedures by frequency</p>
          <div className="h-[260px] w-full min-h-[260px]">
            {treatmentMixData.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No treatment activity recorded in the last 30 days.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={treatmentMixData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} procedures`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">New Patients (Last 6 Months)</h3>
        <p className="text-xs text-gray-500 mb-4">Monthly intake trend</p>
        <div className="h-[260px] w-full min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={newPatientsMonthlyData}>
              <defs>
                <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value} patients`, 'New Patients']} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#10B981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPatients)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
