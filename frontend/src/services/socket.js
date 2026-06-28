// DEPRECATED: Please use SocketContext (useSocket) instead.
// This file is disabled to prevent unauthenticated socket connection conflicts.
/*
import { io } from "socket.io-client";
export const socket = io("http://localhost:5000", {
  autoConnect: false, // Disabled
});
*/
export const socket = { on: () => {}, off: () => {}, emit: () => {}, connect: () => {}, disconnect: () => {} };
