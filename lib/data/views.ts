// lib/data/views.ts
import { SavedView } from '@/lib/types/views';
import { getSupabaseServerClient } from '@/lib/supabase/server';

let MOCK: SavedView[] = []; // fallback in-memory

async function getClientSafe() {
  try {
    return await getSupabaseServerClient();
  } catch (err) {
    console.error(
      '[ViewsRepo] getSupabaseServerClient failed',
      err
    );
    return null;
  }
}

export const ViewsRepo = {
  async list(scope: SavedView['scope']): Promise<SavedView[]> {
    const supabase = await getClientSafe();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('views')
          .select('*')
          .eq('scope', scope)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Si assume che la tabella `views` rispecchi SavedView
          return data as SavedView[];
        }

        if (error) {
          // Se la tabella non esiste o è diversa, log e passa al fallback
          console.warn(
            '[ViewsRepo] list supabase error, uso fallback',
            error.message
          );
        }
      } catch (err) {
        console.error('[ViewsRepo] list fatal', err);
      }
    }

    // Fallback: stessa logica del mock originale CODEX
    return MOCK.filter((v) => v.scope === scope);
  },

  async create(
    view: Omit<SavedView, 'id' | 'createdAt'>
  ): Promise<SavedView> {
    const supabase = await getClientSafe();

    if (supabase) {
      try {
        const payload: any = {
          // SavedView è la fonte di verità: copiamo tutto ciò che c'è
          ...view,
        };

        const { data, error } = await supabase
          .from('views')
          .insert(payload)
          .select('*')
          .single();

        if (!error && data) {
          return data as SavedView;
        }

        if (error) {
          console.warn(
            '[ViewsRepo] create supabase error, uso fallback',
            error.message
          );
        }
      } catch (err) {
        console.error('[ViewsRepo] create fatal', err);
      }
    }

    // Fallback in-memory identico al mock iniziale
    const newView: SavedView = {
      ...(view as SavedView),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    MOCK.push(newView);
    return newView;
  },

  async remove(id: SavedView['id']): Promise<void> {
    const supabase = await getClientSafe();

    if (supabase) {
      try {
        const { error } = await supabase
          .from('views')
          .delete()
          .eq('id', id);

        if (!error) {
          // Allinea anche il mock
          MOCK = MOCK.filter((v) => v.id !== id);
          return;
        }

        console.warn(
          '[ViewsRepo] remove supabase error, uso fallback',
          error.message
        );
      } catch (err) {
        console.error('[ViewsRepo] remove fatal', err);
      }
    }

    // Fallback in-memory
    MOCK = MOCK.filter((v) => v.id !== id);
  },
};
