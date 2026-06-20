import { useState } from 'react';
import type { PlaygroundLanguage } from '../../types';

interface UseWelcomeScreenProps {
  onCreateProject: (name: string, language: PlaygroundLanguage) => Promise<void>;
  recentFolders: string[];
}

const MAX_RECENT_DISPLAY = 8;

export function useWelcomeScreen({ onCreateProject, recentFolders }: UseWelcomeScreenProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [language, setLanguage] = useState<PlaygroundLanguage>('rust');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const name = projectName.trim() || 'playground-project';
    setIsCreating(true);
    try {
      await onCreateProject(name, language);
    } finally {
      setIsCreating(false);
      setShowCreateForm(false);
    }
  };

  const recentDisplay = recentFolders.slice(0, MAX_RECENT_DISPLAY);

  return {
    showCreateForm,
    setShowCreateForm,
    projectName,
    setProjectName,
    language,
    setLanguage,
    isCreating,
    recentDisplay,
    handleCreate,
  };
}
