/**
 * Helper minimale per broadcast di eventi in-process.
 * Qui implementiamo un semplice pub/sub basato su Set di writer.
 * In futuro si può sostituire con Redis, Pusher, ecc.
 */

type Writer = (event: string, data: unknown) => void;

class EventBus {
  private subscribers = new Set<Writer>();

  subscribe(writer: Writer): () => void {
    this.subscribers.add(writer);
    return () => this.subscribers.delete(writer);
  }

  publish(event: string, data: unknown): void {
    for (const w of this.subscribers) {
      try {
        w(event, data);
      } catch {
        // non bloccare gli altri subscriber
      }
    }
  }
}

export const eventsBus = new EventBus();
