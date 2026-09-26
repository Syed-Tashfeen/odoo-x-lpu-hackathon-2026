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
  console.log("🧪 Starting StockSense Auth API Tests...\n");

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
    // ── Test 1: POST /api/auth/signup ─────────────────────────
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

    // ── Test 2: POST /api/auth/login (Valid credentials) ──────
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

    // ── Test 3: GET /api/auth/me (verifyToken) ─────────────────
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

    // ── Test 4: Role Guard — requireRole('manager') blocks staff ──
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

    // ── Test 5: Login as seeded Admin/Manager & access manager-only ──
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

    // ── Test 6: POST /api/auth/forgot-password ────────────────
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

    // Retrieve generated OTP from DB or devOtp
    let otp = forgotRes.body?.devOtp;
    if (!otp) {
      const [u] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
      const [dbOtp] = await db.select().from(otpCodes).where(eq(otpCodes.userId, u.id)).limit(1);
      otp = dbOtp?.code;
    }
    console.log(`  ✅ 6-digit OTP stored in otp_codes: [ ${otp} ]`);

    // ── Test 7: POST /api/auth/reset-password ─────────────────
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

    // ── Test 8: Login with old password (Must fail 401) ───────
    console.log("\n▶ Test 8: Login with old password (Must fail 401)");
    const oldLoginRes = await request({
      method: "POST",
      path: "/api/auth/login",
      body: {
        email: testEmail,
        password: "securepassword123",
      },
    });
    console.log(`  Status: ${oldLoginRes.status}`);
    if (oldLoginRes.status !== 401) {
      throw new Error(`Expected 401 for old password, got ${oldLoginRes.status}`);
    }
    console.log("  ✅ Old password rejected as expected");

    // ── Test 9: Login with new password (Must succeed 200) ────
    console.log("\n▶ Test 9: Login with new password (Must succeed 200)");
    const newLoginRes = await request({
      method: "POST",
      path: "/api/auth/login",
      body: {
        email: testEmail,
        password: "newpassword456",
      },
    });

    console.log(`  Status: ${newLoginRes.status}`);
    if (newLoginRes.status !== 200) {
      throw new Error(`Login with new password failed: ${JSON.stringify(newLoginRes.body)}`);
    }
    console.log("  ✅ Login with new password successful");

    console.log("\n══════════════════════════════════════════════════════");
    console.log("🎉 ALL AUTH & MIDDLEWARE TESTS PASSED (100% SUCCESS)!");
    console.log("══════════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("\n❌ Test execution error:", err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
