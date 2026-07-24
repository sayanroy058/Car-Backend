// Download car images from Unsplash and save to server/uploads/
// Run: npx tsx scripts/download-images.ts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, "..", "server", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS)) {
  fs.mkdirSync(UPLOADS, { recursive: true });
}

// Real Unsplash photo URLs for each car model (800x600, free to use)
// Each car gets 10 images — using real car photos from Unsplash collections
const CAR_IMAGES: Record<string, string[]> = {
  "tesla-model3": [
    "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80",
    "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=800&q=80",
    "https://images.unsplash.com/photo-1561580125-028ee3bd62eb?w=800&q=80",
    "https://images.unsplash.com/photo-1617704548623-340376564e68?w=800&q=80",
    "https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?w=800&q=80",
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80",
    "https://images.unsplash.com/photo-1534323737418-e77edf51dc3c?w=800&q=80",
    "https://images.unsplash.com/photo-1562911791-c7a97b729ec5?w=800&q=80",
    "https://images.unsplash.com/photo-1554744512-d6c603f27c54?w=800&q=80",
    "https://images.unsplash.com/photo-1544002513-2c325fe20d80?w=800&q=80",
  ],
  "bmw-m340i": [
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
    "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=800&q=80",
    "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80",
    "https://images.unsplash.com/photo-1607853554439-0069ec0f29b6?w=800&q=80",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80",
    "https://images.unsplash.com/photo-1617814086367-3a4b9d12ac02?w=800&q=80",
    "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80",
    "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=800&q=80",
  ],
  "porsche-macan": [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
    "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80",
    "https://images.unsplash.com/photo-1611016186353-9af58c69a533?w=800&q=80",
    "https://images.unsplash.com/photo-1617814076367-15c1083aba04?w=800&q=80",
    "https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
    "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=800&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
    "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800&q=80",
  ],
  "mercedes-c300": [
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
    "https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?w=800&q=80",
    "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80",
    "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
    "https://images.unsplash.com/photo-1553440569-bcc638f1fdf3?w=800&q=80",
    "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80",
    "https://images.unsplash.com/photo-1540066019607-e5f69323a8dc?w=800&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
    "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=800&q=80",
  ],
  "audi-q5": [
    "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80",
    "https://images.unsplash.com/photo-1606663889134-b1dedb5ed8b7?w=800&q=80",
    "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&q=80",
    "https://images.unsplash.com/photo-1554260570-e9689a3418b8?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
    "https://images.unsplash.com/photo-1606152421802-db97b1e5732e?w=800&q=80",
    "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80",
    "https://images.unsplash.com/photo-1609521263047-f8f2055c06e0?w=800&q=80",
    "https://images.unsplash.com/photo-1592198084033-bd3eae12d092?w=800&q=80",
    "https://images.unsplash.com/photo-1597916822927-1b87a8f6d3f7?w=800&q=80",
  ],
  "toyota-camry": [
    "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80",
    "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&q=80",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80",
    "https://images.unsplash.com/photo-1551830820-330a71b99659?w=800&q=80",
    "https://images.unsplash.com/photo-1601362840469-51e4d8a58780?w=800&q=80",
    "https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=800&q=80",
    "https://images.unsplash.com/photo-1599256630445-67b5772b1204?w=800&q=80",
    "https://images.unsplash.com/photo-1610647752706-3bb12238b906?w=800&q=80",
    "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
    "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=800&q=80",
  ],
  "honda-civic": [
    "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=800&q=80",
    "https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=800&q=80",
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80",
    "https://images.unsplash.com/photo-1617814076367-15c1083aba04?w=800&q=80",
    "https://images.unsplash.com/photo-1626072778346-0ab6604d39c4?w=800&q=80",
    "https://images.unsplash.com/photo-1609521263047-f8f2055c06e0?w=800&q=80",
    "https://images.unsplash.com/photo-1592198084033-bd3eae12d092?w=800&q=80",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
  ],
  "polestar-2": [
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80",
    "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80",
    "https://images.unsplash.com/photo-1561580125-028ee3bd62eb?w=800&q=80",
    "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=800&q=80",
    "https://images.unsplash.com/photo-1617704548623-340376564e68?w=800&q=80",
    "https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?w=800&q=80",
    "https://images.unsplash.com/photo-1540066019607-e5f69323a8dc?w=800&q=80",
    "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
    "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
  ],
  "volvo-xc60": [
    "https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800&q=80",
    "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80",
    "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&q=80",
    "https://images.unsplash.com/photo-1554260570-e9689a3418b8?w=800&q=80",
    "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80",
    "https://images.unsplash.com/photo-1617814086367-3a4b9d12ac02?w=800&q=80",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
    "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80",
    "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=800&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
  ],
  "lexus-rx350": [
    "https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=800&q=80",
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
    "https://images.unsplash.com/photo-1554744512-d6c603f27c54?w=800&q=80",
    "https://images.unsplash.com/photo-1540066019607-e5f69323a8dc?w=800&q=80",
    "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80",
    "https://images.unsplash.com/photo-1553440569-bcc638f1fdf3?w=800&q=80",
    "https://images.unsplash.com/photo-1617814086367-3a4b9d12ac02?w=800&q=80",
    "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
    "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
  ],
  "hyundai-ioniq5": [
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80",
    "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=800&q=80",
    "https://images.unsplash.com/photo-1617704548623-340376564e68?w=800&q=80",
    "https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?w=800&q=80",
    "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80",
    "https://images.unsplash.com/photo-1561580125-028ee3bd62eb?w=800&q=80",
    "https://images.unsplash.com/photo-1540066019607-e5f69323a8dc?w=800&q=80",
    "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
    "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
  ],
  "kia-ev6": [
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80",
    "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=800&q=80",
    "https://images.unsplash.com/photo-1617704548623-340376564e68?w=800&q=80",
    "https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?w=800&q=80",
    "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80",
    "https://images.unsplash.com/photo-1561580125-028ee3bd62eb?w=800&q=80",
    "https://images.unsplash.com/photo-1540066019607-e5f69323a8dc?w=800&q=80",
    "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
    "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
  ],
  "mazda-cx5": [
    "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80",
    "https://images.unsplash.com/photo-1617814086367-3a4b9d12ac02?w=800&q=80",
    "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
    "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80",
    "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=800&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80",
  ],
  "volkswagen-golf": [
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
    "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
    "https://images.unsplash.com/photo-1540066019607-e5f69323a8dc?w=800&q=80",
    "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80",
    "https://images.unsplash.com/photo-1617814086367-3a4b9d12ac02?w=800&q=80",
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80",
    "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80",
    "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=800&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
  ],
};

