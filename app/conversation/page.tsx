import type { Metadata } from "next";
import { ScenarioClient } from "@/components/ScenarioClient";

export const metadata: Metadata = {
  title: "Conversation · InterpretTime",
};

export default function ConversationPage() {
  return <ScenarioClient />;
}
