'use client';

import { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showToast } from '@/components/toast';
import { ArrowLeft, Plus, Play, Trash2, ChevronDown, Brain, ScrollText, FileText } from 'lucide-react';
import Link from 'next/link';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
  analyzing: 'bg-amber-500/10 text-amber-400 ring-amber-500/20 animate-pulse',
  ready: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  in_progress: 'bg-violet-500/10 text-violet-400 ring-violet-500/20',
  done: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 ring-red-500/20',
};

export default function MilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', strategy: 'gsd' as 'gsd' | 'spec_kit', enableQa: true });

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => api.milestones.list(id),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.milestones.create(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', id] });
      setCreateOpen(false);
      setForm({ title: '', description: '', strategy: 'gsd', enableQa: true });
      showToast('success', 'Milestone created');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const analyzeMutation = useMutation({
    mutationFn: api.milestones.analyze,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', id] });
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
      showToast('success', 'Milestone analyzed — tasks created');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: api.milestones.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', id] });
      showToast('success', 'Milestone deleted');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all">
            <ArrowLeft size={14} />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-white">Milestones</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Big features broken down into tasks using GSD or Spec-Kit.</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Plus size={13} />
          New Milestone
        </Button>
      </div>

      {/* Milestone List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
          <Brain size={24} className="text-violet-400 mb-3" />
          <p className="text-sm font-medium text-zinc-300">No milestones yet</p>
          <p className="mt-1 text-xs text-zinc-600">Create a milestone to break big features into tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((ms: any) => (
            <div key={ms.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              {/* Milestone Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(expanded === ms.id ? null : ms.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{ms.title}</h3>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-medium ring-1 ring-inset ${STATUS_STYLES[ms.status] || ''}`}>
                      {ms.status}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-medium ring-1 ring-inset ${
                      ms.strategy === 'gsd'
                        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                    }`}>
                      {ms.strategy === 'gsd' ? 'GSD' : 'SPEC-KIT'}
                    </span>
                  </div>
                  {ms.description && (
                    <p className="text-[11px] text-zinc-600 truncate">{ms.description}</p>
                  )}
                </div>

                {/* Progress */}
                {ms.totalTasks > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-zinc-400">{ms.completedTasks}/{ms.totalTasks} tasks</p>
                    <div className="w-20 h-1.5 bg-white/[0.06] rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(ms.completedTasks / ms.totalTasks) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {ms.status === 'draft' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); analyzeMutation.mutate(ms.id); }}
                      className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1.5 rounded-md font-medium"
                      disabled={analyzeMutation.isPending}
                    >
                      <Play size={10} /> {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze'}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(ms.id); }}
                    className="text-zinc-700 hover:text-red-400 p-1.5 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronDown size={13} className={`text-zinc-600 transition-transform ${expanded === ms.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Detail */}
              {expanded === ms.id && (
                <div className="border-t border-white/[0.04] p-4 space-y-4">
                  {/* Analysis */}
                  {ms.analysis && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Brain size={12} className="text-violet-400" />
                        <span className="text-[11px] font-semibold text-zinc-400">Analysis</span>
                      </div>
                      <p className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                        {ms.analysis}
                      </p>
                    </div>
                  )}

                  {/* Spec Document */}
                  {ms.specDocument && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ScrollText size={12} className="text-violet-400" />
                        <span className="text-[11px] font-semibold text-violet-400">RFC Specification</span>
                      </div>
                      <div className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap bg-violet-500/5 border border-violet-500/10 rounded-lg p-3 max-h-64 overflow-y-auto">
                        {ms.specDocument}
                      </div>
                    </div>
                  )}

                  {/* Generated Tasks */}
                  {ms.issues && ms.issues.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <FileText size={12} className="text-zinc-500" />
                        <span className="text-[11px] font-semibold text-zinc-400">Generated Tasks ({ms.issues.length})</span>
                      </div>
                      <div className="space-y-1">
                        {ms.issues.map((issue: any) => (
                          <div key={issue.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              issue.status === 'done' ? 'bg-emerald-400'
                              : issue.status === 'failed' ? 'bg-red-400'
                              : issue.status === 'processing' ? 'bg-blue-400 animate-pulse'
                              : 'bg-zinc-500'
                            }`} />
                            <span className="text-[11px] text-zinc-300 truncate flex-1">{issue.title}</span>
                            <span className="text-[9px] text-zinc-600">{issue.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ms.status === 'draft' && !ms.analysis && (
                    <p className="text-xs text-zinc-600 text-center py-4">
                      Click "Analyze" to break this milestone into tasks using {ms.strategy === 'gsd' ? 'GSD' : 'Spec-Kit'}.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">New Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Title</label>
              <Input
                placeholder="e.g., User Authentication System"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] focus:border-violet-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Description</label>
              <Textarea
                placeholder="Describe the feature or initiative in detail. The more context, the better the task breakdown..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] focus:border-violet-500/50 min-h-[120px]"
                rows={5}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Strategy</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm({ ...form, strategy: 'gsd' })}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    form.strategy === 'gsd'
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">GSD</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Fast, minimal tasks. Rapid prototyping.</p>
                </button>
                <button
                  onClick={() => setForm({ ...form, strategy: 'spec_kit' })}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    form.strategy === 'spec_kit'
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">Spec-Kit</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Detailed RFC, strict criteria. Enterprise.</p>
                </button>
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate(form)}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
              disabled={!form.title || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Milestone'}
            </Button>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, enableQa: !form.enableQa })}
                  className={`w-8 h-4.5 rounded-full transition-colors relative ${
                    form.enableQa ? 'bg-violet-600' : 'bg-zinc-700'
                  }`}
                >
                  <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    form.enableQa ? 'left-4' : 'left-0.5'
                  }`} />
                </button>
                <span className="text-xs text-zinc-400">QA Review</span>
              </label>
              <span className="text-[10px] text-zinc-600">
                {form.enableQa ? 'All tasks will be QA reviewed' : 'Tasks skip QA, commit directly'}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
