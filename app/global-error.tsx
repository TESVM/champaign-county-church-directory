"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself, where the
 * normal error boundary cannot render. It must supply its own html and body.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          margin: 0,
          padding: "4rem 1.5rem",
          color: "#102327",
          background: "#EEF5F7"
        }}
      >
        <main style={{ maxWidth: "36rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <p style={{ lineHeight: 1.7 }}>
            The site failed to load. Please try again in a moment.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.875rem", color: "#4A5A5E" }}>
              Reference code: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: 44,
              padding: "0 1.5rem",
              borderRadius: 999,
              border: "none",
              background: "#1F5F63",
              color: "white",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
