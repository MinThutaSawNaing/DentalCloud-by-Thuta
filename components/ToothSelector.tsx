import React from 'react';

interface ToothShapeProps {
  isUpper: boolean;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

// Simplified geometric representation of teeth for the SVG
const ToothShape: React.FC<ToothShapeProps> = ({ isUpper, index, isSelected, onClick }) => {
  // Logic to determine width/shape based on tooth type (Molar vs Incisor)
  // Indices 1, 16, 17, 32 are Wisdom/Molars (Wider)
  // Indices 8, 9, 24, 25 are Central Incisors (Medium)
  
  const isMolar = [1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(index);
  const width = isMolar ? 36 : 28;
  const height = 40;
  
  // Dynamic coloring
  const fillClass = isSelected 
    ? "fill-blue-500 stroke-blue-600" 
    : "fill-white hover:fill-blue-50 stroke-gray-300";

  return (
    <div 
      onClick={onClick}
      className={`relative cursor-pointer transition-all duration-200 transform hover:scale-105 group flex flex-col items-center gap-1`}
    >
      <span className="text-[10px] text-gray-400 font-mono mb-0.5 select-none">{index}</span>
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`} 
        className={`transition-colors duration-200 ${isSelected ? 'drop-shadow-md' : ''}`}
      >
        {/* Simple path representing a tooth crown */}
        <path 
          d={
            isUpper 
            ? `M2,${height} L${width-2},${height} L${width},10 Q${width/2},-5 0,10 Z` // Upper Tooth Shape
            : `M2,0 L${width-2},0 L${width},${height-10} Q${width/2},${height+5} 0,${height-10} Z` // Lower Tooth Shape
          }
          className={`${fillClass} stroke-2`}
        />
        {/* Root indication lines (Visual only) */}
        {!isSelected && (
          <path 
             d={isUpper ? `M${width/2},10 L${width/2},25` : `M${width/2},${height-10} L${width/2},${height-25}`}
             className="stroke-gray-100" 
             fill="none"
          />
        )}
      </svg>
    </div>
  );
};

interface SelectorProps {
  selectedTeeth: number[];
  onToggleTooth: (id: number) => void;
}

export const ToothSelector: React.FC<SelectorProps> = ({ selectedTeeth, onToggleTooth }) => {
  // Adult Permanent Teeth: 1-16 (Upper), 17-32 (Lower)
  // 1-16 (Right to Left from Dentist View -> actually Top Right 1 to Top Left 16)
  // For UI, we usually display 1-16 in a row, 32-17 in a row below it.
  
  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => 32 - i); // 32 down to 17

  return (
    <div className="flex flex-col items-center gap-12 p-4 select-none">
      
      {/* Upper Arch */}
      <div className="relative">
        <h4 className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-gray-400">Maxillary (Upper)</h4>
        <div className="flex gap-1 justify-center items-end" style={{ transform: 'perspective(500px) rotateX(10deg)' }}>
          {upperTeeth.map((id) => (
            <ToothShape 
              key={id} 
              index={id} 
              isUpper={true} 
              isSelected={selectedTeeth.includes(id)}
              onClick={() => onToggleTooth(id)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-gray-100 relative">
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-300">Lingual</span>
      </div>

      {/* Lower Arch */}
      <div className="relative">
         <h4 className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-gray-400">Mandibular (Lower)</h4>
        <div className="flex gap-1 justify-center items-start" style={{ transform: 'perspective(500px) rotateX(-10deg)' }}>
          {lowerTeeth.map((id) => (
            <ToothShape 
              key={id} 
              index={id} 
              isUpper={false} 
              isSelected={selectedTeeth.includes(id)}
              onClick={() => onToggleTooth(id)}
            />
          ))}
        </div>
      </div>

    </div>
  );
};