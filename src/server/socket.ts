import type { Server, Socket } from "socket.io";
import {
  addChat,
  createSession,
  getSession,
  joinSession,
  markDisconnected,
  systemChat,
} from "../game/sessions";
import { projectView, restartFromCheckpoint, submitChoice } from "../game/engine";
import type { Slot } from "../game/types";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../shared/events";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

async function broadcastViews(io: GameServer, sessionId: string) {
  const state = getSession(sessionId);
  if (!state) return;
  const sockets = await io.in(sessionId).fetchSockets();
  for (const sock of sockets) {
    const slot = sock.data.slot;
    if (slot === 0 || slot === 1) {
      sock.emit("view", projectView(state, slot));
    }
  }
}

export function registerGameHandlers(io: GameServer) {
  io.on("connection", (socket: GameSocket) => {
    socket.on("session:create", (cb) => {
      const state = createSession();
      cb?.({ sessionId: state.sessionId });
    });

    socket.on("session:join", async ({ sessionId, playerId, name }, cb) => {
      const res = joinSession(sessionId, playerId, name);
      if (!res.ok) {
        cb?.({ ok: false, error: res.error });
        return;
      }
      socket.data.sessionId = sessionId;
      socket.data.slot = res.slot;
      socket.data.playerId = playerId;
      await socket.join(sessionId);
      systemChat(sessionId, `${name || `플레이어 ${(res.slot ?? 0) + 1}`} 님이 합류했습니다.`);
      cb?.({ ok: true, slot: res.slot });
      await broadcastViews(io, sessionId);
    });

    socket.on("game:submit", async ({ choiceId }) => {
      const { sessionId, slot } = socket.data;
      if (sessionId == null || slot == null) return;
      const state = getSession(sessionId);
      if (!state) return;
      const r = submitChoice(state, slot as Slot, choiceId);
      if (!r.ok && r.error) socket.emit("game:error", { message: r.error });
      await broadcastViews(io, sessionId);
    });

    socket.on("game:restart", async () => {
      const { sessionId } = socket.data;
      if (sessionId == null) return;
      const state = getSession(sessionId);
      if (!state) return;
      restartFromCheckpoint(state);
      systemChat(sessionId, "— 에피소드를 다시 시작합니다 —");
      await broadcastViews(io, sessionId);
    });

    socket.on("chat:send", async ({ text }) => {
      const { sessionId, slot } = socket.data;
      if (sessionId == null || slot == null) return;
      addChat(sessionId, slot as Slot, text);
      await broadcastViews(io, sessionId);
    });

    socket.on("disconnect", async () => {
      const { sessionId, playerId } = socket.data;
      if (sessionId == null || !playerId) return;
      markDisconnected(sessionId, playerId);
      systemChat(sessionId, "— 상대가 접속을 종료했습니다 (일시정지) —");
      await broadcastViews(io, sessionId);
    });
  });
}
