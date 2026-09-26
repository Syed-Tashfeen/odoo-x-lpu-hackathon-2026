import { pgTable, uuid, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { moveTypeEnum } from "./enums";
import { products } from "./products";
import { locations } from "./locations";
import { operations, operationLines } from "./operations";
import { users } from "./users";

export const stockLevels = pgTable(
  "stock_levels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    locationId: uuid("location_id")
      .references(() => locations.id, { onDelete: "cascade" })
      .notNull(),
    quantity: integer("quantity").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    productLocationIdx: uniqueIndex("uq_product_location").on(
      table.productId,
      table.locationId
    ),
  })
);

export const stockMoves = pgTable("stock_moves", {
  id: uuid("id").defaultRandom().primaryKey(),
  operationId: uuid("operation_id").references(() => operations.id),
  operationLineId: uuid("operation_line_id").references(() => operationLines.id),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  fromLocationId: uuid("from_location_id").references(() => locations.id),
  toLocationId: uuid("to_location_id").references(() => locations.id),
  quantity: integer("quantity").notNull(),
  moveType: moveTypeEnum("move_type").notNull(),
  reason: text("reason"),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockLevelSchema = createInsertSchema(stockLevels);
export const selectStockLevelSchema = createSelectSchema(stockLevels);
export const insertStockMoveSchema = createInsertSchema(stockMoves);
export const selectStockMoveSchema = createSelectSchema(stockMoves);

export type StockLevel = z.infer<typeof selectStockLevelSchema>;
export type NewStockLevel = z.infer<typeof insertStockLevelSchema>;
export type StockMove = z.infer<typeof selectStockMoveSchema>;
export type NewStockMove = z.infer<typeof insertStockMoveSchema>;
