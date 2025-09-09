export const dynamic = "force-dynamic";
export const revalidate = 0;

import ReportsClient from "./ReportsClient";

export default function AdminReportsPageWrapper() {
  return <ReportsClient />;
}
