import { useEffect, useMemo, useState } from "react";

"use client";


type PriceBookItem = {
    id: string;
    title: string | null;
    description: string | null;
    item_type: string | null;
    pricing_mode: string | null;
    default_qty: number | null;
    unit: string | null;
    default_unit: string | null;

    labor_rate: number | null;
    labor_hours: number | null;
    taxable_labor: boolean | null;

    materials_cost: number | null;
    materials_markup_pct: number | null;
    taxable_materials: boolean | null;

    created_at?: string | null;
};

type LineItemRow = {
    id: string;
    document_id: string;
    group_id: string | null;

    item_type: string | null;
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
    return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

export default function DocumentInternalEditorPage(props: {
    params: { id: string };
}) {
    const documentId = props.params.id;

    const [pbItems, setPbItems] = useState<PriceBookItem[]>([]);
    const [pbLoading, setPbLoading] = useState(true);
    const [pbError, setPbError] = useState<string | null>(null);

    const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
    const [liLoading, setLiLoading] = useState(true);
    const [liError, setLiError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [addingId, setAddingId] = useState<string | null>(null);

    async function loadPriceBook() {
        setPbLoading(true);
        setPbError(null);
        try {
            const res = await fetch("/api/price-book", { cache: "no-store" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Failed to load price book");
            setPbItems(json.items ?? []);
        } catch (e: any) {
            setPbError(e.message ?? "Failed to load price book");
        } finally {
            setPbLoading(false);
        }
    }

    async function loadLineItems() {
        setLiLoading(true);
        setLiError(null);
        try {
            const res = await fetch(`/api/documents/${documentId}/line-items`, {
                cache: "no-store",
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Failed to load line items");
            setLineItems(json.items ?? []);
        } catch (e: any) {
            setLiError(e.message ?? "Failed to load line items");
        } finally {
            setLiLoading(false);
        }
    }

    useEffect(() => {
        loadPriceBook();
        loadLineItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return pbItems;
        return pbItems.filter((it) => {
            const hay =
                `${it.title ?? ""} ${it.description ?? ""} ${it.item_type ?? ""} ${
                    it.pricing_mode ?? ""
                }`.toLowerCase();
            return hay.includes(q);
        });
    }, [pbItems, query]);

    async function addFromPriceBook(priceBookItemId: string) {
        setAddingId(priceBookItemId);
        try {
            const res = await fetch(`/api/documents/${documentId}/add-from-price-book`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priceBookItemId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Failed to add item");

            // refresh list (simple & reliable)
            await loadLineItems();
        } catch (e: any) {
            alert(e.message ?? "Failed to add item");
        } finally {
            setAddingId(null);
        }
    }

    return (
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
            <h1 style={{ marginBottom: 6 }}>Internal Document Editor</h1>
            <div style={{ color: "#555", marginBottom: 16 }}>
                Document ID: <strong>{documentId}</strong>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                {/* LEFT: Price Book */}
                <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
                    <h2 style={{ fontSize: 16, margin: "6px 0 10px" }}>Add from Price Book</h2>

                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search price book…"
                        style={{
                            width: "100%",
                            padding: 10,
                            border: "1px solid #ccc",
                            borderRadius: 10,
                            marginBottom: 12,
                        }}
                    />

                    {pbLoading ? <div>Loading price book…</div> : null}
                    {pbError ? <div style={{ color: "crimson" }}>{pbError}</div> : null}

                    {!pbLoading && !pbError ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {filtered.map((it) => (
                                <div
                                    key={it.id}
                                    style={{
                                        border: "1px solid #eee",
                                        borderRadius: 12,
                                        padding: 12,
                                        display: "grid",
                                        gridTemplateColumns: "1fr auto",
                                        gap: 12,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 800 }}>
                                            {it.title ?? "(no title)"}{" "}
                                            <span style={{ fontWeight: 500, color: "#666" }}>
                                                {it.item_type ? `• ${it.item_type}` : ""}
                                                {it.pricing_mode ? ` • ${it.pricing_mode}` : ""}
                                            </span>
                                        </div>

                                        {it.description ? (
                                            <div style={{ marginTop: 6, color: "#444" }}>{it.description}</div>
                                        ) : null}

                                        <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
                                            <div>
                                                <strong>Defaults:</strong>{" "}
                                                qty {num(it.default_qty, 1)}{" "}
                                                {it.unit ? it.unit : it.default_unit ? it.default_unit : ""}
                                            </div>
                                            <div>
                                                <strong>Labor:</strong>{" "}
                                                {money(num(it.labor_rate, 0))}
                                                {num(it.labor_hours, 0) ? ` • ${num(it.labor_hours, 0)} hrs` : ""}
                                            </div>
                                            <div>
                                                <strong>Materials:</strong>{" "}
                                                {money(num(it.materials_cost, 0))}{" "}
                                                {num(it.materials_markup_pct, 0)
                                                    ? ` • ${num(it.materials_markup_pct, 0)}% markup`
                                                    : ""}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <button
                                            onClick={() => addFromPriceBook(it.id)}
                                            disabled={!!addingId}
                                            style={{
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                border: "1px solid #222",
                                                background: addingId === it.id ? "#ddd" : "#111",
                                                color: addingId === it.id ? "#111" : "#fff",
                                                cursor: addingId ? "not-allowed" : "pointer",
                                                minWidth: 86,
                                            }}
                                        >
                                            {addingId === it.id ? "Adding…" : "Add"}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {filtered.length === 0 ? (
                                <div style={{ color: "#666" }}>No matches.</div>
                            ) : null}
                        </div>
                    ) : null}
                </section>

                {/* RIGHT: Current Line Items */}
                <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
                    <h2 style={{ fontSize: 16, margin: "6px 0 10px" }}>Current Document Line Items</h2>

                    {liLoading ? <div>Loading line items…</div> : null}
                    {liError ? <div style={{ color: "crimson" }}>{liError}</div> : null}

                    {!liLoading && !liError ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {lineItems.map((it) => (
                                <div
                                    key={it.id}
                                    style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}
                                >
                                    <div style={{ fontWeight: 800 }}>
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
                                    <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
                                        qty {num(it.qty, 1)} {it.unit ?? ""}
                                        {" • "}
                                        labor {money(num(it.labor_rate, 0))}{" "}
                                        {num(it.labor_hours, 0) ? `(${num(it.labor_hours, 0)} hrs)` : ""}
                                        {" • "}
                                        materials {money(num(it.materials_cost, 0))}{" "}
                                        {num(it.materials_markup_pct, 0)
                                            ? `(+${num(it.materials_markup_pct, 0)}%)`
                                            : ""}
                                    </div>
                                </div>
                            ))}

                            {lineItems.length === 0 ? (
                                <div style={{ color: "#666" }}>No line items yet.</div>
                            ) : null}
                        </div>
                    ) : null}
                </section>
            </div>
        </main>
    );
}