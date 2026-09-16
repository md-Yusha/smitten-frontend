import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL, apiFetchHeaders } from '@/src/services/apiConfig';
import { getAccessToken } from '@/src/services/tokenStorage';

const SERVER_EVENTS = [
  'message:new',
  'message:updated',
  'message:deleted',
  'messages:read',
  'presence:update',
  'typing:update',
  'profile:updated',
  'couple:updated',
  'couple:disbanded',
  'content:updated',
  'love:sent',
  'games:challenge_updated',
  'games:tictactoe_updated',
  'games:invite_received',
  'games:invite_accepted',
  'games:invite_declined',
] as const;

type ServerEvent = (typeof SERVER_EVENTS)[number];
type Handler = (...args: unknown[]) => void;

let socket: Socket | null = null;
let activeCoupleId: string | null = null;
let connectPromise: Promise<Socket | null> | null = null;
const listeners = new Map<string, Set<Handler>>();

function emitLocal(event: string, ...args: unknown[]) {
  listeners.get(event)?.forEach((fn) => fn(...args));
}

function wireSocket(sock: Socket) {
  for (const event of SERVER_EVENTS) {
    sock.off(event);
    sock.on(event, (...args: unknown[]) => emitLocal(event, ...args));
  }
  emitLocal('connection:ready');
}

export function subscribeCoupleSocket(event: ServerEvent | string, handler: Handler): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
}

export function emitCoupleSocket(event: string, payload?: unknown): void {
  if (!socket?.connected) return;
  socket.emit(event, payload);
}

export async function ensureCoupleSocket(coupleId: string): Promise<Socket | null> {
  if (socket?.connected && activeCoupleId === coupleId) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    activeCoupleId = null;
    connectPromise = null;
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      const token = await getAccessToken();
      if (!token) return null;

      const sock = io(API_BASE_URL, {
        auth: { token },
        extraHeaders: Object.fromEntries(apiFetchHeaders().entries()),
        reconnection: true,
        reconnectionAttempts: 8,
        timeout: 8000,
      });

      sock.on('connect', () => wireSocket(sock));
      socket = sock;
      activeCoupleId = coupleId;
      if (sock.connected) wireSocket(sock);
      return sock;
    })();
  }

  return connectPromise;
}

export function emitCoupleTyping(typing: boolean): void {
  if (!socket?.connected) return;
  socket.emit(typing ? 'typing:start' : 'typing:stop');
}

export function disconnectCoupleSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  activeCoupleId = null;
  connectPromise = null;
}
