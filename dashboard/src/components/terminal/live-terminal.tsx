'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { getSocket, subscribeToTerminal, unsubscribeFromTerminal } from '@/lib/ws';
import '@xterm/xterm/css/xterm.css';

interface LiveTerminalProps {
  runId: string;
}

export function LiveTerminal({ runId }: LiveTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#09090b',
        foreground: '#d4d4d8',
        cursor: '#d4d4d8',
      },
      fontSize: 12,
      fontFamily: 'var(--font-geist-mono), monospace',
      cursorBlink: false,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    termRef.current = term;

    // Subscribe to terminal output
    subscribeToTerminal(runId);
    const socket = getSocket();

    const handler = (data: any) => {
      const eventData = data.data || data;
      if (eventData.run_id === runId) {
        const line = eventData.line || '';
        term.writeln(line);
      }
    };

    socket.on('run:output', handler);

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(containerRef.current);

    return () => {
      socket.off('run:output', handler);
      unsubscribeFromTerminal(runId);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [runId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded border border-zinc-800 bg-[#09090b]"
    />
  );
}
