'use client';

import { useEffect, useRef, useState } from 'react';
import { useProjectEvents } from '@/hooks/use-websocket';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { WSEvent } from '@/types';

interface LogEntry {
  id: number;
  time: string;
  type: string;
  message: string;
  color: string;
}

const EVENT_CONFIG: Record<string, { label: string; color: string }> = {
  'issue:status_changed': { label: 'STATUS', color: 'text-blue-400' },
  'task:created': { label: 'TASK', color: 'text-violet-400' },
  'task:started': { label: 'AGENT', color: 'text-amber-400' },
  'task:completed': { label: 'DONE', color: 'text-emerald-400' },
  'task:failed': { label: 'FAIL', color: 'text-red-400' },
  'qa:verdict': { label: 'QA', color: 'text-cyan-400' },
  'checkpoint:created': { label: 'GIT', color: 'text-green-400' },
  'checkpoint:rollback': { label: 'ROLLBACK', color: 'text-orange-400' },
  'budget:exceeded': { label: 'BUDGET', color: 'text-red-500' },
  'pipeline:completed': { label: 'PIPELINE', color: 'text-emerald-400' },
  'pipeline:failed': { label: 'PIPELINE', color: 'text-red-400' },
  'run:output': { label: 'OUTPUT', color: 'text-zinc-400' },
};

function formatEvent(event: WSEvent): string {
  const d = event.data as Record<string, unknown>;
  switch (event.type) {
    case 'issue:status_changed':
      return `Issue status: ${d.old_status} → ${d.new_status}`;
    case 'task:created':
      return `Task created: [${d.agent_role}] ${d.title}`;
    case 'task:started':
      return `Agent started: ${d.agent_role} → ${d.task_id}`;
    case 'task:completed':
      return `Agent completed: ${d.agent_role} (${Number(d.duration_seconds || 0).toFixed(1)}s)`;
    case 'task:failed':
      return `Agent failed: ${d.agent_role} — ${d.error || 'unknown error'}`;
    case 'qa:verdict':
      return `QA verdict: ${d.verdict} (${d.issues_count} issues)`;
    case 'checkpoint:created':
      return `Checkpoint: ${d.stage} → ${String(d.commit_sha).slice(0, 8)}`;
    case 'checkpoint:rollback':
      return `Rollback: ${d.repo_side} → ${String(d.target_sha).slice(0, 8)}`;
    case 'budget:exceeded':
      return `Budget exceeded: $${d.used_usd}`;
    case 'pipeline:completed':
      return `Pipeline completed: ${d.stage} (${d.iteration} iterations)`;
    case 'pipeline:failed':
      return `Pipeline failed: ${d.error}`;
    default:
      return JSON.stringify(d);
  }
}

interface EventConsoleProps {
  projectId: string;
}

let idCounter = 0;

export function EventConsole({ projectId }: EventConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useProjectEvents(projectId, (event: WSEvent) => {
    const config = EVENT_CONFIG[event.type] || { label: 'EVENT', color: 'text-zinc-500' };
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const entry: LogEntry = {
      id: ++idCounter,
      time,
      type: config.label,
      message: formatEvent(event),
      color: config.color,
    };

    setLogs((prev) => [...prev.slice(-200), entry]);
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="relative z-10 rounded-xl border border-white/[0.06] bg-[#0c0c0e] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-violet-400" />
          <span className="text-xs font-semibold text-zinc-300">Console</span>
          {logs.length > 0 && (
            <span className="text-[10px] text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
              {logs.length}
            </span>
          )}
          {logs.length > 0 && !collapsed && (
            <div className="flex items-center gap-1 ml-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-600">Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLogs([]); }}
              className="text-zinc-600 hover:text-zinc-400 transition-colors p-1"
            >
              <Trash2 size={12} />
            </button>
          )}
          {collapsed ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
        </div>
      </div>

      {/* Log output */}
      {!collapsed && (
        <div
          ref={scrollRef}
          className="h-56 overflow-y-auto font-mono text-[11px] leading-5 p-3 space-y-0"
          onScroll={(e) => {
            const el = e.currentTarget;
            autoScrollRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
          }}
        >
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-700 text-xs">Waiting for events...</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3 hover:bg-white/[0.02] px-1 rounded">
                <span className="text-zinc-700 shrink-0">{log.time}</span>
                <span className={`shrink-0 w-16 text-right font-semibold ${log.color}`}>
                  {log.type}
                </span>
                <span className="text-zinc-400">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
