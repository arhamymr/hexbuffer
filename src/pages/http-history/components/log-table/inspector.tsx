'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

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
}

export function InspectorSection({ title, items, defaultOpen = true }: InspectorSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 w-full px-2 py-1.5 text-xs font-semibold hover:bg-muted/50 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{title}</span>
        <span className="text-muted-foreground ml-1">({items.length})</span>
      </button>
      {isOpen && (
        <div className="border-t">
          {items.length > 0 ? (
            <Table className="text-xs">
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
                    <TableCell className="py-1 px-2 font-mono text-blue-600 break-all">
                      {item.name}
                    </TableCell>
                    <TableCell className="py-1 px-2 font-mono">
                      {item.value}
                    </TableCell>
                    {item.domain !== undefined && (
                      <TableCell className="py-1 px-2 font-mono">{item.domain}</TableCell>
                    )}
                    {item.path !== undefined && (
                      <TableCell className="py-1 px-2 font-mono">{item.path}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-2 text-xs text-muted-foreground">No items</div>
          )}
        </div>
      )}
    </div>
  );
}

export function buildHeadersList(headers: Record<string, string>): KeyValue[] {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

export function buildCookiesList(cookies: Record<string, string>): KeyValue[] {
  return Object.entries(cookies).map(([name, value]) => ({ name, value }));
}

export function buildParamsList(params: Record<string, string>): KeyValue[] {
  return Object.entries(params).map(([name, value]) => ({ name, value }));
}