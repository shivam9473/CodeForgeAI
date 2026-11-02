import type { Metadata } from "next";
import Desk from "@/components/Desk";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <Desk />;
}
