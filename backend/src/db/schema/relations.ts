import { relations } from "drizzle-orm";
import { users } from "./users";
import { otpCodes } from "./otp_codes";
import { categories } from "./categories";
import { warehouses } from "./warehouses";
import { locations } from "./locations";
import { products } from "./products";
import { stockLevels, stockMoves } from "./stock";
import { operations, operationLines } from "./operations";

export const usersRelations = relations(users, ({ many }) => ({
  operations: many(operations),
  stockMoves: many(stockMoves),
  otpCodes: many(otpCodes),
}));

export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
  user: one(users, {
    fields: [otpCodes.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [locations.warehouseId],
    references: [warehouses.id],
  }),
  stockLevels: many(stockLevels),
  stockMovesFrom: many(stockMoves, { relationName: "fromLocation" }),
  stockMovesTo: many(stockMoves, { relationName: "toLocation" }),
  operationsSource: many(operations, { relationName: "sourceLocation" }),
  operationsDest: many(operations, { relationName: "destLocation" }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stockLevels: many(stockLevels),
  operationLines: many(operationLines),
  stockMoves: many(stockMoves),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  product: one(products, {
    fields: [stockLevels.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [stockLevels.locationId],
    references: [locations.id],
  }),
}));

export const operationsRelations = relations(operations, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [operations.createdBy],
    references: [users.id],
  }),
  sourceLocation: one(locations, {
    fields: [operations.sourceLocationId],
    references: [locations.id],
    relationName: "sourceLocation",
  }),
  destLocation: one(locations, {
    fields: [operations.destLocationId],
    references: [locations.id],
    relationName: "destLocation",
  }),
  lines: many(operationLines),
  stockMoves: many(stockMoves),
}));

export const operationLinesRelations = relations(operationLines, ({ one, many }) => ({
  operation: one(operations, {
    fields: [operationLines.operationId],
    references: [operations.id],
  }),
  product: one(products, {
    fields: [operationLines.productId],
    references: [products.id],
  }),
  stockMoves: many(stockMoves),
}));

export const stockMovesRelations = relations(stockMoves, ({ one }) => ({
  operation: one(operations, {
    fields: [stockMoves.operationId],
    references: [operations.id],
  }),
  operationLine: one(operationLines, {
    fields: [stockMoves.operationLineId],
    references: [operationLines.id],
  }),
  product: one(products, {
    fields: [stockMoves.productId],
    references: [products.id],
  }),
  fromLocation: one(locations, {
    fields: [stockMoves.fromLocationId],
    references: [locations.id],
    relationName: "fromLocation",
  }),
  toLocation: one(locations, {
    fields: [stockMoves.toLocationId],
    references: [locations.id],
    relationName: "toLocation",
  }),
  createdBy: one(users, {
    fields: [stockMoves.createdBy],
    references: [users.id],
  }),
}));
