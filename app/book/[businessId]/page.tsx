import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import BookingFlow from "./BookingFlow";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const db = await getDb();

  const business = await db.prepare("SELECT * FROM businesses WHERE id = ? AND active = 1")
    .bind(businessId).first<any>();
  if (!business) notFound();

  const services = await db.prepare("SELECT * FROM services WHERE business_id = ? AND active = 1 ORDER BY name ASC")
    .bind(businessId).all<any>();

  const hours = await db.prepare("SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC")
    .bind(businessId).all<any>();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
          {business.tagline && <p className="text-gray-500 mt-2">{business.tagline}</p>}
          <p className="text-sm text-gray-400 mt-1">Book your appointment online</p>
        </div>
        <BookingFlow
          business={business}
          services={services.results}
          businessHours={hours.results}
        />
        <p className="text-center text-xs text-gray-300 mt-8">Powered by Hailey</p>
      </div>
    </div>
  );
}
