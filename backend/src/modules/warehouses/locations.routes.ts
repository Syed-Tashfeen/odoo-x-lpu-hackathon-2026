import { Router } from "express";
import * as warehousesController from "./warehouses.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyToken } from "../../middleware/auth.middleware.js";
import { updateLocationSchema } from "./warehouses.schemas.js";

const router = Router();
router.use(verifyToken);

router.get("/:id", warehousesController.getLocationById);
router.patch(
  "/:id",
  validate({ body: updateLocationSchema }),
  warehousesController.updateLocation
);
router.delete("/:id", warehousesController.deleteLocation);

export default router;
