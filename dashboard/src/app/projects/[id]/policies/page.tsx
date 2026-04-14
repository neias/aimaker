'use client';

import { useState, useRef, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/components/toast';
import { Plus, Upload, FileText, Trash2, ArrowLeft, ChevronDown, Pencil, Save, X } from 'lucide-react';
import Link from 'next/link';
import type { Policy, PolicyScope } from '@/types';

const SCOPE_KEYWORDS: Record<string, PolicyScope> = {
  backend: 'backend',
  api: 'backend',
  server: 'backend',
  database: 'backend',
  'db': 'backend',
  endpoint: 'backend',
  nestjs: 'backend',
  express: 'backend',
  frontend: 'frontend',
  ui: 'frontend',
  component: 'frontend',
  css: 'frontend',
  tailwind: 'frontend',
  react: 'frontend',
  nextjs: 'frontend',
  styling: 'frontend',
};

function detectScope(text: string): PolicyScope {
  const lower = text.toLowerCase();
  for (const [keyword, scope] of Object.entries(SCOPE_KEYWORDS)) {
    if (lower.includes(keyword)) return scope;
  }
  return 'global';
}

function parseMdRules(content: string, fileName: string): { name: string; rule: string; scope: PolicyScope }[] {
  const rules: { name: string; rule: string; scope: PolicyScope }[] = [];
  const lines = content.split('\n');

  let currentHeading = '';
  let headingScope: PolicyScope = detectScope(fileName);
  let currentLines: string[] = [];

  const flush = () => {
    if (currentHeading && currentLines.length > 0) {
      const ruleText = currentLines
        .map((l) => l.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean)
        .join('. ');
      if (ruleText.length > 5) {
        rules.push({ name: currentHeading, rule: ruleText, scope: detectScope(currentHeading + ' ' + ruleText) || headingScope });
      }
    }
    currentLines = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      // Update heading scope based on heading content
      const detected = detectScope(currentHeading);
      if (detected !== 'global') headingScope = detected;
    } else if (line.match(/^[-*]\s+.+/)) {
      const ruleText = line.replace(/^[-*]\s+/, '').trim();
      if (ruleText.length > 5) {
        const ruleScope = detectScope(ruleText);
        rules.push({
          name: currentHeading ? `${currentHeading}: ${ruleText.slice(0, 50)}` : ruleText.slice(0, 50),
          rule: ruleText,
          scope: ruleScope !== 'global' ? ruleScope : headingScope,
        });
      }
    } else if (line.trim().length > 10 && !line.startsWith('#') && !line.startsWith('```')) {
      currentLines.push(line);
    }
  }
  flush();

  return rules;
}

