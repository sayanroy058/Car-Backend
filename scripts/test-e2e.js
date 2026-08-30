// End-to-end test: register, login, upload, create listing, verify DB
// Run: node scripts/test-e2e.js

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const UPLOADS = path.join(ROOT, "server", "uploads");

// Ensure uploads exists
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

// Create a minimal valid JPEG for testing
const MINIMAL_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);
const TEST_IMG1 = path.join(UPLOADS, "test-e2e-car1.jpg");
const TEST_IMG2 = path.join(UPLOADS, "test-e2e-car2.jpg");
fs.writeFileSync(TEST_IMG1, MINIMAL_JPEG);
fs.writeFileSync(TEST_IMG2, MINIMAL_JPEG);

let server = null;
let passed = 0;
let failed = 0;

async function check(pass, label) {
  if (pass) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function fetchAPI(endpoint, options = {}) {
  try {
    const res = await fetch(`http://localhost:3001${endpoint}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  }
}

// ── Start server ──
console.log("🚀 Starting server...");
// Remove old DB
const dbPaths = ["drivehub.db", "drivehub.db-wal", "drivehub.db-shm"];
for (const p of dbPaths) {
  try { fs.unlinkSync(path.join(ROOT, p)); } catch { /* ignore */ }
}

server = spawn("node", ["server/server.js"], {
  cwd: ROOT,
  stdio: "pipe",
  env: { ...process.env, PORT: "3001" },
});

// Capture server output for debugging
let serverOutput = "";
server.stdout?.on("data", (d) => { serverOutput += d.toString(); });
server.stderr?.on("data", (d) => { serverOutput += d.toString(); });

// Wait for server to be ready
let serverReady = false;
for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    const res = await fetch("http://localhost:3001/api/health");
    if (res.ok) {
      serverReady = true;
      break;
    }
  } catch { /* still starting */ }
}

if (!serverReady) {
  console.log("Server output:\n", serverOutput.slice(-1000));
  console.log("❌ Server failed to start");
  process.exit(1);
}

console.log("✅ Server ready\n");

// ── RUN TESTS ──

console.log("📋 TEST 1: Health check");
const health = await fetchAPI("/api/health");
await check(health.status === 200, "Health endpoint returns 200");

console.log("\n📋 TEST 2: Register seller account");
const regResp = await fetchAPI("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({
    name: "Rahul Sharma",
    email: "rahul.seller@example.com",
    password: "seller123",
  }),
});
await check(regResp.status === 201, "Seller registered (201)");
const sellerId = regResp.data?.user?.id;
await check(!!sellerId, `Seller ID: ${sellerId}`);

console.log("\n📋 TEST 3: Login as seller");
const loginResp = await fetchAPI("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "rahul.seller@example.com", password: "seller123" }),
});
await check(loginResp.status === 200, "Login successful");
const sellerToken = loginResp.data?.token;
await check(!!sellerToken, `Token received: ${sellerToken?.slice(0, 20)}...`);

console.log("\n📋 TEST 4: Get seller profile (auth/me)");
const meResp = await fetchAPI("/api/auth/me", {
  headers: { Authorization: `Bearer ${sellerToken}` },
});
await check(meResp.status === 200, "Auth/me returns 200");
await check(
  meResp.data?.user?.name === "Rahul Sharma",
  "Profile shows correct name",
);

console.log("\n📋 TEST 5: Upload car images");
const formData = new FormData();
formData.append("images", new Blob([fs.readFileSync(TEST_IMG1)]), "car-front.jpg");
formData.append("images", new Blob([fs.readFileSync(TEST_IMG2)]), "car-side.jpg");
const uploadResp = await fetch("http://localhost:3001/api/upload", {
  method: "POST",
  headers: { Authorization: `Bearer ${sellerToken}` },
  body: formData,
});
const uploadData = await uploadResp.json();
const uploadedUrls = uploadData.urls;
await check(uploadResp.status === 201, "Upload returns 201");
await check(uploadedUrls?.length === 2, `2 images uploaded: ${uploadedUrls?.join(", ")}`);

console.log("\n📋 TEST 6: Create car listing with uploaded images");
const listingResp = await fetchAPI("/api/listings", {
  method: "POST",
  headers: { Authorization: `Bearer ${sellerToken}` },
  body: JSON.stringify({
    sellerId,
    sellerName: "Rahul Sharma",
    sellerEmail: "rahul.seller@example.com",
    sellerPhone: "+919876543210",
    brand: "Honda",
    model: "City",
    variant: "ZX CVT",
    year: 2022,
    registrationYear: 2022,
    fuelType: "Petrol",
    transmission: "CVT",
    kmDriven: 35000,
    ownership: "1st Owner",
    registrationState: "Karnataka",
    registrationCity: "Bengaluru",
    vin: "MAKGM123ABC45678",
    insuranceStatus: "Active",
    roadTaxStatus: "Paid",
    serviceHistory: "Complete dealer history",
    accidentHistory: "No accidents",
    keys: 2,
    exteriorCondition: "Excellent",
    interiorCondition: "Excellent",
    engineCondition: "Excellent",
    tireCondition: "Good (70%+)",
    batteryCondition: "Excellent",
    defects: "Minor scratch on rear bumper",
    modifications: "None",
    description: "Well maintained single owner Honda City ZX CVT. All service records available.",
    expectedPrice: 1250000,
    address: "12 MG Road, Indiranagar, Bengaluru",
    preferredContactTime: "Afternoon (12-5)",
    bodyType: "Sedan",
    images: uploadedUrls,
  }),
});
await check(listingResp.status === 201, "Listing created (201)");
const listing = listingResp.data?.listing;
const listingId = listing?.id;
await check(!!listingId, `Listing ID: ${listingId}`);
await check(listing?.brand === "Honda", `Brand: ${listing?.brand}`);
await check(listing?.status === "pending_review", `Status: ${listing?.status}`);
await check(listing?.images?.length === 2, "Listing has 2 images");

console.log("\n📋 TEST 7: Get listing by ID");
const getResp = await fetchAPI(`/api/listings/${listingId}`);
await check(getResp.status === 200, "GET listing returns 200");
const getListing = getResp.data?.listing;
await check(getListing?.sellerName === "Rahul Sharma", "Seller name correct");
await check(getListing?.expectedPrice === 1250000, "Price correct");

console.log("\n📋 TEST 8: Search listings");
const searchResp = await fetchAPI("/api/listings/search?brand=Honda");
const searchListings = searchResp.data?.listings;
await check(searchResp.status === 200, "Search returns 200");
await check(
  (searchListings?.length ?? 0) >= 1,
  `Found ${searchListings?.length} Honda listings (search only returns listed/approved; new City is pending_review)`,
);

console.log("\n📋 TEST 9: Total listings count");
const allResp = await fetchAPI("/api/listings");
const allListings = allResp.data?.listings;
const totalListings = allListings?.length ?? 0;
await check(totalListings >= 15, `Total listings: ${totalListings} (expect >=15: 14 seed + 1 created)`);

console.log("\n📋 TEST 10: Verify images on disk");
const imgFiles = fs.readdirSync(UPLOADS).filter((f) => f.endsWith(".jpg"));
await check(imgFiles.length >= 2, `${imgFiles.length} .jpg files on disk (expect >=2)`);

console.log("\n📋 TEST 11: Verify image access via HTTP");
if (uploadedUrls?.length > 0) {
  const imgUrl = uploadedUrls[0];
  try {
    const imgResp = await fetch(`http://localhost:3001${imgUrl}`);
    await check(
      imgResp.status === 200,
      `Image ${imgUrl} accessible (HTTP ${imgResp.status})`,
    );
  } catch {
    await check(false, `Image ${imgUrl} not accessible`);
  }
}

console.log("\n📋 TEST 12: Admin login");
const adminResp = await fetchAPI("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "admin@drivehub.io", password: "admin" }),
});
await check(adminResp.status === 200, "Admin login successful");
const adminUser = adminResp.data?.user;
await check(adminUser?.role === "admin", `Admin role: ${adminUser?.role}`);
const adminToken = adminResp.data?.token;

console.log("\n📋 TEST 13: Admin creates listing directly as 'listed'");
const adminListingResp = await fetchAPI("/api/listings", {
  method: "POST",
  headers: { Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({
    sellerId: "admin-1",
    sellerName: "Admin",
    sellerEmail: "admin@drivehub.io",
    sellerPhone: "+919999999999",
    brand: "Maruti Suzuki",
    model: "Swift",
    variant: "ZXi+ AMT",
    year: 2023,
    registrationYear: 2023,
    fuelType: "Petrol",
    transmission: "AMT",
    kmDriven: 15000,
    ownership: "1st Owner",
    registrationState: "Delhi",
    registrationCity: "New Delhi",
    vin: "MBH1234XYZ789",
    insuranceStatus: "Active",
    roadTaxStatus: "Paid",
    serviceHistory: "Complete dealer history",
    accidentHistory: "No accidents",
    keys: 2,
    exteriorCondition: "Excellent",
    interiorCondition: "Excellent",
    engineCondition: "Excellent",
    tireCondition: "Good (70%+)",
    batteryCondition: "Good",
    defects: "None",
    modifications: "None",
    description: "Brand new condition Maruti Swift. Perfect city car with great mileage.",
    expectedPrice: 750000,
    address: "45 Connaught Place, New Delhi",
    preferredContactTime: "Morning (9-12)",
    bodyType: "Hatchback",
    images: ["/uploads/fallback-0.jpg", "/uploads/fallback-1.jpg"],
  }),
});
await check(adminListingResp.status === 201, "Admin listing created (201)");
const adminListing = adminListingResp.data?.listing;
await check(adminListing?.brand === "Maruti Suzuki", "Correct brand");
// Create always yields pending_review, even for an admin — publishing is a
// separate, explicitly authorised PATCH.
await check(adminListing?.status === "pending_review", `Status: ${adminListing?.status}`);
await check(adminListing?.images?.length === 2, "Admin listing has 2 images");
await check(
  adminListing?.sellerId === "admin-1",
  `Seller taken from the token, not the body: ${adminListing?.sellerId}`,
);

console.log("\n📋 TEST 14: Auth is enforced on listing writes");
// Previously POST/PATCH /api/listings sat behind optionalAuth, so anyone could
// create a listing or flip another listing's status, pricing and featured flag.
const anonCreate = await fetchAPI("/api/listings", {
  method: "POST",
  body: JSON.stringify({
    brand: "Ghost",
    model: "Unauthorised",
    year: 2024,
    fuelType: "Petrol",
    transmission: "Manual",
    expectedPrice: 1,
  }),
});
await check(anonCreate.status === 401, `Anonymous create rejected (${anonCreate.status})`);

const anonPatch = await fetchAPI(`/api/listings/${listingId}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "listed" }),
});
await check(anonPatch.status === 401, `Anonymous patch rejected (${anonPatch.status})`);

console.log("\n📋 TEST 15: Sellers cannot self-publish or self-promote");
// A seller may edit their own listing's descriptive fields, but status, pricing,
// featured and the paid "assured" placement are admin-only.
const sellerSelfPublish = await fetchAPI(`/api/listings/${listingId}`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${sellerToken}` },
  body: JSON.stringify({ status: "listed", featured: true, assuredUntil: Date.now() + 86400000 }),
});
await check(sellerSelfPublish.status === 200, "Seller patch accepted");
await check(
  sellerSelfPublish.data?.listing?.status === "pending_review",
  `Status unchanged by seller: ${sellerSelfPublish.data?.listing?.status}`,
);
await check(sellerSelfPublish.data?.listing?.featured === false, "featured not set by seller");
await check(
  !sellerSelfPublish.data?.listing?.assuredUntil,
  "assured placement not granted to seller",
);

