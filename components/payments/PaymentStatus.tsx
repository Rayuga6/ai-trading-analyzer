"use client";

type PaymentStatusProps = {
  status:
    | "idle"
    | "processing"
    | "success"
    | "error"
    | "cancelled";
  message?: string;
};

const STATUS_CONFIG = {
  idle: {
    title: "Ready for payment",
    className: "border-white/10 bg-white/5 text-slate-300",
  },
  processing: {
    title: "Processing payment",
    className: "border-cyan-400/20 bg-cyan-400/5 text-cyan-300",
  },
  success: {
    title: "Payment successful",
    className: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
  },
  error: {
    title: "Payment failed",
    className: "border-red-400/20 bg-red-400/5 text-red-300",
  },
  cancelled: {
    title: "Payment cancelled",
    className: "border-amber-400/20 bg-amber-400/5 text-amber-300",
  },
} as const;

export default function PaymentStatus({
  status,
  message,
}: PaymentStatusProps) {
  if (status === "idle" && !message) {
    return null;
  }

  const config = STATUS_CONFIG[status];

  return (
    <div
      role={status === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`mt-4 rounded-xl border p-4 ${config.className}`}
    >
      <p className="font-semibold">{config.title}</p>

      {message && (
        <p className="mt-1 text-sm opacity-90">
          {message}
        </p>
      )}
    </div>
  );
}