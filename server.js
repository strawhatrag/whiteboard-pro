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
  // Exit if Redis connection is critical for operation
  process.exit(1);
}

const io = new Server(server, {
  // Add cors options to prevent potential connection issues during development
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
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

    // --- STATE OMISSION ---
    // We omit 'init-board' here. In a production app, you'd load state from a
    // persistent database (like a Redis list or PostgreSQL) here, not memory.
  });

  // 2. DRAW EVENT: Broadcasts drawing data to everyone else
  socket.on("draw", (data) => {
    // Broadcast the drawing to every other connected client (across all nodes)
    // The sender (client) already drew the point locally.
    socket.broadcast.emit("draw", data);
  });

  // 3. CLEAR ALL EVENT
  socket.on("clear-all", () => {
    // Broadcast to all clients (across all nodes)
    io.emit("clear-all");

    // NOTE: In a production app, you would also clear the persistent database here.
  });

  // 4. CLEAR ONLY MY STROKES (Requires client side logic in the absence of state)
  socket.on("clear-mine", () => {
    // Since the server doesn't track strokes, we just broadcast the command
    // for everyone else to ignore strokes coming from this user ID.
    // This is a placeholder for a stateful cleanup. For a clean, stateless
    // approach, this button may need to be handled client-side or removed.
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
