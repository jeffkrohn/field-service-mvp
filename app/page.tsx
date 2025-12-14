"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [status, setStatus] = useState("Checking Supabase...");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("jobs").select("id").limit(1);
      if (error) setStatus("❌ Supabase error: " + error.message);
      else setStatus("✅ Supabase connected. jobs rows seen: " + (data?.length ?? 0));
    })();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Field Service MVP</h1>
      <p>{status}</p>

      <p style={{ marginTop: 16 }}>
        Test job page example:{" "}
        <a href="/job/83b7f31f-0019-4148-808a-ab16e4dcae5c">
          /job/83b7f31f-0019-4148-808a-ab16e4dcae5c
        </a>
      </p>
    </main>
  );
}
