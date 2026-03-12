import { db } from '@/src/db';
import { usersTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  return user ?? null;
}

/** Devuelve el usuario existente o crea uno nuevo con los datos de Clerk. */
export async function getOrCreateUserByEmail(params: {
  email: string;
  name: string;
}) {
  const existing = await getUserByEmail(params.email);
  if (existing) return existing;

  const [created] = await db
    .insert(usersTable)
    .values({ email: params.email, name: params.name })
    .returning();
  return created;
}
