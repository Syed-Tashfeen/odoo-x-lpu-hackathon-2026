import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { categories } from "./categories";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  unitOfMeasure: varchar("unit_of_measure", { length: 50 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  reorderPoint: integer("reorder_point").default(0).notNull(),
  reorderQty: integer("reorder_qty").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(products, {
  name: (s) => s.min(1, "Product name is required"),
  sku: (s) => s.min(1, "SKU is required"),
  unitOfMeasure: (s) => s.min(1, "Unit of measure is required"),
});
export const selectProductSchema = createSelectSchema(products);

export type Product = z.infer<typeof selectProductSchema>;
export type NewProduct = z.infer<typeof insertProductSchema>;
