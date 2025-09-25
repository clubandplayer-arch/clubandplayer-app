// lib/data/views.ts
import { SavedView } from '@/lib/types/views';

let MOCK: SavedView[] = []; // in-memory

export const ViewsRepo = {
  async list(scope: SavedView['scope']): Promise<SavedView[]> {
    // TODO: sostituire con query DB
    return MOCK.filter((v) => v.scope === scope);
  },

  async create(view: Omit<SavedView, 'id' | 'createdAt'>): Promise<SavedView> {
    // TODO: sostituire con insert DB
    const newView: SavedView = {
      ...view,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    MOCK.push(newView);
    return newView;
  },

  async remove(id: string): Promise<void> {
    // TODO: sostituire con delete DB
    MOCK = MOCK.filter((v) => v.id !== id);
  },
};
