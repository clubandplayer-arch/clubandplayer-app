/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/views/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const views = [
    {
      id: "v-opps-sicilia-coach",
      name: "Opportunità • Sicilia • Allenatori",
      scope: "opportunities",
      queryString: "view=opps&region=Sicilia&role=Coach&sort=recent",
      createdAt: new Date().toISOString(),
    },
    {
      id: "v-clubs-lazio-dilettanti",
      name: "Club • Lazio • Dilettanti",
      scope: "clubs",
      queryString: "view=clubs&region=Lazio&level=Dilettanti",
      createdAt: new Date().toISOString(),
    },
  ];

  return NextResponse.json({ items: views });
}
