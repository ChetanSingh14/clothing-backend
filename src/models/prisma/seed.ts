import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Start seeding...");

  // 1. Clean existing data
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Admin User
  const adminPasswordHash = await bcrypt.hash("Password123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Flowbox Admin",
      email: "admin@flowbox.com",
      password: adminPasswordHash,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // 3. Create Regular User
  const userPasswordHash = await bcrypt.hash("Password123", 10);
  const regularUser = await prisma.user.create({
    data: {
      name: "Jane Doe",
      email: "jane@flowbox.com",
      password: userPasswordHash,
      role: "USER",
    },
  });
  console.log(`✅ Regular user created: ${regularUser.email}`);

  // 4. Seed Products
  const productsData = [
    {
      title: "Trendy Brown Coat",
      description: "A signature double-breasted trench coat tailored from pure virgin wool, complete with an elegant tie belt, deep slant pockets, and subtle buttoned cuffs. Perfect for layering over winter outfits.",
      price: 75.0,
      category: "Coats",
      images: [
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop"
      ],
      colors: ["#8B5A2B", "#4A3B32", "#A0522D"],
      sizes: ["S", "M", "L", "XL", "XXL"],
      rating: 4.8,
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Absolutely love it! The wool feels extremely high quality and it fits like a glove.",
            userName: "Sarah Jenkins"
          },
          {
            rating: 4,
            comment: "Very cozy coat, keep in mind it runs slightly large. I had to size down.",
            userName: "Emily Watson"
          }
        ]
      }
    },
    {
      title: "Minimal Purple Hoodie",
      description: "Premium oversized fleece hoodie with structured shoulder drops and double-stitched hood overlays. Features deep front cargo pockets and styled drawstrings.",
      price: 120.0,
      category: "Hoodies",
      images: [
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=600&auto=format&fit=crop"
      ],
      colors: ["#7D5A8C", "#4B2840", "#C2B29B"],
      sizes: ["S", "M", "L"],
      rating: 4.9,
      reviews: {
        create: [
          {
            rating: 5,
            comment: "This is the best hoodie I have ever owned. Color is exactly like the rack photo!",
            userName: "Mark Peterson"
          }
        ]
      }
    },
    {
      title: "Urban Knit Sneakers",
      description: "Part of our New Spring Collection, these active sneakers feature lightweight mesh panels, adaptive arch-support footbeds, and custom-molded high-traction soles.",
      price: 95.0,
      category: "Sneakers",
      images: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop"
      ],
      colors: ["#FFFFFF", "#E5DCC5", "#111111"],
      sizes: ["7", "8", "9", "10", "11"],
      rating: 4.7,
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Walked 10 miles in these the first day, zero issues. Super responsive foam!",
            userName: "David Cole"
          },
          {
            rating: 4,
            comment: "Looks great with beige utility pants. Highly recommend.",
            userName: "Lucas Bennett"
          }
        ]
      }
    },
    {
      title: "Premium Beige Sweater",
      description: "Fine-knit crewneck sweater knit from a luxury blend of cashmere and organic cotton. Designed with flatlock seams and rib-knit cuffs for clean structures.",
      price: 85.0,
      category: "Sweaters",
      images: [
        "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?q=80&w=600&auto=format&fit=crop"
      ],
      colors: ["#E6DFD3", "#D2B48C"],
      sizes: ["S", "M", "L", "XL"],
      rating: 4.6,
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Softest cashmere sweater I own. Kept its shape after three washes.",
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
