import { supabase } from "@/lib/supabase";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function TrackPage({ params }: PageProps) {
  const { token } = await params;

  const normalizedToken = token.replace(/-/g, ""); // lets dashed or non-dashed work

  const { data, error } = await supabase
    .from("job_tracking_sessions")
    .select("job_id, token, started_at, expires_at, is_active")
    .eq("token", normalizedToken)
    .maybeSingle();

  if (error) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>Service Status</h2>
        <p style={{ color: "crimson" }}>❌ {error.message}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>Service Status</h2>
        <p style={{ color: "crimson" }}>❌ Invalid or expired tracking link</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Service Status</h2>
      <p style={{ color: "green" }}>
        ✅ Valid tracking link for job_id: {data.job_id}
      </p>
      <p>Token: {data.token}</p>
    </main>
  );
}
