/**
 * Event bus minimale con export 'broadcast' compatibile col webhook.
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

/** helper compatibile con `import { broadcast } from "@/lib/server/events"` */
export function broadcast(event: string, data: unknown): void {
  eventsBus.publish(event, data);
}
