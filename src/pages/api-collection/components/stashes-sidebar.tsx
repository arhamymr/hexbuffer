import React, { useState } from 'react';
import { useApiCollectionStore } from '@/stores/api-collection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChronicleSidebar } from './chronicle-sidebar';
import {
  Plus,
  Trash2,
  FileCode,
  Sparkles,
  History,
  FolderHeart,
  ListPlus,
  Menu,
} from 'lucide-react';

export function StashesSidebar() {
  const store = useApiCollectionStore();
  const [activeTab, setActiveTab] = useState<'apis' | 'history'>('apis');
  const [newRequestName, setNewRequestName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const activeStashId = store.activeStashId;
  const activeStash = store.stashes.find(s => s.id === activeStashId);
  const endpoints = store.stashEndpoints.filter(e => e.stashId === activeStashId);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestName.trim() || !activeStashId) return;
    await store.createEndpoint(activeStashId, newRequestName);
    setNewRequestName('');
    setIsAdding(false);
  };

  if (!activeStashId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-2 border border-dashed rounded-lg bg-muted/10">
        <FolderHeart className="h-8 w-8 text-muted-foreground/40 animate-pulse" />
        <span className="text-xs font-semibold text-muted-foreground">No Collection Selected</span>
        <span className="text-[10px] text-muted-foreground/60 max-w-[180px]">
          Create or select a collection tab at the top to see its API list.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      {/* Tab Switcher */}
      <div className="flex bg-muted p-1 rounded-md shrink-0">
        <Button
          size="sm"
          variant={activeTab === 'apis' ? 'secondary' : 'ghost'}
          className="flex-1 text-xs h-7 font-semibold"
          onClick={() => setActiveTab('apis')}
        >
          <Menu className="h-3.5 w-3.5 mr-1.5" /> API List
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'history' ? 'secondary' : 'ghost'}
          className="flex-1 text-xs h-7 font-semibold"
          onClick={() => setActiveTab('history')}
        >
          <History className="h-3.5 w-3.5 mr-1.5" /> History
        </Button>
      </div>

      {activeTab === 'apis' ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* Header & Add Button */}
          <div className="flex items-center justify-between shrink-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              {activeStash?.name || 'Endpoints'}
            </span>
            {!isAdding && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-semibold"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add API
              </Button>
            )}
          </div>

          {/* Inline Add Form */}
          {isAdding && (
            <form onSubmit={handleCreateRequest} className="flex space-x-2 shrink-0">
              <Input
                placeholder="Request name (e.g. login)"
                className="h-8 text-xs font-mono"
                autoFocus
                value={newRequestName}
                onChange={(e) => setNewRequestName(e.target.value)}
                onBlur={() => {
                  setTimeout(() => {
                    if (!newRequestName.trim()) setIsAdding(false);
                  }, 200);
                }}
              />
              <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
                <ListPlus className="h-4 w-4" />
              </Button>
            </form>
          )}

          {/* Endpoint List Scroll */}
          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-1 pr-2">
              {endpoints.map((ep) => (
                <div
                  key={ep.id}
                  className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer group transition-colors ${
                    store.activeEndpointId === ep.id
                      ? 'bg-secondary font-medium text-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => store.setActiveEndpointId(ep.id)}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <FileCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span
                      className={`font-semibold shrink-0 uppercase text-[9px] px-1 rounded ${
                        ep.method === 'GET'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : ep.method === 'POST'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="truncate font-mono">{ep.name}</span>
                  </div>

                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-destructive hover:bg-destructive/10"
                      title="Delete Request"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete request "${ep.name}"?`)) {
                          void store.deleteEndpoint(ep.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {endpoints.length === 0 && (
                <div className="text-center py-12 flex flex-col items-center justify-center space-y-2 border border-dashed rounded-lg">
                  <Sparkles className="h-6 w-6 text-muted-foreground/50" />
                  <span className="text-xs font-medium text-muted-foreground">
                    No API Endpoints
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 max-w-[150px]">
                    Create a request under this collection to get started.
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <ChronicleSidebar />
        </div>
      )}
    </div>
  );
}