const foreignPatch = await fetchAPI("/api/listings/seed-1", {
  method: "PATCH",
  headers: { Authorization: `Bearer ${sellerToken}` },
  body: JSON.stringify({ description: "hijacked" }),
});
await check(
  foreignPatch.status === 403,
  `Editing another seller's listing rejected (${foreignPatch.status})`,
);

console.log("\n📋 TEST 16: Admin can publish and promote");
const adminPublish = await fetchAPI(`/api/listings/${listingId}`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({
    status: "listed",
    assuredPlan: "assured-7",
    assuredUntil: Date.now() + 7 * 86400000,
    assuredPaymentId: "pay_test_123",
  }),
});
await check(adminPublish.data?.listing?.status === "listed", "Admin set status to listed");
await check(
  (adminPublish.data?.listing?.assuredUntil ?? 0) > Date.now(),
  "Admin granted assured placement",
);

console.log("\n📋 TEST 17: Promoted listings sort first in search");
const promotedSearch = await fetchAPI("/api/listings/search?sort=price_low");
await check(
  promotedSearch.data?.listings?.[0]?.id === listingId,
  `Promoted listing leads results (first: ${promotedSearch.data?.listings?.[0]?.id})`,
);

console.log("\n📋 TEST 18: Registration number is masked for other viewers");
// The full number is PII: it can be used for public RTO lookups. Only the owning
// seller and admins see it in full.
const regPatch = await fetchAPI(`/api/listings/${listingId}`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${sellerToken}` },
  body: JSON.stringify({ registrationNumber: "KA05MH1234" }),
});
await check(
  regPatch.data?.listing?.registrationNumber === "KA05MH1234",
  `Owner sees full number: ${regPatch.data?.listing?.registrationNumber}`,
);

const anonView = await fetchAPI(`/api/listings/${listingId}`);
await check(
  anonView.data?.listing?.registrationNumber === "KA05 •• 1234",
  `Anonymous sees masked number: ${anonView.data?.listing?.registrationNumber}`,
);

const adminView = await fetchAPI(`/api/listings/${listingId}`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
await check(
  adminView.data?.listing?.registrationNumber === "KA05MH1234",
  "Admin sees full number",
);

console.log("\n📋 TEST 19: Specification columns round-trip");
const specPatch = await fetchAPI(`/api/listings/${listingId}`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${sellerToken}` },
  body: JSON.stringify({
    displacementCc: 1498,
    maxPowerBhp: 119,
    maxPowerRpm: 6600,
    maxTorqueNm: 145,
    maxTorqueRpm: 4300,
    driveTrain: "FWD",
    mileageKmpl: 18.4,
    airbags: 6,
    seating: 5,
    bootSpaceL: 506,
    fuelTankL: 40,
    highlights: ["Sunroof", "Apple CarPlay"],
  }),
});
const specced = specPatch.data?.listing;
await check(specced?.displacementCc === 1498, `Displacement stored: ${specced?.displacementCc} cc`);
await check(specced?.maxPowerBhp === 119, `Power stored: ${specced?.maxPowerBhp} bhp`);
await check(specced?.driveTrain === "FWD", `Drivetrain stored: ${specced?.driveTrain}`);
await check(specced?.airbags === 6, `Airbags stored: ${specced?.airbags}`);
await check(specced?.bootSpaceL === 506, `Boot space stored: ${specced?.bootSpaceL} L`);
await check(
  Array.isArray(specced?.highlights) && specced.highlights.length === 2,
  `Highlights stored: ${specced?.highlights?.join(", ")}`,
);

