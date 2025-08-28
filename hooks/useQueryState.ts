'use client';


import { useSearchParams, usePathname, useRouter } from 'next/navigation';


export function useQueryState() {
const sp = useSearchParams();
const pathname = usePathname();
const router = useRouter();


function setQuery(obj: Record<string, string | number | undefined | (string | number)[]>) {
const next = new URLSearchParams(sp.toString());
Object.entries(obj).forEach(([k, v]) => {
if (v === undefined || (Array.isArray(v) && v.length === 0)) {
next.delete(k);
return;
}
if (Array.isArray(v)) next.set(k, v.join(','));
else next.set(k, String(v));
});
router.replace(`${pathname}?${next.toString()}`);
}


return { searchParams: sp, setQuery };
}