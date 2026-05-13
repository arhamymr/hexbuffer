"use client";

import { useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { useTrafficStore } from "@/stores/trafficStore";
import {
  generateDummyTargets,
  generateDummyApiCalls,
  generateDummyFindings,
  generateDummyAttackResults,
  generateDummyAttackConfig,
} from "@/lib/dummy-data";

const DUMMY_DATA_KEY = "apprecon_dummy_loaded";

interface DummyDataState {
  findings: ReturnType<typeof generateDummyFindings>;
  attackResults: ReturnType<typeof generateDummyAttackResults>;
  attackConfig: ReturnType<typeof generateDummyAttackConfig>;
}

export function useDummyData() {
  const loadDummyData = useCallback(() => {
    const dummyTargets = generateDummyTargets();
    const dummyApiCalls = generateDummyApiCalls(dummyTargets.map((t) => t.id), 30);
    const dummyFindings = generateDummyFindings(dummyTargets.map((t) => t.id));
    const dummyAttackResults = generateDummyAttackResults(20);
    const dummyAttackConfig = generateDummyAttackConfig();

    useAppStore.setState({
      targets: dummyTargets,
      selectedTarget: dummyTargets[0] || null,
      routeTabs: {},
      activeTabId: {},
    });

    useTrafficStore.setState({
      calls: dummyApiCalls,
    });

    const dummyState: DummyDataState = {
      findings: dummyFindings,
      attackResults: dummyAttackResults,
      attackConfig: dummyAttackConfig,
    };

    sessionStorage.setItem(DUMMY_DATA_KEY, JSON.stringify(dummyState));

    return dummyState;
  }, []);

  const isLoaded = useCallback(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DUMMY_DATA_KEY) !== null;
  }, []);

  const getDummyState = useCallback((): DummyDataState | null => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(DUMMY_DATA_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as DummyDataState;
    } catch {
      return null;
    }
  }, []);

  const clearDummyData = useCallback(() => {
    sessionStorage.removeItem(DUMMY_DATA_KEY);
    useAppStore.setState({
      targets: [],
      selectedTarget: null,
    });
    useTrafficStore.setState({
      calls: [],
    });
  }, []);

  return {
    loadDummyData,
    isLoaded,
    getDummyState,
    clearDummyData,
  };
}

export function useDummyFindings() {
  const { getDummyState } = useDummyData();
  const dummyState = getDummyState();
  return dummyState?.findings || [];
}

export function useDummyAttackResults() {
  const { getDummyState } = useDummyData();
  const dummyState = getDummyState();
  return dummyState?.attackResults || [];
}

export function useDummyAttackConfig() {
  const { getDummyState } = useDummyData();
  const dummyState = getDummyState();
  return dummyState?.attackConfig || null;
}