import { Router } from "express";
import * as operationsController from "./operations.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyToken } from "../../middleware/auth.middleware.js";
import {
  createOperationSchema,
  updateOperationSchema,
  operationIdParamSchema,
  operationQuerySchema,
} from "./operations.schemas.js";

const router = Router();

// Authentication required
router.use(verifyToken);

router.get(
  "/",
  validate({ query: operationQuerySchema }),
  operationsController.list
);
router.get(
  "/:id",
  validate({ params: operationIdParamSchema }),
  operationsController.getById
);
router.post(
  "/",
  validate({ body: createOperationSchema }),
  operationsController.create
);
router.patch(
  "/:id",
  validate({ params: operationIdParamSchema, body: updateOperationSchema }),
  operationsController.update
);
router.post(
  "/:id/cancel",
  validate({ params: operationIdParamSchema }),
  operationsController.cancel
);
router.post(
  "/:id/validate",
  validate({ params: operationIdParamSchema }),
  operationsController.validate
);

export default router;
