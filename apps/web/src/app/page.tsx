export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>OTA Get Rank Tool</h1>
      <p>ホテル検索順位・件数の自動収集ツール</p>
      <a
        href="/test"
        style={{
          display: "inline-block",
          marginTop: 16,
          padding: "10px 24px",
          background: "#2563eb",
          color: "#fff",
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        APIテストダッシュボード →
      </a>
    </main>
  );
}
