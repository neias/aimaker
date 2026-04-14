'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { FolderKanban, Activity, Zap, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  });

  const { data: health } = useQuery({
    queryKey: ['engine-health'],
    queryFn: api.orchestrator.health,
    refetchInterval: 10000,
  });

  const stats = [
    {
      label: 'Projects',
      value: projects?.length ?? 0,
      icon: FolderKanban,
      color: 'from-violet-500/20 to-violet-600/20',
      iconColor: 'text-violet-400',
    },
    {
      label: 'Engine',
      value: health?.status === 'ok' ? 'Online' : 'Offline',
      icon: Activity,
      color: health?.status === 'ok' ? 'from-emerald-500/20 to-emerald-600/20' : 'from-red-500/20 to-red-600/20',
      iconColor: health?.status === 'ok' ? 'text-emerald-400' : 'text-red-400',
    },
    {
      label: 'Active Tasks',
      value: health?.active_tasks ?? 0,
      icon: Zap,
      color: 'from-amber-500/20 to-amber-600/20',
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Overview of your AI orchestration platform.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${stat.color} blur-2xl`} />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={stat.iconColor} />
                  <span className="text-xs font-medium text-zinc-500">{stat.label}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white">Recent Projects</h2>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : !projects?.length ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 mb-3">
              <FolderKanban size={20} className="text-violet-400" />
            </div>
            <p className="text-sm font-medium text-zinc-300">No projects yet</p>
            <p className="mt-1 text-xs text-zinc-600">Get started by creating your first project.</p>
            <Link href="/projects">
              <Button size="sm" className="mt-4 gap-1.5 bg-violet-600 hover:bg-violet-500 text-white">
                <Plus size={14} />
                Create Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project: any) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{project.name}</h3>
                    <ArrowRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </div>
                  {project.githubRepo && (
                    <p className="mt-1 text-xs text-zinc-600">{project.githubRepo}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                      project.strategy === 'gsd'
                        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                    }`}>
                      {project.strategy === 'gsd' ? 'GSD' : 'SPEC-KIT'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
