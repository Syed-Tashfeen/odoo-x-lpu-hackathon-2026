import { Router } from "express";
import * as dashboardController from "./dashboard.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyToken } from "../../middleware/auth.middleware.js";
import { dashboardKpiQuerySchema } from "./dashboard.schemas.js";

const router = Router();

// Authentication required for dashboard metrics
router.use(verifyToken);

router.get(
  "/kpis",
  validate({ query: dashboardKpiQuerySchema }),
  dashboardController.getKPIs
);

export default router;
