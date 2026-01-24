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
  const handleTeethChange = (newMap: { [key: number]: boolean }, info: { id: any }) => {
    // Ensure the ID is a number before passing it up
    const toothId = typeof info.id === 'string' ? parseInt(info.id, 10) : info.id;
    if (!isNaN(toothId)) {
      onToggleTooth(toothId);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-4 p-2 sm:p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 rounded-xl border border-slate-200/60 shadow-lg shadow-slate-200/40 select-none w-full max-w-full mx-auto backdrop-blur-sm overflow-hidden">
      
      {/* Diagram Title */}
      <div className="text-center mb-1 sm:mb-2">
        <h3 className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-[0.2em] mb-0.5 flex items-center justify-center gap-2">
          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Odontogram Chart
        </h3>
        <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">Select multiple teeth for treatment</p>
      </div>

      {/* React Teeth Selector Component - Scaled down for better fit */}
      <div className="w-full flex justify-center py-2 px-1 overflow-x-auto scrollbar-hide">
        <div className="min-w-[500px] sm:min-w-0 w-full max-w-[800px] transform scale-[0.85] sm:scale-100 origin-center">
          <TeethDiagram 
            selectedTeeth={selectedTeethMap}
            onChange={handleTeethChange}
            width="100%"
            height="auto"
          />
        </div>
      </div>

      {/* Legend - Compact */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2 border-t border-slate-200/60 w-full">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-300 shadow-sm"></div>
          <span className="text-[9px] sm:text-[10px] text-slate-700 font-semibold">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shadow-sm"></div>
          <span className="text-[9px] sm:text-[10px] text-slate-700 font-semibold">Available</span>
        </div>
        <div className="ml-auto px-2 py-0.5 bg-blue-50 rounded-full border border-blue-200/60">
          <span className="text-[9px] sm:text-[10px] text-blue-700 font-bold">
            {selectedTeeth.length} Selected
          </span>
        </div>
      </div>

    </div>
  );
};
