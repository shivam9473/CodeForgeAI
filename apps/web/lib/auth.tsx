"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Front-end only accounts. CodeForge's API has no user system yet, so accounts live in this
// browser's localStorage and passwords are stored as salted SHA-256 hashes. Replace signUp,
// signIn and signOut with real API calls when the backend gains auth.

type User = { name: string; email: string };
type StoredUser = User & { salt: string; hash: string };

type AuthValue = {
  user: User | null;
  ready: boolean;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => void;
};

const USERS_KEY = "codeforge.users";
const SESSION_KEY = "codeforge.session";

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("This browser blocks secure hashing here. Open the app on localhost or HTTPS.");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
  return toHex(new Uint8Array(digest));
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Read the session after mount so server and client markup match.
  useEffect(() => {
    try {
      const email = localStorage.getItem(SESSION_KEY);
      const found = email ? readUsers().find((u) => u.email === email) : undefined;
      if (found) setUser({ name: found.name, email: found.email });
    } catch {
      /* storage blocked: stay logged out */
    }
    setReady(true);
  }, []);

  const signUp = useCallback<AuthValue["signUp"]>(async ({ name, email, password }) => {
    const normalized = email.trim().toLowerCase();
    const users = readUsers();
    if (users.some((u) => u.email === normalized)) {
      throw new Error("An account with this email already exists. Log in instead.");
    }
    const salt = toHex(crypto.getRandomValues(new Uint8Array(12)));
    const record: StoredUser = { name: name.trim(), email: normalized, salt, hash: await hashPassword(password, salt) };
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, record]));
    localStorage.setItem(SESSION_KEY, normalized);
    setUser({ name: record.name, email: record.email });
  }, []);

  const signIn = useCallback<AuthValue["signIn"]>(async ({ email, password }) => {
    const normalized = email.trim().toLowerCase();
    const record = readUsers().find((u) => u.email === normalized);
    const attempt = record ? await hashPassword(password, record.salt) : "";
    if (!record || attempt !== record.hash) throw new Error("Email or password is incorrect.");
    localStorage.setItem(SESSION_KEY, normalized);
    setUser({ name: record.name, email: record.email });
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, signUp, signIn, signOut }), [user, ready, signUp, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
