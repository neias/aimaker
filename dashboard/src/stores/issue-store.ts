import { create } from 'zustand';
import type { Issue, IssueStatus } from '@/types';
import { api } from '@/lib/api';

interface IssueStore {
  issues: Issue[];
  loading: boolean;
  error: string | null;
  fetchIssues: (projectId: string) => Promise<void>;
  updateIssueStatus: (issueId: string, status: IssueStatus) => void;
}

export const useIssueStore = create<IssueStore>((set, get) => ({
  issues: [],
  loading: false,
  error: null,

  fetchIssues: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const issues = await api.issues.list(projectId);
      set({ issues, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  updateIssueStatus: (issueId: string, status: IssueStatus) => {
    set({
      issues: get().issues.map((i) =>
        i.id === issueId ? { ...i, status } : i,
      ),
    });
  },
}));
