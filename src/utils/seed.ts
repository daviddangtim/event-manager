import { db } from '../config/db.ts';
import { users, gates } from '../db/schema.ts';
import bcrypt from 'bcrypt';

async function seed() {
  await db.insert(gates).values({ id: 1, name: 'Main Gate' }).onConflictDoNothing();
  const passwordHash = await bcrypt.hash('password123', 10);
  await db.insert(users).values({
    fullName: 'Super Admin',
    email: 'admin@event.com',
    passwordHash,
    role: 'super_admin',
  }).onConflictDoNothing();
  console.log('Seeded successfully! Login with admin@event.com / password123');
  process.exit(0);
}
seed();