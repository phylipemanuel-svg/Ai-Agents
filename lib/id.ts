import { randomUUID, randomBytes } from "crypto";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function newApiKey(): string {
  return `sk_${randomBytes(24).toString("hex")}`;
}
