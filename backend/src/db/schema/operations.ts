import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { operationTypeEnum, operationStatusEnum } from "./enums";
import { locations } from "./locations";
import { products } from "./products";
import { users } from "./users";

export const operations = pgTable("operations", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: varchar("reference", { length: 50 }).notNull().unique(),
  type: operationTypeEnum("type").notNull(),
  status: operationStatusEnum("status").default("draft").notNull(),
  sourceLocationId: uuid("source_location_id").references(() => locations.id),
  destLocationId: uuid("dest_location_id").references(() => locations.id),
  partnerName: varchar("partner_name", { length: 255 }),
  notes: text("notes"),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const operationLines = pgTable("operation_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  operationId: uuid("operation_id")
    .references(() => operations.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  quantityDone: integer("quantity_done").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOperationSchema = createInsertSchema(operations);
export const selectOperationSchema = createSelectSchema(operations);
export const insertOperationLineSchema = createInsertSchema(operationLines);
export const selectOperationLineSchema = createSelectSchema(operationLines);

export type Operation = z.infer<typeof selectOperationSchema>;
export type NewOperation = z.infer<typeof insertOperationSchema>;
export type OperationLine = z.infer<typeof selectOperationLineSchema>;
export type NewOperationLine = z.infer<typeof insertOperationLineSchema>;
