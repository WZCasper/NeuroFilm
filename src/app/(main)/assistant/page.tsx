import { AIChatWidget } from "@/components/ai/AIChatWidget";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">ИИ-подбор фильмов</h1>
      <div className="h-[70vh]">
        <AIChatWidget />
      </div>
    </div>
  );
}
