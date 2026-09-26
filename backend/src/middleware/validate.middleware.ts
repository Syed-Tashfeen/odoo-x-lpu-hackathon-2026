import { type Request, type Response, type NextFunction } from "express";
import { z, type AnyZodObject, type ZodTypeAny } from "zod";
import { ApiError } from "../lib/api-error.js";

/**
 * Generic Zod validation middleware.
 *
 * Validates req.body, req.query, and req.params against the provided schemas.
 *
 * Usage:
 *   router.post("/users", validate({ body: createUserSchema }), controller.create);
 *   router.get("/users/:id", validate({ params: z.object({ id: z.string().uuid() }) }), controller.get);
 */
interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        Object.defineProperty(req, "params", {
          value: parsedParams,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        next(
          new ApiError(
            422,
            JSON.stringify({
              message: "Validation failed",
              errors: formattedErrors,
            })
          )
        );
      } else {
        next(error);
      }
    }
  };
}
