import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";
import apiRoutes from "./routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Apply global middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Serve uploads folder statically so compiled PDFs and RFQ specs can be accessed by the browser
const uploadDir = path.join(__dirname, "../../uploads");
app.use("/uploads", express.static(uploadDir));

// Healthcheck endpoint
app.get("/api/v1/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Register API routes
app.use("/api/v1", apiRoutes);

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error occurred",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`VendorBridge ERP Backend active on http://localhost:${PORT}`);
  console.log(`Serving static files from: ${uploadDir}`);
  console.log(`===================================================`);
});
