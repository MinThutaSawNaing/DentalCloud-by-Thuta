import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, Loader2, User } from 'lucide-react';
import { Doctor, DoctorSchedule } from '../types';

interface DoctorsViewProps {
  doctors: Doctor[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (doctor: Doctor) => void;
  onDelete: (id: string) => void;
}

const DoctorsView: React.FC<DoctorsViewProps> = ({
  doctors,
  loading,
  onAdd,
  onEdit,
  onDelete
}) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const formatSchedule = (schedules: DoctorSchedule[]) => {
    if (schedules.length === 0) return 'No schedule set';
    
    const grouped = schedules.reduce((acc, sched) => {
      const dayName = dayNames[sched.day_of_week];
      if (!acc[dayName]) acc[dayName] = [];
      acc[dayName].push(`${sched.start_time} - ${sched.end_time}`);
      return acc;
    }, {} as Record<string, string[]>);

    return Object.entries(grouped)
      .map(([day, times]) => `${day}: ${times.join(', ')}`)
      .join(' | ');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Doctors & Schedules</h2>
          <p className="text-sm text-gray-500">Manage doctors and their working schedules</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Doctor
        </button>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="animate-spin text-indigo-600" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="p-12 text-center text-gray-400 italic">
          No doctors found. Add your first doctor to begin.
        </div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                      {doctor.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{doctor.name}</h3>
                      {doctor.specialization && (
                        <p className="text-sm text-gray-600">{doctor.specialization}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(doctor)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit doctor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete Dr. ${doctor.name}?`)) {
                          onDelete(doctor.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete doctor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {doctor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Email:</span>
                      <span>{doctor.email}</span>
                    </div>
                  )}
                  {doctor.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Phone:</span>
                      <span>{doctor.phone}</span>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Schedule</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {formatSchedule(doctor.schedules)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsView;

