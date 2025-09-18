'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const BIO_WORD_LIMIT = 100;

function countWords(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function ClubProfilePage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clubId, setClubId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Caricamento dati iniziali
  useEffect(() => {
    const init = async () => {
      setError(null);

      const {
        data: { user },
        error: uErr,
      } = await supabase.auth.getUser();

      if (uErr) {
        setError(uErr.message);
        setLoading(false);
        return;
      }
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const { data: existing, error: selErr } = await supabase
        .from('clubs')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (selErr) {
        setError(selErr.message);
        setLoading(false);
        return;
      }

      if (!existing) {
        const { data: inserted, error: insErr } = await supabase
          .from('clubs')
          .insert({ owner_id: user.id, name: '', bio: '', logo_url: null })
          .select('*')
          .single();

        if (insErr) {
          setError(insErr.message);
          setLoading(false);
          return;
        }

        setClubId(inserted.id);
        setName(inserted.name ?? '');
        setBio(inserted.bio ?? '');
        setLogoUrl(inserted.logo_url);
      } else {
        setClubId(existing.id);
        setName(existing.name ?? '');
        setBio(existing.bio ?? '');
        setLogoUrl(existing.logo_url);
      }

      setLoading(false);
    };

    void init();
  }, [supabase, router]);

  // Cleanup: revoca l’eventuale blob URL precedente
  useEffect(() => {
    let toRevoke: string | null = null;
    if (logoUrl?.startsWith('blob:')) {
      toRevoke = logoUrl;
    }
    return () => {
      if (toRevoke) {
        try {
          URL.revokeObjectURL(toRevoke);
        } catch {
          /* ignore */
        }
      }
    };
  }, [logoUrl]);

  function onPickLogo(file: File | null) {
    setOkMsg(null);
    setError(null);
    setLogoFile(null);

    if (!file) return;

    // guard-rail: tipo e dimensione
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setError('Formato non valido. Usa PNG o JPG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Il file supera 2MB.');
      return;
    }

    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  }

  async function uploadLogo() {
    if (!userId || !logoFile) return;

    setUploading(true);
    setError(null);
    setOkMsg(null);

    try {
      const ext =
        (logoFile.name.split('.').pop() || (logoFile.type.includes('png') ? 'png' : 'jpg')).toLowerCase();
      const fileName = `logo-${Date.now()}.${ext}`;
      const path = `${userId}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from('club-logos')
        .upload(path, logoFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: logoFile.type,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('club-logos').getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error('Impossibile ottenere la URL pubblica del logo');

      if (!clubId) throw new Error('Club non inizializzato');

      const { error: updErr } = await supabase.from('clubs').update({ logo_url: publicUrl }).eq('id', clubId);
      if (updErr) throw updErr;

      setLogoUrl(publicUrl);
      setOkMsg('Logo aggiornato con successo.');
      setLogoFile(null);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setError(e?.message || 'Errore in upload logo');
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile() {
    if (!clubId) return;

    // limite 100 parole lato client
    const words = countWords(bio);
    if (words > BIO_WORD_LIMIT) {
      setError(`La bio può contenere massimo ${BIO_WORD_LIMIT} parole (ora ${words}).`);
      return;
    }

    setSaving(true);
    setError(null);
    setOkMsg(null);

    try {
      const { error: updErr } = await supabase.from('clubs').update({ name, bio }).eq('id', clubId);
      if (updErr) throw updErr;

      setOkMsg('Profilo salvato.');
    } catch (e: any) {
      setError(e?.message || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  }

  const bioWords = useMemo(() => countWords(bio), [bio]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Profilo Club</h1>
        <p className="mt-4">Caricamento…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Profilo Club</h1>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {okMsg && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700">{okMsg}</div>
      )}

      {/* LOGO */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Logo</h2>
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 overflow-hidden rounded-md border bg-white">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo club"
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
                priority={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">Nessun logo</div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => onPickLogo(e.target.files?.[0] ?? null)}
              disabled={uploading}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={uploadLogo}
                disabled={!logoFile || uploading}
                className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {uploading ? 'Carico…' : 'Carica logo'}
              </button>
              {logoFile && <span className="text-sm text-gray-600">File: {logoFile.name}</span>}
            </div>
            <p className="text-xs text-gray-500">Suggerito: PNG/JPG quadrato ≤ 2MB.</p>
          </div>
        </div>
      </section>

      {/* DATI CLUB */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Dati</h2>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Nome Club</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. ASD Example"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Bio</label>
          <textarea
            className="w-full rounded-md border px-3 py-2"
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Racconta qualcosa sul club…"
          />
          <div className="text-xs">
            Parole: {bioWords}/{BIO_WORD_LIMIT}{' '}
            {bioWords > BIO_WORD_LIMIT && <span className="text-red-600">(limite superato)</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? 'Salvo…' : 'Salva profilo'}
        </button>
      </section>
    </div>
  );
}
