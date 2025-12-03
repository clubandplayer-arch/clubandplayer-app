import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const GET = () =>
  NextResponse.json(
    {
      error: 'messaging_legacy_retired',
      message:
        'Lo stack conversations/messages è stato dismesso. Usa la nuova inbox /messages e le API /api/direct-messages/*.',
    },
    {
      status: 410,
      headers: {
        Link: '</messages>; rel="alternate"',
      },
    },
  );
