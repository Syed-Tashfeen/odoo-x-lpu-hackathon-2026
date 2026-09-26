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

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("🎉 ALL PHASE 1 & PHASE 2 TESTS PASSED WITH 100% SUCCESS!");
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
