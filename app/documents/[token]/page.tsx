// app/documents/[token]/page.tsx
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DocumentRow = {
  id: string;
  job_id: string | null;
  kind: string | null;
  number: string | null;
  status: string | null;
  total: number | null;

  // public link fields (RLS will protect, but these are often present)
  public_token: string | null;
  public_started_at: string | null;
  public_expires_at: string | null;
};

type GroupRow = {
  id: string;
  document_id: string;
  name?: string | null;
  title?: string | null; // some people use title instead of name
  sort_order?: number | null;
};

type LineItemRow = {
  id: string;
  document_id: string;
  group_id: string | null;

  item_type: string | null; // labor/materials/permit/text/etc
  title: string | null;
  description: string | null;

  qty: number | null;
  unit: string | null;
  sort_order: number | null;

  labor_hours: number | null;
  labor_rate: number | null;
  taxable_labor: boolean | null;

  materials_cost: number | null;
  materials_markup_pct: number | null;
  taxable_materials: boolean | null;

  created_at: string | null;
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function num(n: unknown, fallback = 0) {
  const x = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return x;
}

function computeLine(item: LineItemRow) {
  const qty = num(item.qty, 1);

  const laborHours = num(item.labor_hours, 0);
  const laborRate = num(item.labor_rate, 0);
  const laborSubtotal = laborHours * laborRate;

  const materialsCost = num(item.materials_cost, 0);
  const markupPct = num(item.materials_markup_pct, 0);
  const materialsSell = materialsCost * (1 + markupPct / 100);

  // If you want qty to affect totals, apply it here.
  // For service work it’s common that qty reflects "each" and labor/materials already match that,
  // but if you prefer qty multiplier, uncomment the next two lines:
  // const laborTotal = laborSubtotal * qty;
  // const materialsTotal = materialsSell * qty;

  const laborTotal = laborSubtotal;
  const materialsTotal = materialsSell;

  const lineTotal = laborTotal + materialsTotal;

  const taxableLabor = !!item.taxable_labor;
  const taxableMaterials = !!item.taxable_materials;

  const taxableAmount =
    (taxableLabor ? laborTotal : 0) + (taxableMaterials ? materialsTotal : 0);

  return {
    qty,
    laborTotal,
    materialsTotal,
    lineTotal,
    taxableAmount,
  };
}

export default async function DocumentPublicPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;

  // 1) Fetch the document by token (RLS policy should allow only valid tokens)
  const docRes = await supabase
    .from("documents")
    .select("*")
    .eq("public_token", token)
    .maybeSingle<DocumentRow>();

  if (docRes.error) {
    // If you want to display a friendly message instead of 404, we can do that too.
    notFound();
  }

  const doc = docRes.data;
  if (!doc) notFound();

  // 2) Fetch groups (if you have them)
  const groupsRes = await supabase
    .from("document_groups")
    .select("*")
    .eq("document_id", doc.id)
    .order("sort_order", { ascending: true })
    .returns<GroupRow[]>();

  const groups = groupsRes.data ?? [];

  // 3) Fetch line items
  const itemsRes = await supabase
    .from("document_line_items")
    .select("*")
    .eq("document_id", doc.id)
    .returns<LineItemRow[]>();

  const items = (itemsRes.data ?? []).slice();

  // Sort: group first (null last), then sort_order, then created_at
  items.sort((a, b) => {
    const ga = a.group_id ?? "zzzz"; // push nulls to bottom
    const gb = b.group_id ?? "zzzz";
    if (ga < gb) return -1;
    if (ga > gb) return 1;

    const sa = num(a.sort_order, 0);
    const sb = num(b.sort_order, 0);
    if (sa !== sb) return sa - sb;

    const ca = a.created_at ?? "";
    const cb = b.created_at ?? "";
    return ca.localeCompare(cb);
  });

  // Index groups
  const groupLabel = (g: GroupRow) => g.name ?? g.title ?? "Group";
  const groupMap = new Map<string, GroupRow>();
  for (const g of groups) groupMap.set(g.id, g);

  // Build grouped output
  const grouped: Array<{ key: string; label: string; rows: LineItemRow[] }> = [];

  // Items with a group_id
  for (const g of groups) {
    const rows = items.filter((i) => i.group_id === g.id);
    if (rows.length) {
      grouped.push({ key: g.id, label: groupLabel(g), rows });
    }
  }

  // Items without group
  const ungrouped = items.filter((i) => !i.group_id);
  if (ungrouped.length) {
    grouped.push({ key: "ungrouped", label: "Items", rows: ungrouped });
  }

  // Totals
  let subtotal = 0;
  let taxableSubtotal = 0;

  for (const it of items) {
    const c = computeLine(it);
    subtotal += c.lineTotal;
    taxableSubtotal += c.taxableAmount;
  }

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 6 }}>Document</h1>

      <div style={{ marginBottom: 18, color: "#333" }}>
        <div>✅ Valid document link</div>
        <div style={{ marginTop: 10 }}>
          <strong>Kind:</strong> {doc.kind ?? "—"}
          <br />
          <strong>Number:</strong> {doc.number ?? "—"}
          <br />
          <strong>Status:</strong> {doc.status ?? "—"}
          <br />
          <strong>Job ID:</strong> {doc.job_id ?? "—"}
          <br />
          <strong>Token:</strong> {token}
        </div>
      </div>

      <hr style={{ margin: "18px 0" }} />

      {grouped.map((section) => (
        <section key={section.key} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 16, margin: "10px 0" }}>{section.label}</h2>

          <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
            {section.rows.map((it) => {
              const c = computeLine(it);
              return (
                <div
                  key={it.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 140px",
                    gap: 14,
                    padding: 14,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {it.title ?? "(no title)"}{" "}
                      <span style={{ fontWeight: 500, color: "#666" }}>
                        {it.item_type ? `• ${it.item_type}` : ""}
                      </span>
                    </div>

                    {it.description ? (
                      <div style={{ marginTop: 6, color: "#444", whiteSpace: "pre-wrap" }}>
                        {it.description}
                      </div>
                    ) : null}

                    <div style={{ marginTop: 8, color: "#555", fontSize: 13 }}>
                      <div>
                        <strong>Labor:</strong>{" "}
                        {money(c.laborTotal)}{" "}
                        {it.labor_hours ? `(${it.labor_hours} hrs @ ${money(num(it.labor_rate, 0))})` : ""}
                        {it.taxable_labor ? " • taxable" : ""}
                      </div>
                      <div>
                        <strong>Materials:</strong>{" "}
                        {money(c.materialsTotal)}{" "}
                        {it.materials_cost ? `(cost ${money(num(it.materials_cost, 0))} + ${num(it.materials_markup_pct, 0)}% markup)` : ""}
                        {it.taxable_materials ? " • taxable" : ""}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#666" }}>Line Total</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{money(c.lineTotal)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <hr style={{ margin: "18px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
        <div style={{ color: "#555" }}>
          <div>Subtotal (calculated):</div>
          <div>Taxable subtotal:</div>
          <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
            Note: We’re not calculating tax yet because we haven’t added a tax rate field/settings.
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800 }}>{money(subtotal)}</div>
          <div style={{ fontWeight: 800 }}>{money(taxableSubtotal)}</div>
        </div>
      </div>

      {typeof doc.total === "number" ? (
        <div style={{ marginTop: 12, color: "#666" }}>
          (Stored document total: <strong>{money(doc.total)}</strong>)
        </div>
      ) : null}
    </main>
  );
}
