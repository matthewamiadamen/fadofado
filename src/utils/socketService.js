/**
 * Socket.IO connection manager for the Flask CNN backend.
 * Lazy-connects on first use; provides helpers for sending frames
 * and receiving predictions.
 */
import { io } from 'socket.io-client';

let socket = null;

/** Get or create the shared Socket.IO connection. */
export function getSocket() {
  if (!socket) {
    // Vite proxy forwards /socket.io to Flask on port 5000
    socket = io({ transports: ['websocket', 'polling'] });
  }
  return socket;
}

/** Disconnect the socket (e.g. when leaving fingerspelling screens). */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
