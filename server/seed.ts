import bcrypt from "bcryptjs";
import { getDb } from "./db";

const SAMPLE_IMAGES = [
  "/uploads/fallback-0.jpg",
  "/uploads/fallback-1.jpg",
  "/uploads/fallback-2.jpg",
  "/uploads/fallback-3.jpg",
  "/uploads/fallback-4.jpg",
  "/uploads/fallback-5.jpg",
  "/uploads/fallback-6.jpg",
  "/uploads/fallback-7.jpg",
  "/uploads/fallback-8.jpg",
  "/uploads/fallback-9.jpg",
];

// Car-specific local image paths (downloaded from Unsplash to server/uploads/)
const CAR_SPECIFIC_IMAGES: Record<string, string[]> = {
  "Tesla_Model 3": [
    "/uploads/tesla-model3-0.jpg", "/uploads/tesla-model3-1.jpg", "/uploads/tesla-model3-2.jpg",
    "/uploads/tesla-model3-3.jpg", "/uploads/tesla-model3-4.jpg", "/uploads/tesla-model3-5.jpg",
    "/uploads/tesla-model3-6.jpg", "/uploads/tesla-model3-7.jpg", "/uploads/tesla-model3-8.jpg",
    "/uploads/tesla-model3-9.jpg",
  ],
  "BMW_M340i": [
    "/uploads/bmw-m340i-0.jpg", "/uploads/bmw-m340i-1.jpg", "/uploads/bmw-m340i-2.jpg",
    "/uploads/bmw-m340i-3.jpg", "/uploads/bmw-m340i-4.jpg", "/uploads/bmw-m340i-5.jpg",
    "/uploads/bmw-m340i-6.jpg", "/uploads/bmw-m340i-7.jpg", "/uploads/bmw-m340i-8.jpg",
    "/uploads/bmw-m340i-9.jpg",
  ],
  "Porsche_Macan": [
    "/uploads/porsche-macan-0.jpg", "/uploads/porsche-macan-1.jpg", "/uploads/porsche-macan-2.jpg",
    "/uploads/porsche-macan-3.jpg", "/uploads/porsche-macan-4.jpg", "/uploads/porsche-macan-5.jpg",
    "/uploads/porsche-macan-6.jpg", "/uploads/porsche-macan-7.jpg", "/uploads/porsche-macan-8.jpg",
    "/uploads/porsche-macan-9.jpg",
  ],
  "Mercedes-Benz_C300": [
    "/uploads/mercedes-c300-0.jpg", "/uploads/mercedes-c300-1.jpg", "/uploads/mercedes-c300-2.jpg",
    "/uploads/mercedes-c300-3.jpg", "/uploads/mercedes-c300-4.jpg", "/uploads/mercedes-c300-5.jpg",
    "/uploads/mercedes-c300-6.jpg", "/uploads/mercedes-c300-7.jpg", "/uploads/mercedes-c300-8.jpg",
    "/uploads/mercedes-c300-9.jpg",
  ],
  "Audi_Q5": [
    "/uploads/audi-q5-0.jpg", "/uploads/audi-q5-1.jpg", "/uploads/audi-q5-2.jpg",
    "/uploads/audi-q5-3.jpg", "/uploads/audi-q5-4.jpg", "/uploads/audi-q5-5.jpg",
    "/uploads/audi-q5-6.jpg", "/uploads/audi-q5-7.jpg", "/uploads/audi-q5-8.jpg",
    "/uploads/audi-q5-9.jpg",
  ],
  "Toyota_Camry": [
    "/uploads/toyota-camry-0.jpg", "/uploads/toyota-camry-1.jpg", "/uploads/toyota-camry-2.jpg",
    "/uploads/toyota-camry-3.jpg", "/uploads/toyota-camry-4.jpg", "/uploads/toyota-camry-5.jpg",
    "/uploads/toyota-camry-6.jpg", "/uploads/toyota-camry-7.jpg", "/uploads/toyota-camry-8.jpg",
    "/uploads/toyota-camry-9.jpg",
  ],
  "Honda_Civic": [
    "/uploads/honda-civic-0.jpg", "/uploads/honda-civic-1.jpg", "/uploads/honda-civic-2.jpg",
    "/uploads/honda-civic-3.jpg", "/uploads/honda-civic-4.jpg", "/uploads/honda-civic-5.jpg",
    "/uploads/honda-civic-6.jpg", "/uploads/honda-civic-7.jpg", "/uploads/honda-civic-8.jpg",
    "/uploads/honda-civic-9.jpg",
  ],
  "Polestar_2": [
    "/uploads/polestar-2-0.jpg", "/uploads/polestar-2-1.jpg", "/uploads/polestar-2-2.jpg",
    "/uploads/polestar-2-3.jpg", "/uploads/polestar-2-4.jpg", "/uploads/polestar-2-5.jpg",
    "/uploads/polestar-2-6.jpg", "/uploads/polestar-2-7.jpg", "/uploads/polestar-2-8.jpg",
    "/uploads/polestar-2-9.jpg",
  ],
  "Volvo_XC60": [
    "/uploads/volvo-xc60-0.jpg", "/uploads/volvo-xc60-1.jpg", "/uploads/volvo-xc60-2.jpg",
    "/uploads/volvo-xc60-3.jpg", "/uploads/volvo-xc60-4.jpg", "/uploads/volvo-xc60-5.jpg",
    "/uploads/volvo-xc60-6.jpg", "/uploads/volvo-xc60-7.jpg", "/uploads/volvo-xc60-8.jpg",
    "/uploads/volvo-xc60-9.jpg",
  ],
  "Lexus_RX 350": [
    "/uploads/lexus-rx350-0.jpg", "/uploads/lexus-rx350-1.jpg", "/uploads/lexus-rx350-2.jpg",
    "/uploads/lexus-rx350-3.jpg", "/uploads/lexus-rx350-4.jpg", "/uploads/lexus-rx350-5.jpg",
    "/uploads/lexus-rx350-6.jpg", "/uploads/lexus-rx350-7.jpg", "/uploads/lexus-rx350-8.jpg",
    "/uploads/lexus-rx350-9.jpg",
  ],
  "Hyundai_Ioniq 5": [
    "/uploads/hyundai-ioniq5-0.jpg", "/uploads/hyundai-ioniq5-1.jpg", "/uploads/hyundai-ioniq5-2.jpg",
    "/uploads/hyundai-ioniq5-3.jpg", "/uploads/hyundai-ioniq5-4.jpg", "/uploads/hyundai-ioniq5-5.jpg",
    "/uploads/hyundai-ioniq5-6.jpg", "/uploads/hyundai-ioniq5-7.jpg", "/uploads/hyundai-ioniq5-8.jpg",
    "/uploads/hyundai-ioniq5-9.jpg",
  ],
  "Kia_EV6": [
    "/uploads/kia-ev6-0.jpg", "/uploads/kia-ev6-1.jpg", "/uploads/kia-ev6-2.jpg",
    "/uploads/kia-ev6-3.jpg", "/uploads/kia-ev6-4.jpg", "/uploads/kia-ev6-5.jpg",
    "/uploads/kia-ev6-6.jpg", "/uploads/kia-ev6-7.jpg", "/uploads/kia-ev6-8.jpg",
    "/uploads/kia-ev6-9.jpg",
  ],
  "Mazda_CX-5": [
    "/uploads/mazda-cx5-0.jpg", "/uploads/mazda-cx5-1.jpg", "/uploads/mazda-cx5-2.jpg",
    "/uploads/mazda-cx5-3.jpg", "/uploads/mazda-cx5-4.jpg", "/uploads/mazda-cx5-5.jpg",
    "/uploads/mazda-cx5-6.jpg", "/uploads/mazda-cx5-7.jpg", "/uploads/mazda-cx5-8.jpg",
    "/uploads/mazda-cx5-9.jpg",
  ],
  "Volkswagen_Golf GTI": [
    "/uploads/volkswagen-golf-0.jpg", "/uploads/volkswagen-golf-1.jpg", "/uploads/volkswagen-golf-2.jpg",
    "/uploads/volkswagen-golf-3.jpg", "/uploads/volkswagen-golf-4.jpg", "/uploads/volkswagen-golf-5.jpg",
    "/uploads/volkswagen-golf-6.jpg", "/uploads/volkswagen-golf-7.jpg", "/uploads/volkswagen-golf-8.jpg",
    "/uploads/volkswagen-golf-9.jpg",
  ],
};

