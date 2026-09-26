import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "../../config/swagger.js";

extendZodWithOpenApi(z);

export const dashboardKpiQuerySchema = z.object({
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
});

registry.registerPath({
  method: "get",
  path: "/dashboard/kpis",
  tags: ["Dashboard"],
  summary: "Get aggregated dashboard KPI metrics and recent operations",
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: "warehouseId",
      in: "query",
      schema: { type: "string", format: "uuid" },
      required: false,
      description: "Optional warehouse ID to scope metrics to a specific warehouse",
    },
  ],
  responses: {
    200: {
      description: "Dashboard KPIs, recent operations, and quick alerts",
    },
    401: { description: "Unauthorized" },
  },
});
