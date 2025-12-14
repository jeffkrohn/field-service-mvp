"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type JobRow = {
  id: string;
  // Add other columns if you have them (optional):
  // title?: string;
  // customer_name?: string;
};

type UiState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; job: JobRow };

export default function JobPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = useMemo(() => params?.jobId, [params]);

  const [state, setState] = useState<UiState>({ kind: "loading" });
  const [lastAction, setLastAction] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!jobId) {
        setState({ kind: "error", message: "Missing jobId in URL." });
        return;
      }

      // Basic UUID sanity check (prevents the “uuid undefined” type errors)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(jobId)) {
        setState({
          kind: "error",
          message: `Job ID is not a valid UUID: ${jobId}`,
        });
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", jobId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setState({ kind: "error", message: error.message });
        return;
      }

      if (!data) {
        setState({ kind: "error", message: "Job not found in public.jobs." });
        return;
      }

      setState({ kind: "ready", job: data });
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  async function handleAction(action: string) {
    // For now, we just confirm buttons work and keep the UI stable.
    // Next step we’ll wire these to your Supabase functions.
    setLastAction(action);
  }

  if (state.kind === "loading") {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Job Time Clock</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Job Time Clock</h1>
        <p style={{ color: "crimson" }}>✖ {state.message}</p>
        <p>
          URL should look like: <code>/job/&lt;uuid&gt;</code>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Job Time Clock</h1>

      <div style={{ marginTop: 10 }}>
        <div>
          <strong>Job ID:</strong> {state.job.id}
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => handleAction("I’m On Site")}>I’m On Site</button>
        <button onClick={() => handleAction("Work Start")}>Work Start</button>
        <button onClick={() => handleAction("Work End")}>Work End</button>
        <button onClick={() => handleAction("Reset Time")}>Reset Time</button>
      </div>

      <div style={{ marginTop: 18 }}>
        <div>
          <strong>Last action:</strong> {lastAction || "—"}
        </div>
      </div>
    </main>
  );
}
