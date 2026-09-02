import type { Metadata } from 'next';
import type { Locale } from './config';
import { DEFAULT_OG_IMAGE, SITE_NAME } from '@/lib/seo';

type SeoPage = 'home' | 'login' | 'signup' | 'network' | 'clubMap';

const copy: Record<Locale, Record<SeoPage, { title: string; description: string }>> = {
  it: {
    home: { title: 'Club and Player: network sportivo per Club, Player, Staff e Fan', description: 'Profili sportivi, opportunità, candidature e messaggi per Club, Player, Staff e Fan.' },
    login: { title: 'Accedi', description: 'Accedi al tuo account Club and Player.' },
    signup: { title: 'Registrati', description: 'Crea il tuo account e partecipa al network sportivo Club and Player.' },
    network: { title: 'La tua rete', description: 'Gestisci suggerimenti, profili seguiti e follower.' },
    clubMap: { title: 'Mappa dei Club', description: 'Esplora sulla mappa i Club con una sede o un impianto pubblico.' },
  },
  en: {
    home: { title: 'Club and Player: the sports network for Clubs, Players, Staff and Fans', description: 'Sports profiles, opportunities, applications and messages for Clubs, Players, Staff and Fans.' },
    login: { title: 'Log in', description: 'Log in to your Club and Player account.' },
    signup: { title: 'Sign up', description: 'Create your account and join the Club and Player sports network.' },
    network: { title: 'Your network', description: 'Manage suggestions, followed profiles and followers.' },
    clubMap: { title: 'Club map', description: 'Explore Clubs with a public headquarters or venue on the map.' },
  },
  fr: {
    home: { title: 'Club and Player : le réseau sportif des Clubs, Joueurs, Staffs et Supporters', description: 'Profils sportifs, opportunités, candidatures et messages pour les Clubs, Joueurs, Staffs et Supporters.' },
    login: { title: 'Connexion', description: 'Connectez-vous à votre compte Club and Player.' },
    signup: { title: 'Inscription', description: 'Créez votre compte et rejoignez le réseau sportif Club and Player.' },
    network: { title: 'Votre réseau', description: 'Gérez les suggestions, les profils suivis et vos abonnés.' },
    clubMap: { title: 'Carte des Clubs', description: 'Explorez sur la carte les Clubs ayant un siège ou une installation publique.' },
  },
  es: {
    home: { title: 'Club and Player: la red deportiva para Clubes, Jugadores, Cuerpo técnico y Aficionados', description: 'Perfiles deportivos, oportunidades, candidaturas y mensajes para Clubes, Jugadores, Cuerpo técnico y Aficionados.' },
    login: { title: 'Iniciar sesión', description: 'Inicia sesión en tu cuenta de Club and Player.' },
    signup: { title: 'Registrarse', description: 'Crea tu cuenta y únete a la red deportiva Club and Player.' },
    network: { title: 'Tu red', description: 'Gestiona sugerencias, perfiles que sigues y seguidores.' },
    clubMap: { title: 'Mapa de Clubes', description: 'Explora en el mapa los Clubes con sede o instalación pública.' },
  },
};

const openGraphLocales: Record<Locale, string> = { it: 'it_IT', en: 'en_GB', fr: 'fr_FR', es: 'es_ES' };

export function buildLocalizedMetadata(locale: Locale, page: SeoPage, canonical?: string): Metadata {
  const value = copy[locale][page];
  const title = page === 'home' ? value.title : `${value.title} | ${SITE_NAME}`;
  return {
    title,
    description: value.description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: 'website', title, description: value.description, url: canonical,
      siteName: SITE_NAME, locale: openGraphLocales[locale],
      alternateLocale: Object.values(openGraphLocales).filter((candidate) => candidate !== openGraphLocales[locale]),
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: { card: 'summary_large_image', title, description: value.description, images: [DEFAULT_OG_IMAGE] },
  };
}
