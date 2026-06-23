"use client";
import { useState } from "react";

interface Service { id: string; name: string; description: string; duration_minutes: number; price_cents: number; }
interface Business { id: string; name: string; email: string; phone: string; timezone: string; }

type Step = "service" | "datetime" | "info" | "confirm" | "done";

export default function BookingFlow({
  business,
  services,
}: {
  business: Business;
  services: Service[];
  businessHours: any[];
}) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate available times (9am-5pm, every 30 min)
  const times: string[] = [];
  for (let h = 9; h < 17; h++) {
    times.push(`${h.toString().padStart(2, "0")}:00`);
    times.push(`${h.toString().padStart(2, "0")}:30`);
  }

  function formatPrice(cents: number) {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  function formatDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  // Minimum date = today
  const todayStr = new Date().toISOString().split("T")[0];

  async function submit() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/book/${business.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedService!.id,
        serviceName: selectedService!.name,
        date: selectedDate,
        time: selectedTime,
        durationMinutes: selectedService!.duration_minutes,
        priceCents: selectedService!.price_cents,
        clientName,
        clientEmail,
        clientPhone,
        notes,
      }),
    });
    const data = await res.json() as any;
    if (!res.ok) {
      setError(data.error || "Booking failed");
      setLoading(false);
      return;
    }
    setStep("done");
    setLoading(false);
  }

  if (step === "done") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re booked!</h2>
        <p className="text-gray-500 mb-4">
          Your appointment for <strong>{selectedService?.name}</strong> on{" "}
          <strong>{formatDate(selectedDate)}</strong> at <strong>{formatTime(selectedTime)}</strong> is confirmed.
        </p>
        {clientEmail && (
          <p className="text-sm text-gray-400">A confirmation has been sent to {clientEmail}.</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Progress */}
      <div className="flex border-b border-gray-100">
        {(["service", "datetime", "info", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className={`flex-1 py-3 text-center text-xs font-medium ${step === s ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400"}`}>
            {i + 1}. {s === "service" ? "Service" : s === "datetime" ? "Date & Time" : s === "info" ? "Your Info" : "Confirm"}
          </div>
        ))}
      </div>

      <div className="p-6">
        {/* Step 1: Service */}
        {step === "service" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a service</h2>
            {services.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No services available yet.</p>
            ) : (
              <div className="space-y-3">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedService(s); setStep("datetime"); }}
                    className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">{s.name}</div>
                        {s.description && <div className="text-sm text-gray-500 mt-0.5">{s.description}</div>}
                        <div className="text-sm text-gray-400 mt-1">{s.duration_minutes} min</div>
                      </div>
                      <div className="text-indigo-600 font-semibold">{formatPrice(s.price_cents)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === "datetime" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pick a date & time</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {times.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${selectedTime === t ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-700 hover:border-indigo-300"}`}
                    >
                      {formatTime(t)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep("service")} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">Back</button>
              <button
                onClick={() => setStep("info")}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
              >Continue</button>
            </div>
          </div>
        )}

        {/* Step 3: Client info */}
        {step === "info" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Anything we should know?"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep("datetime")} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">Back</button>
              <button
                onClick={() => setStep("confirm")}
                disabled={!clientName}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
              >Continue</button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm your booking</h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Service</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-medium">{formatTime(selectedTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium">{selectedService?.duration_minutes} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Price</span>
                <span className="font-medium">{formatPrice(selectedService?.price_cents || 0)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{clientName}</span>
                </div>
                {clientEmail && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium">{clientEmail}</span>
                  </div>
                )}
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
            <div className="flex gap-3">
              <button onClick={() => setStep("info")} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">Back</button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
