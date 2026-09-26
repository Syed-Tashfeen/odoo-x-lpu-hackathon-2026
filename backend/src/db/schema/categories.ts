import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorySchema = createInsertSchema(categories, {
  name: (s) => s.min(1, "Category name is required"),
});
export const selectCategorySchema = createSelectSchema(categories);

export type Category = z.infer<typeof selectCategorySchema>;
export type NewCategory = z.infer<typeof insertCategorySchema>;
