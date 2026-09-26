import { Router } from "express";
import * as productsController from "./products.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyToken } from "../../middleware/auth.middleware.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productQuerySchema,
} from "./products.schemas.js";

const router = Router();

// Require authenticated user
router.use(verifyToken);

router.get("/", validate({ query: productQuerySchema }), productsController.list);
router.get("/:id", validate({ params: productIdParamSchema }), productsController.getById);
router.post("/", validate({ body: createProductSchema }), productsController.create);
router.patch(
  "/:id",
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productsController.update
);
router.delete("/:id", validate({ params: productIdParamSchema }), productsController.remove);

export default router;
