import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "../../config/db.js";
import {
  warehouses,
  locations,
  stockLevels,
  products,
} from "../../db/schema/index.js";
import { ApiError } from "../../lib/api-error.js";

// ═══════════════════════════════════════════════════════════
// WAREHOUSES SERVICE
// ═══════════════════════════════════════════════════════════

/**
 * List all warehouses with location count and aggregated stock count.
 */
export async function listWarehouses() {
  const allWarehouses = await db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      address: warehouses.address,
      isActive: warehouses.isActive,
      createdAt: warehouses.createdAt,
      locationCount: sql<number>`count(distinct ${locations.id})::int`,
      totalStock: sql<number>`coalesce(sum(${stockLevels.quantity}), 0)::int`,
    })
    .from(warehouses)
    .leftJoin(locations, eq(locations.warehouseId, warehouses.id))
    .leftJoin(stockLevels, eq(stockLevels.locationId, locations.id))
    .groupBy(warehouses.id)
    .orderBy(warehouses.name);

  return allWarehouses;
}

/**
 * Get warehouse by ID along with its locations.
 */
export async function getWarehouseById(id: string) {
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .limit(1);

  if (!warehouse) {
    throw ApiError.notFound(`Warehouse with ID ${id} not found`);
  }

  const locs = await listLocations(id);

  return {
    ...warehouse,
    locations: locs,
  };
}

/**
 * Create a new warehouse.
 */
export async function createWarehouse(data: {
  name: string;
  address?: string | null;
  isActive?: boolean;
}) {
  const trimmedName = data.name.trim();

  const existing = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.name, trimmedName))
    .limit(1);

  if (existing.length > 0) {
    throw ApiError.conflict(`Warehouse "${trimmedName}" already exists`);
  }

  const [warehouse] = await db
    .insert(warehouses)
    .values({
      name: trimmedName,
      address: data.address?.trim() || null,
      isActive: data.isActive ?? true,
    })
    .returning();

  return warehouse;
}

/**
 * Update an existing warehouse.
 */
export async function updateWarehouse(
  id: string,
  data: { name?: string; address?: string | null; isActive?: boolean }
) {
  await getWarehouseById(id);

  const updateData: Record<string, any> = {};

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    const existing = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.name, trimmedName))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      throw ApiError.conflict(`Warehouse "${trimmedName}" already exists`);
    }
    updateData.name = trimmedName;
  }

  if (data.address !== undefined) {
    updateData.address = data.address ? data.address.trim() : null;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  const [updated] = await db
    .update(warehouses)
    .set(updateData)
    .where(eq(warehouses.id, id))
    .returning();

  return updated;
}

/**
 * Delete a warehouse.
 */
export async function deleteWarehouse(id: string) {
  await getWarehouseById(id);
  await db.delete(warehouses).where(eq(warehouses.id, id));
  return { message: "Warehouse and associated locations deleted successfully" };
}

// ═══════════════════════════════════════════════════════════
// LOCATIONS SERVICE
// ═══════════════════════════════════════════════════════════

/**
 * List all locations under a specific warehouse with current stock level sum.
 */
export async function listLocations(warehouseId: string) {
  const result = await db
    .select({
      id: locations.id,
      warehouseId: locations.warehouseId,
      name: locations.name,
      type: locations.type,
      createdAt: locations.createdAt,
      totalQuantity: sql<number>`coalesce(sum(${stockLevels.quantity}), 0)::int`,
    })
    .from(locations)
    .leftJoin(stockLevels, eq(stockLevels.locationId, locations.id))
    .where(eq(locations.warehouseId, warehouseId))
    .groupBy(locations.id)
    .orderBy(locations.name);

  return result;
}

/**
 * Get location by ID.
 */
export async function getLocationById(locationId: string) {
  const [loc] = await db
    .select({
      id: locations.id,
      warehouseId: locations.warehouseId,
      warehouseName: warehouses.name,
      name: locations.name,
      type: locations.type,
      createdAt: locations.createdAt,
    })
    .from(locations)
    .innerJoin(warehouses, eq(warehouses.id, locations.warehouseId))
    .where(eq(locations.id, locationId))
    .limit(1);

  if (!loc) {
    throw ApiError.notFound(`Location with ID ${locationId} not found`);
  }

  return loc;
}

/**
 * Create a new location under a warehouse.
 */
