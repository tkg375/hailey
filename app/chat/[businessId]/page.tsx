import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import ChatWidget from "@/components/ChatWidget";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const db = await getDb();

  const business = await db.prepare(
    "SELECT id, name, primary_color, tagline, bot_name, bot_greeting, hide_branding FROM businesses WHERE id = ? AND active = 1"
  ).bind(businessId).first() as any;

  if (!business) notFound();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">{business.name}</h1>
        {business.tagline && <p className="text-gray-500 mt-1">{business.tagline}</p>}
        <p className="text-sm text-gray-400 mt-4">Chat with our virtual assistant below</p>
      </div>
      <ChatWidget
        businessId={business.id}
        businessName={business.name}
        primaryColor={business.primary_color || "#6366f1"}
        botName={business.bot_name || "Hailey"}
        botGreeting={business.bot_greeting}
        hideBranding={!!business.hide_branding}
      />
    </div>
  );
}
