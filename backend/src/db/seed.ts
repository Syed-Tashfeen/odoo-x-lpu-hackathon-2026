import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";
import { hashPassword } from "../lib/password.js";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log("🌱 Starting StockSense database seeding...\n");

  try {
    // ── 1. Seed Users ──────────────────────────────────────────
    console.log("👤 Seeding default users...");

    const managerPassword = await hashPassword("admin123");
    const staffPassword = await hashPassword("staff123");

    // Seed or update Admin/Manager
    const existingManager = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "admin@stocksense.com"))
      .limit(1);

    let managerId: string;
    if (existingManager.length === 0) {
      const [manager] = await db
        .insert(schema.users)
        .values({
          name: "StockSense Admin",
          email: "admin@stocksense.com",
          passwordHash: managerPassword,
          role: "manager",
          isActive: true,
        })
        .returning();
      managerId = manager.id;
      console.log(`   ✅ Created Manager user: ${manager.email} (${manager.id})`);
    } else {
      managerId = existingManager[0].id;
      await db
        .update(schema.users)
        .set({
          name: "StockSense Admin",
          passwordHash: managerPassword,
          role: "manager",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, managerId));
      console.log(`   ℹ️ Updated Manager user: ${existingManager[0].email}`);
    }

    // Seed or update Staff
    const existingStaff = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "staff@stocksense.com"))
      .limit(1);

    if (existingStaff.length === 0) {
      const [staff] = await db
        .insert(schema.users)
        .values({
          name: "Inventory Staff",
          email: "staff@stocksense.com",
          passwordHash: staffPassword,
          role: "staff",
          isActive: true,
        })
        .returning();
      console.log(`   ✅ Created Staff user: ${staff.email} (${staff.id})`);
    } else {
      await db
        .update(schema.users)
        .set({
          name: "Inventory Staff",
          passwordHash: staffPassword,
          role: "staff",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existingStaff[0].id));
      console.log(`   ℹ️ Updated Staff user: ${existingStaff[0].email}`);
    }

    // ── 2. Seed Default Warehouse ──────────────────────────────
    console.log("\n🏢 Seeding default warehouse...");

    const warehouseName = "Main Distribution Center";
    const existingWarehouse = await db
      .select()
      .from(schema.warehouses)
      .where(eq(schema.warehouses.name, warehouseName))
      .limit(1);

    let warehouseId: string;
    if (existingWarehouse.length === 0) {
      const [wh] = await db
        .insert(schema.warehouses)
        .values({
          name: warehouseName,
          address: "Central Logistics Park, Sector 4, Ind Area",
          isActive: true,
        })
        .returning();
      warehouseId = wh.id;
      console.log(`   ✅ Created Warehouse: ${wh.name} (${wh.id})`);
    } else {
      warehouseId = existingWarehouse[0].id;
      console.log(`   ℹ️ Existing Warehouse: ${warehouseName} (${warehouseId})`);
    }

    // ── 3. Seed Default Locations ──────────────────────────────
    console.log("\n📍 Seeding default warehouse locations...");

    const defaultLocations: Array<{
      name: string;
      type: "internal" | "customer" | "supplier" | "adjustment";
    }> = [
      { name: "Stock / Rack A", type: "internal" },
      { name: "Stock / Rack B", type: "internal" },
      { name: "Receiving Bay", type: "supplier" },
      { name: "Shipping Dock", type: "customer" },
      { name: "Scrap & Damaged Area", type: "adjustment" },
    ];

    for (const loc of defaultLocations) {
      const existingLoc = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.name, loc.name))
        .limit(1);

      if (existingLoc.length === 0) {
        const [insertedLoc] = await db
          .insert(schema.locations)
          .values({
            warehouseId,
            name: loc.name,
            type: loc.type,
          })
          .returning();
        console.log(`   ✅ Created Location: ${insertedLoc.name} [${insertedLoc.type}]`);
      } else {
        console.log(`   ℹ️ Existing Location: ${loc.name} [${loc.type}]`);
      }
    }

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("--------------------------------------------------");
    console.log("🔑 Default Credentials:");
    console.log("   Manager: admin@stocksense.com  / admin123");
    console.log("   Staff:   staff@stocksense.com  / staff123");
    console.log("--------------------------------------------------\n");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
