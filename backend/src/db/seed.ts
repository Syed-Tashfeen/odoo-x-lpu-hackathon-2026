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
  console.log("🌱 Starting StockSense Apple Hardware database seeding...\n");

  try {
    // ── 1. Seed Users ──────────────────────────────────────────
    console.log("👤 Seeding default users...");

    const managerPassword = await hashPassword("admin123");
    const staffPassword = await hashPassword("staff123");

    // Manager User
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

    // Staff User
    const existingStaff = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "staff@stocksense.com"))
      .limit(1);

    let staffId: string;
    if (existingStaff.length === 0) {
      const [staff] = await db
        .insert(schema.users)
        .values({
          name: "Inventory Specialist",
          email: "staff@stocksense.com",
          passwordHash: staffPassword,
          role: "staff",
          isActive: true,
        })
        .returning();
      staffId = staff.id;
      console.log(`   ✅ Created Staff user: ${staff.email} (${staff.id})`);
    } else {
      staffId = existingStaff[0].id;
      await db
        .update(schema.users)
        .set({
          name: "Inventory Specialist",
          passwordHash: staffPassword,
          role: "staff",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existingStaff[0].id));
      console.log(`   ℹ️ Updated Staff user: ${existingStaff[0].email}`);
    }

    // ── 2. Seed Default Warehouse ──────────────────────────────
    console.log("\n🏢 Seeding default Apple logistics warehouse...");

    const warehouseName = "Silicon Valley Central Hub";
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
          address: "1 Infinite Loop, Facility 4, Cupertino, CA",
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
    console.log("\n📍 Seeding warehouse storage zones & bays...");

    const defaultLocations: Array<{
      name: string;
      type: "internal" | "customer" | "supplier" | "adjustment";
    }> = [
      { name: "Main Stock / Rack A", type: "internal" },
      { name: "High-Security Vault / Rack B", type: "internal" },
      { name: "Inbound Receiving Dock", type: "supplier" },
      { name: "Outbound Dispatch Dock", type: "customer" },
      { name: "Damaged & Inspection Zone", type: "adjustment" },
    ];

    const locationMap: Record<string, string> = {};

    for (const loc of defaultLocations) {
      const existingLoc = await db
        .select()
        .from(schema.locations)
        .where(
          and(
            eq(schema.locations.warehouseId, warehouseId),
            eq(schema.locations.name, loc.name)
          )
        )
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
    console.log("\n📁 Seeding Apple hardware categories...");

    const appleCategories = [
      { name: "Laptops & MacBooks", description: "Apple MacBook Pro, MacBook Air, and accessories" },
      { name: "Smartphones & iPhones", description: "Apple iPhone 16 Pro, iPhone 15, and cases" },
      { name: "Tablets & iPads", description: "Apple iPad Pro M4, iPad Air, and Apple Pencils" },
      { name: "Apple Audio & Accessories", description: "AirPods Pro, MagSafe chargers, and Magic Keyboards" },
    ];

    const categoryMap: Record<string, string> = {};

    for (const cat of appleCategories) {
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

    // ── 5. Seed Apple Products & Reorder Rules ──────────────────
    console.log("\n📦 Seeding Apple products with reorder rules...");

    const appleProducts = [
      {
        name: 'MacBook Pro 16" M3 Max (36GB, 1TB SSD)',
        sku: "MBP-16-M3X",
        categoryName: "Laptops & MacBooks",
        unitOfMeasure: "unit",
        description: "Space Black, Liquid Retina XDR display, 16-core CPU, 40-core GPU",
        reorderPoint: 15,
        reorderQty: 40,
        rackAStock: 35,
        rackBStock: 10,
      },
      {
        name: 'MacBook Air 15" M3 (16GB, 512GB SSD)',
        sku: "MBA-15-M3",
        categoryName: "Laptops & MacBooks",
        unitOfMeasure: "unit",
        description: "Midnight finish, ultra-thin 11.5mm, all-day battery life",
        reorderPoint: 25,
        reorderQty: 50,
        rackAStock: 18, // LOW STOCK on purpose! (18 <= 25)
        rackBStock: 0,
      },
      {
        name: "iPhone 16 Pro Max 256GB Desert Titanium",
        sku: "IPH-16-PM-256",
        categoryName: "Smartphones & iPhones",
        unitOfMeasure: "unit",
        description: "Grade 5 titanium design, Camera Control, 48MP Fusion camera, A18 Pro chip",
        reorderPoint: 30,
        reorderQty: 100,
        rackAStock: 80,
        rackBStock: 20,
      },
      {
        name: "iPhone 15 128GB Black",
        sku: "IPH-15-128-BLK",
        categoryName: "Smartphones & iPhones",
        unitOfMeasure: "unit",
        description: "Dynamic Island, 48MP Main camera, USB-C, color-infused glass",
        reorderPoint: 20,
        reorderQty: 60,
        rackAStock: 14, // LOW STOCK on purpose! (14 <= 20)
        rackBStock: 0,
      },
      {
        name: 'iPad Pro 13" M4 256GB Space Black',
        sku: "IPAD-PRO-13-M4",
        categoryName: "Tablets & iPads",
        unitOfMeasure: "unit",
        description: "Ultra Retina XDR OLED display, ridiculously thin 5.1mm, M4 power",
        reorderPoint: 10,
        reorderQty: 30,
        rackAStock: 25,
        rackBStock: 5,
      },
      {
        name: "AirPods Pro 2nd Gen with MagSafe Case (USB-C)",
        sku: "AIRPODS-PRO-2-USBC",
        categoryName: "Apple Audio & Accessories",
        unitOfMeasure: "pair",
        description: "Active Noise Cancellation up to 2x more, Transparency mode, Adaptive Audio",
        reorderPoint: 50,
        reorderQty: 150,
        rackAStock: 120,
        rackBStock: 30,
      },
    ];

    const productMap: Record<string, string> = {};

    for (const prod of appleProducts) {
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
        console.log(`   ✅ Created Product: ${inserted.name} (${inserted.sku}) [Min Alert: ${inserted.reorderPoint}]`);
      } else {
        productId = existing[0].id;
        await db
          .update(schema.products)
          .set({
            name: prod.name,
            categoryId: categoryMap[prod.categoryName],
            reorderPoint: prod.reorderPoint,
            reorderQty: prod.reorderQty,
          })
          .where(eq(schema.products.id, productId));
        console.log(`   ℹ️ Updated Product: ${prod.name} (${prod.sku})`);
      }

      productMap[prod.sku] = productId;

      // Seed stock levels
      const rackAId = locationMap["Main Stock / Rack A"];
      const rackBId = locationMap["High-Security Vault / Rack B"];

      if (rackAId && prod.rackAStock > 0) {
        const [existingStock] = await db
          .select()
          .from(schema.stockLevels)
          .where(
            and(
              eq(schema.stockLevels.productId, productId),
              eq(schema.stockLevels.locationId, rackAId)
            )
          )
          .limit(1);

        if (!existingStock) {
          await db.insert(schema.stockLevels).values({
            productId,
            locationId: rackAId,
            quantity: prod.rackAStock,
          });
        } else {
          await db
            .update(schema.stockLevels)
            .set({ quantity: prod.rackAStock })
            .where(eq(schema.stockLevels.id, existingStock.id));
        }
      }

      if (rackBId && prod.rackBStock > 0) {
        const [existingStock] = await db
          .select()
          .from(schema.stockLevels)
          .where(
            and(
              eq(schema.stockLevels.productId, productId),
              eq(schema.stockLevels.locationId, rackBId)
            )
          )
          .limit(1);

        if (!existingStock) {
          await db.insert(schema.stockLevels).values({
            productId,
            locationId: rackBId,
            quantity: prod.rackBStock,
          });
        } else {
          await db
            .update(schema.stockLevels)
            .set({ quantity: prod.rackBStock })
            .where(eq(schema.stockLevels.id, existingStock.id));
        }
      }
    }

    // ── 6. Seed Sample Operations ──────────────────────────────
    console.log("\n⚡ Seeding sample warehouse operations...");

    const rackAId = locationMap["Main Stock / Rack A"];
    const rackBId = locationMap["High-Security Vault / Rack B"];
    const receivingBayId = locationMap["Inbound Receiving Dock"];
    const dispatchBayId = locationMap["Outbound Dispatch Dock"];

    // Operation 1: Completed Inbound Receipt from Apple California
    const recRef = "REC-000001";
    const [existingRec] = await db
      .select()
      .from(schema.operations)
      .where(eq(schema.operations.reference, recRef))
      .limit(1);

    if (!existingRec && rackAId) {
      const [op1] = await db
        .insert(schema.operations)
        .values({
          reference: recRef,
          type: "receipt",
          status: "done",
          sourceLocationId: receivingBayId || null,
          destLocationId: rackAId,
          partnerName: "Apple Inc. Cupertino Freight",
          notes: "Initial Q3 Batch — MacBook Pro and iPhone 16 shipments",
          completedDate: new Date(),
          createdBy: managerId,
        })
        .returning();

      if (productMap["MBP-16-M3X"]) {
        await db.insert(schema.operationLines).values({
          operationId: op1.id,
          productId: productMap["MBP-16-M3X"],
          quantity: 35,
          quantityDone: 35,
        });
      }
      if (productMap["IPH-16-PM-256"]) {
        await db.insert(schema.operationLines).values({
          operationId: op1.id,
          productId: productMap["IPH-16-PM-256"],
          quantity: 80,
          quantityDone: 80,
        });
      }
      console.log(`   ✅ Seeded Completed Receipt: ${recRef}`);
    }

    // Operation 2: Pending Customer Delivery
    const delRef = "DEL-000001";
    const [existingDel] = await db
      .select()
      .from(schema.operations)
      .where(eq(schema.operations.reference, delRef))
      .limit(1);

    if (!existingDel && rackAId) {
      const [op2] = await db
        .insert(schema.operations)
        .values({
          reference: delRef,
          type: "delivery",
          status: "draft",
          sourceLocationId: rackAId,
          destLocationId: dispatchBayId || null,
          partnerName: "Apple Store Fifth Avenue NYC",
          notes: "Priority retail replenishment — 5x MacBooks and 10x iPhones",
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
          createdBy: managerId,
        })
        .returning();

      if (productMap["MBP-16-M3X"]) {
        await db.insert(schema.operationLines).values({
          operationId: op2.id,
          productId: productMap["MBP-16-M3X"],
          quantity: 5,
          quantityDone: 0,
        });
      }
      if (productMap["IPH-16-PM-256"]) {
        await db.insert(schema.operationLines).values({
          operationId: op2.id,
          productId: productMap["IPH-16-PM-256"],
          quantity: 10,
          quantityDone: 0,
        });
      }
      console.log(`   ✅ Seeded Draft Delivery: ${delRef}`);
    }

    // Operation 3: Draft Internal Transfer to Vault
    const intRef = "INT-000001";
    const [existingInt] = await db
      .select()
      .from(schema.operations)
      .where(eq(schema.operations.reference, intRef))
      .limit(1);

    if (!existingInt && rackAId && rackBId) {
      const [op3] = await db
        .insert(schema.operations)
        .values({
          reference: intRef,
          type: "internal",
          status: "draft",
          sourceLocationId: rackAId,
          destLocationId: rackBId,
          notes: "Transfer 5 units of high-value MacBooks to secure Vault",
          createdBy: staffId,
        })
        .returning();

      if (productMap["MBP-16-M3X"]) {
        await db.insert(schema.operationLines).values({
          operationId: op3.id,
          productId: productMap["MBP-16-M3X"],
          quantity: 5,
          quantityDone: 0,
        });
      }
      console.log(`   ✅ Seeded Draft Internal Transfer: ${intRef}`);
    }

    console.log("\n🎉 Database seeding with Apple hardware completed successfully!");
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
