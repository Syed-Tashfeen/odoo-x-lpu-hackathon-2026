import { Router } from "express";
import * as stockController from "./stock.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyToken } from "../../middleware/auth.middleware.js";
import {
  stockMovesQuerySchema,
  stockLevelsQuerySchema,
  stockAlertsQuerySchema,
} from "./stock.schemas.js";

const router = Router();

// Authentication required for all stock ledger & alert endpoints
router.use(verifyToken);

router.get(
  "/moves",
  validate({ query: stockMovesQuerySchema }),
  stockController.getMoves
);

router.get(
  "/levels",
  validate({ query: stockLevelsQuerySchema }),
  stockController.getLevels
);

router.get(
  "/alerts",
  validate({ query: stockAlertsQuerySchema }),
  stockController.getAlerts
);

export default router;
