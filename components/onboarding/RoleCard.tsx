'use client';

import type { ReactNode } from 'react';

type RoleCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
};

export default function RoleCard({ title, description, icon, selected, onClick }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'w-full rounded-2xl border bg-white p-6 text-left shadow-sm transition duration-200',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#036f9a]/40',
        selected ? 'border-[#036f9a] scale-[1.05]' : 'border-slate-200',
      ].join(' ')}
    >
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#036f9a]/10 text-[#036f9a]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </button>
  );
}
