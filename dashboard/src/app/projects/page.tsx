'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, GitBranch, FolderCode, ArrowRight } from 'lucide-react';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    githubRepo: '',
    backendPath: '',
    frontendPath: '',
    strategy: 'gsd',
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  });

  const createMutation = useMutation({
    mutationFn: api.projects.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      setForm({ name: '', slug: '', githubRepo: '', backendPath: '', frontendPath: '', strategy: 'gsd' });
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your development projects and their AI orchestration.</p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="gap-2 bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Plus size={15} />
          New Project
        </Button>
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : !projects?.length ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 mb-4">
            <FolderCode size={24} className="text-violet-400" />
          </div>
          <p className="text-sm font-medium text-zinc-300">No projects yet</p>
          <p className="mt-1 text-xs text-zinc-600">Create your first project to start orchestrating.</p>
          <Button
            onClick={() => setOpen(true)}
            className="mt-5 gap-2 bg-violet-600 hover:bg-violet-500 text-white"
            size="sm"
          >
            <Plus size={14} />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]">
                {/* Gradient accent */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/10">
                    <FolderCode size={18} className="text-violet-400" />
                  </div>
                  <ArrowRight size={14} className="text-zinc-700 transition-colors group-hover:text-zinc-400" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-white">{project.name}</h3>

                {project.githubRepo && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    <GitBranch size={11} />
                    {project.githubRepo}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                    project.strategy === 'gsd'
                      ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                  }`}>
                    {project.strategy === 'gsd' ? 'GSD' : 'SPEC-KIT'}
                  </span>
                  {project.backendPath && (
                    <span className="inline-flex items-center rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-white/[0.06]">
                      Backend
                    </span>
                  )}
                  {project.frontendPath && (
                    <span className="inline-flex items-center rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-white/[0.06]">
                      Frontend
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Project Name</label>
              <Input
                placeholder="My Awesome App"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                className="bg-white/[0.04] border-white/[0.08] focus:border-violet-500/50 focus:ring-violet-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Slug</label>
              <Input
                placeholder="my-awesome-app"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">GitHub Repository</label>
              <Input
                placeholder="owner/repo"
                value={form.githubRepo}
                onChange={(e) => setForm({ ...form, githubRepo: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Backend Path</label>
                <Input
                  placeholder="/path/to/backend"
                  value={form.backendPath}
                  onChange={(e) => setForm({ ...form, backendPath: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Frontend Path</label>
                <Input
                  placeholder="/path/to/frontend"
                  value={form.frontendPath}
                  onChange={(e) => setForm({ ...form, frontendPath: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Strategy</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setForm({ ...form, strategy: 'gsd' })}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    form.strategy === 'gsd'
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <p className="text-xs font-semibold text-white">GSD</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">Fast, pragmatic</p>
                </button>
                <button
                  onClick={() => setForm({ ...form, strategy: 'spec_kit' })}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    form.strategy === 'spec_kit'
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <p className="text-xs font-semibold text-white">Spec-Kit</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">Detailed, enterprise</p>
                </button>
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate(form)}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
              disabled={!form.name || !form.slug}
            >
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