console.log("\n📋 TEST 20: Non-image uploads are rejected by content sniffing");
// Extension and MIME type are client-controlled, so the file header is checked.
const badForm = new FormData();
badForm.append("images", new Blob(["#!/bin/sh\necho not an image"]), "payload.jpg");
const badUpload = await fetch("http://localhost:3001/api/upload", {
  method: "POST",
  headers: { Authorization: `Bearer ${sellerToken}` },
  body: badForm,
});
await check(badUpload.status === 400, `Disguised non-image rejected (${badUpload.status})`);

console.log("\n📋 TEST 21: Wishlist and saved searches are scoped to the caller");
const wlAdd = await fetchAPI(`/api/wishlist/seed-1`, {
  method: "POST",
  headers: { Authorization: `Bearer ${sellerToken}` },
});
await check(wlAdd.data?.added === true, "Seller added seed-1 to wishlist");

const wlSeller = await fetchAPI("/api/wishlist", {
  headers: { Authorization: `Bearer ${sellerToken}` },
});
await check(wlSeller.data?.wishlist?.includes("seed-1"), "Seller sees their own wishlist");

const wlAdmin = await fetchAPI("/api/wishlist", {
  headers: { Authorization: `Bearer ${adminToken}` },
});
await check(
  !wlAdmin.data?.wishlist?.includes("seed-1"),
  "Admin does not see the seller's wishlist entries",
);

