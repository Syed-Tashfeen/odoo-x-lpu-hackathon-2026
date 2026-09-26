import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
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

    const locationMap: Record<string, string> = {};

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
        locationMap[loc.name] = insertedLoc.id;
        console.log(`   ✅ Created Location: ${insertedLoc.name} [${insertedLoc.type}]`);
      } else {
        locationMap[loc.name] = existingLoc[0].id;
        console.log(`   ℹ️ Existing Location: ${loc.name} [${loc.type}]`);
      }
    }

    // ── 4. Seed Product Categories ─────────────────────────────
    console.log("\n📁 Seeding product categories...");

    const defaultCategories = [
      { name: "Raw Materials", description: "Base materials for manufacturing" },
      { name: "Electronics", description: "Electronic components and modules" },
      { name: "Packaging", description: "Boxes, tape, and packing supplies" },
      { name: "Finished Goods", description: "Ready to ship customer products" },
    ];

    const categoryMap: Record<string, string> = {};

    for (const cat of defaultCategories) {
      const existing = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.name, cat.name))
        .limit(1);

      if (existing.length === 0) {
        const [inserted] = await db
          .insert(schema.categories)
          .values(cat)
          .returning();
        categoryMap[cat.name] = inserted.id;
        console.log(`   ✅ Created Category: ${inserted.name}`);
      } else {
        categoryMap[cat.name] = existing[0].id;
        console.log(`   ℹ️ Existing Category: ${cat.name}`);
      }
    }

    // ── 5. Seed Products & Reorder Rules ───────────────────────
    console.log("\n📦 Seeding products with reorder rules...");

    const defaultProducts = [
      {
        name: "Steel Bolt M8x40",
        sku: "BOLT-M8-040",
        categoryName: "Raw Materials",
        unitOfMeasure: "pcs",
        description: "Industrial strength grade 8.8 steel bolts",
        reorderPoint: 100,
        reorderQty: 500,
        rackAStock: 350,
        rackBStock: 50,
      },
      {
        name: "Industrial Sensor Module",
        sku: "SEN-MOD-001",
        categoryName: "Electronics",
        unitOfMeasure: "pcs",
        description: "Precision temperature & vibration sensor",
        reorderPoint: 30,
        reorderQty: 50,
        rackAStock: 15, // Low stock on purpose! Total = 15 <= 30
        rackBStock: 0,
      },
      {
        name: "Corrugated Box Large",
        sku: "BOX-SHP-003",
        categoryName: "Packaging",
        unitOfMeasure: "box",
        description: "Heavy duty 3-ply shipping carton",
        reorderPoint: 80,
        reorderQty: 200,
        rackAStock: 25, // Low stock on purpose! Total = 45 <= 80
        rackBStock: 20,
      },
      {
        name: "Smart IoT Gateway Pro",
        sku: "IOT-GW-PRO",
        categoryName: "Finished Goods",
        unitOfMeasure: "unit",
        description: "Edge computing gateway with 4G/LTE fallback",
        reorderPoint: 10,
        reorderQty: 25,
        rackAStock: 40,
        rackBStock: 10,
      },
    ];

    for (const prod of defaultProducts) {
      const existing = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.sku, prod.sku))
        .limit(1);

      let productId: string;
      if (existing.length === 0) {
        const [inserted] = await db
          .insert(schema.products)
          .values({
            name: prod.name,
            sku: prod.sku,
            categoryId: categoryMap[prod.categoryName],
            unitOfMeasure: prod.unitOfMeasure,
            description: prod.description,
            reorderPoint: prod.reorderPoint,
            reorderQty: prod.reorderQty,
          })
          .returning();
        productId = inserted.id;
        console.log(`   ✅ Created Product: ${inserted.name} (${inserted.sku}) [Min: ${inserted.reorderPoint}]`);
      } else {
        productId = existing[0].id;
        console.log(`   ℹ️ Existing Product: ${prod.name} (${prod.sku})`);
      }

      // Seed initial stock levels for Rack A & Rack B
      const rackAId = locationMap["Stock / Rack A"];
      const rackBId = locationMap["Stock / Rack B"];

      if (rackAId && prod.rackAStock > 0) {
        const existingStock = await db
          .select()
          .from(schema.stockLevels)
          .where(
            and(
              eq(schema.stockLevels.productId, productId),
              eq(schema.stockLevels.locationId, rackAId)
            )
          )
          .limit(1);

        if (existingStock.length === 0) {
          await db.insert(schema.stockLevels).values({
            productId,
            locationId: rackAId,
            quantity: prod.rackAStock,
          });
        }
      }

      if (rackBId && prod.rackBStock > 0) {
        const existingStock = await db
          .select()
          .from(schema.stockLevels)
          .where(
            and(
              eq(schema.stockLevels.productId, productId),
              eq(schema.stockLevels.locationId, rackBId)
            )
          )
          .limit(1);

        if (existingStock.length === 0) {
          await db.insert(schema.stockLevels).values({
            productId,
            locationId: rackBId,
            quantity: prod.rackBStock,
          });
        }
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
