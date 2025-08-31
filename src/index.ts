import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import valueRoutes from "./routes/valueRoutes";
import { clientPromise, closeConnection, createIndexes } from "./config/db";

// Khởi tạo môi trường
dotenv.config();

// Tạo ứng dụng Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware bảo mật và tiện ích
app.use(helmet()); // Bảo mật HTTP headers
app.use(cors()); // Cho phép CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan("dev")); // Logging

// Test kết nối MongoDB
async function testDbConnection() {
  try {
    await clientPromise;
    console.log("MongoDB connection established successfully");
    
    // Tạo indexes để tối ưu truy vấn
    await createIndexes();
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// app.use fix path when start with //
app.use((req, res, next) => {
  if (req.path.startsWith("//")) {
    req.url = req.path.substring(1);
  }
  next();
});

// Routes
app.use("/api/values", valueRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Not found" });
});

// Khởi động server
const server = app.listen(PORT, async () => {
  await testDbConnection();
  console.log(`Server running on port ${PORT}`);
});

// Xử lý tắt graceful
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(async () => {
    console.log("Server closed");
    await closeConnection();
    process.exit(0);
  });
});

export default app; 