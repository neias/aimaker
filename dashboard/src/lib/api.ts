import { useActivityStore } from '@/stores/activity-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function logActivity(
  method: string,
  path: string,
  status: number,
  duration: number,
  error?: string,
) {
  try {
    const store = useActivityStore.getState();
    store.add({
      category: error ? 'error' : 'api',
      method,
      path,
      status,
      duration,
      message: `${method} ${path} → ${status}`,
      detail: error || undefined,
    });
  } catch {
    // Store may not be initialized in SSR
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method || 'GET';
  const start = performance.now();

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const duration = Math.round(performance.now() - start);

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {
      const text = await res.text();
      if (text) message = text;
    }
    logActivity(method, path, res.status, duration, message);
    throw new Error(message);
  }

  const text = await res.text();
  logActivity(method, path, res.status, duration);

  if (!text) return undefined as T;
  return JSON.parse(text);
}

// Projects
export const api = {
  projects: {
    list: () => request<any[]>('/projects'),
    get: (id: string) => request<any>(`/projects/${id}`),
    create: (data: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
    scan: (id: string) => request<{ snapshot: string; length: number }>(`/projects/${id}/scan`, { method: 'POST' }),
  },
  issues: {
    list: (projectId: string, status?: string) => {
      const qs = status ? `?status=${status}` : '';
      return request<any[]>(`/projects/${projectId}/issues${qs}`);
    },
    get: (id: string) => request<any>(`/issues/${id}`),
    create: (projectId: string, data: any) =>
      request<any>(`/projects/${projectId}/issues`, { method: 'POST', body: JSON.stringify(data) }),
    sync: (projectId: string) =>
      request<{ created: number; updated: number }>(`/projects/${projectId}/issues/sync`, { method: 'POST' }),
    process: (id: string) => request<any>(`/issues/${id}/process`, { method: 'POST' }),
    cancel: (id: string) => request<any>(`/issues/${id}/cancel`, { method: 'POST' }),
    retry: (id: string) => request<any>(`/issues/${id}/retry`, { method: 'POST' }),
    update: (id: string, data: any) => request<any>(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/issues/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (issueId: string) => request<any[]>(`/issues/${issueId}/tasks`),
    get: (id: string) => request<any>(`/tasks/${id}`),
  },
  runs: {
    get: (id: string) => request<any>(`/runs/${id}`),
    logs: (id: string, offset = 0, limit = 200) =>
      request<any[]>(`/runs/${id}/logs?offset=${offset}&limit=${limit}`),
  },
  policies: {
    list: (projectId: string) => request<any[]>(`/projects/${projectId}/policies`),
    create: (projectId: string, data: any) =>
      request<any>(`/projects/${projectId}/policies`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/policies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/policies/${id}`, { method: 'DELETE' }),
  },
  milestones: {
    list: (projectId: string) => request<any[]>(`/projects/${projectId}/milestones`),
    get: (id: string) => request<any>(`/milestones/${id}`),
    create: (projectId: string, data: any) =>
      request<any>(`/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
    analyze: (id: string) => request<any>(`/milestones/${id}/analyze`, { method: 'POST' }),
    delete: (id: string) => request<void>(`/milestones/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    costs: (projectId: string) => request<any[]>(`/projects/${projectId}/analytics/costs`),
    successRate: (projectId: string) => request<any[]>(`/projects/${projectId}/analytics/success-rate`),
    timeline: (projectId: string) => request<any[]>(`/projects/${projectId}/analytics/timeline`),
  },
  orchestrator: {
    health: () => request<any>('/orchestrator/health'),
  },
  activity: {
    list: (projectId: string, options?: { category?: string; limit?: number; offset?: number }) => {
      const params = new URLSearchParams();
      if (options?.category) params.set('category', options.category);
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      const qs = params.toString() ? `?${params.toString()}` : '';
      return request<{ data: any[]; total: number }>(`/projects/${projectId}/activity${qs}`);
    },
  },
};
