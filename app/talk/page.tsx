import type { Metadata } from "next";
import { TalkClient } from "@/components/TalkClient";

export const metadata: Metadata = {
  title: "Quickfire · InterpretTime",
};

export default function TalkPage() {
  return <TalkClient />;
}
