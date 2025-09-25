'use client';

type MiniProps = {
  name: string;
  location?: string;
  role?: string;
  heightCm?: number;
  weightKg?: number;
  foot?: 'Destro' | 'Sinistro' | 'Ambidestro' | string;
  valueEUR?: number;
};

export default function ProfileMiniCard({
  name,
  location,
  role,
  heightCm,
  weightKg,
  foot,
  valueEUR,
}: MiniProps) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-gray-200" />
        <div>
          <div className="font-semibold">{name}</div>
          {location ? <div className="text-xs text-gray-500">{location}</div> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {heightCm != null && (
          <div className="rounded-lg bg-gray-50 p-2">
            <div className="text-gray-500">Altezza</div>
            <div className="font-medium">{(heightCm / 100).toFixed(2)} m</div>
          </div>
        )}
        {weightKg != null && (
          <div className="rounded-lg bg-gray-50 p-2">
            <div className="text-gray-500">Peso</div>
            <div className="font-medium">{weightKg} kg</div>
          </div>
        )}
        {foot && (
          <div className="rounded-lg bg-gray-50 p-2">
            <div className="text-gray-500">Piede</div>
            <div className="font-medium">{foot}</div>
          </div>
        )}
        {role && (
          <div className="rounded-lg bg-gray-50 p-2">
            <div className="text-gray-500">Ruolo</div>
            <div className="font-medium">{role}</div>
          </div>
        )}
      </div>

      {valueEUR != null && (
        <>
          <div className="mt-3 text-xs text-gray-500">Valore stimato</div>
          <div className="text-sm font-semibold">€ {valueEUR.toLocaleString('it-IT')}</div>
        </>
      )}
    </section>
  );
}
