'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { showToast } from '@/components/toast';
import type { Issue, Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FileText, GitBranch, ChevronDown, Brain, ScrollText, Pencil, Save, X } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  pm: 'bg-purple-500/20 text-purple-400',
  backend: 'bg-blue-500/20 text-blue-400',
  frontend: 'bg-green-500/20 text-green-400',
  qa: 'bg-amber-500/20 text-amber-400',
};

const STATUS_DOTS: Record<string, string> = {
  pending: 'bg-zinc-500',
  running: 'bg-blue-400 animate-pulse',
  completed: 'bg-emerald-400',
  failed: 'bg-red-400',
  skipped: 'bg-zinc-600',
};

interface IssueDetailProps {
  issue: Issue | null;
  onClose: () => void;
}

export function IssueDetail({ issue, onClose }: IssueDetailProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', body: '', priority: 'P1', enableQa: true });
  const queryClient = useQueryClient();

  const { data: detail } = useQuery({
    queryKey: ['issue', issue?.id],
    queryFn: () => api.issues.get(issue!.id),
    enabled: !!issue,
  });

  // Sync edit form when issue changes
  useEffect(() => {
    if (detail) {
      setEditForm({
        title: detail.title || '',
        body: detail.body || '',
        priority: detail.priority || 'P1',
        enableQa: detail.enableQa !== false,
      });
      setEditing(false);
    }
  }, [detail]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.issues.update(issue!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issue?.id] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setEditing(false);
      showToast('success', 'Task updated');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const tasks: Task[] = detail?.tasks || [];
  const canEdit = issue?.status === 'waiting';

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <Sheet open={!!issue} onOpenChange={() => { onClose(); setActiveSection(null); setEditing(false); }}>
      <SheetContent className="bg-[#0c0c0e] border-white/[0.06] w-[540px] sm:max-w-[540px] overflow-y-auto">
        {issue && detail && (
          <>
            <SheetHeader>
              {editing ? (
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-base font-semibold"
                />
              ) : (
                <SheetTitle className="text-left pr-6 text-white">
                  {issue.githubIssueNumber && (
                    <span className="text-zinc-600 mr-2">#{issue.githubIssueNumber}</span>
                  )}
                  {detail.title}
                </SheetTitle>
              )}
            </SheetHeader>

            <div className="mt-5 space-y-5">
              {/* Status badges */}
              <div className="flex gap-2 flex-wrap items-center">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                  issue.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                  : issue.status === 'failed' || issue.status === 'human_required' ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                  : 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                }`}>
                  {issue.status}
                </span>
                {editing ? (
                  <div className="flex gap-1">
                    {['P0', 'P1', 'P2'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setEditForm({ ...editForm, priority: p })}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                          editForm.priority === p
                            ? p === 'P0' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                              : p === 'P1' ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 ring-1 ring-zinc-500/30'
                            : 'text-zinc-600 bg-white/[0.04]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                    issue.priority === 'P0' ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                    : issue.priority === 'P1' ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20'
                  }`}>
                    {detail.priority}
                  </span>
                )}
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                  detail.enableQa !== false
                    ? 'bg-violet-500/10 text-violet-400 ring-violet-500/20'
                    : 'bg-zinc-500/10 text-zinc-500 ring-zinc-500/20'
                }`}>
                  {detail.enableQa !== false ? 'QA On' : 'QA Off'}
                </span>
                {issue.labels.map((l) => (
                  <span key={l} className="inline-flex items-center rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-500 ring-1 ring-inset ring-white/[0.06]">
                    {l}
                  </span>
                ))}
                {canEdit && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="ml-auto flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 bg-violet-500/10 px-2 py-1 rounded-md font-medium"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                )}
              </div>

              {/* Description */}
              {editing ? (
                <Textarea
                  value={editForm.body}
                  onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-xs min-h-[100px]"
                  rows={5}
                />
              ) : detail.body ? (
                <div className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 max-h-32 overflow-y-auto">
                  {detail.body}
                </div>
              ) : null}

              {/* QA toggle in edit mode */}
              {editing && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, enableQa: !editForm.enableQa })}
                      className={`w-8 h-4.5 rounded-full transition-colors relative ${
                        editForm.enableQa ? 'bg-violet-600' : 'bg-zinc-700'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        editForm.enableQa ? 'left-4' : 'left-0.5'
                      }`} />
                    </button>
                    <span className="text-xs text-zinc-400">QA Review</span>
                  </label>
                  <span className="text-[10px] text-zinc-600">
                    {editForm.enableQa ? 'Agent will review after execution' : 'Skip QA, commit directly'}
                  </span>
                </div>
              )}

              {/* Save/Cancel buttons */}
              {editing && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
                    onClick={() => updateMutation.mutate(editForm)}
                    disabled={updateMutation.isPending}
                  >
                    <Save size={12} /> {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-white/[0.08] text-zinc-400"
                    onClick={() => setEditing(false)}
                  >
                    <X size={12} /> Cancel
                  </Button>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                  <p className="text-[10px] text-zinc-600">Status</p>
                  <p className="text-sm font-semibold text-white">{issue.status}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                  <p className="text-[10px] text-zinc-600">Attempts</p>
                  <p className="text-sm font-semibold text-white">{issue.iterationCount}/{issue.maxIterations}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                  <p className="text-[10px] text-zinc-600">Created</p>
                  <p className="text-sm font-semibold text-white">{new Date(issue.createdAt).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>

              {/* PM Analysis */}
              {detail.analysis && (
                <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                    onClick={() => toggleSection('analysis')}
                  >
                    <Brain size={13} className="text-violet-400" />
                    <span className="text-xs font-semibold text-zinc-300 flex-1">PM Analysis</span>
                    <ChevronDown size={12} className={`text-zinc-600 transition-transform ${activeSection === 'analysis' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeSection === 'analysis' && (
                    <div className="px-3 pb-3 border-t border-white/[0.04]">
                      <p className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap pt-2.5">
                        {detail.analysis}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Shared Contract */}
              {detail.sharedContract && (
                <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                    onClick={() => toggleSection('contract')}
                  >
                    <GitBranch size={13} className="text-blue-400" />
                    <span className="text-xs font-semibold text-zinc-300 flex-1">Shared Contract</span>
                    <ChevronDown size={12} className={`text-zinc-600 transition-transform ${activeSection === 'contract' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeSection === 'contract' && (
                    <div className="px-3 pb-3 border-t border-white/[0.04]">
                      <pre className="text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap pt-2.5 font-mono overflow-x-auto">
                        {JSON.stringify(detail.sharedContract, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Spec Document */}
              {detail.specDocument && (
                <div className="rounded-lg border border-violet-500/20 overflow-hidden">
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left bg-violet-500/5 hover:bg-violet-500/10 transition-colors"
                    onClick={() => toggleSection('spec')}
                  >
                    <ScrollText size={13} className="text-violet-400" />
                    <span className="text-xs font-semibold text-violet-300 flex-1">RFC Specification</span>
                    <span className="text-[9px] text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded mr-1">SPEC-KIT</span>
                    <ChevronDown size={12} className={`text-violet-600 transition-transform ${activeSection === 'spec' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeSection === 'spec' && (
                    <div className="px-3 pb-3 border-t border-violet-500/10">
                      <div className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap pt-2.5 max-h-96 overflow-y-auto">
                        {detail.specDocument}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tasks */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                  <FileText size={12} className="text-zinc-500" />
                  Tasks ({tasks.length})
                </h3>
                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOTS[task.status]}`} />
                      <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${ROLE_COLORS[task.agentRole] || ''}`}>
                        {task.agentRole}
                      </span>
                      <span className="text-[12px] text-zinc-300 truncate flex-1">{task.title}</span>
                      {task.durationSeconds && (
                        <span className="text-[10px] text-zinc-600 shrink-0">
                          {Number(task.durationSeconds).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-[11px] text-zinc-700 py-3 text-center">No tasks yet</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
