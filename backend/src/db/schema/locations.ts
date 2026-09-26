import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { warehouses } from "./warehouses";
import { locationTypeEnum } from "./enums";

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: locationTypeEnum("type").default("internal").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    warehouseLocationIdx: uniqueIndex("uq_warehouse_location_name").on(
      table.warehouseId,
      table.name
    ),
  })
);

export const insertLocationSchema = createInsertSchema(locations, {
  name: (s) => s.min(1, "Location name is required"),
});
export const selectLocationSchema = createSelectSchema(locations);

export type Location = z.infer<typeof selectLocationSchema>;
export type NewLocation = z.infer<typeof insertLocationSchema>;
