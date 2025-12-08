import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import path from "path";
import { fileURLToPath } from "url";

// ==========================
// PATH FIX & BASIC SERVER SETUP
// ==========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Serve static frontend from /public
app.use(express.static(path.join(__dirname, "public")));

// ==========================
// REDIS ADAPTER SETUP (DISTRIBUTED SYNC)
// ==========================
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_URL = `redis://${REDIS_HOST}:6379`;

const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

try {
  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log("✅ Connected to Redis at", REDIS_HOST);
} catch (error) {
  console.error("❌ Failed to connect to Redis:", error.message);
  process.exit(1);
}

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
// CRITICAL: Apply the Redis adapter to synchronize all app nodes
io.adapter(createAdapter(pubClient, subClient));

// ==========================
// SOCKET.IO USER HANDLING
// ==========================
io.on("connection", (socket) => {
  let userId = null;

  console.log("🟢 Socket connected:", socket.id);

  // 1. Client sends its session userId
  socket.on("register", (data) => {
    userId = data?.userId || socket.id.slice(0, 5).toUpperCase();
    console.log("👤 User registered:", socket.id, "userId:", userId);

    // Send back user info immediately to update the client's label
    socket.emit("user-info", { userId });

    // NOTE: No 'init-board' call because state is not stored in memory.
  });

  // 2. DRAW EVENT: Broadcasts drawing data to everyone else
  socket.on("draw", (data) => {
    // Broadcast the drawing to everyone *except* the sender.
    // The sender draws the point locally for zero latency.
    socket.broadcast.emit("draw", data);
  });

  // 3. CLEAR ALL EVENT
  socket.on("clear-all", () => {
    io.emit("clear-all");
  });

  // 4. CLEAR ONLY MY STROKES
  socket.on("clear-mine", () => {
    // In a stateless design, this serves as a broadcast command
    // that a user wants to clear their strokes.
    io.emit("clear-user-broadcast", { userId });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id, "userId:", userId);
  });
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`✅ Whiteboard running at http://localhost:${PORT}`);
});
