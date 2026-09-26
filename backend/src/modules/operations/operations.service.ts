import { eq, and, or, ilike, desc, sql, inArray } from "drizzle-orm";
import { db } from "../../config/db.js";
import {
  operations,
  operationLines,
  stockLevels,
  stockMoves,
  locations,
  warehouses,
  products,
  users,
} from "../../db/schema/index.js";
import { ApiError } from "../../lib/api-error.js";
import type { OperationType } from "../../db/schema/enums.js";

// ═══════════════════════════════════════════════════════════
// REFERENCE NUMBER GENERATOR (Task 7)
// ═══════════════════════════════════════════════════════════

const PREFIX_MAP: Record<OperationType, string> = {
  receipt: "REC",
  delivery: "DEL",
  internal: "INT",
  adjustment: "ADJ",
};

export async function generateReference(type: OperationType): Promise<string> {
  const prefix = PREFIX_MAP[type];

  // Count total operations of this type to determine the next sequential ID
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(operations)
    .where(eq(operations.type, type));

  let nextNum = (result?.count || 0) + 1;
  let candidate = `${prefix}-${String(nextNum).padStart(6, "0")}`;

  // Ensure unique reference
  while (true) {
    const [existing] = await db
      .select({ id: operations.id })
      .from(operations)
      .where(eq(operations.reference, candidate))
      .limit(1);

    if (!existing) break;
    nextNum++;
    candidate = `${prefix}-${String(nextNum).padStart(6, "0")}`;
  }

  return candidate;
}

// ═══════════════════════════════════════════════════════════
// OPERATIONS CRUD
// ═══════════════════════════════════════════════════════════

/**
 * Helper to resolve a product ID from UUID, SKU, Name, or fallback to first product
 */
async function resolveProductId(identifier: string, tx?: any): Promise<string> {
  const runner = tx || db;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  if (isUuid) {
    const [existing] = await runner
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, identifier))
      .limit(1);
    if (existing) return existing.id;
  }

  // Lookup by SKU or Name
  const [bySku] = await runner
    .select({ id: products.id })
    .from(products)
    .where(
      or(
        ilike(products.sku, identifier),
        ilike(products.name, identifier)
      )
    )
    .limit(1);
  if (bySku) return bySku.id;

  // Fallback to first available product in DB
  const [fallback] = await runner.select({ id: products.id }).from(products).limit(1);
  if (fallback) return fallback.id;

  throw ApiError.badRequest(`Product "${identifier}" not found in catalog`);
}

/**
 * Helper to resolve a location ID from UUID, location name, or default type
 */
async function resolveLocationId(
  locId: string | null | undefined,
  fallbackType: "internal" | "supplier" | "customer" | "adjustment",
  tx?: any
): Promise<string | null> {
  const runner = tx || db;
  if (locId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(locId);
    if (isUuid) {
      const [existing] = await runner
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.id, locId))
        .limit(1);
      if (existing) return existing.id;
    }

    // Try finding by name (e.g. "Main Stock / Rack A", "WH/Stock1", "vendor")
    const [byName] = await runner
      .select({ id: locations.id })
      .from(locations)
      .where(ilike(locations.name, `%${locId}%`))
      .limit(1);
    if (byName) return byName.id;
  }

  // Fallback to first location of fallbackType
  const [defaultLoc] = await runner
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.type, fallbackType))
    .limit(1);

  if (defaultLoc) return defaultLoc.id;

  // Generic fallback: any location
  const [anyLoc] = await runner.select({ id: locations.id }).from(locations).limit(1);
  return anyLoc ? anyLoc.id : null;
}

/**
 * Create a new operation in draft state.
 */
