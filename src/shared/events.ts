import type { PlayerView, Slot } from "../game/types";

// 클라이언트 → 서버
export interface ClientToServerEvents {
  "session:create": (cb: (res: { sessionId: string }) => void) => void;
  "session:join": (
    payload: { sessionId: string; playerId: string; name: string },
    cb: (res: { ok: boolean; slot?: Slot; error?: string }) => void,
  ) => void;
  "game:submit": (payload: { choiceId: string }) => void;
  "game:restart": () => void;
  "chat:send": (payload: { text: string }) => void;
}

// 서버 → 클라이언트
export interface ServerToClientEvents {
  view: (view: PlayerView) => void;
  "game:error": (payload: { message: string }) => void;
}

export interface SocketData {
  sessionId?: string;
  slot?: Slot;
  playerId?: string;
}
