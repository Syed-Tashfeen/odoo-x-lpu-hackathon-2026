import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "../../config/swagger.js";

extendZodWithOpenApi(z);

export const operationTypeEnumZod = z.enum([
  "receipt",
  "delivery",
  "internal",
  "adjustment",
]);

export const operationStatusEnumZod = z.enum([
  "draft",
  "waiting",
  "ready",
  "done",
  "cancelled",
]);

export const operationLineInputSchema = z.object({
  productId: z.string().min(1, "Product ID or SKU is required"),
  quantity: z
    .coerce
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than zero"),
});

export const createOperationSchema = z
  .object({
    type: operationTypeEnumZod,
    sourceLocationId: z.string().optional().nullable(),
    destLocationId: z.string().optional().nullable(),
    partnerName: z.string().max(255).optional().nullable().openapi({ example: "Apple Inc. California" }),
    notes: z.string().optional().nullable().openapi({ example: "Delivery of 50 new M3 MacBooks" }),
    scheduledDate: z.coerce.date().optional().nullable(),
    lines: z
      .array(operationLineInputSchema)
      .min(1, "At least one product line is required"),
  })
  .openapi("CreateOperationRequest");

export const updateOperationSchema = z
  .object({
    status: operationStatusEnumZod.optional(),
    sourceLocationId: z.string().optional().nullable(),
    destLocationId: z.string().optional().nullable(),
    partnerName: z.string().max(255).optional().nullable(),
    notes: z.string().optional().nullable(),
    scheduledDate: z.coerce.date().optional().nullable(),
    lines: z.array(operationLineInputSchema).min(1).optional(),
  })
  .openapi("UpdateOperationRequest");

export const operationIdParamSchema = z.object({
  id: z.string().uuid("Invalid operation ID format"),
});

export const operationQuerySchema = z.object({
  type: operationTypeEnumZod.optional(),
  status: operationStatusEnumZod.optional(),
  warehouseId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ═══════════════════════════════════════════════════════════
// SWAGGER PATH REGISTRATIONS
// ═══════════════════════════════════════════════════════════

registry.registerPath({
  method: "get",
  path: "/operations",
  tags: ["Operations"],
  summary: "List all inventory operations with filters (type, status, warehouse)",
  security: [{ BearerAuth: [] }],
  responses: {
    200: { description: "List of operations" },
  },
});

registry.registerPath({
  method: "post",
  path: "/operations",
  tags: ["Operations"],
  summary: "Create a new draft operation (receipt, delivery, internal transfer, adjustment)",
  security: [{ BearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createOperationSchema } } } },
  responses: {
    201: { description: "Operation created in draft state" },
  },
});

registry.registerPath({
  method: "get",
  path: "/operations/{id}",
  tags: ["Operations"],
  summary: "Get operation by ID with product lines and location details",
  security: [{ BearerAuth: [] }],
  request: { params: operationIdParamSchema },
  responses: {
    200: { description: "Operation details" },
    404: { description: "Operation not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/operations/{id}/validate",
  tags: ["Operations"],
  summary: "Validate operation — transitions to 'done' and atomically updates stock levels & ledger",
  security: [{ BearerAuth: [] }],
  request: { params: operationIdParamSchema },
  responses: {
    200: { description: "Operation validated and stock updated" },
    400: { description: "Validation error or insufficient stock" },
  },
});

registry.registerPath({
  method: "post",
  path: "/operations/{id}/cancel",
  tags: ["Operations"],
  summary: "Cancel a draft or pending operation",
  security: [{ BearerAuth: [] }],
  request: { params: operationIdParamSchema },
  responses: {
    200: { description: "Operation cancelled" },
  },
});
