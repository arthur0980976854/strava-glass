import { ensureSchema, getDb } from "./turso.server";

/**
 * Comptes email / mot de passe stockés dans Turso.
 * L'identifiant du compte sert directement de session id (cookie plans_sid),
 * si bien que l'état de l'app et les tokens intervals.icu sont scopés au compte.
 */

export type User = { id: string; email: string; created_at: number };

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a.buffer);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function signUp(email: string, password: string): Promise<User> {
  await ensureSchema();
  const mail = normalizeEmail(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw new Error("Adresse e-mail invalide.");
  if (password.length < 8) throw new Error("Le mot de passe doit faire au moins 8 caractères.");

  const existing = await getDb().execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [mail],
  });
  if (existing.rows[0]) throw new Error("Un compte existe déjà avec cette adresse.");

  const id = crypto.randomUUID();
  const salt = randomHex(16);
  const hash = await pbkdf2(password, salt);
  const now = Date.now();
  await getDb().execute({
    sql: "INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [id, mail, hash, salt, now],
  });
  return { id, email: mail, created_at: now };
}

export async function signIn(email: string, password: string): Promise<User> {
  await ensureSchema();
  const mail = normalizeEmail(email);
  const rs = await getDb().execute({
    sql: "SELECT id, email, password_hash, salt, created_at FROM users WHERE email = ?",
    args: [mail],
  });
  const row = rs.rows[0];
  if (!row) throw new Error("E-mail ou mot de passe incorrect.");
  const hash = await pbkdf2(password, String(row["salt"]));
  if (hash !== String(row["password_hash"])) throw new Error("E-mail ou mot de passe incorrect.");
  return { id: String(row["id"]), email: String(row["email"]), created_at: Number(row["created_at"]) };
}

export async function findUserById(id: string): Promise<User | null> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: "SELECT id, email, created_at FROM users WHERE id = ?",
    args: [id],
  });
  const row = rs.rows[0];
  if (!row) return null;
  return { id: String(row["id"]), email: String(row["email"]), created_at: Number(row["created_at"]) };
}
