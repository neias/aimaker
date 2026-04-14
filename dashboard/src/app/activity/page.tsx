'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/ws';
import { Search, ArrowDown, ArrowUp, RefreshCw, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  engine: { label: 'ENGINE', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  agent: { label: 'AGENT', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  ws: { label: 'WS', bg: 'bg-violet-500/15', text: 'text-violet-400' },
  system: { label: 'SYSTEM', bg: 'bg-zinc-500/15', text: 'text-zinc-400' },
};

const LEVEL_STYLES: Record<string, string> = {
  info: 'text-zinc-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
  debug: 'text-zinc-600',
};

interface ActivityEntry {
  id: number;
  category: string;
  level: string;
  event: string;
  message: string;
  metadata: Record<string, unknown>;
  issueId?: string;
  milestoneId?: string;
  createdAt: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ActivityPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [realtimeEntries, setRealtimeEntries] = useState<ActivityEntry[]>([]);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  });

  // Auto-select first project
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  const { data: activityData, isLoading, refetch } = useQuery({
    queryKey: ['activity', selectedProject, categoryFilter],
    queryFn: () => api.activity.list(selectedProject!, {
      category: categoryFilter || undefined,
      limit: 200,
    }),
    enabled: !!selectedProject,
    refetchInterval: 15000,
  });

  // Listen for real-time activity events
  useEffect(() => {
    if (!selectedProject) return;

    const socket = getSocket();
    socket.emit('subscribe:project', { projectId: selectedProject });

    const handler = (data: any) => {
      const entry = data.data || data;
      setRealtimeEntries((prev) => [entry, ...prev].slice(0, 50));
    };

    socket.on('activity:new', handler);
    return () => { socket.off('activity:new', handler); };
  }, [selectedProject]);

  // Clear realtime entries when switching project or refetching
  useEffect(() => {
    setRealtimeEntries([]);
  }, [selectedProject, activityData]);

  const dbEntries: ActivityEntry[] = activityData?.data || [];
  const total = activityData?.total || 0;

  // Merge realtime entries (newer) with DB entries, deduplicate by id
  const dbIds = new Set(dbEntries.map((e) => e.id));
  const newRealtime = realtimeEntries.filter((e) => !dbIds.has(e.id));
  const allEntries = [...newRealtime, ...dbEntries];

  const filtered = allEntries.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        e.event.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        JSON.stringify(e.metadata).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categoryCounts = allEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Activity</h1>
          <p className="mt-1 text-xs text-zinc-500">
            <Database size={10} className="inline mr-1" />
            {total} entries stored. Engine commands, agent runs, and pipeline events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Project Selector */}
          <select
            value={selectedProject || ''}
            onChange={(e) => { setSelectedProject(e.target.value); setRealtimeEntries([]); }}
            className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-zinc-300 outline-none focus:border-violet-500/50"
          >
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 bg-white/[0.02] border border-white/[0.06] px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <Input
            placeholder="Search event, message, metadata..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white/[0.04] border-white/[0.08]"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
              !categoryFilter
                ? 'bg-white/[0.08] text-white ring-1 ring-white/[0.15]'
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]'
            }`}
          >
            ALL ({allEntries.length})
          </button>
          {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? null : key)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                categoryFilter === key
                  ? `${style.bg} ${style.text} ring-1 ring-current/30`
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]'
              }`}
            >
              {style.label}
              {categoryCounts[key] ? ` (${categoryCounts[key]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-xs text-zinc-700">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-xs text-zinc-700">
              {allEntries.length === 0
                ? 'No activity yet. Create a milestone and analyze it to see engine logs.'
                : 'No matching entries.'}
            </p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto overscroll-contain divide-y divide-white/[0.03]">
            {filtered.map((entry) => (
              <div key={entry.id}>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-mono cursor-pointer hover:bg-white/[0.02] transition-colors ${
                    entry.level === 'error' ? 'bg-red-500/[0.03]' : ''
                  }`}
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  {/* Time */}
                  <span className="text-zinc-700 shrink-0 w-16">{formatTime(entry.createdAt)}</span>

                  {/* Category */}
                  <span className={`shrink-0 w-16 text-center text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    CATEGORY_STYLES[entry.category]?.bg || 'bg-zinc-500/15'
                  } ${CATEGORY_STYLES[entry.category]?.text || 'text-zinc-400'}`}>
                    {CATEGORY_STYLES[entry.category]?.label || entry.category.toUpperCase()}
                  </span>

                  {/* Level indicator */}
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                    entry.level === 'error' ? 'bg-red-400'
                    : entry.level === 'warn' ? 'bg-amber-400'
                    : 'bg-zinc-700'
                  }`} />

                  {/* Event */}
                  <span className="shrink-0 text-zinc-600 w-40 truncate">{entry.event}</span>

                  {/* Message */}
                  <span className={`flex-1 truncate ${LEVEL_STYLES[entry.level] || 'text-zinc-400'}`}>
                    {entry.message}
                  </span>

                  {/* Metadata indicator */}
                  {entry.metadata && Object.keys(entry.metadata).length > 2 && (
                    <span className="shrink-0 text-[9px] text-zinc-700 bg-white/[0.04] px-1.5 py-0.5 rounded">
                      {Object.keys(entry.metadata).length} fields
                    </span>
                  )}
                </div>

                {/* Expanded metadata */}
                {expandedId === entry.id && entry.metadata && (
                  <div className="px-4 pb-3 border-t border-white/[0.03]">
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
                      {Object.entries(entry.metadata)
                        .filter(([k]) => k !== 'project_id')
                        .map(([key, value]) => {
                          const isLong = typeof value === 'string' && value.length > 80;
                          return (
                            <div key={key} className={isLong ? 'col-span-2' : ''}>
                              <span className="text-[10px] text-zinc-600">{key}: </span>
                              {isLong ? (
                                <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap bg-white/[0.02] rounded p-2 mt-1 max-h-32 overflow-y-auto font-mono">
                                  {String(value)}
                                </pre>
                              ) : (
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
