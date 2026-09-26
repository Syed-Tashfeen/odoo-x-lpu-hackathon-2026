import { type Request, type Response, type NextFunction } from "express";
import * as operationsService from "./operations.service.js";

export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await operationsService.listOperations(req.query as any);
    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await operationsService.getOperationById(req.params.id as string);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await operationsService.createOperation(req.body, req.user!.id);
    res.status(201).json({
      success: true,
      message: `Operation ${data.reference} created in draft state`,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await operationsService.updateDraftOperation(
      req.params.id as string,
      req.body
    );
    res.status(200).json({
      success: true,
      message: `Operation ${data.reference} updated successfully`,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await operationsService.cancelOperation(req.params.id as string);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.operation,
    });
  } catch (error) {
    next(error);
  }
}

export async function validate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await operationsService.validateOperation(
      req.params.id as string,
      req.user!.id
    );
    res.status(200).json({
      success: true,
      message: `Operation ${data.reference} validated successfully. Stock levels updated.`,
      data,
    });
  } catch (error) {
    next(error);
  }
}
