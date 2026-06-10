'use client';

import React from 'react';
import type { AutomationNodeType } from '../types';

interface DnDState {
  type: AutomationNodeType | null;
  setType: (t: AutomationNodeType | null) => void;
  addNodeAtCenter: ((nodeType: AutomationNodeType) => void) | null;
  setAddNodeAtCenter: (fn: ((nodeType: AutomationNodeType) => void) | null) => void;
}

const DnDContext = React.createContext<DnDState>({
  type: null,
  setType: () => {},
  addNodeAtCenter: null,
  setAddNodeAtCenter: () => {},
});

export function useDnD() {
  return React.useContext(DnDContext);
}

export function DnDProvider({ children }: { children: React.ReactNode }) {
  const typeRef = React.useRef<AutomationNodeType | null>(null);
  const [, forceUpdate] = React.useState(0);
  const [addNodeAtCenter, setAddNodeAtCenter] = React.useState<((t: AutomationNodeType) => void) | null>(null);

  const setType = React.useCallback((t: AutomationNodeType | null) => {
    typeRef.current = t;
    forceUpdate((c) => c + 1);
  }, []);

  const value = React.useMemo(
    () => ({
      get type() { return typeRef.current; },
      setType,
      addNodeAtCenter,
      setAddNodeAtCenter,
    }),
    [setType, addNodeAtCenter, setAddNodeAtCenter]
  );

  return (
    <DnDContext.Provider value={value}>
      {children}
    </DnDContext.Provider>
  );
}
