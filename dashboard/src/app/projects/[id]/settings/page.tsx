'use client';

import { useState, useEffect, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Trash2, ArrowLeft, ScanSearch, CheckCircle } from 'lucide-react';
import { showToast } from '@/components/toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(id),
  });

  const [form, setForm] = useState({
    name: '',
    slug: '',
    githubRepo: '',
    githubToken: '',
    backendPath: '',
    frontendPath: '',
    baseBranch: 'main',
    projectType: 'fullstack' as 'frontend' | 'backend' | 'fullstack',
    description: '',
    strategy: 'gsd',
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        slug: project.slug || '',
        githubRepo: project.githubRepo || '',
        githubToken: '',
        backendPath: project.backendPath || '',
        frontendPath: project.frontendPath || '',
        baseBranch: project.baseBranch || 'main',
        projectType: project.projectType || 'fullstack',
        description: project.description || '',
        strategy: project.strategy || 'gsd',
      });
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.projects.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => api.projects.scan(id),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      showToast('success', `Codebase scanned: ${data.length} chars`);
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    },
  });

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-white/[0.03] animate-pulse" />
        <div className="h-96 rounded-xl bg-white/[0.03] animate-pulse" />
      </div>
    );
  }

  const handleSave = () => {
    const payload: any = { ...form };
    if (!payload.githubToken) delete payload.githubToken;
    updateMutation.mutate(payload);
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all">
            <ArrowLeft size={14} />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Project Settings</h1>
          <p className="text-xs text-zinc-500">{project?.name}</p>
        </div>
      </div>

      {/* General */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">General</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Project name and identifier.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] focus:border-violet-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] font-mono text-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Project Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['frontend', 'backend', 'fullstack'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, projectType: t })}
                  className={`rounded-lg border p-2.5 text-center transition-all ${
                    form.projectType === t
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <p className="text-xs font-semibold text-white">{t === 'fullstack' ? 'Full Stack' : t === 'frontend' ? 'Frontend' : 'Backend'}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Description</label>
            <textarea
              placeholder="What is this project? Tech stack, purpose, key features..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="flex min-h-[80px] w-full rounded-md border bg-white/[0.04] border-white/[0.08] px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
              rows={3}
            />
          </div>
        </div>
      </section>

      {/* GitHub */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">GitHub Integration</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Connect to a GitHub repository to sync issues.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Repository</label>
            <Input
              placeholder="owner/repo"
              value={form.githubRepo}
              onChange={(e) => setForm({ ...form, githubRepo: e.target.value })}
              className="bg-white/[0.04] border-white/[0.08]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Access Token</label>
            <Input
              type="password"
              placeholder="ghp_xxxx (leave empty to keep current)"
              value={form.githubToken}
              onChange={(e) => setForm({ ...form, githubToken: e.target.value })}
              className="bg-white/[0.04] border-white/[0.08]"
            />
            <p className="text-[10px] text-zinc-600">Required for private repos. Leave empty to keep existing token.</p>
          </div>
        </div>
      </section>

      {/* Paths */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Repository Paths</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Local paths to the project's source code. Agents will work in these directories.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Backend Path</label>
            <Input
              placeholder="/Users/you/apps/myapp-api"
              value={form.backendPath}
              onChange={(e) => setForm({ ...form, backendPath: e.target.value })}
              className="bg-white/[0.04] border-white/[0.08] font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Frontend Path</label>
            <Input
              placeholder="/Users/you/apps/myapp-fe"
              value={form.frontendPath}
              onChange={(e) => setForm({ ...form, frontendPath: e.target.value })}
              className="bg-white/[0.04] border-white/[0.08] font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Base Branch</label>
            <Input
              placeholder="main"
              value={form.baseBranch}
              onChange={(e) => setForm({ ...form, baseBranch: e.target.value })}
              className="bg-white/[0.04] border-white/[0.08] font-mono text-xs w-48"
            />
          </div>
        </div>
      </section>

      {/* Codebase Scan */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Codebase Snapshot</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Scan project files so AI agents understand your existing code. Stored in DB — no need to rescan each time.</p>
        </div>
        <div className="p-5 space-y-4">
          {project?.codebaseScannedAt ? (
            <div className="flex items-center gap-3">
              <CheckCircle size={14} className="text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-zinc-300">
                  Scanned on {new Date(project.codebaseScannedAt).toLocaleString('tr-TR')}
                </p>
                <p className="text-[10px] text-zinc-600">
                  {project.codebaseSnapshot?.length?.toLocaleString() || 0} chars captured
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
              >
                <ScanSearch size={13} className={scanMutation.isPending ? 'animate-spin' : ''} />
                {scanMutation.isPending ? 'Scanning...' : 'Rescan'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6">
              <ScanSearch size={20} className="text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500 mb-3">No snapshot yet. Scan to give agents codebase context.</p>
              <Button
                size="sm"
                className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
              >
                <ScanSearch size={13} className={scanMutation.isPending ? 'animate-spin' : ''} />
                {scanMutation.isPending ? 'Scanning...' : 'Scan Codebase'}
              </Button>
            </div>
          )}
          {project?.codebaseSnapshot && (
            <details className="group">
              <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">
                Preview snapshot
              </summary>
              <pre className="mt-2 text-[10px] text-zinc-500 leading-relaxed whitespace-pre-wrap bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 max-h-64 overflow-y-auto font-mono">
                {project.codebaseSnapshot}
              </pre>
            </details>
          )}
        </div>
      </section>

      {/* Strategy */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Strategy</h2>
          <p className="text-xs text-zinc-500 mt-0.5">How the PM agent breaks down issues into tasks.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setForm({ ...form, strategy: 'gsd' })}
              className={`rounded-xl border p-4 text-left transition-all ${
                form.strategy === 'gsd'
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <p className="text-sm font-semibold text-white">GSD</p>
              <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
                Fast and pragmatic. Minimal task lists, direct to implementation. Best for rapid prototyping.
              </p>
            </button>
            <button
              onClick={() => setForm({ ...form, strategy: 'spec_kit' })}
              className={`rounded-xl border p-4 text-left transition-all ${
                form.strategy === 'spec_kit'
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <p className="text-sm font-semibold text-white">Spec-Kit</p>
              <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
                Detailed RFC-style specs with strict acceptance criteria. Best for critical or large-scale work.
              </p>
            </button>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Save size={14} />
          {updateMutation.isPending ? 'Saving...' : updateMutation.isSuccess ? 'Saved!' : 'Save Changes'}
        </Button>

        {/* Danger Zone */}
        {!deleteConfirm ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => setDeleteConfirm(true)}
          >
            <Trash2 size={13} />
            Delete Project
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Are you sure?</span>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirm(false)}
              className="border-white/[0.08] text-zinc-400"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
