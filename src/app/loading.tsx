export default function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "1rem" }}>
      <div className="spinner" style={{ width: "24px", height: "24px", borderWidth: "3px" }}></div>
      <p style={{ color: "var(--text-muted)" }}>Loading...</p>
    </div>
  );
}
