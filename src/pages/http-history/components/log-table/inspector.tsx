'use client';

import { useState } from 'react';
import { TextEditor } from '@/components/ui/text-editor';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { buildHttpHeaderList } from '@/lib/http-message';

interface KeyValue {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

interface InspectorSectionProps {
  title: string;
  items: KeyValue[];
  defaultOpen?: boolean;
  defaultView?: InspectorViewMode;
}

const wrappedCellClass = 'py-1 px-2 font-mono whitespace-normal break-words [overflow-wrap:anywhere]';
const MAX_COLLAPSED_VALUE_LENGTH = 120;
type InspectorViewMode = 'text' | 'table';

function ExpandableValue({ value }: { value: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldCollapse = value.length > MAX_COLLAPSED_VALUE_LENGTH;
  const visibleValue = shouldCollapse && !isExpanded
    ? `${value.slice(0, MAX_COLLAPSED_VALUE_LENGTH)}...`
    : value;

  return (
    <div>
      <span title={shouldCollapse && !isExpanded ? value : undefined}>
        {visibleValue}
      </span>
      {shouldCollapse && (
        <button
          type="button"
          className="ml-1 text-[11px] font-sans font-medium text-primary hover:underline"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function formatItemsAsText(items: KeyValue[]): string {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1 && items[0].name.toLowerCase().includes('body')) {
    return items[0].value;
  }

  return items
    .map((item) => {
      const lines = [`${item.name}: ${item.value}`];

      if (item.domain !== undefined) {
        lines.push(`  Domain: ${item.domain}`);
      }

      if (item.path !== undefined) {
        lines.push(`  Path: ${item.path}`);
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

export function InspectorSection({ title, items, defaultOpen = true, defaultView = 'text' }: InspectorSectionProps) {
  return (
    <Accordion type="single" defaultValue={defaultOpen ? title : undefined} collapsible className="border rounded-md mb-2 min-w-0 overflow-hidden">
      <AccordionItem value={title} className="last:border-b-0">
        <AccordionTrigger className="px-2 py-1.5 text-xs font-semibold hover:bg-muted/50 transition-colors">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate">{title}</span>
            <span className="text-muted-foreground">({items.length})</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="border-t">
          {items.length > 0 ? (
            <div>
              {defaultView === 'text' ? (
                <div className="h-40 overflow-hidden">
                  <TextEditor
                    language="http"
                    value={formatItemsAsText(items)}
                    options={{
                      readOnly: true,
                      scrollBeyondLastLine: false,
                      lineNumbers: 'off',
                      folding: false,
                      glyphMargin: false,
                      lineDecorationsWidth: 0,
                      lineNumbersMinChars: 0,
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineHeight: 18,
                      renderWhitespace: 'selection',
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                </div>
              ) : (
                <Table className="text-xs table-fixed max-w-full">
                  <TableHeader>
                    <TableRow className="h-7 hover:bg-transparent">
                      <TableHead className="py-1 px-2 font-semibold">Name</TableHead>
                      <TableHead className="py-1 px-2 font-semibold">Value</TableHead>
                      {items[0]?.domain !== undefined && (
                        <TableHead className="py-1 px-2 font-semibold">Domain</TableHead>
                      )}
                      {items[0]?.path !== undefined && (
                        <TableHead className="py-1 px-2 font-semibold">Path</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className={`${wrappedCellClass} text-blue-600`}>
                          {item.name}
                        </TableCell>
                        <TableCell className={wrappedCellClass}>
                          <ExpandableValue value={item.value} />
                        </TableCell>
                        {item.domain !== undefined && (
                          <TableCell className={wrappedCellClass}>{item.domain}</TableCell>
                        )}
                        {item.path !== undefined && (
                          <TableCell className={wrappedCellClass}>{item.path}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="p-2 text-xs text-muted-foreground">No items</div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function buildHeadersList(headers: Record<string, string>): KeyValue[] {
  return buildHttpHeaderList(headers);
}

export function buildCookiesList(cookies: Record<string, string>): KeyValue[] {
  return Object.entries(cookies).map(([name, value]) => ({ name, value }));
}

export function buildParamsList(params: Record<string, string>): KeyValue[] {
  return Object.entries(params).map(([name, value]) => ({ name, value }));
}
