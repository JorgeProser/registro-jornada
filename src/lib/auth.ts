import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      name: string;
      role: Role;
      companyId: string;
      companyName: string;
    };
  }
  interface User {
    username: string;
    role: Role;
    companyId: string;
    companyName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    companyId: string;
    companyName: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username.toUpperCase().trim() },
          select: {
            id: true,
            username: true,
            name: true,
            surname: true,
            role: true,
            companyId: true,
            passwordHash: true,
            deletedAt: true,
          },
        });

        if (!user || user.deletedAt) return null;
        if (!user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        const company = await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { name: true },
        });

        return {
          id: user.id,
          username: user.username,
          name: `${user.name} ${user.surname}`,
          role: user.role,
          companyId: user.companyId,
          companyName: company?.name ?? "",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.role = token.role;
      session.user.companyId = token.companyId;
      session.user.companyName = token.companyName;
      return session;
    },
  },
};
