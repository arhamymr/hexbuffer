import Markdown from 'react-markdown';
import { type CustomSection } from '../types';

interface MarkdownPreviewProps {
  section: CustomSection;
}

export function MarkdownPreview({ section }: MarkdownPreviewProps) {
  const content = section.content.trim() ? section.content : section.placeholder;

  return (
    <div className="h-full overflow-auto bg-background">
      <article className="mx-auto max-w-4xl px-8 py-6 text-sm leading-6 text-foreground">
        <Markdown
          components={{
            h1: ({ children }) => (
              <h1 className="mb-4 border-b pb-2 text-2xl font-semibold">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-3 mt-6 text-xl font-semibold">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="mb-2 mt-5 text-base font-semibold">{children}</h3>
            ),
            p: ({ children }) => <p className="mb-3">{children}</p>,
            ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>,
            ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="mb-3 border-l-2 pl-3 text-muted-foreground">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="mb-3 overflow-auto rounded border bg-muted/40 p-3 font-mono text-xs">
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <div className="mb-3 overflow-auto">
                <table className="w-full border-collapse text-left text-xs">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border bg-muted px-2 py-1 font-medium">{children}</th>
            ),
            td: ({ children }) => <td className="border px-2 py-1">{children}</td>,
            a: ({ children, href }) => (
              <a className="text-primary underline underline-offset-2" href={href}>
                {children}
              </a>
            ),
          }}
        >
          {content}
        </Markdown>
      </article>
    </div>
  );
}
