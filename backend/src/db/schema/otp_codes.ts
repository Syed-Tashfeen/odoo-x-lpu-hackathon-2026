import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes);
export const selectOtpCodeSchema = createSelectSchema(otpCodes);

export type OtpCode = z.infer<typeof selectOtpCodeSchema>;
export type NewOtpCode = z.infer<typeof insertOtpCodeSchema>;
