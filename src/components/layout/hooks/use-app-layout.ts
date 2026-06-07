import * as React from 'react';

export function useAppLayout() {
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);

  const toggleAssistant = React.useCallback(() => {
    setIsAssistantOpen((current) => !current);
  }, []);

  return {
    isAssistantOpen,
    toggleAssistant,
  };
}
