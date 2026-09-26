import { Router } from "express";
import * as categoriesController from "./categories.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyToken } from "../../middleware/auth.middleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from "./categories.schemas.js";

const router = Router();

// All category routes require authentication
router.use(verifyToken);

router.get("/", categoriesController.list);
router.get("/:id", validate({ params: categoryIdParamSchema }), categoriesController.getById);
router.post("/", validate({ body: createCategorySchema }), categoriesController.create);
router.patch(
  "/:id",
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoriesController.update
);
router.delete("/:id", validate({ params: categoryIdParamSchema }), categoriesController.remove);

export default router;
