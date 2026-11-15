import type { Metadata } from "next";
import { DemoLauncher } from "@/components/DemoLauncher";

export const metadata: Metadata = {
  title: "Demo · InterpretTime",
};

export default function DemoPage() {
  return <DemoLauncher />;
}
