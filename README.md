# Ride Redefined — Backend

A REST API backend for **Ride Redefined** (a.k.a. DriveHub), a car marketplace
application. Built with **Express 5**, **SQLite** (via `better-sqlite3`), JWT
authentication, and image uploads via `multer`.

---

## Tech Stack

| Layer        | Choice                              |
| ------------ | ----------------------------------- |
| Runtime      | Node.js (ES modules)                |
| Web framework| Express 5                           |
| Database     | SQLite (`better-sqlite3`, WAL mode) |
| Auth         | JWT (`jsonwebtoken`) + `bcryptjs`   |
| File upload  | `multer` (disk storage)              |
| CORS         | `cors`                              |

---

## Prerequisites

- **Node.js >= 18** (uses native ES modules and `node --watch`)
- npm (bundled with Node)

---

## Installation

```bash
# from the project root
npm install
```

This installs Express, better-sqlite3 (compiled natively), and all other
dependencies.

---

## Configuration

The backend reads a handful of optional environment variables. You can set
them inline or via a shell export:

| Variable     | Default                              | Description                          |
| ------------ | ------------------------------------ | ------------------------------------ |
| `PORT`       | `3001`                               | Port the API server listens on       |
| `JWT_SECRET`  | `drivehub-dev-secret-change-in-production` | Secret used to sign JWT tokens |

> **Set `JWT_SECRET` before exposing this anywhere.** The fallback is a committed
> constant, so with the default in place anyone can mint a valid admin token.

Example:

```bash
PORT=4000 JWT_SECRET="my-secret" npm run server
```

---

## Database

The SQLite database file is created automatically at the project root as
`drivehub.db` (with WAL sidecar files `drivehub.db-shm` and `drivehub.db-wal`).

Migrations live in `server/migrations/` and are applied **automatically on
startup** by `server/db.js`. They are tracked in a `_migrations` table so they
only run once.

You can also run migrations manually:

```bash
npm run migrate
```

To seed demo/sample data:

```bash
npm run seed
```

---

## Running the Backend

### Development (auto-restart on changes)

```bash
npm run dev:server
```

Uses `node --watch server/server.js`.

### Production / normal run

```bash
npm run server
```

On startup you should see:

```
🚀 Server running on http://localhost:3001
📁 Uploads served from http://localhost:3001/uploads
```

---

## Available npm Scripts

| Script                | Command                              | Description                                  |
| --------------------- | ------------------------------------ | -------------------------------------------- |
| `dev:server`          | `node --watch server/server.js`      | Start dev server with file-watch reload      |
| `server`              | `node server/server.js`              | Start the API server                         |
| `migrate`             | `node server/migrate.js`             | Run pending SQL migrations manually          |
| `seed`                | `node server/seed.js`                | Insert seed/sample data into the DB         |
| `download-images`     | `node scripts/download-images.js`     | Download reference images for seeding        |
| `test:e2e`            | `node scripts/test-e2e.js`            | End-to-end test (boots server, exercises API)|

---

## API Overview

Base URL: `http://localhost:3001/api`

### Health

| Method | Endpoint        | Auth | Description         |
| ------ | --------------- | ---- | ------------------- |
| GET    | `/api/health`   | No   | Health check ping   |

### Authentication (`/api/auth`)

| Method | Endpoint              | Auth | Description                          |
| ------ | --------------------- | ---- | ------------------------------------ |
| POST   | `/api/auth/register`  | No   | Register a new user; returns JWT     |
| POST   | `/api/auth/login`     | No   | Login with email/password; returns JWT|
| GET    | `/api/auth/me`        | Yes  | Get current user profile             |
| PATCH  | `/api/auth/profile`   | Yes  | Update name, phone, avatar, firm name/logo |

Roles: `user` (default) or `agent` (pass `role: "agent"` at registration).

### Listings (`/api/listings`)

| Method | Endpoint                    | Auth       | Description                          |
| ------ | --------------------------- | ---------- | ------------------------------------ |
| GET    | `/api/listings`             | Optional  | List all listings (promoted first)   |
| GET    | `/api/listings/search`      | Optional  | Filter/search listings by query params |
| GET    | `/api/listings/:id`         | Optional  | Get a single listing                 |
| GET    | `/api/listings/:id/similar` | Optional  | Get similar listings (same body type)|
| POST   | `/api/listings`            | **Yes**    | Create a listing (always `pending_review`) |
| PATCH  | `/api/listings/:id`        | **Yes**    | Update a listing you own, or any as admin |

Search query params (`GET /api/listings/search`): `q`, `brand`, `body`, `fuel`,
`trans`, `own`, `state`, `priceMin`, `priceMax`, `yearMin`, `yearMax`, `kmMin`,
`kmMax`, `sort` (`newest` | `price_low` | `price_high` | `km_low`).

