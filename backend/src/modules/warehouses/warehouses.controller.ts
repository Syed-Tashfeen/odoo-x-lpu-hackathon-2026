import { type Request, type Response, type NextFunction } from "express";
import * as warehousesService from "./warehouses.service.js";

// ── Warehouse Handlers ─────────────────────────────────────

export async function listWarehouses(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await warehousesService.listWarehouses();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getWarehouseById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await warehousesService.getWarehouseById(req.params.id as string);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createWarehouse(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await warehousesService.createWarehouse(req.body);
    res.status(201).json({
      success: true,
      message: "Warehouse created successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWarehouse(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await warehousesService.updateWarehouse(
      req.params.id as string,
      req.body
    );
    res.status(200).json({
      success: true,
      message: "Warehouse updated successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteWarehouse(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await warehousesService.deleteWarehouse(req.params.id as string);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

// ── Location Handlers ──────────────────────────────────────

export async function listLocations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await warehousesService.listLocations(req.params.id as string);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getLocationById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const locationId = (req.params.locationId || req.params.id) as string;
    const data = await warehousesService.getLocationById(locationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createLocation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await warehousesService.createLocation(
      req.params.id as string,
      req.body
    );
    res.status(201).json({
      success: true,
      message: "Location created successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLocation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const locationId = (req.params.locationId || req.params.id) as string;
    const data = await warehousesService.updateLocation(locationId, req.body);
    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteLocation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const locationId = (req.params.locationId || req.params.id) as string;
    const result = await warehousesService.deleteLocation(locationId);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

// ── Stock Overview Handler ─────────────────────────────────

export async function getStockOverview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await warehousesService.getWarehouseStockOverview(
      req.params.id as string
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