export async function createLocation(
  warehouseId: string,
  data: {
    name: string;
    type?: "internal" | "customer" | "supplier" | "adjustment";
  }
) {
  // Ensure warehouse exists
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, warehouseId))
    .limit(1);

  if (!warehouse) {
    throw ApiError.notFound(`Warehouse with ID ${warehouseId} not found`);
  }

  const trimmedName = data.name.trim();

  // Check unique index (warehouseId, name)
  const existing = await db
    .select()
    .from(locations)
    .where(
      and(
        eq(locations.warehouseId, warehouseId),
        eq(locations.name, trimmedName)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw ApiError.conflict(
      `Location "${trimmedName}" already exists in warehouse "${warehouse.name}"`
    );
  }

  const [location] = await db
    .insert(locations)
    .values({
      warehouseId,
      name: trimmedName,
      type: data.type || "internal",
    })
    .returning();

  return location;
}

/**
 * Update an existing location.
 */
export async function updateLocation(
  locationId: string,
  data: {
    name?: string;
    type?: "internal" | "customer" | "supplier" | "adjustment";
  }
) {
  const loc = await getLocationById(locationId);

  const updateData: Record<string, any> = {};

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    const existing = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, loc.warehouseId),
          eq(locations.name, trimmedName)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].id !== locationId) {
      throw ApiError.conflict(
        `Location "${trimmedName}" already exists in this warehouse`
      );
    }
    updateData.name = trimmedName;
  }

  if (data.type !== undefined) {
    updateData.type = data.type;
  }

  const [updated] = await db
    .update(locations)
    .set(updateData)
    .where(eq(locations.id, locationId))
    .returning();

  return updated;
}

/**
 * Delete a location.
 */
export async function deleteLocation(locationId: string) {
  await getLocationById(locationId);
  await db.delete(locations).where(eq(locations.id, locationId));
  return { message: "Location deleted successfully" };
}

// ═══════════════════════════════════════════════════════════
// TASK 3: STOCK OVERVIEW PER WAREHOUSE GROUPED BY LOCATION
// ═══════════════════════════════════════════════════════════

/**
 * Get comprehensive stock overview for a warehouse grouped by its locations.
 */
export async function getWarehouseStockOverview(warehouseId: string) {
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, warehouseId))
    .limit(1);

  if (!warehouse) {
    throw ApiError.notFound(`Warehouse with ID ${warehouseId} not found`);
  }

  // 1. Fetch all locations for this warehouse
  const allLocations = await db
    .select()
    .from(locations)
    .where(eq(locations.warehouseId, warehouseId))
    .orderBy(locations.name);

  // 2. Fetch all stock levels with joined product details for this warehouse
  const allStockRows = await db
    .select({
      stockLevelId: stockLevels.id,
      locationId: stockLevels.locationId,
      productId: products.id,
      productName: products.name,
      sku: products.sku,
      unitOfMeasure: products.unitOfMeasure,
      quantity: stockLevels.quantity,
      reorderPoint: products.reorderPoint,
      reorderQty: products.reorderQty,
      updatedAt: stockLevels.updatedAt,
    })
    .from(stockLevels)
    .innerJoin(locations, eq(locations.id, stockLevels.locationId))
    .innerJoin(products, eq(products.id, stockLevels.productId))
    .where(eq(locations.warehouseId, warehouseId));

  // 3. Group stock items by location
  const locationStockMap: Record<string, typeof allStockRows> = {};
  for (const row of allStockRows) {
    if (!locationStockMap[row.locationId]) {
      locationStockMap[row.locationId] = [];
    }
    locationStockMap[row.locationId].push(row);
  }

  let totalWarehouseStock = 0;
  const uniqueProductIds = new Set<string>();

  const locationsOverview = allLocations.map((loc) => {
    const items = locationStockMap[loc.id] || [];
    const totalLocationQuantity = items.reduce((sum, item) => {
      totalWarehouseStock += item.quantity;
      uniqueProductIds.add(item.productId);
      return sum + item.quantity;
    }, 0);

    return {
      id: loc.id,
      name: loc.name,
      type: loc.type,
      totalQuantity: totalLocationQuantity,
      itemCount: items.length,
      items: items.map((item) => ({
        stockLevelId: item.stockLevelId,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        unitOfMeasure: item.unitOfMeasure,
        quantity: item.quantity,
        reorderPoint: item.reorderPoint,
        isLowStock: item.quantity <= item.reorderPoint,
        updatedAt: item.updatedAt,
      })),
    };
  });

  return {
    warehouse: {
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address,
      isActive: warehouse.isActive,
    },
    summary: {
      totalStockQuantity: totalWarehouseStock,
      uniqueProductsCount: uniqueProductIds.size,
      totalLocationsCount: allLocations.length,
    },
    locations: locationsOverview,
  };
}
