import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Start seeding...");

  // 1. Clean existing data
  await prisma.settings.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Default Brand Settings
  const brandSettings = await prisma.settings.create({
    data: {
      id: 1,
      companyName: "MDFK CLOTHING CO.",
      logoUrl: "/logo.jpg",
    },
  });
  console.log(`✅ Default Brand Settings seeded: ${brandSettings.companyName}`);

  // 3. Create Admin User
  const adminPasswordHash = await bcrypt.hash("Password123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "MDFK Admin",
      email: "admin@mdfkclothing.com",
      password: adminPasswordHash,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // 4. Create Regular User
  const userPasswordHash = await bcrypt.hash("Password123", 10);
  const regularUser = await prisma.user.create({
    data: {
      name: "Jane Doe",
      email: "jane@mdfkclothing.com",
      password: userPasswordHash,
      role: "USER",
    },
  });
  console.log(`✅ Regular user created: ${regularUser.email}`);

  // 5. Seed Graphic T-Shirts Products
  const productsData = [
    {
      title: "Cyberpunk Printed Tee",
      description: "Oversized fit streetwear graphic tee screen-printed on heavy 260GSM pre-shrunk carded cotton. Features double-needle tailored hems and a ribbed drop-shoulder collar frame. Dynamic cyber-art neon chest graphics.",
      price: 35.0,
      category: "T-Shirts",
      images: [
        "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop"
      ],
      colors: ["#111111", "#FFFFFF", "#4B2840"],
      sizes: ["S", "M", "L", "XL", "XXL"],
      rating: 4.9,
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Best oversized tee I own. Heavyweight fabric holds its boxy structure perfectly.",
            userName: "Mark Peterson"
          },
          {
            rating: 4,
            comment: "Printed graphics are high res. Survived three washes without crack lines.",
            userName: "Sarah Jenkins"
          }
        ]
      }
    },
    {
      title: "Acid Wash Street Tee",
      description: "Vintage wash effect cotton jersey printed tee with custom spray-paint style typography graphic across the shoulders. Heavy cotton texture with premium distressed detailing.",
      price: 39.0,
      category: "T-Shirts",
      images: [
        "https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop"
      ],
      colors: ["#4A3B32", "#8B5A2B"],
      sizes: ["S", "M", "L", "XL"],
      rating: 4.8,
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Dope vintage wash finish. Fits exactly how a streetwear tee should.",
            userName: "Lucas Bennett"
          }
        ]
      }
    },
    {
      title: "Aesthetic Gothic Hoodie",
      description: "Heavyweight brushed fleece hoodie with cyber-gothic typography sleeve prints. Double-lined hood, thick ribbing cuffs, and roomy kangaroo storage pocket.",
      price: 58.0,
      category: "Hoodies",
      images: [
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=600&auto=format&fit=crop"
      ],
      colors: ["#111111", "#7D5A8C"],
      sizes: ["S", "M", "L", "XL"],
      rating: 4.7,
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Thick hood details and cozy interior. Ideal for fall street fits.",
            userName: "David Cole"
          }
        ]
      }
    },
    {
      title: "Retro Arcade Oversized Tee",
      description: "Boxy drop-shoulder streetwear tee made of 100% combed ringspun cotton. Featuring pixelated retro console chest prints and classic aesthetic tags.",
      price: 34.0,
      category: "T-Shirts",
      images: [
        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop"
      ],
      colors: ["#FFFFFF", "#111111"],
      sizes: ["M", "L", "XL"],
      rating: 4.6,
      reviews: {
        create: [
          {
            rating: 4,
            comment: "Comfortable material, bright colors print. Fast shipping.",
            userName: "Oliver Hayes"
          }
        ]
      }
    }
  ];

  for (const item of productsData) {
    const createdProduct = await prisma.product.create({
      data: item,
      include: { reviews: true }
    });
    console.log(`✅ Product created: ${createdProduct.title} with ${createdProduct.reviews.length} reviews.`);
  }

  console.log("🌱 Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
