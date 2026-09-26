import { type Request, type Response } from "express";
import * as stockService from "./stock.service.js";

/**
 * GET /api/stock/moves
 * Retrieve paginated stock move audit history.
 */
export async function getMoves(req: Request, res: Response) {
  const result = await stockService.getMoveHistory(req.query as any);
  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
}

/**
 * GET /api/stock/levels
 * Retrieve stock levels per location.
 */
export async function getLevels(req: Request, res: Response) {
  const result = await stockService.getStockLevels(req.query as any);
  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
}

/**
 * GET /api/stock/alerts
 * Retrieve low-stock alerts where quantity <= reorder_point.
 */
export async function getAlerts(req: Request, res: Response) {
  const result = await stockService.getLowStockAlerts(req.query as any);
  res.json({
    success: true,
    data: result.alerts,
    summary: result.summary,
  });
}
