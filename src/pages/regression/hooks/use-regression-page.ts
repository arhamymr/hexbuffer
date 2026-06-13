import React from 'react';
import { useRegressionStore } from '@/stores/regression';
import type { TestCase, TestStep } from '../types';

export function useRegressionPage() {
  const {
    testCases,
    runs,
    activeRun,
    liveSteps,
    loadTestCases,
    saveTestCase,
    deleteTestCase,
    runTest,
    loadRuns,
  } = useRegressionStore();

  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(null);
  const [editingCase, setEditingCase] = React.useState<TestCase | null>(null);
  const [isNew, setIsNew] = React.useState(false);

  // Load test cases on mount
  React.useEffect(() => {
    loadTestCases();
  }, [loadTestCases]);

  // Auto-select first test case
  React.useEffect(() => {
    if (!selectedCaseId && testCases.length > 0) {
      setSelectedCaseId(testCases[0].id);
    }
  }, [testCases, selectedCaseId]);

  // Load runs when selection changes
  React.useEffect(() => {
    if (selectedCaseId) {
      loadRuns(selectedCaseId);
    }
  }, [selectedCaseId, loadRuns]);

  const selectedCase = testCases.find((c) => c.id === selectedCaseId) || null;
  const selectedRuns = selectedCaseId ? runs[selectedCaseId] || [] : [];

  const handleCreate = React.useCallback(() => {
    const newCase: TestCase = {
      id: crypto.randomUUID(),
      name: 'New Test Case',
      description: '',
      targetUrl: '',
      steps: [],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingCase(newCase);
    setIsNew(true);
  }, []);

  const handleEdit = React.useCallback((tc: TestCase) => {
    setEditingCase({ ...tc });
    setIsNew(false);
  }, []);

  const handleSave = React.useCallback(async (tc: TestCase) => {
    const saved = await saveTestCase(tc);
    setEditingCase(null);
    setIsNew(false);
    setSelectedCaseId(saved.id);
  }, [saveTestCase]);

  const handleDelete = React.useCallback(async (id: string) => {
    await deleteTestCase(id);
    if (selectedCaseId === id) {
      setSelectedCaseId(null);
      setEditingCase(null);
    }
  }, [deleteTestCase, selectedCaseId]);

  const handleRun = React.useCallback(async (testCaseId: string) => {
    await runTest(testCaseId);
  }, [runTest]);

  const handleCancelEdit = React.useCallback(() => {
    setEditingCase(null);
    setIsNew(false);
  }, []);

  return {
    testCases,
    selectedCase,
    selectedRuns,
    activeRun,
    liveSteps,
    editingCase,
    isNew,
    handleCreate,
    handleEdit,
    handleSave,
    handleDelete,
    handleRun,
    handleCancelEdit,
    setSelectedCaseId,
  };
}
