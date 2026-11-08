import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_URL = (process.env.API_URL ?? "http://localhost:4000/api/v1").replace(/\/+$/, "");
const SESSION_MAX_AGE = 30 * 60; // 30 minutes
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "corpus.session-token";

/**
 * NextAuth configuration.
 *
 * There is exactly one enabled provider today: `local`. The Credentials
 * provider does not touch a database directly — it delegates the password
 * check to the Express API, which owns the User table and uses bcrypt.
 *
 * The session is a JWT stored in an HTTP-only cookie. `maxAge` is 30 minutes
 * and `updateAge` is 60 seconds, so an active user's cookie is refreshed while
 * they work, but an idle session expires after 30 minutes. The client-side
 * SessionRefresher also refreshes the cookie every 20 minutes.
 *
 * Adding Google later:
 *   1. Install nothing extra; next-auth ships the provider.
 *   2. import Google from "next-auth/providers/google";
 *   3. Add it to `providers` with GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
 *   4. Add a callback that links the Google account to a row in the Express
 *      User table with provider: "google" (the schema already supports it).
 *   5. Keep the same `jwt`/`session` callbacks so roles still flow through.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 60,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  cookies: {
    sessionToken: {
      name: COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "local",
      name: "Local account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          cache: "no-store",
        });

        if (!response.ok) return null;

        const payload = await response.json();
        const user = payload?.data;

        if (!user?.id) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          username: user.username,
          role: user.role,
          provider: user.provider,
        };
      },
    }),
    // Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username ?? user.name;
        token.role = user.role ?? "contributor";
        token.provider = user.provider ?? "local";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub;
        session.user.username = token.username;
        session.user.role = token.role ?? "contributor";
        session.user.provider = token.provider ?? "local";
      }
      return session;
    },
  },
});
