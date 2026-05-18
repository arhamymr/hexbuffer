import type { Target } from '@/types';
import type { DashboardAnalysisResult } from './lib/analyze-asset-input';

export interface DashboardAnalysisMessage {
  id: string;
  target: Target;
  result: DashboardAnalysisResult;
}
