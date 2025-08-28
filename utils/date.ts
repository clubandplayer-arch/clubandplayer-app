export function formatDateShort(iso: string) {
try {
const d = new Date(iso);
return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
} catch {
return '—';
}
}