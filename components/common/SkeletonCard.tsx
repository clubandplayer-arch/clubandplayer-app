'use client';


export function SkeletonCard() {
return (
<div className="border rounded-xl p-4 bg-white animate-pulse">
<div className="h-5 w-2/3 bg-neutral-200 rounded mb-2" />
<div className="h-4 w-1/3 bg-neutral-200 rounded mb-4" />
<div className="h-4 w-1/2 bg-neutral-200 rounded mb-2" />
<div className="h-4 w-1/3 bg-neutral-200 rounded mb-2" />
<div className="h-8 w-full bg-neutral-200 rounded" />
</div>
);
}