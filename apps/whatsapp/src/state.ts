import type { Expense } from "@ej-ledger/core";

export type ConversationState =
  | { kind: "awaiting-confirmation"; expense: Expense }
  | { kind: "awaiting-receipt"; expense: Expense };

export class SessionStore {
  private readonly sessions = new Map<string, { expiresAt: number; state: ConversationState }>();

  constructor(private readonly ttlMs = 15 * 60_000, private readonly now = () => Date.now()) {}

  get(sender: string): ConversationState | undefined {
    const session = this.sessions.get(sender);
    if (!session) return undefined;
    if (session.expiresAt <= this.now()) {
      this.sessions.delete(sender);
      return undefined;
    }
    return session.state;
  }

  set(sender: string, state: ConversationState): void {
    this.sessions.set(sender, { state, expiresAt: this.now() + this.ttlMs });
  }

  clear(sender: string): void {
    this.sessions.delete(sender);
  }
}
