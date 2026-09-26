import { type Request, type Response, type NextFunction } from "express";
import * as categoriesService from "./categories.service.js";

export async function list(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await categoriesService.listCategories();
    res.status(200).json({ success: true, data });
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
    const data = await categoriesService.getCategoryById(req.params.id as string);
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
    const data = await categoriesService.createCategory(req.body);
    res.status(201).json({
      success: true,
      message: "Category created successfully",
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
    const data = await categoriesService.updateCategory(
      req.params.id as string,
      req.body
    );
    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await categoriesService.deleteCategory(req.params.id as string);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}
