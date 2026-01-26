import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Loader2, Edit2, Trash2, Clock, User, FileText, FileDown } from 'lucide-react';
import { Appointment } from '../types';
import { exportAppointmentsToPDF } from '../utils/pdfExport';
import Pagination from './Pagination';

interface AppointmentsViewProps {
  appointments: Appointment[];
  loading: boolean;
  onAddAppointment: () => void;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onUpdateStatus: (id: string, status: 'Scheduled' | 'Completed' | 'Cancelled') => void;
}

const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  loading,
  onAddAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onUpdateStatus
}) => {
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    // Handle both "HH:MM:SS" and "HH:MM" formats
    const time = timeString.split(':').slice(0, 2).join(':');
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'Cancelled':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  // Filtered data based on search term
  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments;
    const term = searchTerm.toLowerCase();
    return appointments.filter(apt => 
      apt.patient_name?.toLowerCase().includes(term) ||
      apt.type?.toLowerCase().includes(term) ||
      apt.doctor_name?.toLowerCase().includes(term) ||
      apt.date.toLowerCase().includes(term) ||
      apt.time.toLowerCase().includes(term) ||
      apt.status.toLowerCase().includes(term) ||
      apt.notes?.toLowerCase().includes(term)
    );
  }, [appointments, searchTerm]);

  // Separate upcoming and past appointments
  const upcomingAppointments = filteredAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    aptDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return aptDate >= today && apt.status === 'Scheduled';
  }).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  const pastAppointments = filteredAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    aptDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return aptDate < today || apt.status !== 'Scheduled';
  }).sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });

  // Paginated data
  const paginatedUpcoming = useMemo(() => {
    if (showAllUpcoming) return upcomingAppointments;
    const startIndex = (upcomingPage - 1) * itemsPerPage;
    return upcomingAppointments.slice(startIndex, startIndex + itemsPerPage);
  }, [upcomingAppointments, upcomingPage, showAllUpcoming]);

  const paginatedPast = useMemo(() => {
    if (showAllPast) return pastAppointments;
    const startIndex = (pastPage - 1) * itemsPerPage;
    return pastAppointments.slice(startIndex, startIndex + itemsPerPage);
  }, [pastAppointments, pastPage, showAllPast]);

  const handleDownloadPDF = () => {
    exportAppointmentsToPDF(appointments);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Appointment Schedule</h2>
        <p className="text-sm text-gray-500">Manage patient appointments and scheduling</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <div className="relative flex-1 sm:flex-initial">
          <input
            type="text"
            placeholder="Search appointments..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setUpcomingPage(1); // Reset to first page when searching
              setPastPage(1);
            }}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={appointments.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Export PDF</span>
          </button>
          <button
            onClick={onAddAppointment}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Appointment</span>
          </button>
        </div>
      </div>
    </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="p-6">
          {/* Upcoming Appointments */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Upcoming Appointments
            </h3>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 italic text-sm">
                No upcoming appointments scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedUpcoming.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 w-full">
                      <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-indigo-100 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-indigo-700">
                          {new Date(appointment.date).toLocaleDateString('en-US', { day: 'numeric' })}
                        </span>
                        <span className="text-[10px] sm:text-xs text-indigo-600 uppercase">
                          {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">{appointment.patient_name || 'Unknown Patient'}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(appointment.time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {appointment.type || 'Checkup'}
                          </span>
                          {appointment.doctor_name && (
                            <span className="flex items-center gap-1 text-indigo-600 font-medium">
                              <User className="w-3 h-3" />
                              Dr. {appointment.doctor_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <select
                        value={appointment.status}
                        onChange={(e) => onUpdateStatus(appointment.id, e.target.value as any)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1 sm:flex-initial"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onEditAppointment(appointment)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit appointment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete this appointment?`)) {
                              onDeleteAppointment(appointment.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete appointment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {upcomingAppointments.length > 0 && (
              <Pagination
                totalItems={upcomingAppointments.length}
                itemsPerPage={itemsPerPage}
                currentPage={upcomingPage}
                onPageChange={setUpcomingPage}
                showAll={showAllUpcoming}
                onToggleShowAll={() => setShowAllUpcoming(!showAllUpcoming)}
              />
            )}
          </div>

          {/* Past Appointments */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              Past Appointments
            </h3>
            {pastAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 italic text-sm">
                No past appointments found.
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedPast.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors opacity-75"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-gray-700">
                          {new Date(appointment.date).toLocaleDateString('en-US', { day: 'numeric' })}
                        </span>
                        <span className="text-xs text-gray-600">
                          {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-gray-700">{appointment.patient_name || 'Unknown Patient'}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(appointment.time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {appointment.type || 'Checkup'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(appointment.date)}
                          </span>
                        </div>
                        {appointment.notes && (
                          <p className="text-xs text-gray-600 mt-2 italic">{appointment.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={appointment.status}
                        onChange={(e) => onUpdateStatus(appointment.id, e.target.value as any)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <button
                        onClick={() => onEditAppointment(appointment)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit appointment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete this appointment?`)) {
                            onDeleteAppointment(appointment.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete appointment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pastAppointments.length > 0 && (
              <Pagination
                totalItems={pastAppointments.length}
                itemsPerPage={itemsPerPage}
                currentPage={pastPage}
                onPageChange={setPastPage}
                showAll={showAllPast}
                onToggleShowAll={() => setShowAllPast(!showAllPast)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsView;

