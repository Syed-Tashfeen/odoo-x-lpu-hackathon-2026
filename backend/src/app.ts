import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import pino from "pino";
import { env } from "./config/env.js";
import { setupSwagger } from "./config/swagger.js";
import { errorHandler } from "./middleware/error.middleware.js";

// ── Import route modules ──────────────────────────────────
import authRoutes from "./modules/auth/auth.routes.js";
import categoriesRoutes from "./modules/categories/categories.routes.js";
import productsRoutes from "./modules/products/products.routes.js";
import warehousesRoutes from "./modules/warehouses/warehouses.routes.js";
import locationsRoutes from "./modules/warehouses/locations.routes.js";
import operationsRoutes from "./modules/operations/operations.routes.js";

// ── Logger ────────────────────────────────────────────────
const logger = pino({
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

// ── Express app ───────────────────────────────────────────
const app = express();

// ── Global middleware ─────────────────────────────────────
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

// ── Swagger ───────────────────────────────────────────────
setupSwagger(app);

// ── Health check ──────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════
// ROUTE MODULES
// ═══════════════════════════════════════════════════════════
app.use("/api/v1/auth", authRoutes);
app.use("/api/auth", authRoutes); // backward compatibility alias

app.use("/api/v1/categories", categoriesRoutes);
app.use("/api/categories", categoriesRoutes);

app.use("/api/v1/products", productsRoutes);
app.use("/api/products", productsRoutes);

app.use("/api/v1/warehouses", warehousesRoutes);
app.use("/api/warehouses", warehousesRoutes);

app.use("/api/v1/locations", locationsRoutes);
app.use("/api/locations", locationsRoutes);

app.use("/api/v1/operations", operationsRoutes);
app.use("/api/operations", operationsRoutes);

// ── Error handler (must be last) ──────────────────────────
app.use(errorHandler);

export { app, logger };
