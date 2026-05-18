export function AppFooter() {
  return (
    <footer className="border-t px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
      <span>© {new Date().getFullYear()} | Apprecon Version 0.1</span>
    </footer>
  );
}