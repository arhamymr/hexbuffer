import { HighlightedText } from "@/components/highlighted-text";

const PARAM_COLORS = ["#e06c75", "#61afef", "#98c379", "#e5c07b", "#c678dd", "#56b6c2", "#d19a66"];

export function ColoredUrl({ url, searchQuery }: { url: string; searchQuery: string }) {
  try {
    const qIdx = url.indexOf('?');
    if (qIdx === -1) return <HighlightedText text={url} query={searchQuery} />;
    const base = url.slice(0, qIdx + 1);
    const pairs = url.slice(qIdx + 1).split('&');
    return (
      <>
        <HighlightedText text={base} query={searchQuery} />
        {pairs.map((pair, i) => (
          <span key={i}>
            {i > 0 && <span className="text-muted-foreground">&</span>}
            <span style={{ color: PARAM_COLORS[i % PARAM_COLORS.length] }}>
              <HighlightedText text={pair} query={searchQuery} />
            </span>
          </span>
        ))}
      </>
    );
  } catch {
    return <HighlightedText text={url} query={searchQuery} />;
  }
}
