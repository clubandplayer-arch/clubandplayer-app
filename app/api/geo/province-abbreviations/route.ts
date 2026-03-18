import { NextResponse } from 'next/server';

import { jsonError } from '@/lib/api/auth';
import { getProvinceAbbreviationsServer } from '@/lib/geo/provinceAbbreviations';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await getProvinceAbbreviationsServer();
    return NextResponse.json({ data });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
