import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { findUserByEmail, findOrCreateGoogleUser } from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please provide email and password');
        }

        const user = await findUserByEmail(credentials.email);
        if (!user) {
          throw new Error('No account found with this email');
        }

        if (!user.password) {
          throw new Error('This account uses Google sign-in. Please use the Google button.');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Find or create the user in MongoDB
        const dbUser = await findOrCreateGoogleUser({
          email: user.email!,
          name: user.name || user.email!.split('@')[0],
          image: user.image || undefined,
        });
        // Attach MongoDB fields to the user object for the jwt callback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user as any).role = dbUser.role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user as any).id = dbUser._id.toString();
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, copy user fields into the token
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role as string | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.id = (user as any).id as string;
      }
      // Allow client-side session updates (e.g. after role selection)
      if (trigger === 'update' && session) {
        token.role = session.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).id = token.id;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
  },

  secret: process.env.NEXTAUTH_SECRET || 'insight-advanced-retrieval-secret-key-2024',
};
