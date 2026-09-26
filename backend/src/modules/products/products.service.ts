import { eq, or, ilike, sql, and, desc } from "drizzle-orm";
import { db } from "../../config/db.js";
import {
  products,
  categories,
  stockLevels,
  locations,
  warehouses,
} from "../../db/schema/index.js";
import { ApiError } from "../../lib/api-error.js";

/**
 * List products with search, category filter, low-stock filter, and total stock.
 */
export async function listProducts(query: {
  search?: string;
  sku?: string;
  categoryId?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}) {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const offset = (page - 1) * limit;

  // Build filtering conditions
  const conditions = [];

  if (query.search) {
    const term = `%${query.search.trim()}%`;
    conditions.push(
      or(ilike(products.name, term), ilike(products.sku, term))
    );
  }

  if (query.sku) {
    conditions.push(ilike(products.sku, `%${query.sku.trim()}%`));
  }

  if (query.categoryId) {
    conditions.push(eq(products.categoryId, query.categoryId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Query products with joined category and aggregated total stock
  const queryBuilder = db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      categoryId: products.categoryId,
      categoryName: categories.name,
      unitOfMeasure: products.unitOfMeasure,
      description: products.description,
      imageUrl: products.imageUrl,
      reorderPoint: products.reorderPoint,
      reorderQty: products.reorderQty,
      totalStock: sql<number>`coalesce(sum(${stockLevels.quantity}), 0)::int`,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(stockLevels, eq(stockLevels.productId, products.id))
    .where(whereClause)
    .groupBy(products.id, categories.name)
    .orderBy(desc(products.createdAt));

  const allItems = await queryBuilder;

  // Annotate isLowStock
  let formatted = allItems.map((p) => ({
    ...p,
    isLowStock: p.totalStock <= p.reorderPoint,
  }));

  // Apply low-stock filter if requested
  if (query.lowStock === true) {
    formatted = formatted.filter((p) => p.isLowStock);
  }

  const total = formatted.length;
  const paginated = formatted.slice(offset, offset + limit);

  return {
    data: paginated,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get product detail by ID with stock breakdown per warehouse & location.
 */
export async function getProductById(id: string) {
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      categoryId: products.categoryId,
      categoryName: categories.name,
      unitOfMeasure: products.unitOfMeasure,
      description: products.description,
      imageUrl: products.imageUrl,
      reorderPoint: products.reorderPoint,
      reorderQty: products.reorderQty,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    throw ApiError.notFound(`Product with ID ${id} not found`);
  }

  // Fetch stock levels joined with location and warehouse details
  const levels = await db
    .select({
      id: stockLevels.id,
      locationId: stockLevels.locationId,
      locationName: locations.name,
      locationType: locations.type,
      warehouseId: locations.warehouseId,
      warehouseName: warehouses.name,
      quantity: stockLevels.quantity,
      updatedAt: stockLevels.updatedAt,
    })
    .from(stockLevels)
    .innerJoin(locations, eq(locations.id, stockLevels.locationId))
    .innerJoin(warehouses, eq(warehouses.id, locations.warehouseId))
    .where(eq(stockLevels.productId, id));

  const totalStock = levels.reduce((sum, lvl) => sum + lvl.quantity, 0);

  return {
    ...product,
    totalStock,
    isLowStock: totalStock <= product.reorderPoint,
    stockLevels: levels,
  };
}

/**
 * Create a new product.
 */
export async function createProduct(data: {
  name: string;
  sku: string;
  categoryId?: string | null;
  unitOfMeasure: string;
  description?: string | null;
  imageUrl?: string | null;
  reorderPoint?: number;
  reorderQty?: number;
}) {
  const trimmedSku = data.sku.trim().toUpperCase();

  // Validate unique SKU
  const existing = await db
    .select()
    .from(products)
    .where(eq(products.sku, trimmedSku))
    .limit(1);

  if (existing.length > 0) {
    throw ApiError.conflict(`Product with SKU "${trimmedSku}" already exists`);
  }

  // Validate category if provided
  let resolvedCategoryId: string | null = null;
  if (data.categoryId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.categoryId);
    if (isUuid) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, data.categoryId))
        .limit(1);
      if (cat) resolvedCategoryId = cat.id;
    }
    if (!resolvedCategoryId) {
      const [byName] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(ilike(categories.name, `%${data.categoryId}%`))
        .limit(1);
      if (byName) resolvedCategoryId = byName.id;
    }
  }

  const [product] = await db
    .insert(products)
    .values({
      name: data.name.trim(),
      sku: trimmedSku,
      categoryId: resolvedCategoryId,
      unitOfMeasure: data.unitOfMeasure.trim(),
      description: data.description?.trim() || null,
      imageUrl: data.imageUrl || null,
      reorderPoint: data.reorderPoint ?? 0,
      reorderQty: data.reorderQty ?? 0,
    })
    .returning();

  return getProductById(product.id);
}

/**
 * Update product details and reorder rules.
 */
export async function updateProduct(
  id: string,
  data: {
    name?: string;
    sku?: string;
    categoryId?: string | null;
    unitOfMeasure?: string;
    description?: string | null;
    imageUrl?: string | null;
    reorderPoint?: number;
    reorderQty?: number;
  }
) {
  // Ensure product exists
  await getProductById(id);

  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.unitOfMeasure !== undefined) updateData.unitOfMeasure = data.unitOfMeasure.trim();
  if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.reorderPoint !== undefined) updateData.reorderPoint = data.reorderPoint;
  if (data.reorderQty !== undefined) updateData.reorderQty = data.reorderQty;

  if (data.sku !== undefined) {
    const trimmedSku = data.sku.trim().toUpperCase();
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.sku, trimmedSku))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      throw ApiError.conflict(`Product with SKU "${trimmedSku}" already exists`);
    }
    updateData.sku = trimmedSku;
  }

  if (data.categoryId !== undefined) {
    if (data.categoryId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.categoryId);
      let foundCatId: string | null = null;
      if (isUuid) {
        const [cat] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, data.categoryId))
          .limit(1);
        if (cat) foundCatId = cat.id;
      }
      if (!foundCatId) {
        const [byName] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(ilike(categories.name, `%${data.categoryId}%`))
          .limit(1);
        if (byName) foundCatId = byName.id;
      }
      updateData.categoryId = foundCatId;
    } else {
      updateData.categoryId = null;
    }
  }

  await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id));

  return getProductById(id);
}

/**
 * Delete product.
 */
export async function deleteProduct(id: string) {
  await getProductById(id);

  // Cascades to stockLevels as defined in schema
  await db.delete(products).where(eq(products.id, id));

  return { message: "Product deleted successfully" };
}