**Write authorisation.** `POST` attributes the listing to the authenticated
caller (`sellerId` in the body is ignored) and always starts it in
`pending_review` — a seller cannot self-publish. On `PATCH`, a seller may edit
their own listing's descriptive and specification fields; `status`, `pricing`,
`featured` and the `assured*` promotion fields are admin-only and silently
dropped for everyone else. Editing someone else's listing returns `403`.

**Specifications.** Listings carry real per-variant figures rather than
placeholders: `displacementCc`, `maxPowerBhp`/`maxPowerRpm`,
`maxTorqueNm`/`maxTorqueRpm`, `driveTrain`, `mileageKmpl`, `airbags`, `seating`,
`bootSpaceL`, `fuelTankL`, `groundClearanceMm`, `lengthMm`, `widthMm`,
`heightMm`, `wheelbaseMm`, plus a `highlights` JSON array of declared features.
The frontend resolves these from its vehicle catalogue at submission time.

**Registration number (PII).** `registrationNumber` is stored in full but only
returned in full to the owning seller and to admins. Everyone else receives a
masked form such as `MH12 •• 1234`.

**Promotion.** `assuredUntil` is an epoch-ms expiry. While it is in the future
the listing sorts ahead of everything else in `/api/listings` and
`/api/listings/search`, in every sort order. Clients label these as promoted.

### Offers (`/api/offers`) — auth required

| Method | Endpoint              | Description                       |
| ------ | --------------------- | --------------------------------- |
| GET    | `/api/offers`         | Offers you made, plus offers on your listings |
| POST   | `/api/offers`         | Create an offer on someone else's listing |
| PATCH  | `/api/offers/:id`     | Accept/decline/counter — seller or admin only |

### Bookings (`/api/bookings`) — auth required

| Method | Endpoint              | Description                          |
| ------ | --------------------- | ------------------------------------ |
| GET    | `/api/bookings`       | Your bookings (all bookings for admins) |
| POST   | `/api/bookings`       | Create a booking (test drive/financing) |
| PATCH  | `/api/bookings/:id`   | Update your own booking, or any as admin |

### Tickets (`/api/tickets`) — auth required

| Method | Endpoint              | Description                       |
| ------ | --------------------- | --------------------------------- |
| GET    | `/api/tickets`        | Your tickets (all tickets for admins) |
| POST   | `/api/tickets`        | Create a support ticket           |
| PATCH  | `/api/tickets/:id`    | Edit your own ticket; `status` is admin-only |

Ownership for these resources is always derived from the verified JWT — a
client-supplied `userId` is ignored.

### Reviews (`/api/reviews`)

| Method | Endpoint              | Auth | Description                |
| ------ | --------------------- | ---- | -------------------------- |
| GET    | `/api/reviews`        | No   | List reviews for a listing |
| POST   | `/api/reviews`        | Yes  | Create a review            |

### Conversations (`/api/conversations`) — auth required

| Method | Endpoint                       | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| GET    | `/api/conversations`           | Your conversations (all for admins)      |
| GET    | `/api/conversations/:id`       | Get a conversation you participate in    |
| POST   | `/api/conversations`           | Start/continue a conversation as buyer   |
| POST   | `/api/conversations/:id/messages` | Send a message (sender from the token) |
| POST   | `/api/conversations/:id/read`  | Mark read for the calling user           |

Non-participants receive `403`.

### Saved Searches (`/api/saved-searches`) — auth required

| Method | Endpoint                       | Description                  |
| ------ | ------------------------------ | ---------------------------- |
| GET    | `/api/saved-searches`          | Your saved searches          |
| POST   | `/api/saved-searches`          | Save a search with filters   |
| DELETE | `/api/saved-searches/:id`      | Delete one of your own (404 otherwise) |

### Wishlist (`/api/wishlist`) — auth required

| Method | Endpoint                 | Description                |
| ------ | ------------------------ | -------------------------- |
| GET    | `/api/wishlist`          | Your wishlist listing ids  |
| POST   | `/api/wishlist/:listingId` | Toggle a listing in your wishlist |

### Uploads (`/api/upload`) — auth required

| Method | Endpoint         | Description                                             |
| ------ | ---------------- | ------------------------------------------------------- |
| POST   | `/api/upload`    | Upload 1–20 images (`multipart/form-data`, field `images`). Returns `{ urls, count, rejected? }`. |

- Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`
- **Content is verified by magic bytes**, not just the extension or MIME type —
  a file that isn't really an image is deleted and reported under `rejected`.
  A request where nothing survives returns `400`.
- Max file size: 10 MB
- Max files per request: 20
- Uploaded files are stored in `server/uploads/` and served at `/uploads/<filename>`

---

## Authentication

Protected endpoints expect a Bearer JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are obtained from `POST /api/auth/register` or `POST /api/auth/login`
and are valid for **7 days**. Missing/invalid tokens return `401`.

---

## Example: Full Flow

```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"secret123"}'

# Response includes a `token`. Use it below:
TOKEN="<paste token here>"

# 2. Upload an image
curl -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@/path/to/car.jpg"

# 3. Create a listing using the returned image URL
curl -X POST http://localhost:3001/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "sellerName":"Jane",
    "brand":"Hyundai","model":"Venue","variant":"1.5 CRDi SX MT",
    "year":2022,"registrationYear":2022,
    "fuelType":"Diesel","transmission":"Manual","kmDriven":35000,
    "ownership":"1st Owner","registrationNumber":"KA05MH1234",
    "registrationState":"Karnataka","registrationCity":"Bengaluru",
    "insuranceStatus":"Active","roadTaxStatus":"Paid",
    "serviceHistory":"Complete dealer history","accidentHistory":"No accidents",
    "keys":2,"exteriorCondition":"Good","interiorCondition":"Good",
    "engineCondition":"Good","tireCondition":"Good","batteryCondition":"Good",
    "expectedPrice":1200000,"preferredContactTime":"Evenings",
    "bodyType":"Compact SUV","images":["/uploads/car.jpg"],
    "displacementCc":1493,"maxPowerBhp":114,"maxPowerRpm":4000,
    "maxTorqueNm":250,"maxTorqueRpm":1500,"driveTrain":"FWD",
    "mileageKmpl":23.4,"airbags":6,"seating":5,
    "bootSpaceL":350,"fuelTankL":45,
    "highlights":["Sunroof","Apple CarPlay"]
  }'

# The listing is created as pending_review and attributed to $TOKEN's user.
# An admin publishes it separately:
#   curl -X PATCH http://localhost:3001/api/listings/<id> \
#     -H "Content-Type: application/json" \
#     -H "Authorization: Bearer $ADMIN_TOKEN" \
#     -d '{"status":"listed"}'

# 4. Fetch listings
curl http://localhost:3001/api/listings
```

---

## Testing

### End-to-end test

The E2E test boots the server against a fresh database and exercises the API
end to end: registration, login, image upload, listing creation, search, and the
authorisation rules — anonymous writes are rejected, sellers cannot self-publish
or self-promote, cross-user edits return `403`, registration numbers are masked
for other viewers, specification columns round-trip, non-image uploads are
rejected by content sniffing, and the wishlist and saved searches are scoped to
their owner.

```bash
npm run test:e2e
```

It auto-creates a minimal JPEG and the `server/uploads/` directory, so no
external setup is needed.

---

## Project Structure

```
.
├── drivehub.db                 # SQLite database (auto-created)
├── package.json
├── scripts/
│   ├── download-images.js      # Helper to fetch seed images
│   └── test-e2e.js             # End-to-end test harness
└── server/
    ├── server.js               # Express app entrypoint
    ├── db.js                   # SQLite connection + migration runner
    ├── migrate.js              # Migration runner (also runnable as CLI)
    ├── seed.js                 # Sample data seeding
    ├── middleware/
    │   └── auth.js             # requireAuth / optionalAuth JWT middleware
    ├── lib/
    │   └── registration.js     # Registration-number masking & validation
    ├── migrations/
    │   ├── 001_initial_schema.sql
    │   └── 002_vehicle_specs.sql  # Specs, registration no., promotion, profile
    ├── routes/
    │   ├── auth.js
    │   ├── bookings.js
    │   ├── conversations.js
    │   ├── listings.js
    │   ├── offers.js
    │   ├── reviews.js
    │   ├── saved-searches.js
    │   ├── tickets.js
    │   ├── upload.js
    │   └── wishlist.js
    └── uploads/                # Multer disk-storage destination (served at /uploads)
```

---

## Notes & Troubleshooting

- **Native build:** `better-sqlite3` compiles a native module. If `npm install`
  fails, ensure build tools (Python + a C++ compiler) are available, or install
  prebuilt binaries via `npm rebuild better-sqlite3`.
- **Resetting the database:** delete `drivehub.db`, `drivehub.db-shm`, and
  `drivehub.db-wal`, then restart the server (migrations re-run automatically).
  Run `npm run seed` to repopulate sample data.
- **Port conflicts:** set `PORT=<other>` if `3001` is in use.
- **Production secret:** always override `JWT_SECRET` in production deployments.
