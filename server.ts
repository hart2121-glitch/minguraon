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
const hostname = "localhost";

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

  httpServer.listen(port, () => {
    console.log(`▶ 유천당 서버 가동: http://${hostname}:${port}`);
  });
});
