import { useState } from 'react';

export function useTreeNode(defaultExpanded: boolean) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded((currentValue) => !currentValue);
  };

  return {
    isExpanded,
    toggleExpanded,
  };
}
