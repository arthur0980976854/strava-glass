import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * In-memory fake of ./turso.server — enough SQL surface for the account,
 * session-link and per-user state functions in coros.server.ts.
 */

type Row = Record<string, unknown>;
const tables = new Map<string, Map<string, Row>>();

function ensureTable(name: string): Map<string, Row> {
  let t = tables.get(name);
  if (!t) {
    t = new Map();
    tables.set(name, t);
  }
  return t;
}

function sqlInsert(table: string, cols: string[], args: unknown[]): string {
  const key = cols[0] ?? "";
  const row: Row = {};
  cols.forEach((c, i) => {
    row[c] = args[i];
  });
  ensureTable(table).set(String(row[key]), row);
  return key;
}

const fakeDb = {
  async execute({ sql, args }: { sql: string; args?: unknown[] }) {
    const a = args ?? [];
    // Schema bootstrap — ignore.
    if (/CREATE TABLE/i.test(sql)) return { rows: [] };

    // Upsert with ON CONFLICT
    if (/INSERT INTO coros_accounts/i.test(sql)) {
      const cols = (sql.match(/\(([^)]+)\)\s*VALUES/) ?? [])[1]?.split(",").map((s) => s.trim()) ?? [];
      sqlInsert("coros_accounts", cols, a);
      return { rows: [] };
    }
    if (/INSERT INTO session_accounts/i.test(sql)) {
      const cols = (sql.match(/\(([^)]+)\)\s*VALUES/) ?? [])[1]?.split(",").map((s) => s.trim()) ?? [];
      sqlInsert("session_accounts", cols, a);
      return { rows: [] };
    }
    if (/INSERT INTO coros_account_tokens/i.test(sql)) {
      const cols = (sql.match(/\(([^)]+)\)\s*VALUES/) ?? [])[1]?.split(",").map((s) => s.trim()) ?? [];
      sqlInsert("coros_account_tokens", cols, a);
      return { rows: [] };
    }
    if (/INSERT INTO user_state/i.test(sql)) {
      const cols = (sql.match(/\(([^)]+)\)\s*VALUES/) ?? [])[1]?.split(",").map((s) => s.trim()) ?? [];
      sqlInsert("user_state", cols, a);
      return { rows: [] };
    }
    if (/INSERT INTO app_state/i.test(sql)) {
      const cols = (sql.match(/\(([^)]+)\)\s*VALUES/) ?? [])[1]?.split(",").map((s) => s.trim()) ?? [];
      sqlInsert("app_state", cols, a);
      return { rows: [] };
    }

    // SELECTs
    if (/SELECT \* FROM coros_accounts WHERE email/i.test(sql)) {
      const email = String(a[0]);
      return { rows: ensureTable("coros_accounts").has(email) ? [ensureTable("coros_accounts").get(email)!] : [] };
    }
    if (/SELECT email FROM session_accounts WHERE session_id/i.test(sql)) {
      const sid = String(a[0]);
      const row = ensureTable("session_accounts").get(sid);
      return { rows: row ? [{ email: row["email"] }] : [] };
    }
    if (/SELECT t\.access_token/i.test(sql)) {
      const email = String(a[0]);
      const tok = ensureTable("coros_account_tokens").get(email);
      if (!tok) return { rows: [] };
      const acc = ensureTable("coros_accounts").get(email);
      return {
        rows: [
          {
            access_token: tok["access_token"],
            expires_at: tok["expires_at"],
            athlete_name: acc?.["athlete_name"] ?? null,
          },
        ],
      };
    }
    if (/SELECT data FROM user_state WHERE user_id/i.test(sql)) {
      const uid = String(a[0]);
      const row = ensureTable("user_state").get(uid);
      return { rows: row ? [{ data: row["data"] }] : [] };
    }
    if (/SELECT data FROM app_state WHERE session_id/i.test(sql)) {
      const sid = String(a[0]);
      const row = ensureTable("app_state").get(sid);
      return { rows: row ? [{ data: row["data"] }] : [] };
    }

    // DELETEs
    if (/DELETE FROM session_accounts/i.test(sql)) {
      ensureTable("session_accounts").delete(String(a[0]));
      return { rows: [] };
    }
    if (/DELETE FROM coros_account_tokens/i.test(sql)) {
      ensureTable("coros_account_tokens").delete(String(a[0]));
      return { rows: [] };
    }

    return { rows: [] };
  },
  async batch(statements: { sql: string; args?: unknown[] }[]) {
    for (const s of statements) await fakeDb.execute(s);
    return [];
  },
};

