import { getDb } from '@/lib/mongodb';
import type { WithId, Document } from 'mongodb';

export type UserRole = 'user' | 'recruiter';

export interface UserDoc {
  email: string;
  name: string;
  password?: string; // hashed — absent for OAuth-only users
  role: UserRole | null; // null means role not yet selected (Google OAuth first sign-in)
  provider: 'credentials' | 'google';
  image?: string;
  createdAt: Date;
}

export type UserDocument = WithId<UserDoc> & Document;

async function usersCollection() {
  const db = await getDb();
  return db.collection<UserDoc>('users');
}

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  const col = await usersCollection();
  return col.findOne({ email: email.toLowerCase() }) as Promise<UserDocument | null>;
}

export async function createUser(data: Omit<UserDoc, 'createdAt'>): Promise<UserDocument> {
  const col = await usersCollection();
  const doc: UserDoc = {
    ...data,
    email: data.email.toLowerCase(),
    createdAt: new Date(),
  };
  const result = await col.insertOne(doc);
  return { ...doc, _id: result.insertedId } as UserDocument;
}

export async function findOrCreateGoogleUser(profile: {
  email: string;
  name: string;
  image?: string;
}): Promise<UserDocument> {
  const existing = await findUserByEmail(profile.email);
  if (existing) return existing;

  return createUser({
    email: profile.email,
    name: profile.name,
    image: profile.image,
    role: null, // will be set in the role-selection step
    provider: 'google',
  });
}

export async function setUserRole(email: string, role: UserRole): Promise<boolean> {
  const col = await usersCollection();
  const result = await col.updateOne(
    { email: email.toLowerCase() },
    { $set: { role } }
  );
  return result.modifiedCount === 1;
}

// Ensure email uniqueness index (called once on startup)
export async function ensureIndexes() {
  const col = await usersCollection();
  await col.createIndex({ email: 1 }, { unique: true });
}
