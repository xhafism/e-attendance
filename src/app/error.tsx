"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <h2 style={{ marginBottom: "1rem" }}>Something went wrong!</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>{error.message || "An unexpected error occurred."}</p>
      <button
        className="btn btn-primary"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
