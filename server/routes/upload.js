import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, unique);
  },
});

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported image type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

/**
 * Magic-byte signatures for the formats we accept. Extension and MIME type are
 * both client-controlled, so the file's actual header is checked before the
 * upload is accepted — otherwise any payload could be stored and later served
 * from our own origin.
 */
function sniffImageType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.slice(0, 6).toString("ascii") === "GIF87a" || buf.slice(0, 6).toString("ascii") === "GIF89a") return "gif";
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  // AVIF and other ISO-BMFF derivatives: "ftyp" box at offset 4.
  if (buf.slice(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.slice(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis") || brand.startsWith("mif1")) return "avif";
  }
  return null;
}

/** Reads the first bytes of a file and returns its detected image type. */
function detectFileType(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const header = Buffer.alloc(32);
    fs.readSync(fd, header, 0, 32, 0);
    return sniffImageType(header);
  } finally {
    fs.closeSync(fd);
  }
}

const router = Router();

// POST /api/upload — upload one or more images
router.post(
  "/",
  (req, res, next) => {
    upload.array("images", 20)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          res.status(400).json({ error: `Upload error: ${err.message}` });
          return;
        }
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
      }
      next();
    });
  },
  (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No image files uploaded" });
      return;
    }

    // Verify each file really is an image; discard anything that is not.
    const rejected = [];
    const accepted = [];
    for (const f of files) {
      let type = null;
      try {
        type = detectFileType(f.path);
      } catch {
        type = null;
      }
      if (type) {
        accepted.push(f);
      } else {
        rejected.push(f.originalname);
        fs.unlink(f.path, () => {});
      }
    }

    if (accepted.length === 0) {
      res.status(400).json({
        error: `No valid images uploaded. Rejected: ${rejected.join(", ")}`,
      });
      return;
    }

    const urls = accepted.map((f) => `/uploads/${f.filename}`);
    res.status(201).json({
      urls,
      count: urls.length,
      ...(rejected.length ? { rejected } : {}),
    });
  },
);

export default router;