export default function PoliciesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ scope: 'global' as PolicyScope, name: '', description: '', rule: '' });
  const [importPreview, setImportPreview] = useState<{ name: string; rule: string; scope: PolicyScope }[] | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<{ id: string; name: string; rule: string; scope: PolicyScope } | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ policyId, data }: { policyId: string; data: any }) =>
      api.policies.update(policyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies', id] });
      setEditingPolicy(null);
      showToast('success', 'Rule updated');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies', id],
    queryFn: () => api.policies.list(id),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.policies.create(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies', id] });
      setForm({ scope: 'global', name: '', description: '', rule: '' });
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ policyId, enabled }: { policyId: string; enabled: boolean }) =>
      api.policies.update(policyId, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.policies.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies', id] });
      showToast('success', 'Rule deleted');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const scopes: PolicyScope[] = ['global', 'backend', 'frontend'];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const rules = parseMdRules(content, file.name);

    if (rules.length === 0) {
      showToast('error', 'No rules found in file. Use markdown with headings and bullet points.');
      return;
    }

    setImportFileName(file.name);
    setImportPreview(rules);
    e.target.value = '';
  };

  const handleImportAll = async () => {
    if (!importPreview) return;
    let imported = 0;
    for (const rule of importPreview) {
      try {
        await api.policies.create(id, rule);
        imported++;
      } catch { /* skip duplicates */ }
    }
    queryClient.invalidateQueries({ queryKey: ['policies', id] });
    showToast('success', `Imported ${imported} rules from ${importFileName}`);
    setImportPreview(null);
    setImportFileName('');
  };

  const handleImportSelected = async (index: number) => {
    const rule = importPreview![index];
    try {
      await api.policies.create(id, rule);
      queryClient.invalidateQueries({ queryKey: ['policies', id] });
      setImportPreview((prev) => prev!.filter((_, i) => i !== index));
      showToast('success', `Imported: ${rule.name}`);
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

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
          <h1 className="text-xl font-semibold tracking-tight text-white">Policy Manager</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Define rules that agents must follow.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06]"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={13} />
          Import .md
        </Button>
      </div>

      {/* Import Preview */}
      {importPreview && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-violet-400" />
              <span className="text-sm font-medium text-white">{importFileName}</span>
              <span className="text-[10px] text-zinc-500 bg-white/[0.06] px-1.5 py-0.5 rounded">
                {importPreview.length} rules found
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
                onClick={handleImportAll}
              >
                Import All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/[0.08] text-zinc-400"
                onClick={() => { setImportPreview(null); setImportFileName(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain">
            {importPreview.map((rule, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
              >
                <button
                  onClick={() => {
                    const nextScope: Record<string, PolicyScope> = { global: 'backend', backend: 'frontend', frontend: 'global' };
                    setImportPreview((prev) =>
                      prev!.map((r, idx) => idx === i ? { ...r, scope: nextScope[r.scope] } : r)
                    );
                  }}
                  className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                    rule.scope === 'backend' ? 'bg-blue-500/20 text-blue-400' :
                    rule.scope === 'frontend' ? 'bg-green-500/20 text-green-400' :
                    'bg-zinc-500/20 text-zinc-400'
                  }`}
                  title="Click to change scope"
                >
                  {rule.scope}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-zinc-300 truncate">{rule.name}</p>
                  <p className="text-[10px] text-zinc-600 truncate">{rule.rule}</p>
                </div>
                <button
                  onClick={() => handleImportSelected(i)}
                  className="shrink-0 text-[10px] text-violet-400 hover:text-violet-300 bg-violet-500/10 px-2 py-1 rounded"
                >
                  Import
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Rule */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
        <p className="text-xs font-semibold text-zinc-400">Add new rule</p>
        <div className="flex gap-2">
          {scopes.map((s) => (
            <button
              key={s}
              onClick={() => setForm({ ...form, scope: s })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                form.scope === s
                  ? 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30'
                  : 'text-zinc-600 hover:text-zinc-400 bg-white/[0.02] hover:bg-white/[0.06]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <Input
          placeholder="Rule name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="bg-white/[0.04] border-white/[0.08] text-sm"
        />
        <Textarea
          placeholder="Rule (e.g., Only use Tailwind CSS for styling)"
          value={form.rule}
          onChange={(e) => setForm({ ...form, rule: e.target.value })}
          className="bg-white/[0.04] border-white/[0.08] text-sm"
          rows={2}
        />
        <Button
          onClick={() => createMutation.mutate(form)}
          disabled={!form.name || !form.rule}
          size="sm"
          className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Plus size={13} />
          Add Rule
        </Button>
      </div>

      {/* Rules List */}
      <Tabs defaultValue="all">
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          <TabsTrigger value="all">All ({policies.length})</TabsTrigger>
          {scopes.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s} ({policies.filter((p: Policy) => p.scope === s).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {['all', ...scopes].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-1.5 mt-4">
            {policies
              .filter((p: Policy) => tab === 'all' || p.scope === tab)
              .map((policy: Policy) => (
                <div
                  key={policy.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] group"
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}
                  >
                    <button
                      className={`w-3 h-3 rounded-full shrink-0 transition-colors ${policy.enabled ? 'bg-emerald-400' : 'bg-zinc-700'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMutation.mutate({ policyId: policy.id, enabled: !policy.enabled });
                      }}
                    />
                    <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                      policy.scope === 'backend' ? 'bg-blue-500/20 text-blue-400' :
                      policy.scope === 'frontend' ? 'bg-green-500/20 text-green-400' :
                      'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {policy.scope}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-300">{policy.name}</p>
                      {expandedPolicy !== policy.id && (
                        <p className="text-[11px] text-zinc-600 truncate">{policy.rule}</p>
                      )}
                    </div>
                    <ChevronDown
                      size={13}
                      className={`shrink-0 text-zinc-700 transition-transform ${expandedPolicy === policy.id ? 'rotate-180' : ''}`}
                    />
                    <button
                      className="shrink-0 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(policy.id); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {expandedPolicy === policy.id && (
                    <div className="px-3 pb-3 pt-0 border-t border-white/[0.04]">
                      {editingPolicy?.id === policy.id ? (
                        <div className="space-y-2 pt-2.5">
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingPolicy.name}
                              onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                              className="bg-white/[0.04] border-white/[0.08] text-xs h-8"
                              placeholder="Rule name"
                            />
                            <div className="flex gap-1 shrink-0">
                              {(['global', 'backend', 'frontend'] as PolicyScope[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setEditingPolicy({ ...editingPolicy, scope: s })}
                                  className={`px-2 py-1 rounded text-[9px] font-medium transition-all ${
                                    editingPolicy.scope === s
                                      ? s === 'backend' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                                        : s === 'frontend' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                                        : 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30'
                                      : 'text-zinc-600 hover:text-zinc-400 bg-white/[0.04]'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Textarea
                            value={editingPolicy.rule}
                            onChange={(e) => setEditingPolicy({ ...editingPolicy, rule: e.target.value })}
                            className="bg-white/[0.04] border-white/[0.08] text-xs min-h-[80px]"
                            rows={4}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateMutation.mutate({
                                policyId: editingPolicy.id,
                                data: { name: editingPolicy.name, rule: editingPolicy.rule, scope: editingPolicy.scope },
                              })}
                              className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1.5 rounded-md font-medium"
                            >
                              <Save size={10} /> Save
                            </button>
                            <button
                              onClick={() => setEditingPolicy(null)}
                              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 bg-white/[0.04] px-2.5 py-1.5 rounded-md"
                            >
                              <X size={10} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2.5">
                          <p className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {policy.rule}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPolicy({ id: policy.id, name: policy.name, rule: policy.rule, scope: policy.scope });
                            }}
                            className="flex items-center gap-1 mt-2.5 text-[10px] text-violet-400 hover:text-violet-300 bg-violet-500/10 px-2 py-1 rounded-md font-medium"
                          >
                            <Pencil size={10} /> Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            {policies.filter((p: Policy) => tab === 'all' || p.scope === tab).length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-700">
                <p className="text-xs">No rules in this scope</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
