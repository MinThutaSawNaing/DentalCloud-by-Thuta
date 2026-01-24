declare module 'react-teeth-selector' {
  import { FC } from 'react';

  export interface TeethDiagramProps {
    selectedTeeth?: { [key: number]: boolean };
    defaultSelected?: { [key: number]: boolean };
    onChange?: (map: { [key: number]: boolean }, info: { id: number; x: number; y: number }) => void;
    width?: number | string;
    height?: number | string;
  }

  export const TeethDiagram: FC<TeethDiagramProps>;
}