const wlAnon = await fetchAPI("/api/wishlist");
await check(wlAnon.status === 401, `Anonymous wishlist rejected (${wlAnon.status})`);

const ssCreate = await fetchAPI("/api/saved-searches", {
  method: "POST",
  headers: { Authorization: `Bearer ${sellerToken}` },
  body: JSON.stringify({ name: "Hondas under 15L", filters: { brand: ["Honda"] } }),
});
await check(ssCreate.status === 201, "Saved search created");
const savedSearchId = ssCreate.data?.search?.id;

const ssAdminDelete = await fetchAPI(`/api/saved-searches/${savedSearchId}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${adminToken}` },
});
await check(
  ssAdminDelete.status === 404,
  `Another user cannot delete the saved search (${ssAdminDelete.status})`,
);

console.log("\n📋 TEST 22: Final DB state");
const finalResp = await fetchAPI("/api/listings");
const finalListings = finalResp.data?.listings;
const finalTotal = finalListings?.length ?? 0;
await check(finalTotal >= 16, `Final total: ${finalTotal} listings (expect >=16)`);

// Show listing summary
console.log("\n📋 Listing summary:");
for (const l of finalListings || []) {
  console.log(
    `  ${l.id} | ${l.brand} ${l.model} | ${l.status} | ${l.images?.length ?? 0} imgs | ${l.images?.[0]?.slice(0, 40)}`,
  );
}

// ── Results ──
console.log(`\n${"═".repeat(50)}`);
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

// ── Cleanup ──
// Remove only the uploads this run created, so the uploads directory is left as
// it was found. The minimal JPEG fixtures and drivehub.db are left in place:
// both are currently tracked in git, and the script recreates them on each run.
server?.kill();
for (const url of uploadedUrls ?? []) {
  try { fs.unlinkSync(path.join(UPLOADS, path.basename(url))); } catch { /* already gone */ }
}

process.exit(failed > 0 ? 1 : 0);
