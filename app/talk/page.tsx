import type { Metadata } from "next";
import { TalkClient } from "@/components/TalkClient";

export const metadata: Metadata = {
  title: "Practice conversation · InterpretTime",
};

export default function TalkPage() {
  return <TalkClient />;
}
