import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["manager", "staff"]);
export const locationTypeEnum = pgEnum("location_type", [
  "internal",
  "customer",
  "supplier",
  "adjustment",
]);
export const operationTypeEnum = pgEnum("operation_type", [
  "receipt",
  "delivery",
  "internal",
  "adjustment",
]);
export const operationStatusEnum = pgEnum("operation_status", [
  "draft",
  "waiting",
  "ready",
  "done",
  "cancelled",
]);
export const moveTypeEnum = pgEnum("move_type", [
  "in",
  "out",
  "transfer",
  "adjustment",
]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type LocationType = (typeof locationTypeEnum.enumValues)[number];
export type OperationType = (typeof operationTypeEnum.enumValues)[number];
export type OperationStatus = (typeof operationStatusEnum.enumValues)[number];
export type MoveType = (typeof moveTypeEnum.enumValues)[number];
