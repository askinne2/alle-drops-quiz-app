import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getPool } from "../lib/db";

interface SubmissionStats {
  total: number;
  this_week: number;
  tennessee: number;
  texas: number;
  low: number;
  moderate: number;
  high: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  let stats: SubmissionStats = {
    total: 0, this_week: 0, tennessee: 0, texas: 0, low: 0, moderate: 0, high: 0,
  };

  try {
    const pool = getPool();
    const result = await pool.query<SubmissionStats>(`
      SELECT
        COUNT(*)                                                            AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')   AS this_week,
        COUNT(*) FILTER (WHERE patient_state = 'tennessee')                AS tennessee,
        COUNT(*) FILTER (WHERE patient_state = 'texas')                    AS texas,
        COUNT(*) FILTER (WHERE score_bracket = '0-2')                      AS low,
        COUNT(*) FILTER (WHERE score_bracket = '3-6')                      AS moderate,
        COUNT(*) FILTER (WHERE score_bracket = '7+')                       AS high
      FROM submissions
    `);
    const row = result.rows[0];
    stats = {
      total:      Number(row.total),
      this_week:  Number(row.this_week),
      tennessee:  Number(row.tennessee),
      texas:      Number(row.texas),
      low:        Number(row.low),
      moderate:   Number(row.moderate),
      high:       Number(row.high),
    };
  } catch {
    // DB unavailable — render zeros rather than crash
  }

  return { stats };
};

export default function Index() {
  const { stats } = useLoaderData<typeof loader>();

  return (
    <s-page heading="AlleDrops — Allergist on Demand">
      <s-section heading="Submissions">
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="This week" value={stats.this_week} />
          <StatCard label="Tennessee" value={stats.tennessee} />
          <StatCard label="Texas" value={stats.texas} />
        </div>
      </s-section>

      <s-section heading="Score Brackets">
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <StatCard label="0–2 Low" value={stats.low} accent="#2e7d32" />
          <StatCard label="3–6 Moderate" value={stats.moderate} accent="#e65100" />
          <StatCard label="7+ High" value={stats.high} accent="#b71c1c" />
        </div>
      </s-section>

      <s-section heading="Actions">
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link to="/app/quiz-results">
            <s-button variant="primary">View Submissions</s-button>
          </Link>
        </div>
      </s-section>
    </s-page>
  );
}

function StatCard({
  label,
  value,
  accent = "#0070f3",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e5e5",
        borderRadius: "8px",
        padding: "1rem 1.5rem",
        minWidth: "120px",
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: "2rem", fontWeight: 700, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.35rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
