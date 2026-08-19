/**
 * WeRent Backend — dev seed script (ADR-006: seed is a dev concern).
 * Creates sample products, users, and reviews so the demo works out of the box.
 *
 * Usage: node_modules/.bin/ts-node prisma/seed.ts
 */
import { FitFeedback, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_PRODUCTS = [
  {
    name: 'Kemeja Linen Oversize',
    description: 'Kemeja linen premium dengan potongan oversize, cocok untuk gaya kasual maupun semi-formal.',
    category: 'men',
    price: 85000,
  },
  {
    name: 'Gaun Pesta Satin',
    description: 'Gaun satin elegan untuk acara pesta malam, dengan aksen draperi di bagian pinggang.',
    category: 'women',
    price: 150000,
  },
  {
    name: 'Jaket Denim Vintage',
    description: 'Jaket denim bergaya vintage dengan warna medium wash yang timeless.',
    category: 'unisex',
    price: 120000,
  },
];

const SAMPLE_USERS = [
  { email: 'sinta@example.com', name: 'Sinta Maharani' },
  { email: 'budi@example.com', name: 'Budi Santoso' },
  { email: 'dewi@example.com', name: 'Dewi Lestari' },
  { email: 'andika@example.com', name: 'Andika Pratama' },
  { email: 'rina@example.com', name: 'Rina Wijaya' },
  { email: 'fajar@example.com', name: 'Fajar Nugroho' },
];

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Clean slate (idempotent reseed).
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const products: Prisma.ProductGetPayload<object>[] = [];
  for (const productData of SAMPLE_PRODUCTS) {
    const product = await prisma.product.create({ data: productData });
    products.push(product);
  }

  const users: Prisma.UserGetPayload<object>[] = [];
  for (const userData of SAMPLE_USERS) {
    const user = await prisma.user.create({ data: userData });
    users.push(user);
  }

  // 5 reviews for product[0]: 3 TRUE_TO_SIZE, 1 RUNS_SMALL, 1 RUNS_LARGE.
  const reviewSeeds: Array<Prisma.ReviewUncheckedCreateInput> = [
    {
      productId: products[0].id,
      userId: users[0].id,
      rating: 5,
      title: 'Pas banget!',
      body: 'Ukurannya pas di badan saya, bahan linennya nyaman dipakai seharian.',
      fitFeedback: FitFeedback.TRUE_TO_SIZE,
    },
    {
      productId: products[0].id,
      userId: users[1].id,
      rating: 4,
      title: 'Nyaman dan adem',
      body: 'Bahan adem, modelnya oversize sesuai ekspektasi. Recommended!',
      fitFeedback: FitFeedback.TRUE_TO_SIZE,
    },
    {
      productId: products[0].id,
      userId: users[2].id,
      rating: 3,
      title: 'Sedikit kebesaran',
      body: 'Untuk tinggi 155, potongan ini sedikit kebesaran tapi masih bisa dipakai.',
      fitFeedback: FitFeedback.RUNS_LARGE,
    },
    {
      productId: products[0].id,
      userId: users[3].id,
      rating: 5,
      title: 'Kualitas bagus',
      body: 'Jahitan rapi, warna sesuai foto. Ukuran M pas untuk tinggi 170.',
      fitFeedback: FitFeedback.TRUE_TO_SIZE,
    },
    {
      productId: products[0].id,
      userId: users[4].id,
      rating: 2,
      title: 'Terlalu ketat di bahu',
      body: 'Ukurannya terlalu kecil di bagian bahu untuk postur saya yang lebar.',
      fitFeedback: FitFeedback.RUNS_SMALL,
    },
  ];

  for (const reviewData of reviewSeeds) {
    await prisma.review.create({ data: reviewData });
  }

  console.log(`Seeded ${products.length} products, ${users.length} users, ${reviewSeeds.length} reviews.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
