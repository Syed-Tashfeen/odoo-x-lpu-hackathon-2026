import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "../../config/swagger.js";

extendZodWithOpenApi(z);

export const moveTypeEnumZod = z.enum(["in", "out", "transfer", "adjustment"]);

// ═══════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ═══════════════════════════════════════════════════════════

export const stockMovesQuerySchema = z.object({
  productId: z.string().uuid("Invalid product ID format").optional(),
  product: z.string().optional(),
  locationId: z.string().uuid("Invalid location ID format").optional(),
  location: z.string().optional(),
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
  from: z.string().optional(), // Date string: YYYY-MM-DD or ISO
  to: z.string().optional(),   // Date string: YYYY-MM-DD or ISO
  moveType: z.enum(["in", "out", "transfer", "adjustment"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const stockLevelsQuerySchema = z.object({
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
  warehouse: z.string().optional(),
  productId: z.string().uuid("Invalid product ID format").optional(),
  product: z.string().optional(),
  search: z.string().optional(),
  below_reorder: z
    .preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return val;
    }, z.boolean())
    .optional(),
  belowReorder: z
    .preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return val;
    }, z.boolean())
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const stockAlertsQuerySchema = z.object({
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
  categoryId: z.string().uuid("Invalid category ID format").optional(),
});

// ═══════════════════════════════════════════════════════════
// SWAGGER REGISTRATIONS
// ═══════════════════════════════════════════════════════════

registry.registerPath({
  method: "get",
  path: "/stock/moves",
  tags: ["Stock"],
  summary: "Get stock move history (immutable audit trail)",
  security: [{ BearerAuth: [] }],
  parameters: [
    { name: "productId", in: "query", schema: { type: "string", format: "uuid" }, required: false },
    { name: "locationId", in: "query", schema: { type: "string", format: "uuid" }, required: false },
    { name: "warehouseId", in: "query", schema: { type: "string", format: "uuid" }, required: false },
    { name: "moveType", in: "query", schema: { type: "string", enum: ["in", "out", "transfer", "adjustment"] }, required: false },
    { name: "from", in: "query", schema: { type: "string", format: "date" }, required: false },
    { name: "to", in: "query", schema: { type: "string", format: "date" }, required: false },
    { name: "page", in: "query", schema: { type: "integer", default: 1 }, required: false },
    { name: "limit", in: "query", schema: { type: "integer", default: 20 }, required: false },
  ],
  responses: {
    200: {
      description: "List of stock moves with joined product and location details",
    },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/stock/levels",
  tags: ["Stock"],
  summary: "Get current stock levels per location",
  security: [{ BearerAuth: [] }],
  parameters: [
    { name: "warehouseId", in: "query", schema: { type: "string", format: "uuid" }, required: false },
    { name: "productId", in: "query", schema: { type: "string", format: "uuid" }, required: false },
    { name: "below_reorder", in: "query", schema: { type: "boolean" }, required: false },
    { name: "page", in: "query", schema: { type: "integer", default: 1 }, required: false },
    { name: "limit", in: "query", schema: { type: "integer", default: 50 }, required: false },
  ],
  responses: {
    200: {
      description: "List of stock levels per location",
    },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/stock/alerts",
  tags: ["Stock"],
  summary: "Get low-stock alert items (quantity <= reorder_point)",
  security: [{ BearerAuth: [] }],
  parameters: [
    { name: "warehouseId", in: "query", schema: { type: "string", format: "uuid" }, required: false },
    { name: "categoryId", in: "query", schema: { type: "string", format: "uuid" }, required: false },
  ],
  responses: {
    200: {
      description: "Active low-stock alerts with deficit and location breakdown",
    },
    401: { description: "Unauthorized" },
  },
});
