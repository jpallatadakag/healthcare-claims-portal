import AssistantChat from "@/components/assistant/AssistantChat";

export default function AssistantPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">AI Assistant</h1>
        <p className="text-slate-500 text-sm mt-1">
          Ask questions about your claims data — rule-based, no external APIs.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
