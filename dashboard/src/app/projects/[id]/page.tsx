'use client';

import { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useProjectEvents } from '@/hooks/use-websocket';
import { useIssueStore } from '@/stores/issue-store';
import { KanbanBoard } from '@/components/kanban/board';
import { IssueDetail } from '@/components/kanban/issue-detail';
import { EventConsole } from '@/components/console/event-console';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Shield, BarChart3, RefreshCw, GitBranch, Plus, Settings, Milestone } from 'lucide-react';
import type { Issue, WSEvent } from '@/types';

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: '', body: '', priority: 'P1' });
  const { updateIssueStatus } = useIssueStore();

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(id),
  });

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['issues', id],
    queryFn: () => api.issues.list(id),
    refetchInterval: 15000,
  });

  const syncMutation = useMutation({
    mutationFn: () => api.issues.sync(id),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
      showToast('success', `Synced: ${data.created} created, ${data.updated} updated`);
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const createIssueMutation = useMutation({
    mutationFn: (data: any) => api.issues.create(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
      setAddOpen(false);
      setIssueForm({ title: '', body: '', priority: 'P1' });
      showToast('success', 'Task added to Waiting');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const processMutation = useMutation({
    mutationFn: api.issues.process,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
      showToast('success', 'Processing started');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: api.issues.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
      showToast('success', 'Processing cancelled');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const retryMutation = useMutation({
    mutationFn: api.issues.retry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
      showToast('success', 'Issue queued for retry');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: api.issues.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
      showToast('success', 'Task deleted');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (issueId: string) => api.issues.process(issueId), // TODO: proper archive endpoint
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
      showToast('success', 'Task archived');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  useProjectEvents(id, (event: WSEvent) => {
    if (event.type === 'issue:status_changed') {
      const data = event.data as any;
      updateIssueStatus(data.issue_id, data.new_status);
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
    }
    if (event.type === 'pipeline:completed' || event.type === 'pipeline:failed') {
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
    }
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {project?.name || 'Loading...'}
          </h1>
          {project?.githubRepo && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
              <GitBranch size={11} />
              {project.githubRepo}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAddOpen(true)}
            size="sm"
            className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
          >
            <Plus size={13} />
            Add Task
          </Button>
          <Link href={`/projects/${id}/milestones`}>
            <Button variant="outline" size="sm" className="gap-1.5 border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06]">
              <Milestone size={13} />
              Milestones
            </Button>
          </Link>
          <Link href={`/projects/${id}/policies`}>
            <Button variant="outline" size="sm" className="gap-1.5 border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06]">
              <Shield size={13} />
              Policies
            </Button>
          </Link>
          <Link href={`/projects/${id}/analytics`}>
            <Button variant="outline" size="sm" className="gap-1.5 border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06]">
              <BarChart3 size={13} />
              Analytics
            </Button>
          </Link>
          {project?.githubRepo && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06]"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw size={13} className={syncMutation.isPending ? 'animate-spin' : ''} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync GitHub'}
            </Button>
          )}
          <Link href={`/projects/${id}/settings`}>
            <Button variant="outline" size="sm" className="gap-1.5 border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06]">
              <Settings size={13} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : (
        <KanbanBoard
          issues={issues}
          onProcess={(issueId) => processMutation.mutate(issueId)}
          onCancel={(issueId) => cancelMutation.mutate(issueId)}
          onRetry={(issueId) => retryMutation.mutate(issueId)}
          onDelete={(issueId) => deleteMutation.mutate(issueId)}
          onArchive={(issueId) => archiveMutation.mutate(issueId)}
          onSelect={setSelectedIssue}
        />
      )}

      {/* Console */}
      <EventConsole projectId={id} />

      {/* Issue Detail Sheet */}
      <IssueDetail
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />

      {/* Add Issue Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Title</label>
              <Input
                placeholder="Describe the task or feature..."
                value={issueForm.title}
                onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] focus:border-violet-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Description</label>
              <Textarea
                placeholder="Detailed description, acceptance criteria, technical notes..."
                value={issueForm.body}
                onChange={(e) => setIssueForm({ ...issueForm, body: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] focus:border-violet-500/50 min-h-[120px]"
                rows={5}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Priority</label>
              <div className="flex gap-2">
                {['P0', 'P1', 'P2'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setIssueForm({ ...issueForm, priority: p })}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                      issueForm.priority === p
                        ? p === 'P0'
                          ? 'border-red-500/50 bg-red-500/10 text-red-400'
                          : p === 'P1'
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                          : 'border-zinc-500/50 bg-zinc-500/10 text-zinc-400'
                        : 'border-white/[0.06] bg-white/[0.02] text-zinc-600 hover:border-white/[0.12]'
                    }`}
                  >
                    {p}
                    <span className="ml-1.5 text-[10px] opacity-60">
                      {p === 'P0' ? 'Critical' : p === 'P1' ? 'Normal' : 'Low'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={() => createIssueMutation.mutate(issueForm)}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
              disabled={!issueForm.title || createIssueMutation.isPending}
            >
              {createIssueMutation.isPending ? 'Creating...' : 'Add to Waiting'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
