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
  const handleTeethChange = (newMap: { [key: number]: boolean }, info: any) => {
    // The library might pass the ID in different ways depending on version
    // Let's try to get it from info.id or info
    const id = info?.id !== undefined ? info.id : info;
    const toothId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (toothId && !isNaN(toothId)) {
      onToggleTooth(toothId);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 p-3 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm select-none w-full max-w-full mx-auto backdrop-blur-sm overflow-hidden">
      
      {/* Diagram Title */}
      <div className="text-center mb-1">
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Clinical Odontogram
        </h3>
        <p className="text-[10px] text-slate-500">Multi-select enabled</p>
      </div>

      {/* React Teeth Selector Component - Removed scale to fix click targets and adjusted width */}
      <div className="w-full flex justify-center py-1">
        <div className="w-full max-w-[450px]">
          <TeethDiagram 
            selectedTeeth={selectedTeethMap}
            onChange={handleTeethChange}
            width="100%"
            height="auto"
          />
        </div>
      </div>

      {/* Legend - Very Compact */}
      <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100 mt-1">
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-[9px] text-slate-600 font-medium">Selected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
            <span className="text-[9px] text-slate-600 font-medium">Available</span>
          </div>
        </div>
        <div className="px-2 py-0.5 bg-blue-50 rounded text-[9px] text-blue-700 font-bold border border-blue-100">
          {selectedTeeth.length} Teeth
        </div>
      </div>

    </div>
  );
};
