import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "../../config/swagger.js";

extendZodWithOpenApi(z);

// ═══════════════════════════════════════════════════════════
// PRODUCT REQUEST SCHEMAS
// ═══════════════════════════════════════════════════════════

export const createProductSchema = z
  .object({
    name: z
      .string()
      .min(1, "Product name is required")
      .max(255, "Product name cannot exceed 255 characters")
      .openapi({ example: "Steel Screws M4x20" }),
    sku: z
      .string()
      .min(1, "SKU is required")
      .max(100, "SKU cannot exceed 100 characters")
      .openapi({ example: "SCR-M4-020" }),
    categoryId: z
      .string()
      .uuid("Invalid category ID format")
      .optional()
      .nullable()
      .openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }),
    unitOfMeasure: z
      .string()
      .min(1, "Unit of measure is required")
      .max(50)
      .default("pcs")
      .openapi({ example: "pcs" }),
    description: z.string().optional().nullable().openapi({ example: "Pack of 100 industrial grade screws" }),
    imageUrl: z.string().url("Must be a valid URL").optional().nullable().openapi({ example: "https://example.com/img.png" }),
    reorderPoint: z.coerce.number().int().min(0, "Reorder point must be >= 0").default(0).openapi({ example: 50 }),
    reorderQty: z.coerce.number().int().min(0, "Reorder quantity must be >= 0").default(0).openapi({ example: 100 }),
  })
  .openapi("CreateProductRequest");

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    sku: z.string().min(1).max(100).optional(),
    categoryId: z.string().uuid().optional().nullable(),
    unitOfMeasure: z.string().min(1).max(50).optional(),
    description: z.string().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    reorderPoint: z.coerce.number().int().min(0).optional(),
    reorderQty: z.coerce.number().int().min(0).optional(),
  })
  .openapi("UpdateProductRequest");

export const productIdParamSchema = z.object({
  id: z.string().uuid("Invalid product ID format"),
});

export const productQuerySchema = z.object({
  search: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  lowStock: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ═══════════════════════════════════════════════════════════
// PRODUCT RESPONSE SCHEMAS
// ═══════════════════════════════════════════════════════════

export const stockPerLocationSchema = z.object({
  id: z.string().uuid(),
  locationId: z.string().uuid(),
  locationName: z.string(),
  locationType: z.string(),
  warehouseId: z.string().uuid(),
  warehouseName: z.string(),
  quantity: z.number(),
  updatedAt: z.coerce.date(),
});

export const productDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sku: z.string(),
  categoryId: z.string().uuid().nullable(),
  categoryName: z.string().nullable(),
  unitOfMeasure: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  reorderPoint: z.number(),
  reorderQty: z.number(),
  totalStock: z.number(),
  isLowStock: z.boolean(),
  stockLevels: z.array(stockPerLocationSchema).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ═══════════════════════════════════════════════════════════
// SWAGGER REGISTRATIONS
// ═══════════════════════════════════════════════════════════

registry.registerPath({
  method: "get",
  path: "/products",
  tags: ["Products"],
  summary: "List all products with stock summary and filters",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: "List of products",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(productDetailSchema),
            meta: z.object({
              total: z.number(),
              page: z.number(),
              limit: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{id}",
  tags: ["Products"],
  summary: "Get product details with stock per location breakdown",
  security: [{ BearerAuth: [] }],
  request: { params: productIdParamSchema },
  responses: {
    200: {
      description: "Product details with stock per location",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: productDetailSchema,
          }),
        },
      },
    },
    404: { description: "Product not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/products",
  tags: ["Products"],
  summary: "Create a new product with reorder rules",
  security: [{ BearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createProductSchema } } } },
  responses: {
    201: {
      description: "Product created successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: productDetailSchema,
          }),
        },
      },
    },
    409: { description: "SKU already exists" },
  },
});
