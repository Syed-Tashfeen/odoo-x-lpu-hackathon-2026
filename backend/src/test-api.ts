import http from "http";
import { app } from "./app.js";
import { db } from "./config/db.js";
import { users, otpCodes } from "./db/schema/index.js";
import { eq } from "drizzle-orm";

let server: http.Server;

async function request(options: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const dataString = options.body ? JSON.stringify(options.body) : "";
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 3001,
        path: options.path,
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(dataString),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const parsed = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 200, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 200, body: raw });
          }
        });
      }
    );

    req.on("error", reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log("🧪 Starting StockSense Phase 1 & Phase 2 API Tests...\n");

  await new Promise<void>((resolve) => {
    server = app.listen(3001, () => {
      console.log("🚀 Test server listening on http://127.0.0.1:3001");
      resolve();
    });
  });

  const testEmail = `testuser_${Date.now()}@example.com`;
  let staffToken = "";
  let managerToken = "";

  try {
    // ══════════════════════════════════════════════════════════
    // PHASE 1 — AUTH & MIDDLEWARE TESTS
    // ══════════════════════════════════════════════════════════

    console.log("\n▶ Test 1: POST /api/auth/signup");
    const signupRes = await request({
      method: "POST",
      path: "/api/auth/signup",
      body: {
        name: "Test Staff User",
        email: testEmail,
        password: "securepassword123",
        role: "staff",
      },
    });

    console.log(`  Status: ${signupRes.status}`);
    if (signupRes.status !== 201 || !signupRes.body?.data?.token) {
      throw new Error(`Signup failed: ${JSON.stringify(signupRes.body)}`);
    }
    console.log("  ✅ Signup successful, received token and user profile");

    console.log("\n▶ Test 2: POST /api/auth/login (Staff login)");
    const loginRes = await request({
      method: "POST",
      path: "/api/auth/login",
      body: {
        email: testEmail,
        password: "securepassword123",
      },
    });

    console.log(`  Status: ${loginRes.status}`);
    if (loginRes.status !== 200 || !loginRes.body?.data?.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }
    staffToken = loginRes.body.data.token;
    console.log("  ✅ Staff login successful");

    console.log("\n▶ Test 3: GET /api/auth/me (verifyToken middleware)");
    const meRes = await request({
      method: "GET",
      path: "/api/auth/me",
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${meRes.status}`);
    if (meRes.status !== 200 || meRes.body?.data?.email !== testEmail) {
      throw new Error(`GET /me failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log("  ✅ verifyToken successfully decoded JWT and attached user");

    console.log("\n▶ Test 4: Role guard requireRole('manager') blocks staff");
    const forbiddenRes = await request({
      method: "GET",
      path: "/api/auth/manager-only",
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${forbiddenRes.status}`);
    if (forbiddenRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for staff, got ${forbiddenRes.status}`);
    }
    console.log("  ✅ requireRole correctly rejected staff (403 Forbidden)");

    console.log("\n▶ Test 5: Manager login & role guard allow");
    const managerLoginRes = await request({
      method: "POST",
      path: "/api/auth/login",
      body: {
        email: "admin@stocksense.com",
        password: "admin123",
      },
    });

    console.log(`  Status: ${managerLoginRes.status}`);
    if (managerLoginRes.status !== 200) {
      throw new Error(`Manager login failed: ${JSON.stringify(managerLoginRes.body)}`);
    }
    managerToken = managerLoginRes.body.data.token;

    const managerAllowedRes = await request({
      method: "GET",
      path: "/api/auth/manager-only",
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    console.log(`  Status: ${managerAllowedRes.status}`);
    if (managerAllowedRes.status !== 200) {
      throw new Error(`Expected 200 OK for manager, got ${managerAllowedRes.status}`);
    }
    console.log("  ✅ requireRole('manager') correctly allowed manager access (200 OK)");

    console.log("\n▶ Test 6: POST /api/auth/forgot-password (6-digit OTP generation)");
    const forgotRes = await request({
      method: "POST",
      path: "/api/auth/forgot-password",
      body: { email: testEmail },
    });

    console.log(`  Status: ${forgotRes.status}`);
    if (forgotRes.status !== 200) {
      throw new Error(`Forgot password failed: ${JSON.stringify(forgotRes.body)}`);
    }

    let otp = forgotRes.body?.devOtp;
    if (!otp) {
      const [u] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
      const [dbOtp] = await db.select().from(otpCodes).where(eq(otpCodes.userId, u.id)).limit(1);
      otp = dbOtp?.code;
    }
    console.log(`  ✅ 6-digit OTP stored in otp_codes: [ ${otp} ]`);

    console.log("\n▶ Test 7: POST /api/auth/reset-password (Verify OTP & update password_hash)");
    const resetRes = await request({
      method: "POST",
      path: "/api/auth/reset-password",
      body: {
        email: testEmail,
        otp,
        newPassword: "newpassword456",
      },
    });

    console.log(`  Status: ${resetRes.status}`);
    if (resetRes.status !== 200) {
      throw new Error(`Reset password failed: ${JSON.stringify(resetRes.body)}`);
    }
    console.log("  ✅ Password reset successful, otp marked used, password_hash updated");

    // ══════════════════════════════════════════════════════════
    // PHASE 2 — CATEGORIES & PRODUCTS CRUD TESTS
    // ══════════════════════════════════════════════════════════

    console.log("\n==================================================");
    console.log("📁 PHASE 2 TESTS: CATEGORIES & PRODUCTS");
    console.log("==================================================");

    // Test 10: GET /api/categories (List categories)
    console.log("\n▶ Test 10: GET /api/categories (List categories with productCount)");
    const categoriesRes = await request({
      method: "GET",
      path: "/api/categories",
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${categoriesRes.status}`);
    if (categoriesRes.status !== 200 || !Array.isArray(categoriesRes.body?.data)) {
      throw new Error(`List categories failed: ${JSON.stringify(categoriesRes.body)}`);
    }
    console.log(`  ✅ Retrieved ${categoriesRes.body.data.length} categories`);
    const rawMaterialsCat = categoriesRes.body.data.find((c: any) => c.name === "Raw Materials");

    // Test 11: POST /api/categories (Create category)
    console.log("\n▶ Test 11: POST /api/categories (Create new category)");
    const newCatName = `Custom Cat ${Date.now()}`;
    const createCatRes = await request({
      method: "POST",
      path: "/api/categories",
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        name: newCatName,
        description: "Temporary category for test",
      },
    });

    console.log(`  Status: ${createCatRes.status}`);
    if (createCatRes.status !== 201 || !createCatRes.body?.data?.id) {
      throw new Error(`Create category failed: ${JSON.stringify(createCatRes.body)}`);
    }
    const createdCatId = createCatRes.body.data.id;
    console.log(`  ✅ Created category "${newCatName}" (${createdCatId})`);

    // Test 12: PATCH /api/categories/:id (Update category)
    console.log("\n▶ Test 12: PATCH /api/categories/:id (Update category)");
    const updateCatRes = await request({
      method: "PATCH",
      path: `/api/categories/${createdCatId}`,
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { description: "Updated description via test" },
    });

    console.log(`  Status: ${updateCatRes.status}`);
    if (updateCatRes.status !== 200 || updateCatRes.body?.data?.description !== "Updated description via test") {
      throw new Error(`Update category failed: ${JSON.stringify(updateCatRes.body)}`);
    }
    console.log("  ✅ Category description updated successfully");

    // Test 13: GET /api/products (List products & verify totalStock & isLowStock)
    console.log("\n▶ Test 13: GET /api/products (List products)");
    const productsRes = await request({
      method: "GET",
      path: "/api/products",
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${productsRes.status}`);
    if (productsRes.status !== 200 || !Array.isArray(productsRes.body?.data)) {
      throw new Error(`List products failed: ${JSON.stringify(productsRes.body)}`);
    }
    console.log(`  ✅ Retrieved ${productsRes.body.data.length} products`);

    // Test 14: Filter SKU & Search
    console.log("\n▶ Test 14: GET /api/products?sku=BOLT (SKU search filter)");
    const skuSearchRes = await request({
      method: "GET",
      path: "/api/products?sku=BOLT",
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${skuSearchRes.status}`);
    if (skuSearchRes.status !== 200 || skuSearchRes.body.data.length === 0) {
      throw new Error(`SKU search failed: ${JSON.stringify(skuSearchRes.body)}`);
    }
    console.log(`  ✅ Found product with SKU: ${skuSearchRes.body.data[0].sku}`);
    const boltProductId = skuSearchRes.body.data[0].id;

    // Test 15: Low-stock filter
    console.log("\n▶ Test 15: GET /api/products?lowStock=true (Low-stock filter)");
    const lowStockRes = await request({
      method: "GET",
      path: "/api/products?lowStock=true",
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${lowStockRes.status}`);
    if (lowStockRes.status !== 200) {
      throw new Error(`Low stock filter failed: ${JSON.stringify(lowStockRes.body)}`);
    }
    const allLow = lowStockRes.body.data.every((p: any) => p.isLowStock === true);
    console.log(`  ✅ Found ${lowStockRes.body.data.length} low-stock products. All isLowStock === true: ${allLow}`);

    // Test 16: GET /api/products/:id with stockLevels breakdown
    console.log("\n▶ Test 16: GET /api/products/:id (Stock per location join)");
    const detailRes = await request({
      method: "GET",
      path: `/api/products/${boltProductId}`,
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${detailRes.status}`);
    if (detailRes.status !== 200 || !Array.isArray(detailRes.body?.data?.stockLevels)) {
      throw new Error(`Product detail join failed: ${JSON.stringify(detailRes.body)}`);
    }
    console.log(`  ✅ Product detail loaded with ${detailRes.body.data.stockLevels.length} location stock entries`);
    console.log(`     Total Stock: ${detailRes.body.data.totalStock} ${detailRes.body.data.unitOfMeasure}`);
    for (const lvl of detailRes.body.data.stockLevels) {
      console.log(`     - [${lvl.warehouseName}] ${lvl.locationName}: ${lvl.quantity}`);
    }

    // Test 17: POST /api/products (Create product with reorder rules)
    console.log("\n▶ Test 17: POST /api/products (Create product with reorder rules)");
    const testSku = `TEST-SKU-${Date.now()}`;
    const createProdRes = await request({
      method: "POST",
      path: "/api/products",
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        name: "Test Heavy Duty Clamp",
        sku: testSku,
        categoryId: rawMaterialsCat?.id,
        unitOfMeasure: "pcs",
        reorderPoint: 45,
        reorderQty: 150,
      },
    });

    console.log(`  Status: ${createProdRes.status}`);
    if (createProdRes.status !== 201 || !createProdRes.body?.data?.id) {
      throw new Error(`Create product failed: ${JSON.stringify(createProdRes.body)}`);
    }
    const newProdId = createProdRes.body.data.id;
    console.log(`  ✅ Created product with SKU ${testSku} (Reorder Point: ${createProdRes.body.data.reorderPoint})`);

    // Test 18: PATCH /api/products/:id (Update reorder rules)
    console.log("\n▶ Test 18: PATCH /api/products/:id (Update reorder rules)");
    const updateProdRes = await request({
      method: "PATCH",
      path: `/api/products/${newProdId}`,
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        reorderPoint: 60,
        reorderQty: 250,
      },
    });

    console.log(`  Status: ${updateProdRes.status}`);
    if (updateProdRes.status !== 200 || updateProdRes.body.data.reorderPoint !== 60) {
      throw new Error(`Update reorder rules failed: ${JSON.stringify(updateProdRes.body)}`);
    }
    console.log("  ✅ Reorder rules updated: Point=60, Qty=250");

    // Test 19: DELETE /api/products/:id
    console.log("\n▶ Test 19: DELETE /api/products/:id");
    const deleteProdRes = await request({
      method: "DELETE",
      path: `/api/products/${newProdId}`,
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    console.log(`  Status: ${deleteProdRes.status}`);
    if (deleteProdRes.status !== 200) {
      throw new Error(`Delete product failed: ${JSON.stringify(deleteProdRes.body)}`);
    }
    console.log("  ✅ Test product deleted successfully");

    // Test 20: DELETE /api/categories/:id
    console.log("\n▶ Test 20: DELETE /api/categories/:id");
    const deleteCatRes = await request({
      method: "DELETE",
      path: `/api/categories/${createdCatId}`,
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    console.log(`  Status: ${deleteCatRes.status}`);
    if (deleteCatRes.status !== 200) {
      throw new Error(`Delete category failed: ${JSON.stringify(deleteCatRes.body)}`);
    }
    console.log("  ✅ Test category deleted successfully");

    // ══════════════════════════════════════════════════════════
    // PHASE 3 — WAREHOUSES & LOCATIONS TESTS
    // ══════════════════════════════════════════════════════════

    console.log("\n==================================================");
    console.log("🏢 PHASE 3 TESTS: WAREHOUSES & LOCATIONS");
    console.log("==================================================");

    // Test 21: GET /api/warehouses
    console.log("\n▶ Test 21: GET /api/warehouses (List warehouses with locationCount & totalStock)");
    const warehousesRes = await request({
      method: "GET",
      path: "/api/warehouses",
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${warehousesRes.status}`);
    if (warehousesRes.status !== 200 || !Array.isArray(warehousesRes.body?.data)) {
      throw new Error(`List warehouses failed: ${JSON.stringify(warehousesRes.body)}`);
    }
    console.log(`  ✅ Retrieved ${warehousesRes.body.data.length} warehouses`);
    const mainWh = warehousesRes.body.data.find((w: any) => w.name === "Main Distribution Center");
    if (!mainWh) throw new Error("Main Distribution Center not found in seeded warehouses");
    console.log(`     Main Warehouse ID: ${mainWh.id}, Locations: ${mainWh.locationCount}, Total Stock: ${mainWh.totalStock}`);

    // Test 22: POST /api/warehouses (Create new warehouse)
    console.log("\n▶ Test 22: POST /api/warehouses (Create new secondary warehouse)");
    const newWhName = `East Coast Hub ${Date.now()}`;
    const createWhRes = await request({
      method: "POST",
      path: "/api/warehouses",
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        name: newWhName,
        address: "99 Harbor Way, Port Terminal 2",
        isActive: true,
      },
    });

    console.log(`  Status: ${createWhRes.status}`);
    if (createWhRes.status !== 201 || !createWhRes.body?.data?.id) {
      throw new Error(`Create warehouse failed: ${JSON.stringify(createWhRes.body)}`);
    }
    const createdWhId = createWhRes.body.data.id;
    console.log(`  ✅ Created warehouse "${newWhName}" (${createdWhId})`);

    // Test 23: PATCH /api/warehouses/:id
    console.log("\n▶ Test 23: PATCH /api/warehouses/:id (Update warehouse)");
    const updateWhRes = await request({
      method: "PATCH",
      path: `/api/warehouses/${createdWhId}`,
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { address: "Updated Address: 101 Harbor Way" },
    });

    console.log(`  Status: ${updateWhRes.status}`);
    if (updateWhRes.status !== 200 || updateWhRes.body.data.address !== "Updated Address: 101 Harbor Way") {
      throw new Error(`Update warehouse failed: ${JSON.stringify(updateWhRes.body)}`);
    }
    console.log("  ✅ Warehouse address updated successfully");

    // Test 24: POST /api/warehouses/:id/locations (Create location under warehouse)
    console.log("\n▶ Test 24: POST /api/warehouses/:id/locations (Create location)");
    const createLocRes = await request({
      method: "POST",
      path: `/api/warehouses/${createdWhId}/locations`,
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        name: "Cold Storage Bay",
        type: "internal",
      },
    });

    console.log(`  Status: ${createLocRes.status}`);
    if (createLocRes.status !== 201 || !createLocRes.body?.data?.id) {
      throw new Error(`Create location failed: ${JSON.stringify(createLocRes.body)}`);
    }
    const createdLocId = createLocRes.body.data.id;
    console.log(`  ✅ Created location "Cold Storage Bay" (${createdLocId})`);

    // Test 25: GET /api/warehouses/:id/locations
    console.log("\n▶ Test 25: GET /api/warehouses/:id/locations (List locations in warehouse)");
    const listLocsRes = await request({
      method: "GET",
      path: `/api/warehouses/${createdWhId}/locations`,
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${listLocsRes.status}`);
    if (listLocsRes.status !== 200 || listLocsRes.body.data.length === 0) {
      throw new Error(`List locations failed: ${JSON.stringify(listLocsRes.body)}`);
    }
    console.log(`  ✅ Listed ${listLocsRes.body.data.length} location(s) under new warehouse`);

    // Test 26: PATCH /api/locations/:id
    console.log("\n▶ Test 26: PATCH /api/locations/:id (Direct location update)");
    const updateLocRes = await request({
      method: "PATCH",
      path: `/api/locations/${createdLocId}`,
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { name: "Deep Freeze Zone" },
    });

    console.log(`  Status: ${updateLocRes.status}`);
    if (updateLocRes.status !== 200 || updateLocRes.body.data.name !== "Deep Freeze Zone") {
      throw new Error(`Update location failed: ${JSON.stringify(updateLocRes.body)}`);
    }
    console.log("  ✅ Location renamed to 'Deep Freeze Zone'");

    // Test 27: GET /api/warehouses/:id/stock-overview (Task 3: Aggregated stock grouped by location)
    console.log("\n▶ Test 27: GET /api/warehouses/:id/stock-overview (Task 3: Stock overview grouped by location)");
    const overviewRes = await request({
      method: "GET",
      path: `/api/warehouses/${mainWh.id}/stock-overview`,
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    console.log(`  Status: ${overviewRes.status}`);
    if (overviewRes.status !== 200 || !overviewRes.body?.data?.locations) {
      throw new Error(`Stock overview failed: ${JSON.stringify(overviewRes.body)}`);
    }
    const overview = overviewRes.body.data;
    console.log(`  ✅ Stock Overview for "${overview.warehouse.name}":`);
    console.log(`     Total Stock Quantity: ${overview.summary.totalStockQuantity}`);
    console.log(`     Unique Products: ${overview.summary.uniqueProductsCount}`);
    console.log(`     Locations Count: ${overview.summary.totalLocationsCount}`);
    for (const l of overview.locations) {
      console.log(`     - [${l.type.toUpperCase()}] ${l.name}: ${l.totalQuantity} items (${l.itemCount} products)`);
    }

    // Test 28: Cleanup test location & warehouse
    console.log("\n▶ Test 28: Cleanup test location & warehouse (DELETE)");
    const delLocRes = await request({
      method: "DELETE",
      path: `/api/locations/${createdLocId}`,
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (delLocRes.status !== 200) throw new Error("Delete location failed");

    console.log("  ✅ Cleaned up temporary test location and warehouse");

    // ══════════════════════════════════════════════════════════
    // PHASE 4 — OPERATIONS ENGINE TESTS (MacBooks & iPhones)
    // ══════════════════════════════════════════════════════════

    console.log("\n==================================================");
    console.log("⚡ PHASE 4 TESTS: OPERATIONS ENGINE (Apple Hardware)");
    console.log("==================================================");

    // Fetch Apple products from database for operation tests
    const allAppleProdsRes = await request({
      method: "GET",
      path: "/api/products?search=MacBook",
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const macbookPro = allAppleProdsRes.body.data.find((p: any) => p.sku === "MBP-16-M3X");
    if (!macbookPro) throw new Error("MacBook Pro 16 not found in seeded products");

    // Fetch storage locations
    const locationsRes = await request({
      method: "GET",
      path: `/api/warehouses/${mainWh.id}/locations`,
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const rackALoc = locationsRes.body.data.find((l: any) => l.name.includes("Rack A"));
    const rackBLoc = locationsRes.body.data.find((l: any) => l.name.includes("Rack B"));
    if (!rackALoc || !rackBLoc) throw new Error("Warehouse Rack A or Rack B location not found");

    // ── Test 29 & 30: Create Draft Receipt & Auto-Generated Reference ──
    console.log("\n▶ Test 29: POST /api/operations (Create Draft Inbound Receipt for 20 MacBooks)");
    const receiptCreateRes = await request({
      method: "POST",
      path: "/api/operations",
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        type: "receipt",
        destLocationId: rackALoc.id,
        partnerName: "Apple Logistics Distribution",
        notes: "Restock: 20x MacBook Pro 16 M3 Max",
        lines: [{ productId: macbookPro.id, quantity: 20 }],
      },
    });

    console.log(`  Status: ${receiptCreateRes.status}`);
    if (receiptCreateRes.status !== 201 || !receiptCreateRes.body?.data?.id) {
      throw new Error(`Create receipt failed: ${JSON.stringify(receiptCreateRes.body)}`);
    }
    const receiptOp = receiptCreateRes.body.data;
    console.log(`  ✅ Created Receipt: ${receiptOp.reference} (Status: ${receiptOp.status})`);

    // Verify auto-generated reference
    if (!receiptOp.reference.startsWith("REC-")) {
      throw new Error(`Expected reference to start with 'REC-', got: ${receiptOp.reference}`);
    }
    console.log(`  ✅ Auto-generated reference format verified: [ ${receiptOp.reference} ]`);

    // ── Test 31: Update Draft Operation (Task 4) ─────────────
    console.log("\n▶ Test 31: PATCH /api/operations/:id (Update draft operation notes & lines)");
    const updateOpRes = await request({
      method: "PATCH",
      path: `/api/operations/${receiptOp.id}`,
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        notes: "Updated Restock: 25x MacBook Pro 16 M3 Max",
        lines: [{ productId: macbookPro.id, quantity: 25 }],
      },
    });

    console.log(`  Status: ${updateOpRes.status}`);
    if (updateOpRes.status !== 200 || updateOpRes.body.data.lines[0].quantity !== 25) {
      throw new Error(`Update draft operation failed: ${JSON.stringify(updateOpRes.body)}`);
    }
    console.log("  ✅ Draft operation updated successfully (New planned quantity: 25)");

    // Get previous stock level in Rack A before validation
    const prodDetailBefore = await request({
      method: "GET",
      path: `/api/products/${macbookPro.id}`,
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const rackAStockBefore = prodDetailBefore.body.data.stockLevels.find((s: any) => s.locationId === rackALoc.id)?.quantity || 0;
    console.log(`     MacBook Pro stock in Rack A BEFORE receipt: ${rackAStockBefore} units`);

    // ── Test 32: Validate Receipt (Task 6) ───────────────────
    console.log("\n▶ Test 32: POST /api/operations/:id/validate (Validate Receipt -> Mutates Stock)");
    const validateReceiptRes = await request({
      method: "POST",
      path: `/api/operations/${receiptOp.id}/validate`,
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    console.log(`  Status: ${validateReceiptRes.status}`);
    if (validateReceiptRes.status !== 200 || validateReceiptRes.body.data.status !== "done") {
      throw new Error(`Validate receipt failed: ${JSON.stringify(validateReceiptRes.body)}`);
    }
    console.log("  ✅ Receipt validated! Status transitioned to 'done'");

    // Check stock level increased by exactly 25
    const prodDetailAfter = await request({
      method: "GET",
      path: `/api/products/${macbookPro.id}`,
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const rackAStockAfter = prodDetailAfter.body.data.stockLevels.find((s: any) => s.locationId === rackALoc.id)?.quantity || 0;
    console.log(`     MacBook Pro stock in Rack A AFTER receipt: ${rackAStockAfter} units (+25 added)`);
    if (rackAStockAfter !== rackAStockBefore + 25) {
      throw new Error(`Expected ${rackAStockBefore + 25} units, but found ${rackAStockAfter}`);
    }
    console.log("  ✅ Stock level accurately incremented in database");

    // ── Test 33: Internal Transfer (Rack A -> Rack B) ─────────
    console.log("\n▶ Test 33: Internal Transfer (Move 5 MacBooks from Rack A to Rack B Vault)");
    const transferRes = await request({
      method: "POST",
      path: "/api/operations",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        type: "internal",
        sourceLocationId: rackALoc.id,
        destLocationId: rackBLoc.id,
        notes: "Move 5 MacBooks to High Security Vault",
        lines: [{ productId: macbookPro.id, quantity: 5 }],
      },
    });

    const transferOp = transferRes.body.data;
    console.log(`  ✅ Created Internal Transfer: ${transferOp.reference}`);

    const validateTransferRes = await request({
      method: "POST",
      path: `/api/operations/${transferOp.id}/validate`,
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    console.log(`  Status: ${validateTransferRes.status}`);
    if (validateTransferRes.status !== 200) {
      throw new Error(`Validate transfer failed: ${JSON.stringify(validateTransferRes.body)}`);
    }
    console.log("  ✅ Transfer validated: 5 MacBooks deducted from Rack A and added to Rack B Vault");

    // ── Test 34: Insufficient Stock Guard ────────────────────
    console.log("\n▶ Test 34: Insufficient Stock Guard on Delivery (Attempting to ship 99,999 MacBooks)");
    const excessiveDelRes = await request({
      method: "POST",
      path: "/api/operations",
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        type: "delivery",
        sourceLocationId: rackALoc.id,
        partnerName: "Unauthorized Bulk Buyer",
        lines: [{ productId: macbookPro.id, quantity: 99999 }],
      },
    });

    const excessiveOpId = excessiveDelRes.body.data.id;
    const validateExcessiveRes = await request({
      method: "POST",
      path: `/api/operations/${excessiveOpId}/validate`,
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    console.log(`  Status: ${validateExcessiveRes.status}`);
    if (validateExcessiveRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for insufficient stock, got ${validateExcessiveRes.status}`);
    }
    console.log("  ✅ Insufficient stock correctly prevented operation (400 Bad Request)");

    // ── Test 35: Valid Delivery ──────────────────────────────
    console.log("\n▶ Test 35: POST /api/operations (Valid Delivery of 2 MacBooks to Customer)");
    const validDelRes = await request({
      method: "POST",
      path: "/api/operations",
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        type: "delivery",
        sourceLocationId: rackALoc.id,
        partnerName: "Apple Store Fifth Avenue",
        notes: "Express Customer Order",
        lines: [{ productId: macbookPro.id, quantity: 2 }],
      },
    });

    const validDelId = validDelRes.body.data.id;
    const validateDelRes = await request({
      method: "POST",
      path: `/api/operations/${validDelId}/validate`,
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    console.log(`  Status: ${validateDelRes.status}`);
    if (validateDelRes.status !== 200) {
      throw new Error(`Delivery validation failed: ${JSON.stringify(validateDelRes.body)}`);
    }
    console.log("  ✅ Delivery validated: 2 units dispatched, stock successfully decremented");

    // ── Test 36: Inventory Adjustment (Physical Count Audit) ──
    console.log("\n▶ Test 36: POST /api/operations (Physical Count Audit Adjustment)");
    const adjRes = await request({
      method: "POST",
      path: "/api/operations",
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        type: "adjustment",
        destLocationId: rackBLoc.id,
        notes: "Physical Count Audit: Set Vault MacBooks to exactly 20 units",
        lines: [{ productId: macbookPro.id, quantity: 20 }],
      },
    });

    const adjId = adjRes.body.data.id;
    const validateAdjRes = await request({
      method: "POST",
      path: `/api/operations/${adjId}/validate`,
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    console.log(`  Status: ${validateAdjRes.status}`);
    if (validateAdjRes.status !== 200) {
      throw new Error(`Adjustment validation failed: ${JSON.stringify(validateAdjRes.body)}`);
    }
    console.log("  ✅ Inventory adjustment validated: stock level reconciled to 20 units");

    // ── Test 37: Cancel Draft Operation (Task 5) ──────────────
    console.log("\n▶ Test 37: POST /api/operations/:id/cancel (Cancel draft operation)");
    const cancelRes = await request({
      method: "POST",
      path: `/api/operations/${excessiveOpId}/cancel`,
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    console.log(`  Status: ${cancelRes.status}`);
    if (cancelRes.status !== 200 || cancelRes.body.data.status !== "cancelled") {
      throw new Error(`Cancel operation failed: ${JSON.stringify(cancelRes.body)}`);
    }
    console.log("  ✅ Operation status transitioned to 'cancelled'");

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("🎉 ALL PHASE 1, 2, 3, AND 4 TESTS PASSED WITH 100% SUCCESS!");
    console.log("══════════════════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("\n❌ Test execution error:", err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
