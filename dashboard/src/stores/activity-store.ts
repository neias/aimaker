import { create } from 'zustand';

export interface ActivityEntry {
  id: number;
  time: string;
  category: 'api' | 'ws' | 'engine' | 'agent' | 'error';
  method?: string;
  path?: string;
  status?: number;
  message: string;
  detail?: string;
  duration?: number;
}

let entryId = 0;

interface ActivityStore {
  entries: ActivityEntry[];
  add: (entry: Omit<ActivityEntry, 'id' | 'time'>) => void;
  clear: () => void;
}

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  entries: [],
  add: (entry) =>
    set((state) => ({
      entries: [...state.entries.slice(-500), { ...entry, id: ++entryId, time: now() }],
    })),
  clear: () => set({ entries: [] }),
}));
