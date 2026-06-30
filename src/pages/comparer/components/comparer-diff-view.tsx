import { useMemo } from 'react';
import { diffWords, diffChars, type Change } from 'diff';
import { GitDiffIcon } from '@phosphor-icons/react';
import type { DiffMode } from '../types';

// ── Types ───────────────────────────────────────────

interface InlinePart {
  text: string;
  type: 'unchanged' | 'added' | 'removed';
}

interface LineData {
  leftContent: string;
  rightContent: string;
  leftType: 'unchanged' | 'removed' | 'empty';
  rightType: 'unchanged' | 'added' | 'empty';
  inlineLeft?: InlinePart[];
  inlineRight?: InlinePart[];
}

// ── Helpers ─────────────────────────────────────────

function getLines(change: Change): string[] {
  const lines = change.value.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    return lines.slice(0, -1);
  }
  return lines;
}

function computeInlineParts(a: string, b: string, mode: DiffMode) {
  if (mode === 'lines' || !a || !b) return undefined;
  const fn = mode === 'words' ? diffWords : diffChars;
  try {
    const changes = fn(a, b);
    const left: InlinePart[] = [];
    const right: InlinePart[] = [];
    for (const c of changes) {
      if (c.added) {
        right.push({ text: c.value, type: 'added' });
      } else if (c.removed) {
        left.push({ text: c.value, type: 'removed' });
      } else {
        left.push({ text: c.value, type: 'unchanged' });
        right.push({ text: c.value, type: 'unchanged' });
      }
    }
    return { left, right };
  } catch {
    return undefined;
  }
}

function buildLines(changes: Change[], mode: DiffMode): LineData[] {
  const lines: LineData[] = [];
  let i = 0;

  while (i < changes.length) {
    const c = changes[i];

    if (c.added) {
      for (const line of getLines(c)) {
        lines.push({
          leftContent: '',
          rightContent: line,
          leftType: 'empty',
          rightType: 'added',
        });
      }
      i++;
    } else if (c.removed) {
      // Check if next change is an added block (for pairing → inline diff)
      if (i + 1 < changes.length && changes[i + 1].added) {
        const removedLines = getLines(c);
        const addedLines = getLines(changes[i + 1]);
        const maxLen = Math.max(removedLines.length, addedLines.length);

        for (let j = 0; j < maxLen; j++) {
          const left = j < removedLines.length ? removedLines[j] : '';
          const right = j < addedLines.length ? addedLines[j] : '';
          const inline = left && right ? computeInlineParts(left, right, mode) : undefined;

          lines.push({
            leftContent: left,
            rightContent: right,
            leftType: left ? 'removed' : 'empty',
            rightType: right ? 'added' : 'empty',
            inlineLeft: inline?.left,
            inlineRight: inline?.right,
          });
        }

        i += 2;
      } else {
        for (const line of getLines(c)) {
          lines.push({
            leftContent: line,
            rightContent: '',
            leftType: 'removed',
            rightType: 'empty',
          });
        }
        i++;
      }
    } else {
      // Unchanged
      for (const line of getLines(c)) {
        lines.push({
          leftContent: line,
          rightContent: line,
          leftType: 'unchanged',
          rightType: 'unchanged',
        });
      }
      i++;
    }
  }

  return lines;
}

// ── Inline Renderer ─────────────────────────────────

function InlineRenderer({ parts }: { parts: InlinePart[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <span
          key={i}
          className={
            p.type === 'added'
              ? 'bg-green-400/30 rounded-sm'
              : p.type === 'removed'
                ? 'bg-red-400/30 rounded-sm'
                : ''
          }
        >
          {p.text}
        </span>
      ))}
    </>
  );
}

// ── Main Component ──────────────────────────────────

interface ComparerDiffViewProps {
  diffResult: Change[];
  diffMode: DiffMode;
}

export function ComparerDiffView({ diffResult, diffMode }: ComparerDiffViewProps) {
  const lines = useMemo(() => buildLines(diffResult, diffMode), [diffResult, diffMode]);

  if (lines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <GitDiffIcon className="mx-auto h-8 w-8 mb-2 text-muted-foreground/50" />
          <p>Enter text in both panels to see the diff</p>
        </div>
      </div>
    );
  }

  let leftLineNum = 0;
  let rightLineNum = 0;

  return (
    <div className="h-full overflow-auto font-mono text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            <th className="w-12 border-r border-b px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              A
            </th>
            <th className="border-b px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Original
            </th>
            <th className="w-12 border-x border-b px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              B
            </th>
            <th className="border-b px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Modified
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => {
            const showLeftNum = line.leftType !== 'empty';
            const showRightNum = line.rightType !== 'empty';
            if (showLeftNum) leftLineNum++;
            if (showRightNum) rightLineNum++;

            const isRemoved = line.leftType === 'removed';
            const isAdded = line.rightType === 'added';

            return (
              <tr
                key={idx}
                className={
                  isRemoved && isAdded
                    ? 'bg-yellow-500/[0.06]'
                    : isRemoved
                      ? 'bg-red-500/[0.07]'
                      : isAdded
                        ? 'bg-green-500/[0.07]'
                        : ''
                }
              >
                {/* Left line number */}
                <td className="w-12 select-none border-r px-2 py-0.5 text-right text-[10px] leading-[1.4] text-muted-foreground/60 align-top">
                  {showLeftNum ? leftLineNum : ''}
                </td>
                {/* Left content */}
                <td
                  className={`px-2 py-0.5 leading-[1.4] whitespace-pre-wrap break-all align-top ${
                    isRemoved
                      ? 'text-red-600/90 dark:text-red-400/90'
                      : line.leftType === 'empty'
                        ? 'opacity-30'
                        : 'text-foreground/80'
                  }`}
                >
                  {line.inlineLeft ? (
                    <InlineRenderer parts={line.inlineLeft} />
                  ) : (
                    <span>{line.leftContent || '\u00A0'}</span>
                  )}
                </td>
                {/* Right line number */}
                <td className="w-12 select-none border-x px-2 py-0.5 text-right text-[10px] leading-[1.4] text-muted-foreground/60 align-top">
                  {showRightNum ? rightLineNum : ''}
                </td>
                {/* Right content */}
                <td
                  className={`px-2 py-0.5 leading-[1.4] whitespace-pre-wrap break-all align-top ${
                    isAdded
                      ? 'text-green-600/90 dark:text-green-400/90'
                      : line.rightType === 'empty'
                        ? 'opacity-30'
                        : 'text-foreground/80'
                  }`}
                >
                  {line.inlineRight ? (
                    <InlineRenderer parts={line.inlineRight} />
                  ) : (
                    <span>{line.rightContent || '\u00A0'}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
