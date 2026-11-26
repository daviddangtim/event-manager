import { db } from '../config/db.ts';
import { users, gates } from '../db/schema.ts';
import bcrypt from 'bcrypt';

const password = 'password123'
const email = 'usher1@event.com'
const fullName = 'Somto Chukwu'

async function seed() {
  await db.insert(gates).values({ id: 1, name: 'Main Gate' }).onConflictDoNothing();
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    fullName: fullName,
    email: email,
    passwordHash,
    role: 'usher',
  }).onConflictDoNothing();
  console.log(`Seeded successfully! Login with ${email} / ${password}`);
  process.exit(0);
}
seed();