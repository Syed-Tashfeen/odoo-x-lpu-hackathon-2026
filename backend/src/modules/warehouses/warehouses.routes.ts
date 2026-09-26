import { Router } from "express";
import * as warehousesController from "./warehouses.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyToken } from "../../middleware/auth.middleware.js";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  warehouseIdParamSchema,
  createLocationSchema,
  updateLocationSchema,
  locationParamsSchema,
} from "./warehouses.schemas.js";

const router = Router();

// Authentication required for all warehouse/location operations
router.use(verifyToken);

// ── Warehouses CRUD ────────────────────────────────────────
router.get("/", warehousesController.listWarehouses);
router.get(
  "/:id",
  validate({ params: warehouseIdParamSchema }),
  warehousesController.getWarehouseById
);
router.post(
  "/",
  validate({ body: createWarehouseSchema }),
  warehousesController.createWarehouse
);
router.patch(
  "/:id",
  validate({ params: warehouseIdParamSchema, body: updateWarehouseSchema }),
  warehousesController.updateWarehouse
);
router.delete(
  "/:id",
  validate({ params: warehouseIdParamSchema }),
  warehousesController.deleteWarehouse
);

// ── Task 3: Stock Overview Grouped by Location ─────────────
router.get(
  "/:id/stock-overview",
  validate({ params: warehouseIdParamSchema }),
  warehousesController.getStockOverview
);

// ── Nested Locations CRUD under Warehouse ──────────────────
router.get(
  "/:id/locations",
  validate({ params: warehouseIdParamSchema }),
  warehousesController.listLocations
);
router.post(
  "/:id/locations",
  validate({ params: warehouseIdParamSchema, body: createLocationSchema }),
  warehousesController.createLocation
);
router.patch(
  "/:id/locations/:locationId",
  validate({ params: locationParamsSchema, body: updateLocationSchema }),
  warehousesController.updateLocation
);
router.delete(
  "/:id/locations/:locationId",
  validate({ params: locationParamsSchema }),
  warehousesController.deleteLocation
);

export default router;