vi.mock("./turso.server", () => ({
  ensureSchema: async () => {},
  getDb: () => fakeDb,
}));

import {
  getOrCreateAccount,
  linkSession,
  sessionEmail,
  unlinkSession,
  saveTokens,
  loadTokens,
  loadUserState,
  saveUserState,
  migrateSessionStateToAccount,
} from "./coros.server";

describe("COROS accounts — data follows the account, not the device", () => {
  beforeEach(() => {
    tables.clear();
  });

  it("links a session to an account after login", async () => {
    await saveTokens({
      email: "athlete@coros.com",
      athlete_name: "athlete",
      access_token: "tok-1",
      expires_at: 1_000_000,
    });
    await linkSession("session-A", "athlete@coros.com");

    expect(await sessionEmail("session-A")).toBe("athlete@coros.com");
    expect(await sessionEmail("session-B")).toBeNull(); // other device not linked yet
  });

  it("stores the access token per account (shared across devices)", async () => {
    await saveTokens({
      email: "athlete@coros.com",
      athlete_name: "athlete",
      access_token: "tok-1",
      expires_at: 1_000_000,
    });
    // Device B logs in with the same account → same token store.
    await saveTokens({
      email: "athlete@coros.com",
      athlete_name: "athlete",
      access_token: "tok-2",
      expires_at: 2_000_000,
    });
    const tokens = await loadTokens("athlete@coros.com");
    expect(tokens?.access_token).toBe("tok-2");
    expect(tokens?.athlete_name).toBe("athlete");
  });

  it("two devices connected to the same account share the same planning state", async () => {
    // Device A: login + planning state.
    await linkSession("session-A", "athlete@coros.com");
    await saveUserState("athlete@coros.com", JSON.stringify({ sessions: [{ id: "s1", name: "Séance A" }] }));

    // Device B: login with same account.
    await linkSession("session-B", "athlete@coros.com");
    const state = await loadUserState("athlete@coros.com");

    expect(state).toBe(JSON.stringify({ sessions: [{ id: "s1", name: "Séance A" }] }));
    expect(await sessionEmail("session-B")).toBe("athlete@coros.com");
  });

  it("migrates anonymous session state into the account on first login", async () => {
    // Anonymous work on device A before logging in (state keyed by session id).
    ensureTable("app_state").set("session-A", { session_id: "session-A", data: "local-data" });

    await migrateSessionStateToAccount("session-A", "athlete@coros.com");
    expect(await loadUserState("athlete@coros.com")).toBe("local-data");
  });

  it("does not overwrite existing account state on later login", async () => {
    await saveUserState("athlete@coros.com", "account-data");
    ensureTable("app_state").set("session-B", { session_id: "session-B", data: "local-data" });

    await migrateSessionStateToAccount("session-B", "athlete@coros.com");
    expect(await loadUserState("athlete@coros.com")).toBe("account-data");
  });

  it("unlinking a session keeps the account data intact", async () => {
    await linkSession("session-A", "athlete@coros.com");
    await saveUserState("athlete@coros.com", "account-data");
    await getOrCreateAccount("athlete@coros.com", "athlete");

    await unlinkSession("session-A");
    expect(await sessionEmail("session-A")).toBeNull();
    expect(await loadUserState("athlete@coros.com")).toBe("account-data");
  });
});
