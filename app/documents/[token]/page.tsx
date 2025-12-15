"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DocumentRow = {
  id: string;
  job_id: string | null;
  kind: string | null;
  number: string | null;
  status: string | null;
  total: number | null;
  public_token: string | null;
  public_started_at: string | null;
  public_expires_at: string | null;
};

export default function DocumentPublicPage() {
  const params = useParams();
  const tokenParam = params?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<DocumentRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("documents")
        .select(
          "id, job_id, kind, number, status, total, public_token, public_started_at, public_expires_at"
        )
        .eq("public_token", token)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRow(null);
      } else if (!data) {
        setError("Invalid or expired document link");
        setRow(null);
      } else {
        setRow(data as DocumentRow);
      }

      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, Arial" }}>
      <h2>Document</h2>

      {loading && <p>Loading…</p>}

      {!loading && error && (
        <>
          <p>❌ {error}</p>
          <p>
            Token: <code>{String(token)}</code>
          </p>
        </>
      )}

      {!loading && row && (
        <>
          <p>✅ Valid document link</p>
          <p>
            Kind: <b>{row.kind ?? "—"}</b>
          </p>
          <p>
            Number: <b>{row.number ?? "—"}</b>
          </p>
          <p>
            Status: <b>{row.status ?? "—"}</b>
          </p>
          <p>
            Total: <b>{row.total ?? 0}</b>
          </p>
          <p>
            Job ID: <code>{row.job_id ?? "—"}</code>
          </p>
          <p>
            Token: <code>{row.public_token ?? "—"}</code>
          </p>
        </>
      )}
    </main>
  );
}
