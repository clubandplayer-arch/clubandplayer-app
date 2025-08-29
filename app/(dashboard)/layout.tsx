"use client";

import React from "react";
import { ToastProvider } from "@/components/common/ToastProvider";
import LiveEventsClient from "@/components/common/LiveEventsClient";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <LiveEventsClient />
      {children}
    </ToastProvider>
  );
}
