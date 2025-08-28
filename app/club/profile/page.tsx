"use client";

/**
 * Pagina profilo club
 * FILE COMPLETO — REPLACE FULL
 */

import React from "react";
import Image from "next/image";

interface ClubProfileProps {
  params?: { id?: string };
}

export default function ClubProfilePage({ params }: ClubProfileProps) {
  // Qui useresti fetch/loader reale per i dati club
  const club = {
    id: params?.id || "123",
    name: "ASD Club Atlético Carlentini",
    city: "Carlentini",
    province: "SR",
    level: "Terza Categoria",
    logoUrl: "/placeholder.png", // sostituire con campo reale
    description:
      "Club calcistico dilettantistico fondato nel 2023. Attivo sul territorio di Carlentini con settore giovanile e prima squadra.",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-28 h-28">
          <Image
            src={club.logoUrl}
            alt={`Logo di ${club.name}`}
            width={112}
            height={112}
            className="rounded-full object-cover border"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          <p className="text-gray-600">
            {club.city} ({club.province}) – {club.level}
          </p>
        </div>
      </div>

      <div className="prose max-w-none">
        <h2>Descrizione</h2>
        <p>{club.description}</p>
      </div>
    </div>
  );
}
