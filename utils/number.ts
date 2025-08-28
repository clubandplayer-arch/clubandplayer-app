export function formatCurrency(v: number, currency: 'EUR' = 'EUR') {
try {
return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(v);
} catch {
return `${v} ${currency}`;
}
}