// ── General fallback images (for any missing car-specific images) ──
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
  "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80",
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80",
];

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  if (fs.existsSync(filepath)) {
    console.log(`  ✓ (cached) ${path.basename(filepath)}`);
    return true;
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    console.log(`  ✓ ${path.basename(filepath)} (${(buffer.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${path.basename(filepath)} - ${(err as Error).message}`);
    return false;
  }
}

async function main() {
  console.log("📸 Downloading car images to server/uploads/...\n");

  let total = 0;
  let success = 0;

  for (const [car, urls] of Object.entries(CAR_IMAGES)) {
    console.log(`${car}:`);
    for (let i = 0; i < urls.length; i++) {
      const filepath = path.join(UPLOADS, `${car}-${i}.jpg`);
      const ok = await downloadImage(urls[i], filepath);
      total++;
      if (ok) success++;
    }
    console.log();
  }

  // Also download fallback images
  console.log("fallbacks:");
  for (let i = 0; i < FALLBACK_IMAGES.length; i++) {
    const filepath = path.join(UPLOADS, `fallback-${i}.jpg`);
    const ok = await downloadImage(FALLBACK_IMAGES[i], filepath);
    total++;
    if (ok) success++;
  }

  console.log(`\n✅ Done: ${success}/${total} images downloaded to server/uploads/`);
}

main().catch(console.error);
