import prisma from "./common/config/prisma.config";

async function main() {
  const product = await prisma.product.create({
    data: {
      title: "Couple Streetwear Hoodie Set",
      description: "Cozy matching couple streetwear hoodie set. Heavyweight cotton with aesthetic drop shoulders.",
      price: 1499.0,
      category: "Couple",
      images: [
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop", // Primary
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop#color=%23000000",
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=600&auto=format&fit=crop#color=%23000000",
        "https://images.unsplash.com/photo-1596755094514-f87e32f6b717?q=80&w=600&auto=format&fit=crop#color=%23000000",
        "https://images.unsplash.com/photo-1588117260148-b47818741c74?q=80&w=600&auto=format&fit=crop#color=%23000000",
        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=600&auto=format&fit=crop#color=%23000000"
      ],
      colors: ["#000000"],
      sizes: ["S", "M", "L", "XL"],
      rating: 5.0
    }
  });
  console.log("✅ Seeded Couple category product:", product);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
