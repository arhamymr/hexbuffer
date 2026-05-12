"use client";

import { useEffect, useState } from "react";
import { useDummyData } from "@/hooks/useDummyData";

interface DummyDataLoaderProps {
  children: React.ReactNode;
}

export function DummyDataLoader({ children }: DummyDataLoaderProps) {
  const { loadDummyData, isLoaded } = useDummyData();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded && !isLoaded()) {
      loadDummyData();
      setLoaded(true);
    } else if (loaded && !isLoaded()) {
      loadDummyData();
    }
  }, [loadDummyData, isLoaded, loaded]);

  return <>{children}</>;
}