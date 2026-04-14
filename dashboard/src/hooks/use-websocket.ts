'use client';

import { useEffect, useRef } from 'react';
import { getSocket, subscribeToProject } from '@/lib/ws';
import { useActivityStore } from '@/stores/activity-store';
import type { WSEvent } from '@/types';

export function useProjectEvents(
  projectId: string | undefined,
  onEvent: (event: WSEvent) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();
    subscribeToProject(projectId);

    const events = [
      'issue:status_changed',
      'task:created',
      'task:started',
      'task:completed',
      'task:failed',
      'qa:verdict',
      'checkpoint:created',
      'checkpoint:rollback',
      'budget:exceeded',
      'pipeline:completed',
      'pipeline:failed',
      'milestone:analyzing',
      'milestone:ready',
    ];

    const handler = (data: WSEvent) => {
      // Log to activity store
      try {
        const store = useActivityStore.getState();
        store.add({
          category: 'ws',
          message: `WS ${data.type}`,
          detail: JSON.stringify(data.data, null, 2),
        });
      } catch {}

      onEventRef.current(data);
    };

    events.forEach((e) => socket.on(e, handler));

    return () => {
      events.forEach((e) => socket.off(e, handler));
    };
  }, [projectId]);
}
