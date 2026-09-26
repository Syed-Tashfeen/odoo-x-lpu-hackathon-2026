import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "../../config/swagger.js";

extendZodWithOpenApi(z);

// ═══════════════════════════════════════════════════════════
// CATEGORY REQUEST SCHEMAS
// ═══════════════════════════════════════════════════════════

export const createCategorySchema = z
  .object({
    name: z
      .string()
      .min(1, "Category name is required")
      .max(255, "Category name too long")
      .openapi({ example: "Electronics" }),
    description: z
      .string()
      .optional()
      .openapi({ example: "Electronic gadgets and components" }),
  })
  .openapi("CreateCategoryRequest");

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .min(1, "Category name cannot be empty")
      .max(255)
      .optional()
      .openapi({ example: "Industrial Electronics" }),
    description: z
      .string()
      .optional()
      .openapi({ example: "Updated description" }),
  })
  .openapi("UpdateCategoryRequest");

export const categoryIdParamSchema = z.object({
  id: z.string().uuid("Invalid category ID format"),
});

// ═══════════════════════════════════════════════════════════
// CATEGORY RESPONSE SCHEMAS
// ═══════════════════════════════════════════════════════════

export const categoryResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    productCount: z.number().optional(),
    createdAt: z.coerce.date(),
  })
  .openapi("Category");

// ═══════════════════════════════════════════════════════════
// SWAGGER REGISTRATIONS
// ═══════════════════════════════════════════════════════════

registry.registerPath({
  method: "get",
  path: "/categories",
  tags: ["Categories"],
  summary: "List all product categories",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: "List of categories",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(categoryResponseSchema),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/categories",
  tags: ["Categories"],
  summary: "Create a new product category",
  security: [{ BearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createCategorySchema } } } },
  responses: {
    201: {
      description: "Category created",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: categoryResponseSchema,
          }),
        },
      },
    },
    409: { description: "Category with this name already exists" },
  },
});
