import { useMockForgePage } from './hooks/use-mock-forge-page';
import { MockForgeContent } from './components/mock-forge-content';

export function MockForgePage() {
  const page = useMockForgePage();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <MockForgeContent page={page} />
    </div>
  );
}
