'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LiveTerminal } from '@/components/terminal/live-terminal';
import { Badge } from '@/components/ui/badge';

export default function TerminalPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);

  const { data: run } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.runs.get(runId),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-4 h-[calc(100vh-48px)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Live Terminal</h1>
          {run && (
            <>
              <Badge variant="outline">{run.agentRole}</Badge>
              <Badge variant="outline">{run.modelTier}</Badge>
              <Badge
                variant="outline"
                className={
                  run.status === 'running'
                    ? 'text-blue-400 border-blue-800'
                    : run.status === 'completed'
                    ? 'text-green-400 border-green-800'
                    : 'text-red-400 border-red-800'
                }
              >
                {run.status}
              </Badge>
            </>
          )}
        </div>
        {run && (
          <div className="flex gap-4 text-xs text-zinc-500">
            <span>Model: {run.modelName || '-'}</span>
            <span>Tokens: {(run.tokensInput + run.tokensOutput).toLocaleString()}</span>
            <span>Cost: ${Number(run.costUsd).toFixed(4)}</span>
          </div>
        )}
      </div>

      <div className="flex-1 h-[calc(100%-60px)]">
        <LiveTerminal runId={runId} />
      </div>
    </div>
  );
}
