import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const warehouses = pgTable("warehouses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWarehouseSchema = createInsertSchema(warehouses, {
  name: (s) => s.min(1, "Warehouse name is required"),
});
export const selectWarehouseSchema = createSelectSchema(warehouses);

export type Warehouse = z.infer<typeof selectWarehouseSchema>;
export type NewWarehouse = z.infer<typeof insertWarehouseSchema>;
