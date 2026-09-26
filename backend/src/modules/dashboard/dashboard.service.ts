import { eq, and, or, inArray, sql, desc } from "drizzle-orm";
import { db } from "../../config/db.js";
import {
  products,
  warehouses,
  locations,
  operations,
  operationLines,
  stockLevels,
} from "../../db/schema/index.js";
import { getLowStockAlerts } from "../stock/stock.service.js";

export async function getDashboardKPIs(warehouseId?: string) {
  // 1. Total Products
  const [{ totalProducts }] = await db
    .select({ totalProducts: sql<number>`count(*)::int` })
    .from(products);

  // 2. Locations and Warehouses counts
  const [{ totalWarehouses }] = await db
    .select({ totalWarehouses: sql<number>`count(*)::int` })
    .from(warehouses)
    .where(eq(warehouses.isActive, true));

  const locConditions = [eq(locations.type, "internal")];
  if (warehouseId) {
    locConditions.push(eq(locations.warehouseId, warehouseId));
  }

  const [{ totalLocations }] = await db
    .select({ totalLocations: sql<number>`count(*)::int` })
    .from(locations)
    .where(and(...locConditions));

  // 3. Total Stock Quantity on hand
  const stockConditions = [eq(locations.type, "internal")];
  if (warehouseId) {
    stockConditions.push(eq(locations.warehouseId, warehouseId));
  }

  const [{ totalStockQuantity }] = await db
    .select({
      totalStockQuantity: sql<number>`coalesce(sum(${stockLevels.quantity}), 0)::int`,
    })
    .from(stockLevels)
    .innerJoin(locations, eq(stockLevels.locationId, locations.id))
    .where(and(...stockConditions));

  // 4. Low-stock and Out-of-stock counts
  const alertData = await getLowStockAlerts({ warehouseId });
  const lowStockCount = alertData.summary.totalAlerts;
  const outOfStockCount = alertData.summary.criticalAlerts;

  // 5. Operations counts (Receipts, Deliveries, Transfers)
  const pendingStatuses = ["draft", "waiting", "ready"] as const;

  // Pending Receipts
  const [{ pendingReceipts }] = await db
    .select({ pendingReceipts: sql<number>`count(*)::int` })
    .from(operations)
    .where(
      and(
        eq(operations.type, "receipt"),
        inArray(operations.status, pendingStatuses)
      )
    );

  // Pending Deliveries
  const [{ pendingDeliveries }] = await db
    .select({ pendingDeliveries: sql<number>`count(*)::int` })
    .from(operations)
    .where(
      and(
        eq(operations.type, "delivery"),
        inArray(operations.status, pendingStatuses)
      )
    );

  // Scheduled Transfers
  const [{ scheduledTransfers }] = await db
    .select({ scheduledTransfers: sql<number>`count(*)::int` })
    .from(operations)
    .where(
      and(
        eq(operations.type, "internal"),
        inArray(operations.status, pendingStatuses)
      )
    );

  // Completed Operations
  const [{ completedOperations }] = await db
    .select({ completedOperations: sql<number>`count(*)::int` })
    .from(operations)
    .where(eq(operations.status, "done"));

  // 6. Recent Operations (Last 10)
  const recentOpsRaw = await db
    .select({
      id: operations.id,
      reference: operations.reference,
      type: operations.type,
      status: operations.status,
      partnerName: operations.partnerName,
      scheduledDate: operations.scheduledDate,
      completedDate: operations.completedDate,
      createdAt: operations.createdAt,
      sourceLocationId: operations.sourceLocationId,
      destLocationId: operations.destLocationId,
      linesCount: sql<number>`count(${operationLines.id})::int`,
    })
    .from(operations)
    .leftJoin(operationLines, eq(operations.id, operationLines.operationId))
    .groupBy(operations.id)
    .orderBy(desc(operations.createdAt))
    .limit(10);

  return {
    kpis: {
      totalProducts,
      totalStockQuantity,
      lowStockCount,
      outOfStockCount,
      pendingReceipts,
      pendingDeliveries,
      scheduledTransfers,
      completedOperations,
      totalWarehouses,
      totalLocations,
    },
    recentOperations: recentOpsRaw,
    quickAlerts: alertData.alerts.slice(0, 5),
  };
}
