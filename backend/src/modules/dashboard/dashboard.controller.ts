import { type Request, type Response } from "express";
import * as dashboardService from "./dashboard.service.js";

/**
 * GET /api/dashboard/kpis
 * Retrieve aggregated inventory KPIs and recent operations.
 */
export async function getKPIs(req: Request, res: Response) {
  const warehouseId = req.query.warehouseId as string | undefined;
  const result = await dashboardService.getDashboardKPIs(warehouseId);
  res.json({
    success: true,
    data: result,
  });
}
