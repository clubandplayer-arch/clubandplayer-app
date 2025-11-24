declare module 'next/dist/compiled/web-vitals' {
  export type WebVitalMetric = {
    name: string;
    value: number;
    id?: string;
    rating?: 'good' | 'needs-improvement' | 'poor' | string;
    delta?: number;
  };
  export type ReportCallback = (metric: WebVitalMetric) => void;
  export function onCLS(cb: ReportCallback): void;
  export function onFID(cb: ReportCallback): void;
  export function onINP(cb: ReportCallback): void;
  export function onLCP(cb: ReportCallback): void;
  export function onTTFB(cb: ReportCallback): void;
}
