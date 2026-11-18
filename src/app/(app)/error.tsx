"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card text-center">
      <p className="mb-3 font-semibold">Something went wrong.</p>
      <p className="mb-4 text-sm text-slate-600">Check your internet connection and try again.</p>
      <button className="btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
