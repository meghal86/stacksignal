import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  console.log('Testing database connection...');

  try {
    // 1. Create a test User record
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        creditsBalance: 10,
      },
    });
    console.log('✅ Created test user:', user.id);

    // 2. Create a test Analysis linked to it
    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        rawInput: 'Test input',
        topIdeas: { idea1: 'Test Idea 1', idea2: 'Test Idea 2' },
        isPublic: false,
      },
    });
    console.log('✅ Created test analysis:', analysis.id);

    // 3. Delete both records (cleanup)
    await prisma.analysis.delete({
      where: { id: analysis.id },
    });
    console.log('✅ Deleted test analysis');

    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log('✅ Deleted test user');

    console.log('🎉 Database test completed successfully!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
