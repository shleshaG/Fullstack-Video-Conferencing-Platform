import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.route.js";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// ================== SOCKET.IO ==================
connectToSocket(server);

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// ================== ROUTES ==================

// Root route (to avoid "Cannot GET /")
app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully 🚀");
});

// User routes
app.use("/api/v1/users", userRoutes);

// ================== SERVER & DB ==================
const PORT = process.env.PORT || 8000;

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

start();
