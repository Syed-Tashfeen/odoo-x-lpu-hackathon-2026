import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "../../config/swagger.js";

extendZodWithOpenApi(z);

// ═══════════════════════════════════════════════════════════
// WAREHOUSE SCHEMAS
// ═══════════════════════════════════════════════════════════

export const createWarehouseSchema = z
  .object({
    name: z
      .string()
      .min(1, "Warehouse name is required")
      .max(255, "Name cannot exceed 255 characters")
      .openapi({ example: "Central Distribution Center" }),
    address: z.string().optional().nullable().openapi({ example: "Plot 42, Logistics Park, Sector 4" }),
    isActive: z.boolean().default(true).openapi({ example: true }),
  })
  .openapi("CreateWarehouseRequest");

export const updateWarehouseSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    address: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .openapi("UpdateWarehouseRequest");

export const warehouseIdParamSchema = z.object({
  id: z.string().uuid("Invalid warehouse ID format"),
});

// ═══════════════════════════════════════════════════════════
// LOCATION SCHEMAS
// ═══════════════════════════════════════════════════════════

export const locationTypeZodEnum = z.enum([
  "internal",
  "customer",
  "supplier",
  "adjustment",
]);

export const createLocationSchema = z
  .object({
    name: z
      .string()
      .min(1, "Location name is required")
      .max(255, "Name cannot exceed 255 characters")
      .openapi({ example: "Rack A" }),
    type: locationTypeZodEnum.default("internal").openapi({ example: "internal" }),
  })
  .openapi("CreateLocationRequest");

export const updateLocationSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    type: locationTypeZodEnum.optional(),
  })
  .openapi("UpdateLocationRequest");

export const locationParamsSchema = z.object({
  id: z.string().uuid("Invalid warehouse ID format").optional(),
  locationId: z.string().uuid("Invalid location ID format"),
});

// ═══════════════════════════════════════════════════════════
// SWAGGER REGISTRATIONS
// ═══════════════════════════════════════════════════════════

registry.registerPath({
  method: "get",
  path: "/warehouses",
  tags: ["Warehouses"],
  summary: "List all warehouses with location and stock counts",
  security: [{ BearerAuth: [] }],
  responses: {
    200: { description: "List of warehouses" },
  },
});

registry.registerPath({
  method: "get",
  path: "/warehouses/{id}",
  tags: ["Warehouses"],
  summary: "Get warehouse by ID with its locations",
  security: [{ BearerAuth: [] }],
  request: { params: warehouseIdParamSchema },
  responses: {
    200: { description: "Warehouse details" },
    404: { description: "Warehouse not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/warehouses/{id}/stock-overview",
  tags: ["Warehouses"],
  summary: "Get stock overview per warehouse grouped by location",
  security: [{ BearerAuth: [] }],
  request: { params: warehouseIdParamSchema },
  responses: {
    200: { description: "Aggregated stock grouped by location" },
    404: { description: "Warehouse not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/warehouses/{id}/locations",
  tags: ["Warehouses"],
  summary: "List all locations under a specific warehouse",
  security: [{ BearerAuth: [] }],
  request: { params: warehouseIdParamSchema },
  responses: {
    200: { description: "List of locations" },
  },
});

registry.registerPath({
  method: "post",
  path: "/warehouses/{id}/locations",
  tags: ["Warehouses"],
  summary: "Create a new location inside a warehouse",
  security: [{ BearerAuth: [] }],
  request: {
    params: warehouseIdParamSchema,
    body: { content: { "application/json": { schema: createLocationSchema } } },
  },
  responses: {
    201: { description: "Location created" },
    409: { description: "Location with this name already exists in this warehouse" },
  },
});
