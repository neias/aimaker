'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle, XCircle, Clock, ListTodo, Milestone, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  waiting: '#71717a',
  processing: '#3b82f6',
  testing: '#eab308',
  done: '#22c55e',
  failed: '#ef4444',
  human_required: '#f97316',
};

const PIE_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#71717a', '#ef4444', '#f97316'];

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: issues = [] } = useQuery({
    queryKey: ['issues', id],
    queryFn: () => api.issues.list(id),
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => api.milestones.list(id),
  });

  // Compute stats from issues
  const statusCounts = issues.reduce<Record<string, number>>((acc, i: any) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});

  const totalIssues = issues.length;
  const doneIssues = statusCounts['done'] || 0;
  const failedIssues = statusCounts['failed'] || 0;
  const waitingIssues = statusCounts['waiting'] || 0;
  const processingIssues = (statusCounts['processing'] || 0) + (statusCounts['analyzing'] || 0) + (statusCounts['testing'] || 0);
  const successRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

  const statusPieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  // Issues by priority
  const priorityCounts = issues.reduce<Record<string, number>>((acc, i: any) => {
    acc[i.priority] = (acc[i.priority] || 0) + 1;
    return acc;
  }, {});

  const priorityData = Object.entries(priorityCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([priority, count]) => ({ priority, count }));

  // Milestones summary
  const milestoneStats = {
    total: milestones.length,
    done: milestones.filter((m: any) => m.status === 'done').length,
    inProgress: milestones.filter((m: any) => ['analyzing', 'ready', 'in_progress'].includes(m.status)).length,
  };

  // Recent completed (last 20)
  const recentDone = issues
    .filter((i: any) => i.status === 'done')
    .slice(0, 10);

  // Recent failed
  const recentFailed = issues
    .filter((i: any) => ['failed', 'human_required'].includes(i.status))
    .slice(0, 10);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all">
            <ArrowLeft size={14} />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Analytics</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Project performance overview.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Tasks', value: totalIssues, icon: ListTodo, color: 'text-zinc-400' },
          { label: 'Completed', value: doneIssues, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Failed', value: failedIssues, icon: XCircle, color: 'text-red-400' },
          { label: 'In Progress', value: processingIssues, icon: Clock, color: 'text-blue-400' },
          { label: 'Success Rate', value: `${successRate}%`, icon: BarChart3, color: 'text-violet-400' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon size={12} className={stat.color} />
                <span className="text-[10px] text-zinc-600">{stat.label}</span>
              </div>
              <p className="text-xl font-semibold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Task Status Distribution</h3>
          {statusPieData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={35}
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {statusPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[d.name] || '#71717a' }} />
                    <span className="text-zinc-400 w-24">{d.name}</span>
                    <span className="text-zinc-500 font-mono">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-700 py-10 text-center">No data yet</p>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Tasks by Priority</h3>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={priorityData}>
                <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#52525b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: 11 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.priority === 'P0' ? '#ef4444'
                      : entry.priority === 'P1' ? '#eab308'
                      : '#71717a'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-zinc-700 py-10 text-center">No data yet</p>
          )}
        </div>
      </div>

      {/* Milestones Summary */}
      {milestones.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Milestone size={14} className="text-violet-400" />
            Milestones
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{milestoneStats.total}</p>
              <p className="text-[10px] text-zinc-600">Total</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-emerald-400">{milestoneStats.done}</p>
              <p className="text-[10px] text-zinc-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-blue-400">{milestoneStats.inProgress}</p>
              <p className="text-[10px] text-zinc-600">In Progress</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {milestones.slice(0, 5).map((ms: any) => (
              <div key={ms.id} className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-white/[0.02]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  ms.status === 'done' ? 'bg-emerald-400'
                  : ms.status === 'failed' ? 'bg-red-400'
                  : ms.status === 'analyzing' ? 'bg-amber-400 animate-pulse'
                  : 'bg-zinc-500'
                }`} />
                <span className="text-zinc-300 flex-1 truncate">{ms.title}</span>
                <span className="text-zinc-600">{ms.strategy}</span>
                <span className="text-zinc-500">{ms.totalTasks} tasks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle size={13} />
            Recently Completed ({recentDone.length})
          </h3>
          <div className="space-y-1">
            {recentDone.map((issue: any) => (
              <div key={issue.id} className="text-[11px] text-zinc-400 py-1 truncate">
                {issue.title}
              </div>
            ))}
            {recentDone.length === 0 && (
              <p className="text-[11px] text-zinc-700 py-4 text-center">None yet</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <XCircle size={13} />
            Failed / Needs Attention ({recentFailed.length})
          </h3>
          <div className="space-y-1">
            {recentFailed.map((issue: any) => (
              <div key={issue.id} className="flex items-center gap-2 text-[11px] py-1">
                <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded ${
                  issue.status === 'human_required'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {issue.status === 'human_required' ? 'HUMAN' : 'FAIL'}
                </span>
                <span className="text-zinc-400 truncate">{issue.title}</span>
              </div>
            ))}
            {recentFailed.length === 0 && (
              <p className="text-[11px] text-zinc-700 py-4 text-center">None - all good!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
