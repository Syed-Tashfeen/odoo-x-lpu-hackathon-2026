import { eq, and, or, ilike, desc, asc, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../config/db.js";
import {
  stockMoves,
  stockLevels,
  products,
  categories,
  locations,
  warehouses,
  operations,
  users,
} from "../../db/schema/index.js";
import type { MoveType } from "../../db/schema/enums.js";

// Aliases for locations and warehouses in joins
const fromLocationAlias = alias(locations, "from_location");
const toLocationAlias = alias(locations, "to_location");
const fromWarehouseAlias = alias(warehouses, "from_warehouse");
const toWarehouseAlias = alias(warehouses, "to_warehouse");

// ═══════════════════════════════════════════════════════════
// 1. MOVE HISTORY (Task 1)
// ═══════════════════════════════════════════════════════════

export interface GetMovesQuery {
  productId?: string;
  product?: string;
  locationId?: string;
  location?: string;
  warehouseId?: string;
  from?: string;
  to?: string;
  moveType?: "in" | "out" | "transfer" | "adjustment";
  page?: number;
  limit?: number;
}

export async function getMoveHistory(query: GetMovesQuery) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 20;
  const offset = (page - 1) * limit;

  const conditions = [];

  // Filter by Product ID or SKU / Name
  const targetProduct = query.productId || query.product;
  if (targetProduct) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        targetProduct
      );
    if (isUuid) {
      conditions.push(eq(stockMoves.productId, targetProduct));
    } else {
      conditions.push(
        or(
          ilike(products.name, `%${targetProduct}%`),
          ilike(products.sku, `%${targetProduct}%`)
        )
      );
    }
  }

  // Filter by Location ID (either source or destination)
  const targetLocation = query.locationId || query.location;
  if (targetLocation) {
    conditions.push(
      or(
        eq(stockMoves.fromLocationId, targetLocation),
        eq(stockMoves.toLocationId, targetLocation)
      )
    );
  }

  // Filter by Warehouse ID
  if (query.warehouseId) {
    conditions.push(
      or(
        eq(fromLocationAlias.warehouseId, query.warehouseId),
        eq(toLocationAlias.warehouseId, query.warehouseId)
      )
    );
  }

  // Filter by Move Type
  if (query.moveType) {
    conditions.push(eq(stockMoves.moveType, query.moveType as MoveType));
  }

  // Date Filters
  if (query.from) {
    const fromDate = new Date(query.from);
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(stockMoves.createdAt, fromDate));
    }
  }

  if (query.to) {
    const toDate = new Date(query.to);
    if (!isNaN(toDate.getTime())) {
      // If time was not specified (e.g. YYYY-MM-DD), set to end of day
      if (query.to.length <= 10) {
        toDate.setHours(23, 59, 59, 999);
      }
      conditions.push(lte(stockMoves.createdAt, toDate));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockMoves)
    .leftJoin(products, eq(stockMoves.productId, products.id))
    .leftJoin(fromLocationAlias, eq(stockMoves.fromLocationId, fromLocationAlias.id))
    .leftJoin(toLocationAlias, eq(stockMoves.toLocationId, toLocationAlias.id))
    .where(whereClause);

  // Fetch paginated data with rich joins
  const rows = await db
    .select({
      id: stockMoves.id,
      quantity: stockMoves.quantity,
      moveType: stockMoves.moveType,
      reason: stockMoves.reason,
      createdAt: stockMoves.createdAt,
      product: {
        id: products.id,
        name: products.name,
        sku: products.sku,
        unitOfMeasure: products.unitOfMeasure,
        imageUrl: products.imageUrl,
      },
      fromLocation: {
        id: fromLocationAlias.id,
        name: fromLocationAlias.name,
        type: fromLocationAlias.type,
        warehouseId: fromLocationAlias.warehouseId,
        warehouseName: fromWarehouseAlias.name,
      },
      toLocation: {
        id: toLocationAlias.id,
        name: toLocationAlias.name,
        type: toLocationAlias.type,
        warehouseId: toLocationAlias.warehouseId,
        warehouseName: toWarehouseAlias.name,
      },
      operation: {
        id: operations.id,
        reference: operations.reference,
        type: operations.type,
        status: operations.status,
        partnerName: operations.partnerName,
      },
      createdBy: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(stockMoves)
    .leftJoin(products, eq(stockMoves.productId, products.id))
    .leftJoin(fromLocationAlias, eq(stockMoves.fromLocationId, fromLocationAlias.id))
    .leftJoin(fromWarehouseAlias, eq(fromLocationAlias.warehouseId, fromWarehouseAlias.id))
    .leftJoin(toLocationAlias, eq(stockMoves.toLocationId, toLocationAlias.id))
    .leftJoin(toWarehouseAlias, eq(toLocationAlias.warehouseId, toWarehouseAlias.id))
    .leftJoin(operations, eq(stockMoves.operationId, operations.id))
    .leftJoin(users, eq(stockMoves.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(stockMoves.createdAt))
    .limit(limit)
    .offset(offset);

  // Format locations cleanly (null if ID is null)
  const items = rows.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    moveType: row.moveType,
    reason: row.reason,
    createdAt: row.createdAt,
    product: row.product,
    fromLocation: row.fromLocation?.id
      ? {
          id: row.fromLocation.id,
          name: row.fromLocation.name,
          type: row.fromLocation.type,
          warehouse: row.fromLocation.warehouseId
            ? {
                id: row.fromLocation.warehouseId,
                name: row.fromLocation.warehouseName,
              }
            : null,
        }
      : null,
    toLocation: row.toLocation?.id
      ? {
          id: row.toLocation.id,
          name: row.toLocation.name,
          type: row.toLocation.type,
          warehouse: row.toLocation.warehouseId
            ? {
                id: row.toLocation.warehouseId,
                name: row.toLocation.warehouseName,
              }
            : null,
        }
      : null,
    operation: row.operation?.id ? row.operation : null,
    createdBy: row.createdBy?.id ? row.createdBy : null,
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// 2. STOCK LEVELS (Task 2)
// ═══════════════════════════════════════════════════════════

export interface GetStockLevelsQuery {
  warehouseId?: string;
  warehouse?: string;
  productId?: string;
  product?: string;
  search?: string;
  below_reorder?: boolean;
  belowReorder?: boolean;
  page?: number;
  limit?: number;
}

export async function getStockLevels(query: GetStockLevelsQuery) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 50;
  const offset = (page - 1) * limit;

  const conditions = [];

  const targetWarehouse = query.warehouseId || query.warehouse;
  if (targetWarehouse) {
    conditions.push(eq(locations.warehouseId, targetWarehouse));
  }

  const targetProduct = query.productId || query.product;
  if (targetProduct) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        targetProduct
      );
    if (isUuid) {
      conditions.push(eq(stockLevels.productId, targetProduct));
    } else {
      conditions.push(
        or(
          ilike(products.name, `%${targetProduct}%`),
          ilike(products.sku, `%${targetProduct}%`)
        )
      );
    }
  }

  if (query.search) {
    conditions.push(
      or(
        ilike(products.name, `%${query.search}%`),
        ilike(products.sku, `%${query.search}%`),
        ilike(locations.name, `%${query.search}%`)
      )
    );
  }

  const isBelowReorder = query.below_reorder ?? query.belowReorder;
  if (isBelowReorder === true) {
    conditions.push(sql`${stockLevels.quantity} <= ${products.reorderPoint}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockLevels)
    .innerJoin(products, eq(stockLevels.productId, products.id))
    .innerJoin(locations, eq(stockLevels.locationId, locations.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: stockLevels.id,
      quantity: stockLevels.quantity,
      updatedAt: stockLevels.updatedAt,
      product: {
        id: products.id,
        name: products.name,
        sku: products.sku,
        unitOfMeasure: products.unitOfMeasure,
        reorderPoint: products.reorderPoint,
        reorderQty: products.reorderQty,
        imageUrl: products.imageUrl,
        categoryId: products.categoryId,
        categoryName: categories.name,
      },
      location: {
        id: locations.id,
        name: locations.name,
        type: locations.type,
        warehouseId: locations.warehouseId,
        warehouseName: warehouses.name,
      },
    })
    .from(stockLevels)
    .innerJoin(products, eq(stockLevels.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(locations, eq(stockLevels.locationId, locations.id))
    .leftJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .where(whereClause)
    .orderBy(asc(products.name), asc(locations.name))
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    updatedAt: row.updatedAt,
    isBelowReorder: row.quantity <= row.product.reorderPoint,
    product: {
      id: row.product.id,
      name: row.product.name,
      sku: row.product.sku,
      unitOfMeasure: row.product.unitOfMeasure,
      reorderPoint: row.product.reorderPoint,
      reorderQty: row.product.reorderQty,
      imageUrl: row.product.imageUrl,
      category: row.product.categoryId
        ? {
            id: row.product.categoryId,
            name: row.product.categoryName,
          }
        : null,
    },
    location: {
      id: row.location.id,
      name: row.location.name,
      type: row.location.type,
      warehouse: row.location.warehouseId
        ? {
            id: row.location.warehouseId,
            name: row.location.warehouseName,
          }
        : null,
    },
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// 3. LOW-STOCK ALERTS (Task 3)
// ═══════════════════════════════════════════════════════════

export interface GetStockAlertsQuery {
  warehouseId?: string;
  categoryId?: string;
}

export async function getLowStockAlerts(query: GetStockAlertsQuery = {}) {
  // 1. Fetch products (optionally filtered by category)
  const productConditions = [];
  if (query.categoryId) {
    productConditions.push(eq(products.categoryId, query.categoryId));
  }

  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      unitOfMeasure: products.unitOfMeasure,
      reorderPoint: products.reorderPoint,
      reorderQty: products.reorderQty,
      imageUrl: products.imageUrl,
      categoryId: products.categoryId,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(productConditions.length > 0 ? and(...productConditions) : undefined);

  if (allProducts.length === 0) {
    return {
      alerts: [],
      summary: {
        totalAlerts: 0,
        criticalAlerts: 0,
      },
    };
  }

  // 2. Fetch stock levels across internal locations
  const levelConditions = [eq(locations.type, "internal")];
  if (query.warehouseId) {
    levelConditions.push(eq(locations.warehouseId, query.warehouseId));
  }

  const levels = await db
    .select({
      productId: stockLevels.productId,
      locationId: stockLevels.locationId,
      locationName: locations.name,
      warehouseId: locations.warehouseId,
      warehouseName: warehouses.name,
      quantity: stockLevels.quantity,
    })
    .from(stockLevels)
    .innerJoin(locations, eq(stockLevels.locationId, locations.id))
    .leftJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .where(and(...levelConditions));

  // Map stock breakdown by product
  const stockByProduct = new Map<
    string,
    {
      totalStock: number;
      locations: Array<{
        locationId: string;
        locationName: string;
        warehouseId: string | null;
        warehouseName: string | null;
        quantity: number;
      }>;
    }
  >();

  for (const lvl of levels) {
    const existing = stockByProduct.get(lvl.productId) || {
      totalStock: 0,
      locations: [],
    };
    existing.totalStock += lvl.quantity;
    existing.locations.push({
      locationId: lvl.locationId,
      locationName: lvl.locationName,
      warehouseId: lvl.warehouseId,
      warehouseName: lvl.warehouseName,
      quantity: lvl.quantity,
    });
    stockByProduct.set(lvl.productId, existing);
  }

  // 3. Filter products where totalStock <= reorderPoint
  const alerts: Array<{
    productId: string;
    productName: string;
    sku: string;
    unitOfMeasure: string;
    imageUrl: string | null;
    category: { id: string; name: string | null } | null;
    currentStock: number;
    reorderPoint: number;
    reorderQty: number;
    deficit: number;
    recommendedOrder: number;
    locations: Array<{
      locationId: string;
      locationName: string;
      warehouseId: string | null;
      warehouseName: string | null;
      quantity: number;
    }>;
  }> = [];

  let criticalCount = 0;

  for (const prod of allProducts) {
    const stockInfo = stockByProduct.get(prod.id) || {
      totalStock: 0,
      locations: [],
    };

    const currentStock = stockInfo.totalStock;

    // Trigger alert if current stock is at or below the reorder point
    if (currentStock <= prod.reorderPoint) {
      if (currentStock === 0) {
        criticalCount++;
      }

      const deficit = Math.max(0, prod.reorderPoint - currentStock);
      const recommendedOrder =
        prod.reorderQty > 0 ? prod.reorderQty : Math.max(deficit, 1);

      alerts.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        unitOfMeasure: prod.unitOfMeasure,
        imageUrl: prod.imageUrl,
        category: prod.categoryId
          ? {
              id: prod.categoryId,
              name: prod.categoryName,
            }
          : null,
        currentStock,
        reorderPoint: prod.reorderPoint,
        reorderQty: prod.reorderQty,
        deficit,
        recommendedOrder,
        locations: stockInfo.locations,
      });
    }
  }

  // Sort by deficit descending (biggest shortage first), then by name
  alerts.sort((a, b) => b.deficit - a.deficit || a.productName.localeCompare(b.productName));

  return {
    alerts,
    summary: {
      totalAlerts: alerts.length,
      criticalAlerts: criticalCount,
    },
  };
}
