import { createServer } from "node:http";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { registerGameHandlers } from "./src/server/socket";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./src/shared/events";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;
// 로컬 개발은 localhost, 배포 환경은 모든 인터페이스(0.0.0.0)에 바인딩
const hostname = process.env.HOST || (dev ? "localhost" : "0.0.0.0");

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: { origin: "*" },
  });

  registerGameHandlers(io);

  httpServer.listen(port, hostname, () => {
    console.log(`▶ 령안 서버 가동: http://${hostname}:${port}`);
  });
});