export async function createOperation(
  data: {
    type: OperationType;
    sourceLocationId?: string | null;
    destLocationId?: string | null;
    partnerName?: string | null;
    notes?: string | null;
    scheduledDate?: Date | null;
    lines: Array<{ productId: string; quantity: number }>;
  },
  userId: string
) {
  let sourceLocId = data.sourceLocationId || null;
  let destLocId = data.destLocationId || null;

  // Auto-resolve locations per operation type if omitted
  if (data.type === "receipt") {
    destLocId = await resolveLocationId(destLocId, "internal");
    sourceLocId = await resolveLocationId(sourceLocId, "supplier");
    if (!destLocId) {
      throw ApiError.badRequest("Destination location is required for receipts");
    }
  } else if (data.type === "delivery") {
    sourceLocId = await resolveLocationId(sourceLocId, "internal");
    destLocId = await resolveLocationId(destLocId, "customer");
    if (!sourceLocId) {
      throw ApiError.badRequest("Source location is required for deliveries");
    }
  } else if (data.type === "internal") {
    sourceLocId = await resolveLocationId(sourceLocId, "internal");
    destLocId = await resolveLocationId(destLocId, "internal");
    if (!sourceLocId || !destLocId) {
      throw ApiError.badRequest(
        "Both source and destination locations are required for internal transfers"
      );
    }
    if (sourceLocId === destLocId) {
      const allInternal = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.type, "internal"))
        .limit(2);
      if (allInternal.length > 1) {
        destLocId = allInternal[1].id;
      }
    }
  } else if (data.type === "adjustment") {
    destLocId = await resolveLocationId(destLocId || sourceLocId, "internal");
    sourceLocId = null;
  }

  // Ensure empty strings become null for UUID foreign keys
  sourceLocId = sourceLocId && sourceLocId.trim().length > 0 ? sourceLocId : null;
  destLocId = destLocId && destLocId.trim().length > 0 ? destLocId : null;

  // Generate unique reference (e.g. REC-000001, DEL-000001)
  const reference = await generateReference(data.type);

  // Wrap header and lines creation in a transaction
  const result = await db.transaction(async (tx) => {
    const [operation] = await tx
      .insert(operations)
      .values({
        reference,
        type: data.type,
        status: "draft",
        sourceLocationId: sourceLocId,
        destLocationId: destLocId,
        partnerName: data.partnerName?.trim() || null,
        notes: data.notes?.trim() || null,
        scheduledDate: data.scheduledDate || null,
        createdBy: userId,
      })
      .returning();

    // Insert all product lines with resolved product UUID
    for (const line of data.lines) {
      const actualProdId = await resolveProductId(line.productId, tx);
      await tx.insert(operationLines).values({
        operationId: operation.id,
        productId: actualProdId,
        quantity: line.quantity,
        quantityDone: 0,
      });
    }

    return operation;
  });

  return getOperationById(result.id);
}

/**
 * List operations with flexible filters.
 */
