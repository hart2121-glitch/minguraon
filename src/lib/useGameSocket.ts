"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { PlayerView, Slot } from "@/game/types";
import type { ClientToServerEvents, ServerToClientEvents } from "@/shared/events";
import { getName, getPlayerId } from "./identity";

type GameClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface UseGameSocket {
  connected: boolean;
  view: PlayerView | null;
  slot: Slot | null;
  joinError: string | null;
  actionError: string | null;
  submit: (choiceId: string) => void;
  restart: () => void;
  sendChat: (text: string) => void;
}

export function useGameSocket(sessionId: string): UseGameSocket {
  const socketRef = useRef<GameClientSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<PlayerView | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const socket: GameClientSocket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    const playerId = getPlayerId();
    const name = getName();

    const doJoin = () => {
      socket.emit("session:join", { sessionId, playerId, name }, (res) => {
        if (res.ok) {
          setSlot(res.slot ?? null);
          setJoinError(null);
        } else {
          setJoinError(res.error ?? "참가에 실패했습니다.");
        }
      });
    };

    socket.on("connect", () => {
      setConnected(true);
      doJoin();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("view", (v) => setView(v));
    socket.on("game:error", ({ message }) => {
      setActionError(message);
      setTimeout(() => setActionError(null), 2500);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const submit = useCallback((choiceId: string) => {
    socketRef.current?.emit("game:submit", { choiceId });
  }, []);

  const restart = useCallback(() => {
    socketRef.current?.emit("game:restart");
  }, []);

  const sendChat = useCallback((text: string) => {
    const t = text.trim();
    if (t) socketRef.current?.emit("chat:send", { text: t });
  }, []);

  return { connected, view, slot, joinError, actionError, submit, restart, sendChat };
}
