import React, { useMemo } from 'react';
import { TeethDiagram } from 'react-teeth-selector';

interface SelectorProps {
  selectedTeeth: number[];
  onToggleTooth: (id: number) => void;
}

export const ToothSelector: React.FC<SelectorProps> = ({ selectedTeeth, onToggleTooth }) => {
  // Convert array of tooth numbers to object map format required by react-teeth-selector
  const selectedTeethMap = useMemo(() => {
    const map: { [key: number]: boolean } = {};
    selectedTeeth.forEach(toothId => {
      map[toothId] = true;
    });
    return map;
  }, [selectedTeeth]);

  // Handle tooth click/toggle from react-teeth-selector
  const handleTeethChange = (newMap: { [key: number]: boolean }, info: { id: number }) => {
    // Toggle the tooth that was clicked
    onToggleTooth(info.id);
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/40 select-none w-full max-w-full mx-auto backdrop-blur-sm">
      
      {/* Diagram Title */}
      <div className="text-center mb-2 sm:mb-3">
        <h3 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-1 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Odontogram - Universal Numbering System
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Click or tap to select/deselect teeth</p>
      </div>

      {/* React Teeth Selector Component */}
      <div className="w-full flex justify-center overflow-hidden">
        <TeethDiagram 
          selectedTeeth={selectedTeethMap}
          onChange={handleTeethChange}
          width="100%"
          height="auto"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-4 border-t border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-blue-300 shadow-md shadow-blue-500/30"></div>
          <span className="text-[10px] sm:text-xs text-slate-700 font-semibold">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 shadow-sm"></div>
          <span className="text-[10px] sm:text-xs text-slate-700 font-semibold">Unselected</span>
        </div>
        <div className="px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-200/60">
          <span className="text-[10px] sm:text-xs text-blue-700 font-bold">
            {selectedTeeth.length} tooth{selectedTeeth.length !== 1 ? 's' : ''} selected
          </span>
        </div>
      </div>

    </div>
  );
};