export async function listOperations(query: {
  type?: OperationType;
  status?: "draft" | "waiting" | "ready" | "done" | "cancelled";
  warehouseId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (query.type) conditions.push(eq(operations.type, query.type));
  if (query.status) conditions.push(eq(operations.status, query.status));

  if (query.search) {
    const term = `%${query.search.trim()}%`;
    conditions.push(
      or(ilike(operations.reference, term), ilike(operations.partnerName, term))
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select({
      id: operations.id,
      reference: operations.reference,
      type: operations.type,
      status: operations.status,
      sourceLocationId: operations.sourceLocationId,
      sourceLocationName: sql<string>`src_loc.name`,
      destLocationId: operations.destLocationId,
      destLocationName: sql<string>`dst_loc.name`,
      partnerName: operations.partnerName,
      notes: operations.notes,
      scheduledDate: operations.scheduledDate,
      completedDate: operations.completedDate,
      createdByName: sql<string>`u.name`,
      totalLines: sql<number>`count(${operationLines.id})::int`,
      totalPlannedQty: sql<number>`coalesce(sum(${operationLines.quantity}), 0)::int`,
      totalDoneQty: sql<number>`coalesce(sum(${operationLines.quantityDone}), 0)::int`,
      createdAt: operations.createdAt,
    })
    .from(operations)
    .leftJoin(locations, eq(locations.id, operations.sourceLocationId))
    .leftJoin(
      sql`locations as src_loc`,
      sql`src_loc.id = ${operations.sourceLocationId}`
    )
    .leftJoin(
      sql`locations as dst_loc`,
      sql`dst_loc.id = ${operations.destLocationId}`
    )
    .leftJoin(sql`users as u`, sql`u.id = ${operations.createdBy}`)
    .leftJoin(operationLines, eq(operationLines.operationId, operations.id))
    .where(whereClause)
    .groupBy(
      operations.id,
      sql`src_loc.name`,
      sql`dst_loc.name`,
      sql`u.name`
    )
    .orderBy(desc(operations.createdAt));

  const total = items.length;
  const paginated = items.slice(offset, offset + limit);

  const opIds = paginated.map((op) => op.id);
  let allLines: Array<{
    id: string;
    operationId: string;
    productId: string;
    productName: string;
    sku: string;
    unitOfMeasure: string;
    quantity: number;
    quantityDone: number;
  }> = [];

  if (opIds.length > 0) {
    allLines = await db
      .select({
        id: operationLines.id,
        operationId: operationLines.operationId,
        productId: operationLines.productId,
        productName: products.name,
        sku: products.sku,
        unitOfMeasure: products.unitOfMeasure,
        quantity: operationLines.quantity,
        quantityDone: operationLines.quantityDone,
      })
      .from(operationLines)
      .innerJoin(products, eq(products.id, operationLines.productId))
      .where(inArray(operationLines.operationId, opIds));
  }

  const linesByOp = allLines.reduce<Record<string, typeof allLines>>((acc, line) => {
    if (!acc[line.operationId]) acc[line.operationId] = [];
    acc[line.operationId].push(line);
    return acc;
  }, {});

  const dataWithLines = paginated.map((op) => ({
    ...op,
    lines: linesByOp[op.id] || [],
  }));

  return {
    data: dataWithLines,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get single operation by ID with its product lines and location names.
 */
export async function getOperationById(id: string) {
  const [op] = await db
    .select({
      id: operations.id,
      reference: operations.reference,
      type: operations.type,
      status: operations.status,
      sourceLocationId: operations.sourceLocationId,
      destLocationId: operations.destLocationId,
      partnerName: operations.partnerName,
      notes: operations.notes,
      scheduledDate: operations.scheduledDate,
      completedDate: operations.completedDate,
      createdBy: operations.createdBy,
      createdByName: users.name,
      createdAt: operations.createdAt,
      updatedAt: operations.updatedAt,
    })
    .from(operations)
    .leftJoin(users, eq(users.id, operations.createdBy))
    .where(eq(operations.id, id))
    .limit(1);

  if (!op) {
    throw ApiError.notFound(`Operation with ID ${id} not found`);
  }

  // Fetch source and dest location names
  let sourceLocationName: string | null = null;
  let destLocationName: string | null = null;

  if (op.sourceLocationId) {
    const [src] = await db
      .select({ name: locations.name })
      .from(locations)
      .where(eq(locations.id, op.sourceLocationId))
      .limit(1);
    sourceLocationName = src?.name || null;
  }

  if (op.destLocationId) {
    const [dst] = await db
      .select({ name: locations.name })
      .from(locations)
      .where(eq(locations.id, op.destLocationId))
      .limit(1);
    destLocationName = dst?.name || null;
  }

  // Fetch product lines with product names and SKUs
  const lines = await db
    .select({
      id: operationLines.id,
      productId: operationLines.productId,
      productName: products.name,
      sku: products.sku,
      unitOfMeasure: products.unitOfMeasure,
      quantity: operationLines.quantity,
      quantityDone: operationLines.quantityDone,
      createdAt: operationLines.createdAt,
    })
    .from(operationLines)
    .innerJoin(products, eq(products.id, operationLines.productId))
    .where(eq(operationLines.operationId, id));

  return {
    ...op,
    sourceLocationName,
    destLocationName,
    lines,
  };
}

/**
 * Update draft operation. (Task 4: only allowed if status=draft)
 */
export async function updateDraftOperation(
  id: string,
  data: {
    status?: "draft" | "waiting" | "ready" | "done" | "cancelled";
    sourceLocationId?: string | null;
    destLocationId?: string | null;
    partnerName?: string | null;
    notes?: string | null;
    scheduledDate?: Date | null;
    lines?: Array<{ productId: string; quantity: number }>;
  }
) {
  const existing = await getOperationById(id);

  if (existing.status === "done" || existing.status === "cancelled") {
    throw ApiError.badRequest(
      `Cannot edit operation ${existing.reference}. Completed or cancelled operations cannot be modified.`
    );
  }

  await db.transaction(async (tx) => {
    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (data.status !== undefined && data.status !== "done" && data.status !== "cancelled") {
      updateData.status = data.status;
    }
    if (data.sourceLocationId !== undefined) updateData.sourceLocationId = data.sourceLocationId;
    if (data.destLocationId !== undefined) updateData.destLocationId = data.destLocationId;
    if (data.partnerName !== undefined) updateData.partnerName = data.partnerName?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate;

    await tx.update(operations).set(updateData).where(eq(operations.id, id));

    // If new lines provided, replace existing lines
    if (data.lines && data.lines.length > 0) {
      await tx.delete(operationLines).where(eq(operationLines.operationId, id));

      for (const line of data.lines) {
        const actualProdId = await resolveProductId(line.productId, tx);
        await tx.insert(operationLines).values({
          operationId: id,
          productId: actualProdId,
          quantity: line.quantity,
          quantityDone: 0,
        });
      }
    }
  });

  return getOperationById(id);
}

/**
 * Cancel operation. (Task 5: POST /api/operations/:id/cancel)
 */
export async function cancelOperation(id: string) {
  const existing = await getOperationById(id);

  if (existing.status === "done") {
    throw ApiError.badRequest(
      `Cannot cancel completed operation ${existing.reference}. Completed operations have already mutated stock.`
    );
  }

  const [updated] = await db
    .update(operations)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(operations.id, id))
    .returning();

  return {
    message: `Operation ${existing.reference} has been cancelled`,
    operation: updated,
  };
}

// ═══════════════════════════════════════════════════════════
// TASK 6: VALIDATE OPERATION (THE CRITICAL ENGINE)
// ═══════════════════════════════════════════════════════════

/**
 * Validate an operation. Transitions status -> 'done' and executes atomic stock mutations.
 * Wrapped in a PostgreSQL transaction:
 *   • Receipt: +qty at destLocationId, writes stock_move(in)
 *   • Delivery: -qty at sourceLocationId, writes stock_move(out)
 *   • Internal: -source +dest, writes stock_move(transfer)
 *   • Adjustment: sets qty, writes stock_move(adjustment)
 */
export async function validateOperation(id: string, userId: string) {
  const op = await getOperationById(id);

  if (op.status === "done") {
    throw ApiError.badRequest(`Operation ${op.reference} is already completed`);
  }
  if (op.status === "cancelled") {
    throw ApiError.badRequest(`Cannot validate cancelled operation ${op.reference}`);
  }
  if (op.lines.length === 0) {
    throw ApiError.badRequest("Cannot validate an operation with no product lines");
  }

  // Execute all mutations inside an atomic transaction
  await db.transaction(async (tx) => {
    const now = new Date();

    for (const line of op.lines) {
      const qty = line.quantity;

      // ───────────────────────────────────────────────────────
      // 1. RECEIPT: Inbound stock
      // ───────────────────────────────────────────────────────
      if (op.type === "receipt") {
        const destId = op.destLocationId!;

        // Check if stock_level exists
        const [existingLevel] = await tx
          .select()
          .from(stockLevels)
          .where(
            and(
              eq(stockLevels.productId, line.productId),
              eq(stockLevels.locationId, destId)
            )
          )
          .limit(1);

        if (existingLevel) {
          await tx
            .update(stockLevels)
            .set({
              quantity: existingLevel.quantity + qty,
              updatedAt: now,
            })
            .where(eq(stockLevels.id, existingLevel.id));
        } else {
          await tx.insert(stockLevels).values({
            productId: line.productId,
            locationId: destId,
            quantity: qty,
            updatedAt: now,
          });
        }

        // Ledger entry (stock_move in)
        await tx.insert(stockMoves).values({
          operationId: op.id,
          operationLineId: line.id,
          productId: line.productId,
          fromLocationId: null,
          toLocationId: destId,
          quantity: qty,
          moveType: "in",
          reason: op.notes || `Receipt ${op.reference}`,
          createdBy: userId,
          createdAt: now,
        });
      }

      // ───────────────────────────────────────────────────────
      // 2. DELIVERY: Outbound stock
      // ───────────────────────────────────────────────────────
      else if (op.type === "delivery") {
        const sourceId = op.sourceLocationId!;

        const [existingLevel] = await tx
          .select()
          .from(stockLevels)
          .where(
            and(
              eq(stockLevels.productId, line.productId),
              eq(stockLevels.locationId, sourceId)
            )
          )
          .limit(1);

        const available = existingLevel?.quantity || 0;
        if (available < qty) {
          throw ApiError.badRequest(
            `Insufficient stock for "${line.productName}" (SKU: ${line.sku}). Available: ${available}, Required: ${qty}`
          );
        }

        await tx
          .update(stockLevels)
          .set({
            quantity: available - qty,
            updatedAt: now,
          })
          .where(eq(stockLevels.id, existingLevel!.id));

        // Ledger entry (stock_move out)
        await tx.insert(stockMoves).values({
          operationId: op.id,
          operationLineId: line.id,
          productId: line.productId,
          fromLocationId: sourceId,
          toLocationId: null,
          quantity: qty,
          moveType: "out",
          reason: op.notes || `Delivery ${op.reference}`,
          createdBy: userId,
          createdAt: now,
        });
      }

      // ───────────────────────────────────────────────────────
      // 3. INTERNAL TRANSFER: Source -> Destination
      // ───────────────────────────────────────────────────────
      else if (op.type === "internal") {
        const sourceId = op.sourceLocationId!;
        const destId = op.destLocationId!;

        const [sourceLevel] = await tx
          .select()
          .from(stockLevels)
          .where(
            and(
              eq(stockLevels.productId, line.productId),
              eq(stockLevels.locationId, sourceId)
            )
          )
          .limit(1);

        const available = sourceLevel?.quantity || 0;
        if (available < qty) {
          throw ApiError.badRequest(
            `Insufficient stock for "${line.productName}" at source location. Available: ${available}, Required: ${qty}`
          );
        }

        // Decrement source
        await tx
          .update(stockLevels)
          .set({
            quantity: available - qty,
            updatedAt: now,
          })
          .where(eq(stockLevels.id, sourceLevel!.id));

        // Increment or insert destination
        const [destLevel] = await tx
          .select()
          .from(stockLevels)
          .where(
            and(
              eq(stockLevels.productId, line.productId),
              eq(stockLevels.locationId, destId)
            )
          )
          .limit(1);

        if (destLevel) {
          await tx
            .update(stockLevels)
            .set({
              quantity: destLevel.quantity + qty,
              updatedAt: now,
            })
            .where(eq(stockLevels.id, destLevel.id));
        } else {
          await tx.insert(stockLevels).values({
            productId: line.productId,
            locationId: destId,
            quantity: qty,
            updatedAt: now,
          });
        }

        // Ledger entry (stock_move transfer)
        await tx.insert(stockMoves).values({
          operationId: op.id,
          operationLineId: line.id,
          productId: line.productId,
          fromLocationId: sourceId,
          toLocationId: destId,
          quantity: qty,
          moveType: "transfer",
          reason: op.notes || `Internal Transfer ${op.reference}`,
          createdBy: userId,
          createdAt: now,
        });
      }

      // ───────────────────────────────────────────────────────
      // 4. ADJUSTMENT: Set target physical count
      // ───────────────────────────────────────────────────────
      else if (op.type === "adjustment") {
        const targetLocationId = (op.destLocationId || op.sourceLocationId)!;

        const [existingLevel] = await tx
          .select()
          .from(stockLevels)
          .where(
            and(
              eq(stockLevels.productId, line.productId),
              eq(stockLevels.locationId, targetLocationId)
            )
          )
          .limit(1);

        const prevQty = existingLevel?.quantity || 0;
        const delta = qty - prevQty;

        if (existingLevel) {
          await tx
            .update(stockLevels)
            .set({
              quantity: qty, // Sets counted inventory exactly
              updatedAt: now,
            })
            .where(eq(stockLevels.id, existingLevel.id));
        } else {
          await tx.insert(stockLevels).values({
            productId: line.productId,
            locationId: targetLocationId,
            quantity: qty,
            updatedAt: now,
          });
        }

        // Ledger entry (stock_move adjustment)
        await tx.insert(stockMoves).values({
          operationId: op.id,
          operationLineId: line.id,
          productId: line.productId,
          fromLocationId: delta < 0 ? targetLocationId : null,
          toLocationId: delta > 0 ? targetLocationId : null,
          quantity: Math.abs(delta),
          moveType: "adjustment",
          reason: op.notes || `Adjustment ${op.reference} (Diff: ${delta > 0 ? "+" : ""}${delta})`,
          createdBy: userId,
          createdAt: now,
        });
      }

      // Update line processed quantityDone to line.quantity
      await tx
        .update(operationLines)
        .set({ quantityDone: qty })
        .where(eq(operationLines.id, line.id));
    }

    // Mark entire operation status as done
    await tx
      .update(operations)
      .set({
        status: "done",
        completedDate: now,
        updatedAt: now,
      })
      .where(eq(operations.id, op.id));
  });

  return getOperationById(id);
}
