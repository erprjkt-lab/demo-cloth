"use client";

// Last resort for errors in the root or app layout (e.g. the database can't be reached while
// loading the signed-in user). Plain HTML: the antd provider lives in the layout that failed.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#F8FAFC" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h2 style={{ margin: "0 0 8px" }}>Can&apos;t reach the server</h2>
          <p style={{ color: "#475569", margin: "0 0 16px" }}>Check your internet connection and try again.</p>
          <button
            onClick={reset}
            style={{ background: "#0289C3", color: "#fff", border: 0, borderRadius: 6, padding: "8px 16px", fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