function getCarImages(brand: string, model: string): string[] {
  const key = `${brand}_${model}`;
  return CAR_SPECIFIC_IMAGES[key] ?? SAMPLE_IMAGES;
}

const OWNERSHIP = ["1st Owner", "2nd Owner", "3rd Owner", "4th+ Owner"];
const STATES = [
  "Maharashtra",
  "Karnataka",
  "Delhi",
  "Tamil Nadu",
  "Telangana",
  "Gujarat",
  "West Bengal",
  "Haryana",
];
const CITIES = [
  "Mumbai",
  "Bengaluru",
  "New Delhi",
  "Chennai",
  "Hyderabad",
  "Ahmedabad",
  "Kolkata",
  "Gurugram",
  "Pune",
  "Noida",
];

const SELLERS = [
  "Aarav Sharma",
  "Priya Patel",
  "Rohan Mehta",
  "Sneha Iyer",
  "Vikram Singh",
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const CARS = [
  {
    brand: "Tesla",
    model: "Model 3",
    variant: "Long Range AWD",
    year: 2022,
    fuelType: "Electric",
    transmission: "Automatic",
    expectedPrice: 4850000,
    bodyType: "Sedan",
  },
  {
    brand: "BMW",
    model: "M340i",
    variant: "xDrive",
    year: 2021,
    fuelType: "Petrol",
    transmission: "Automatic",
    expectedPrice: 5290000,
    bodyType: "Sedan",
  },
  {
    brand: "Porsche",
    model: "Macan",
    variant: "S",
    year: 2020,
    fuelType: "Petrol",
    transmission: "DCT",
    expectedPrice: 6890000,
    bodyType: "SUV",
  },
  {
    brand: "Mercedes-Benz",
    model: "C300",
    variant: "AMG Line",
    year: 2022,
    fuelType: "Petrol",
    transmission: "Automatic",
    expectedPrice: 4990000,
    bodyType: "Sedan",
  },
  {
    brand: "Audi",
    model: "Q5",
    variant: "45 TFSI Premium",
    year: 2021,
    fuelType: "Petrol",
    transmission: "DCT",
    expectedPrice: 4650000,
    bodyType: "SUV",
  },
  {
    brand: "Toyota",
    model: "Camry",
    variant: "XSE Hybrid",
    year: 2023,
    fuelType: "Hybrid",
    transmission: "CVT",
    expectedPrice: 3890000,
    bodyType: "Sedan",
  },
  {
    brand: "Honda",
    model: "Civic",
    variant: "Sport Touring",
    year: 2022,
    fuelType: "Petrol",
    transmission: "CVT",
    expectedPrice: 1850000,
    bodyType: "Hatchback",
  },
  {
    brand: "Polestar",
    model: "2",
    variant: "Long Range Dual",
    year: 2022,
    fuelType: "Electric",
    transmission: "Automatic",
    expectedPrice: 5290000,
    bodyType: "Sedan",
  },
  {
    brand: "Volvo",
    model: "XC60",
    variant: "T8 Recharge",
    year: 2021,
    fuelType: "Hybrid",
    transmission: "Automatic",
    expectedPrice: 5490000,
    bodyType: "SUV",
  },
  {
    brand: "Lexus",
    model: "RX 350",
    variant: "F Sport",
    year: 2020,
    fuelType: "Petrol",
    transmission: "Automatic",
    expectedPrice: 5290000,
    bodyType: "SUV",
  },
  {
    brand: "Hyundai",
    model: "Ioniq 5",
    variant: "Limited AWD",
    year: 2023,
    fuelType: "Electric",
    transmission: "Automatic",
    expectedPrice: 4490000,
    bodyType: "SUV",
  },
  {
    brand: "Kia",
    model: "EV6",
    variant: "GT-Line AWD",
    year: 2022,
    fuelType: "Electric",
    transmission: "Automatic",
    expectedPrice: 4190000,
    bodyType: "SUV",
  },
  {
    brand: "Mazda",
    model: "CX-5",
    variant: "Signature Turbo",
    year: 2021,
    fuelType: "Petrol",
    transmission: "Automatic",
    expectedPrice: 2290000,
    bodyType: "SUV",
  },
  {
    brand: "Volkswagen",
    model: "Golf GTI",
    variant: "Autobahn",
    year: 2022,
    fuelType: "Petrol",
    transmission: "DCT",
    expectedPrice: 2890000,
    bodyType: "Hatchback",
  },
];

export function seed() {
  const db = getDb();

  const count = db.prepare("SELECT COUNT(*) as c FROM listings").get() as {
    c: number;
  };
  if (count.c > 0) return; // already seeded

  // ── Seed admin and agent users ──
  const adminHash = bcrypt.hashSync("admin", 10);
  db.prepare(
    "INSERT OR IGNORE INTO users (id, name, email, phone, role, password) VALUES (?, ?, ?, ?, ?, ?)",
  ).run("admin-1", "Admin", "admin@drivehub.io", null, "admin", adminHash);

  const agentHash = bcrypt.hashSync("agent", 10);
  db.prepare(
    "INSERT OR IGNORE INTO users (id, name, email, phone, role, password) VALUES (?, ?, ?, ?, ?, ?)",
  ).run("agent-1", "Agent Priya", "agent@drivehub.io", null, "agent", agentHash);

  // ── Seed listings ──
  const insertListing = db.prepare(`
    INSERT INTO listings (id, sellerId, sellerName, sellerEmail, sellerPhone, brand, model, variant,
      year, registrationYear, fuelType, transmission, kmDriven, ownership, registrationState,
      registrationCity, vin, insuranceStatus, roadTaxStatus, serviceHistory, accidentHistory,
      keys, exteriorCondition, interiorCondition, engineCondition, tireCondition, batteryCondition,
      defects, modifications, description, expectedPrice, address, preferredContactTime, bodyType,
      images, status, pricing, createdAt, views, featured)
    VALUES (@id, @sellerId, @sellerName, @sellerEmail, @sellerPhone, @brand, @model, @variant,
      @year, @registrationYear, @fuelType, @transmission, @kmDriven, @ownership, @registrationState,
      @registrationCity, @vin, @insuranceStatus, @roadTaxStatus, @serviceHistory, @accidentHistory,
      @keys, @exteriorCondition, @interiorCondition, @engineCondition, @tireCondition, @batteryCondition,
      @defects, @modifications, @description, @expectedPrice, @address, @preferredContactTime, @bodyType,
      @images, @status, @pricing, @createdAt, @views, @featured)
  `);

  const seedListings = db.transaction(() => {
    CARS.forEach((c, i) => {
      const expectedPrice = c.expectedPrice;
      const refurb = Math.round(expectedPrice * 0.04);
      const repair = Math.round(expectedPrice * 0.02);
      const transport = 35000;
      const inspection = 18000;
      const documentation = 12000;
      const commission = Math.round(expectedPrice * 0.05);
      const margin = Math.round(expectedPrice * 0.08);
      const finalPrice =
        expectedPrice +
        refurb +
        repair +
        transport +
        inspection +
        documentation +
        commission +
        margin;

      const startIdx = i % SAMPLE_IMAGES.length;
      const specificImages = getCarImages(c.brand, c.model);
      const images = [
        ...specificImages,
        ...SAMPLE_IMAGES,
      ].slice(0, 10);

      const status =
        i < 8
          ? "listed"
          : i < 11
            ? "approved"
            : i < 13
              ? "pending_review"
              : "under_inspection";

      const pricing =
        i < 8
          ? {
              basePrice: expectedPrice,
              refurbishment: refurb,
              repair,
              transportation: transport,
              inspection,
              documentation,
              commission,
              margin,
              finalPrice,
            }
          : null;

      insertListing.run({
        id: `seed-${i + 1}`,
        sellerId: `seed-seller-${i + 1}`,
        sellerName: SELLERS[i % 5],
        sellerEmail: `seller${i + 1}@example.in`,
        sellerPhone: `+91 98${(2000000 + i * 137)
          .toString()
          .slice(0, 8)}`,
        brand: c.brand,
        model: c.model,
        variant: c.variant,
        year: c.year,
        registrationYear: c.year,
        fuelType: c.fuelType,
        transmission: c.transmission,
        kmDriven: randInt(8000, 75000),
        ownership: rand(OWNERSHIP),
        registrationState: rand(STATES),
        registrationCity: rand(CITIES),
        vin: `VIN${(1000000 + i * 37).toString().padStart(11, "0")}`,
        insuranceStatus: rand(["Active", "Expired", "Expires soon"]),
        roadTaxStatus: "Paid",
        serviceHistory: rand([
          "Complete dealer history",
          "Partial records",
          "Owner serviced",
        ]),
        accidentHistory: rand([
          "No accidents",
          "Minor — repaired",
          "None reported",
        ]),
        keys: rand([1, 2, 2, 2, 3]),
        exteriorCondition: rand(["Excellent", "Very Good", "Good"]),
        interiorCondition: rand(["Excellent", "Very Good", "Good"]),
        engineCondition: rand(["Excellent", "Very Good"]),
        tireCondition: rand(["New (90%+)", "Good (70%+)", "Fair (50%+)"]),
        batteryCondition: rand(["Excellent", "Good"]),
        defects:
          "Minor cosmetic wear on driver-side bolster. Small stone chip on hood.",
        modifications: "None — fully stock",
        description: `Well-maintained ${c.brand} ${c.model} ${c.variant}. Single-family ownership, garage-kept, all service records available.`,
        expectedPrice,
        address: "123 Market Street",
        preferredContactTime: rand([
          "Morning (9-12)",
          "Afternoon (12-5)",
          "Evening (5-8)",
        ]),
        bodyType: c.bodyType,
        images: JSON.stringify(images),
        status,
        pricing: pricing ? JSON.stringify(pricing) : null,
        createdAt: Date.now() - (i + 1) * 86400000,
        views: randInt(120, 2200),
        featured: i < 4 ? 1 : 0,
      });
    });
  });

  // ── Seed tickets ──
  const insertTicket = db.prepare(`
    INSERT INTO tickets (id, name, email, subject, category, message, status, createdAt)
    VALUES (@id, @name, @email, @subject, @category, @message, @status, @createdAt)
  `);

  const seedTickets = db.transaction(() => {
    const tickets = [
      {
        id: "t-1",
        name: "John Lee",
        email: "john@example.com",
        subject: "Financing options for Tesla Model 3",
        category: "Financing",
        message: "Hi, what are the EMI options?",
        status: "open",
        createdAt: Date.now() - 86400000,
      },
      {
        id: "t-2",
        name: "Maria Gomez",
        email: "maria@example.com",
        subject: "Inspection report missing",
        category: "Inspection",
        message: "Can you share the full report?",
        status: "in_progress",
        createdAt: Date.now() - 2 * 86400000,
      },
      {
        id: "t-3",
        name: "Sam Patel",
        email: "sam@example.com",
        subject: "Refund status",
        category: "Purchase",
        message: "Awaiting refund update.",
        status: "waiting_customer",
        createdAt: Date.now() - 4 * 86400000,
      },
      {
        id: "t-4",
        name: "Aisha Khan",
        email: "aisha@example.com",
        subject: "Doc upload error",
        category: "Support",
        message: "Can't upload PDF.",
        status: "resolved",
        createdAt: Date.now() - 7 * 86400000,
      },
    ];
    for (const t of tickets) {
      insertTicket.run(t);
    }
  });

  // ── Seed offers ──
  const insertOffer = db.prepare(`
    INSERT INTO offers (id, listingId, buyerName, amount, message, state, counterAmount, createdAt)
    VALUES (@id, @listingId, @buyerName, @amount, @message, @state, @counterAmount, @createdAt)
  `);

  const seedOffers = db.transaction(() => {
    const offers = [
      {
        id: "o-1",
        listingId: "seed-1",
        buyerName: "Arjun Kapoor",
        amount: 4750000,
        message: "Cash, can pick up this weekend.",
        state: "pending",
        counterAmount: null,
        createdAt: Date.now() - 3 * 3600000,
      },
      {
        id: "o-2",
        listingId: "seed-1",
        buyerName: "Riya N.",
        amount: 4680000,
        message: "Trade-in available.",
        state: "countered",
        counterAmount: 4720000,
        createdAt: Date.now() - 86400000,
      },
    ];
    for (const o of offers) {
      insertOffer.run(o);
    }
  });

  // ── Seed reviews ──
  const REVIEW_AUTHORS = [
    "Aditya R.",
    "Megha S.",
    "Karthik V.",
    "Neha G.",
    "Rahul D.",
    "Pooja M.",
  ];
  const REVIEW_TITLES = [
    "Excellent condition, as described",
    "Smooth buying experience",
    "Great value for money",
    "Worth every rupee",
    "Highly recommend DriveHub",
  ];
  const REVIEW_BODIES = [
    "The 200-point inspection was spot on. Car felt brand new. Paperwork was seamless.",
    "Test drive was easy to book and the advisor was transparent about every detail.",
    "Pricing was fair and the financing options were clearly explained. No hidden charges.",
    "Refurbishment quality is top-notch. Couldn't find a single issue during delivery.",
    "From browsing to delivery, the whole process took 4 days. Very impressed.",
  ];

  const insertReview = db.prepare(`
    INSERT INTO reviews (id, listingId, userId, name, rating, title, body, createdAt)
    VALUES (@id, @listingId, @userId, @name, @rating, @title, @body, @createdAt)
  `);

  const seedReviews = db.transaction(() => {
    for (let idx = 0; idx < 8; idx++) {
      const listingId = `seed-${idx + 1}`;
      const count = (idx % 3) + 1;
      for (let i = 0; i < count; i++) {
        insertReview.run({
          id: `sr-${listingId}-${i}`,
          listingId,
          userId: `seed-reviewer-${idx}-${i}`,
          name: REVIEW_AUTHORS[(idx + i) % REVIEW_AUTHORS.length],
          rating: 4 + ((idx + i) % 2),
          title: REVIEW_TITLES[(idx + i) % REVIEW_TITLES.length],
          body: REVIEW_BODIES[(idx + i) % REVIEW_BODIES.length],
          createdAt: Date.now() - (i + 1) * 86400000 * (idx + 1),
        });
      }
    }
  });

  seedListings();
  seedTickets();
  seedOffers();
  seedReviews();

  console.log("✅ Database seeded: admin, agent, 14 cars, tickets, offers, reviews");
}

// Run directly via: npx tsx server/seed.ts
// Uses process.argv to check if this file is the main entry point
const isMain = process.argv[1] &&
  (process.argv[1].endsWith("/seed.ts") || process.argv[1].endsWith("\\seed.ts"));
if (isMain) {
  console.log("Seeding database...");
  seed();
  console.log("Seed complete.");
}
