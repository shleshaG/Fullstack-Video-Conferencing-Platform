import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("SOMETHING CONNECTED")
    // 🔹 When a user joins a call
    socket.on("join-call", (path) => {
      if (!connections[path]) {
        connections[path] = [];
      }
      connections[path].push(socket.id);

      timeOnline[socket.id] = new Date();

      // Notify existing users that a new user joined
      for (let a = 0; a < connections[path].length; a++) {
        io.to(connections[path][a]).emit(
          "user-joined",
          socket.id,
          connections[path]
        );
      }

      // Send existing chat messages to the newly joined user
      if (messages[path]) {
        for (let a = 0; a < messages[path].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][a]["data"],
            messages[path][a]["sender"],
            messages[path][a]["socket-id-sender"]
          );
        }
      }
    });

    // 🔹 Handle WebRTC signaling
    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    // 🔹 Handle chat messages
    socket.on("chat-message", (data, sender) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        [null, false]
      );

      if (found && matchingRoom) {
        if (!messages[matchingRoom]) {
          messages[matchingRoom] = [];
        }
        messages[matchingRoom].push({
          data,
          sender,
          "socket-id-sender": socket.id,
        });

        for (let a = 0; a < connections[matchingRoom].length; ++a) {
          io.to(connections[matchingRoom][a]).emit(
            "chat-message",
            data,
            sender,
            socket.id
          );
        }
      }
    });

    // 🔹 Handle disconnection
    socket.on("disconnect", () => {
      const diffTime = Math.abs(new Date() - timeOnline[socket.id]);
      const secondsOnline = Math.floor(diffTime / 1000);

      let key = null;

      // Find which room this socket belonged to
      for (const [roomKey, roomValue] of Object.entries(connections)) {
        if (roomValue.includes(socket.id)) {
          key = roomKey;

          // Remove socket from that room
          connections[roomKey] = roomValue.filter((id) => id !== socket.id);

          // Notify remaining users
          for (let i = 0; i < connections[roomKey].length; i++) {
            io.to(connections[roomKey][i]).emit("user-left", socket.id);
          }

          break; // Found the room, no need to continue
        }
      }

      // Cleanup
      delete timeOnline[socket.id];

      console.log(
        `Socket ${socket.id} disconnected from ${
          key || "unknown room"
        } after ${secondsOnline} seconds`
      );
    });
  });

  return io;
};
