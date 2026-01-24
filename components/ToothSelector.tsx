import React, { useMemo } from 'react';
import { TeethDiagram } from 'react-teeth-selector';

interface SelectorProps {
  selectedTeeth: number[];
  onToggleTooth: (id: number) => void;
}

// Mapping between Universal (1-32) and ISO (11-48) numbering systems
const universalToISO = (n: number): number => {
  if (n >= 1 && n <= 8) return 19 - n;
  if (n >= 9 && n <= 16) return n + 12;
  if (n >= 17 && n <= 24) return 55 - n;
  if (n >= 25 && n <= 32) return n + 16;
  return n;
};

const isoToUniversal = (n: number): number => {
  if (n >= 11 && n <= 18) return 19 - n;
  if (n >= 21 && n <= 28) return n - 12;
  if (n >= 31 && n <= 38) return 55 - n;
  if (n >= 41 && n <= 48) return n - 16;
  return n;
};

export const ToothSelector: React.FC<SelectorProps> = ({ selectedTeeth, onToggleTooth }) => {
  // Convert array of universal tooth numbers to ISO object map format required by react-teeth-selector
  const selectedTeethMap = useMemo(() => {
    const map: { [key: number]: boolean } = {};
    selectedTeeth.forEach(toothId => {
      const isoId = universalToISO(toothId);
      map[isoId] = true;
    });
    return map;
  }, [selectedTeeth]);

  // Handle tooth click/toggle from react-teeth-selector
  const handleTeethChange = (newMap: any, info: any) => {
    // Extract ISO ID from info or fallback to arguments
    const id = info?.id !== undefined ? info.id : (typeof info !== 'object' ? info : null);
    
    if (id != null) {
      const isoId = parseInt(id.toString(), 10);
      if (!isNaN(isoId)) {
        // Convert ISO back to Universal before calling the toggle callback
        const universalId = isoToUniversal(isoId);
        onToggleTooth(universalId);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 p-3 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm w-full max-w-full mx-auto backdrop-blur-sm overflow-hidden">
      
      {/* Diagram Title */}
      <div className="text-center mb-1">
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Clinical Odontogram
        </h3>
        <p className="text-[10px] text-slate-500">Universal Numbering System</p>
      </div>

      {/* React Teeth Selector Component */}
      <div className="w-full flex justify-center py-1">
        <div className="w-full max-w-[400px]">
          <TeethDiagram 
            selectedTeeth={selectedTeethMap}
            onChange={handleTeethChange}
            width="100%"
            height="auto"
            selectedColor="#3B82F6"
            hoverColor="#93C5FD"
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
