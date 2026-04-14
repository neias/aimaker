import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

export function subscribeToProject(projectId: string) {
  const s = getSocket();
  s.emit('subscribe:project', { projectId });
}

export function subscribeToTerminal(runId: string) {
  const s = getSocket();
  s.emit('subscribe:terminal', { runId });
}

export function unsubscribeFromTerminal(runId: string) {
  const s = getSocket();
  s.emit('unsubscribe:terminal', { runId });
}
