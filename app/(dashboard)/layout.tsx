"use client";

import React from "react";
import { ToastProvider } from "@/components/common/ToastProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}