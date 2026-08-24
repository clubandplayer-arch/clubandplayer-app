import { cookies, headers } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { LOCALE_COOKIE_NAME, resolveLocale, type Locale } from './config';

async function getAuthenticatedProfileLocale(): Promise<string | null> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (!profile?.id) return null;
    const { data: preference } = await supabase
      .from('profile_preferences')
      .select('languages(code,is_supported,is_active)')
      .eq('profile_id', profile.id)
      .maybeSingle();
    const language = Array.isArray(preference?.languages) ? preference.languages[0] : preference?.languages;
    return language?.is_supported && language?.is_active ? language.code : null;
  } catch {
    return null;
  }
}

export async function resolveRequestLocale(): Promise<Locale> {
  const [profileLocale, cookieStore, headerStore] = await Promise.all([
    getAuthenticatedProfileLocale(),
    cookies(),
    headers(),
  ]);
  return resolveLocale({
    profileLocale,
    localLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    browserLocale: headerStore.get('accept-language')?.split(',')[0],
  });
}
