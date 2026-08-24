import type { SupabaseClient } from '@supabase/supabase-js';
import { LOCALE_COOKIE_MAX_AGE, LOCALE_COOKIE_NAME, type Locale } from './config';

export function persistLocaleCookie(locale: Locale): void {
  document.cookie = buildLocaleCookie(locale, location.protocol === 'https:');
}

export const buildLocaleCookie = (locale: Locale, secure: boolean): string =>
  `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}`;

export const buildLanguagePreferenceUpdate = (preferredLanguageId: string) => ({
  preferred_language_id: preferredLanguageId,
});

export const buildLanguagePreferenceInsert = (profileId: string, preferredLanguageId: string) => ({
  profile_id: profileId,
  preferred_language_id: preferredLanguageId,
});

export async function persistAuthenticatedLocale(supabase: SupabaseClient, locale: Locale): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (profileError || !profile?.id) throw profileError ?? new Error('Profile not found');

  const { data: language, error: languageError } = await supabase
    .from('languages')
    .select('id')
    .eq('code', locale)
    .eq('is_supported', true)
    .eq('is_active', true)
    .maybeSingle();
  if (languageError || !language?.id) throw languageError ?? new Error('Language not available');

  // Update only the language column so residence and relocation are untouched.
  const { data: updated, error: updateError } = await supabase
    .from('profile_preferences')
    .update(buildLanguagePreferenceUpdate(language.id))
    .eq('profile_id', profile.id)
    .select('profile_id');
  if (updateError) throw updateError;
  if ((updated ?? []).length > 0) return true;

  const { error: insertError } = await supabase
    .from('profile_preferences')
    .insert(buildLanguagePreferenceInsert(profile.id, language.id));
  if (!insertError) return true;

  // A concurrent first write may have created the row: retry a narrow update.
  if (insertError.code === '23505') {
    const { error: retryError } = await supabase
      .from('profile_preferences')
      .update(buildLanguagePreferenceUpdate(language.id))
      .eq('profile_id', profile.id);
    if (!retryError) return true;
    throw retryError;
  }
  throw insertError;
}
