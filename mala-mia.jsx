import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Receipt, UserCheck, Boxes,
  Tag, Settings, Plus, Trash2, Pencil, X, Check, AlertTriangle, ChevronDown,
  ChevronRight, Search, RotateCcw, Ban,
} from "lucide-react";

/* ----------------------------- constantes ----------------------------- */

const STORAGE_KEY = "mala-mia-data-v1";
const LOCATIONS = ["Paraguai", "São Paulo", "Rio de Janeiro", "Outro"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const DEFAULT_DATA = {
  businessName: "Perfumes Exclusivos",
  settings: {
    expenseByLocation: { "Paraguai": 30, "São Paulo": 20, "Rio de Janeiro": 10, "Outro": 0 },
    defaultCommission: 10,
    lowStock: 2,
  },
  products: [],
  purchases: [],
  customers: [],
  resellers: [],
  sales: [],
  catalog: [],
};

/* ------------------------------ helpers -------------------------------- */

const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);
const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
const formatBRL = (v) => (num(v)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatUSD = (v) => (num(v)).toLocaleString("en-US", { style: "currency", currency: "USD" });
const formatDateBR = (s) => { if (!s) return "-"; const p = s.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s; };
const monthKey = (s) => (s ? s.slice(0, 7) : "");
const monthLabel = (key) => { if (!key) return "-"; const [y, m] = key.split("-"); return `${MESES[parseInt(m, 10) - 1]}/${y}`; };
const addMonths = (dateStr, n) => { const d = new Date(dateStr + "T00:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
const thisMonthKey = () => todayStr().slice(0, 7);
const clamp2 = (v) => Math.round(num(v) * 100) / 100;

function genInstallments(total, count, firstDate) {
  const n = Math.max(1, parseInt(count, 10) || 1);
  const base = clamp2(total / n);
  const rows = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const value = isLast ? clamp2(total - acc) : base;
    acc += value;
    rows.push({ n: i + 1, dueDate: addMonths(firstDate, i), value, status: "pendente", paidDate: null });
  }
  return rows;
}

function installmentDisplayStatus(inst) {
  if (inst.status === "pago") return "pago";
  if (inst.status === "cancelada") return "cancelada";
  if (inst.dueDate < todayStr()) return "atrasado";
  return "pendente";
}

/* --------------------------- pequenos átomos ---------------------------- */

const Field = ({ label, hint, children }) => (
  <label className="cc-field">
    <span className="cc-label">{label}</span>
    {children}
    {hint ? <span className="cc-hint">{hint}</span> : null}
  </label>
);

const Badge = ({ tone = "muted", children }) => <span className={`cc-badge cc-badge-${tone}`}>{children}</span>;

const StatusBadge = ({ status }) => {
  const map = {
    pago: { tone: "green", label: "Pago" },
    pendente: { tone: "gold", label: "Pendente" },
    atrasado: { tone: "red", label: "Atrasado" },
    cancelada: { tone: "muted", label: "Cancelada" },
    ativa: { tone: "green", label: "Ativa" },
    paga: { tone: "green", label: "Paga" },
  };
  const cfg = map[status] || { tone: "muted", label: status };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
};

const Kpi = ({ label, value, sub, tone }) => (
  <div className="cc-kpi">
    <div className="cc-kpi-label">{label}</div>
    <div className={`cc-kpi-value ${tone ? `cc-kpi-${tone}` : ""}`}>{value}</div>
    {sub ? <div className="cc-kpi-sub">{sub}</div> : null}
  </div>
);

const Section = ({ title, action, children }) => (
  <div className="cc-card">
    <div className="cc-section-head">
      <h2>{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const Empty = ({ text }) => <div className="cc-empty">{text}</div>;

const IconBtn = ({ onClick, title, children, danger }) => (
  <button type="button" onClick={onClick} title={title} className={`cc-iconbtn ${danger ? "cc-iconbtn-danger" : ""}`}>
    {children}
  </button>
);

/* -------------------------------- app ----------------------------------- */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(DEFAULT_DATA);
  const [tab, setTab] = useState("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveErr, setSaveErr] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r && r.value) {
          const parsed = JSON.parse(r.value);
          setData({ ...DEFAULT_DATA, ...parsed, settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) } });
        }
      } catch (e) { /* sem dados salvos ainda */ }
      setLoading(false);
    })();
  }, []);

  const save = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      window.storage.set(STORAGE_KEY, JSON.stringify(next)).catch(() => setSaveErr(true));
      return next;
    });
  }, []);

  const productsById = useMemo(() => Object.fromEntries(data.products.map((p) => [p.id, p])), [data.products]);
  const customersById = useMemo(() => Object.fromEntries(data.customers.map((c) => [c.id, c])), [data.customers]);
  const resellersById = useMemo(() => Object.fromEntries(data.resellers.map((r) => [r.id, r])), [data.resellers]);

  const activeSales = useMemo(() => data.sales.filter((s) => s.status === "ativa"), [data.sales]);

  /* ---------- comissões: por revendedora + mês da venda ---------- */
  const commissionRows = useMemo(() => {
    const rows = [];
    data.resellers.forEach((r) => {
      const months = Array.from(new Set(activeSales.filter((s) => s.resellerId === r.id).map((s) => monthKey(s.date))));
      months.sort();
      months.forEach((m) => {
        const salesInMonth = activeSales.filter((s) => s.resellerId === r.id && monthKey(s.date) === m);
        const totalVendido = salesInMonth.reduce((a, s) => a + num(s.total), 0);
        const pct = num(r.commissionPercent);
        const comissao = clamp2((totalVendido * pct) / 100);
        const saleIds = new Set(salesInMonth.map((s) => s.id));
        let recebidoParcela1 = 0;
        salesInMonth.forEach((s) => {
          (s.installments || []).forEach((i) => { if (i.n === 1 && i.status === "pago") recebidoParcela1 += num(i.value); });
        });
        const valorRevendedora = Math.min(recebidoParcela1, comissao);
        const situacao = comissao > 0 && valorRevendedora >= comissao ? "paga" : "pendente";
        rows.push({ resellerId: r.id, resellerName: r.name, month: m, totalVendido, comissao, recebidoParcela1, valorRevendedora, situacao, saleIds });
      });
    });
    return rows.sort((a, b) => (a.month < b.month ? 1 : -1));
  }, [data.resellers, activeSales]);

  /* -------------------------- mutações -------------------------- */

  const addCustomerQuick = (name) => {
    const c = { id: uid(), name: name.trim(), phone: "" };
    save((prev) => ({ ...prev, customers: [...prev.customers, c] }));
    return c;
  };

  const upsertProductFromPurchaseItem = (prev, item, ctx) => {
    const existingIdx = prev.products.findIndex(
      (p) => p.name.toLowerCase() === item.name.toLowerCase() && p.category.toLowerCase() === (item.category || "").toLowerCase()
    );
    const unitBRL = ctx.location === "Paraguai" ? num(item.unitValue) * num(ctx.dollarRate) : num(item.unitValue);
    const valorPago = clamp2(unitBRL * (1 + num(ctx.paymentFee) / 100));
    const custoFinal = clamp2(valorPago * (1 + num(ctx.expensePercent) / 100));
    const precoVenda = clamp2(valorPago * (2 + num(ctx.expensePercent) / 100));
    if (existingIdx >= 0) {
      const list = [...prev.products];
      const p = { ...list[existingIdx] };
      p.qty = num(p.qty) + num(item.qty);
      p.valorPago = valorPago; p.custoFinal = custoFinal; p.precoVenda = precoVenda;
      p.local = ctx.location; p.dataCompra = ctx.date; p.fornecedor = ctx.fornecedor || p.fornecedor;
      list[existingIdx] = p;
      return list;
    }
    const novo = {
      id: uid(), name: item.name, category: item.category || "Geral", qty: num(item.qty),
      valorPago, custoFinal, precoVenda, local: ctx.location, dataCompra: ctx.date,
      fornecedor: ctx.fornecedor || "",
    };
    return [...prev.products, novo];
  };

  const saveSettings = (patch) => save((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="cc-root cc-loading">
        <Style />
        <div className="cc-loading-text">Carregando seus dados…</div>
      </div>
    );
  }

  const NAV = [
    { id: "dashboard", label: "Painel", icon: LayoutDashboard },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "compras", label: "Compras", icon: ShoppingBag },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "vendas", label: "Vendas", icon: Receipt },
    { id: "revendedoras", label: "Revendedoras", icon: UserCheck },
    { id: "estoque", label: "Estoque", icon: Boxes },
    { id: "catalogo", label: "Catálogo Paraguai", icon: Tag },
  ];

  return (
    <div className="cc-root">
      <Style />
      <aside className="cc-sidebar">
        <div className="cc-brand">
          <div className="cc-brand-mark">MM</div>
          <div>
            <div className="cc-brand-title">Mala Mia</div>
            <div className="cc-brand-sub">{data.businessName}</div>
          </div>
        </div>
        <nav className="cc-nav">
          {NAV.map((n) => (
            <button key={n.id} className={`cc-nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
              <n.icon size={17} strokeWidth={1.8} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <button className="cc-nav-item cc-settings-btn" onClick={() => setSettingsOpen(true)}>
          <Settings size={17} strokeWidth={1.8} /> <span>Configurações</span>
        </button>
        {saveErr && <div className="cc-save-warn">Não consegui salvar agora. Seus dados ficam nesta sessão.</div>}
      </aside>

      <main className="cc-main">
        {tab === "dashboard" && <Dashboard data={data} activeSales={activeSales} commissionRows={commissionRows} />}
        {tab === "produtos" && <Produtos data={data} save={save} />}
        {tab === "compras" && <Compras data={data} save={save} upsertProductFromPurchaseItem={upsertProductFromPurchaseItem} />}
        {tab === "clientes" && <Clientes data={data} save={save} activeSales={activeSales} resellersById={resellersById} />}
        {tab === "vendas" && <Vendas data={data} save={save} productsById={productsById} addCustomerQuick={addCustomerQuick} />}
        {tab === "revendedoras" && <Revendedoras data={data} save={save} commissionRows={commissionRows} />}
        {tab === "estoque" && <Estoque data={data} activeSales={activeSales} />}
        {tab === "catalogo" && <Catalogo data={data} save={save} />}
      </main>

      {settingsOpen && (
        <SettingsModal data={data} saveSettings={saveSettings} onClose={() => setSettingsOpen(false)} onName={(n) => save((p) => ({ ...p, businessName: n }))} />
      )}
    </div>
  );
}

/* ============================== DASHBOARD ============================== */

function Dashboard({ data, activeSales, commissionRows }) {
  const [monthFilter, setMonthFilter] = useState("todos");

  const months = useMemo(() => Array.from(new Set(data.sales.map((s) => monthKey(s.date)))).sort(), [data.sales]);

  const salesInScope = useMemo(
    () => (monthFilter === "todos" ? activeSales : activeSales.filter((s) => monthKey(s.date) === monthFilter)),
    [activeSales, monthFilter]
  );

  const totalVendido = salesInScope.reduce((a, s) => a + num(s.total), 0);

  const allInstallments = useMemo(() => {
    const rows = [];
    activeSales.forEach((s) => (s.installments || []).forEach((i) => rows.push({ ...i, saleId: s.id, saleDate: s.date, saleMonth: monthKey(s.date) })));
    return rows;
  }, [activeSales]);

  const scopeInstallments = monthFilter === "todos" ? allInstallments : allInstallments.filter((i) => i.saleMonth === monthFilter);
  const totalRecebido = scopeInstallments.filter((i) => i.status === "pago").reduce((a, i) => a + num(i.value), 0);
  const totalAReceber = allInstallments.filter((i) => i.status !== "pago" && i.status !== "cancelada").reduce((a, i) => a + num(i.value), 0);
  const totalAtrasado = allInstallments.filter((i) => installmentDisplayStatus(i) === "atrasado").reduce((a, i) => a + num(i.value), 0);
  const unidadesEmEstoque = data.products.reduce((a, p) => a + num(p.qty), 0);
  const lowStockCount = data.products.filter((p) => num(p.qty) <= num(data.settings.lowStock)).length;

  const comissoesPendentes = commissionRows.filter((r) => r.situacao === "pendente").reduce((a, r) => a + (r.comissao - r.valorRevendedora), 0);

  const rankingRevendedoras = useMemo(() => {
    const map = {};
    activeSales.forEach((s) => { if (!s.resellerId) return; map[s.resellerId] = (map[s.resellerId] || 0) + num(s.total); });
    return Object.entries(map)
      .map(([id, total]) => ({ name: data.resellers.find((r) => r.id === id)?.name || "—", total }))
      .sort((a, b) => b.total - a.total);
  }, [activeSales, data.resellers]);

  const productSales = useMemo(() => {
    const map = {};
    activeSales.forEach((s) => (s.items || []).forEach((it) => { map[it.name] = (map[it.name] || 0) + num(it.qty); }));
    return Object.entries(map).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
  }, [activeSales]);

  const maisVendidos = productSales.slice(0, 5);
  const menosVendidos = [...productSales].sort((a, b) => a.qty - b.qty).slice(0, 5);

  const evolucaoMensal = useMemo(() => {
    const map = {};
    activeSales.forEach((s) => { const k = monthKey(s.date); map[k] = (map[k] || 0) + num(s.total); });
    return Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => ({ mes: monthLabel(k), total: v }));
  }, [activeSales]);

  return (
    <div className="cc-page">
      <div className="cc-page-head">
        <div>
          <h1>Painel</h1>
          <p className="cc-page-sub">Visão geral do negócio, na hora.</p>
        </div>
        <Field label="Período">
          <select className="cc-input" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="todos">Todos os meses</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </Field>
      </div>

      <div className="cc-kpi-grid">
        <Kpi label="Total vendido" value={formatBRL(totalVendido)} />
        <Kpi label="Total recebido" value={formatBRL(totalRecebido)} tone="green" />
        <Kpi label="A receber" value={formatBRL(totalAReceber)} tone="gold" />
        <Kpi label="Atrasado" value={formatBRL(totalAtrasado)} tone="red" />
        <Kpi label="Unidades em estoque" value={unidadesEmEstoque} sub={lowStockCount ? `${lowStockCount} produto(s) em estoque baixo` : "Estoque saudável"} />
        <Kpi label="Comissões pendentes" value={formatBRL(comissoesPendentes)} tone="gold" />
      </div>

      <div className="cc-grid-2">
        <Section title="Evolução das vendas por mês">
          {evolucaoMensal.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evolucaoMensal}>
                <CartesianGrid stroke="#E7D6C4" vertical={false} />
                <XAxis dataKey="mes" stroke="#8B6F5D" fontSize={12} />
                <YAxis stroke="#8B6F5D" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E7D6C4", fontFamily: "Inter, sans-serif" }} />
                <Line type="monotone" dataKey="total" stroke="#C6A15B" strokeWidth={2.5} dot={{ r: 3 }} name="Vendido" />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty text="Ainda não há vendas registradas para mostrar aqui." />}
        </Section>

        <Section title="Ranking de revendedoras">
          {rankingRevendedoras.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rankingRevendedoras} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="#E7D6C4" horizontal={false} />
                <XAxis type="number" stroke="#8B6F5D" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#3B2430" fontSize={12} width={100} />
                <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E7D6C4", fontFamily: "Inter, sans-serif" }} />
                <Bar dataKey="total" fill="#4F7A5D" radius={[0, 4, 4, 0]} name="Vendido" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Cadastre revendedoras e vendas para ver o ranking." />}
        </Section>
      </div>

      <div className="cc-grid-2">
        <Section title="Itens mais vendidos">
          {maisVendidos.length ? (
            <ul className="cc-rank-list">
              {maisVendidos.map((p, i) => (
                <li key={p.name}><span className="cc-rank-num">{i + 1}</span><span className="cc-rank-name">{p.name}</span><span className="cc-rank-val">{p.qty} un.</span></li>
              ))}
            </ul>
          ) : <Empty text="Sem vendas registradas ainda." />}
        </Section>
        <Section title="Itens menos vendidos">
          {menosVendidos.length ? (
            <ul className="cc-rank-list">
              {menosVendidos.map((p, i) => (
                <li key={p.name}><span className="cc-rank-num">{i + 1}</span><span className="cc-rank-name">{p.name}</span><span className="cc-rank-val">{p.qty} un.</span></li>
              ))}
            </ul>
          ) : <Empty text="Sem vendas registradas ainda." />}
        </Section>
      </div>
    </div>
  );
}

/* ============================== PRODUTOS ============================== */

function Produtos({ data, save }) {
  const blank = { name: "", category: "", qty: 0, valorPago: 0, custoFinal: 0, precoVenda: 0, local: "Paraguai", dataCompra: todayStr(), fornecedor: "" };
  const [form, setForm] = useState(null);
  const [q, setQ] = useState("");

  const list = data.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.category || "").toLowerCase().includes(q.toLowerCase()));

  const submit = () => {
    if (!form.name.trim()) return;
    save((prev) => {
      const exists = prev.products.some((p) => p.id === form.id);
      return { ...prev, products: exists ? prev.products.map((p) => (p.id === form.id ? form : p)) : [...prev.products, { ...form, id: uid() }] };
    });
    setForm(null);
  };

  const remove = (id) => save((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== id) }));

  return (
    <div className="cc-page">
      <div className="cc-page-head">
        <div><h1>Produtos</h1><p className="cc-page-sub">Seu catálogo completo, com preços sempre editáveis.</p></div>
        <button className="cc-btn cc-btn-primary" onClick={() => setForm(blank)}><Plus size={16} /> Novo produto</button>
      </div>

      <div className="cc-search"><Search size={15} /><input placeholder="Buscar por nome ou categoria…" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      <Section title={`Produtos cadastrados (${list.length})`}>
        {list.length ? (
          <table className="cc-table">
            <thead><tr><th>Nome</th><th>Categoria</th><th>Estoque</th><th>Paguei</th><th>Custo final</th><th>Preço venda</th><th>Local</th><th></th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="cc-strong">{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.qty <= num(data.settings.lowStock) ? <Badge tone={p.qty === 0 ? "red" : "gold"}>{p.qty}</Badge> : p.qty}</td>
                  <td>{formatBRL(p.valorPago)}</td>
                  <td>{formatBRL(p.custoFinal)}</td>
                  <td className="cc-strong">{formatBRL(p.precoVenda)}</td>
                  <td>{p.local}</td>
                  <td className="cc-row-actions">
                    <IconBtn title="Editar" onClick={() => setForm(p)}><Pencil size={15} /></IconBtn>
                    <IconBtn title="Excluir" danger onClick={() => remove(p.id)}><Trash2 size={15} /></IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty text="Nenhum produto ainda. Cadastre manualmente aqui ou lance uma compra na aba Compras." />}
      </Section>

      {form && (
        <Modal title={form.id ? "Editar produto" : "Novo produto"} onClose={() => setForm(null)}>
          <div className="cc-form-grid">
            <Field label="Nome do produto"><input className="cc-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Categoria"><input className="cc-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <Field label="Quantidade em estoque"><input type="number" className="cc-input" value={form.qty} onChange={(e) => setForm({ ...form, qty: num(e.target.value) })} /></Field>
            <Field label="Valor que paguei"><input type="number" step="0.01" className="cc-input" value={form.valorPago} onChange={(e) => setForm({ ...form, valorPago: num(e.target.value) })} /></Field>
            <Field label="Custo final" hint="Inclui despesas de viagem/local"><input type="number" step="0.01" className="cc-input" value={form.custoFinal} onChange={(e) => setForm({ ...form, custoFinal: num(e.target.value) })} /></Field>
            <Field label="Preço de venda" hint="Sugerido pelo sistema — sempre editável"><input type="number" step="0.01" className="cc-input" value={form.precoVenda} onChange={(e) => setForm({ ...form, precoVenda: num(e.target.value) })} /></Field>
            <Field label="Local da compra">
              <select className="cc-input" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })}>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Data da compra"><input type="date" className="cc-input" value={form.dataCompra} onChange={(e) => setForm({ ...form, dataCompra: e.target.value })} /></Field>
            <Field label="Fornecedor (opcional)"><input className="cc-input" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></Field>
          </div>
          <div className="cc-modal-actions"><button className="cc-btn cc-btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="cc-btn cc-btn-primary" onClick={submit}><Check size={16} /> Salvar</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== COMPRAS ============================== */

function Compras({ data, save, upsertProductFromPurchaseItem }) {
  const emptyItem = () => ({ id: uid(), name: "", category: "", qty: 1, unitValue: 0 });
  const blank = () => ({
    date: todayStr(), invoiceNumber: "", location: "Paraguai", dollarRate: 0, paymentMethod: "Dinheiro",
    paymentFee: 0, expensePercent: data.settings.expenseByLocation["Paraguai"] || 0, fornecedor: "",
    items: [emptyItem()],
  });
  const [form, setForm] = useState(null);

  const openNew = () => setForm(blank());

  const updateItem = (id, patch) => setForm((f) => ({ ...f, items: f.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (id) => setForm((f) => ({ ...f, items: f.items.filter((it) => it.id !== id) }));

  const onLocationChange = (loc) => setForm((f) => ({ ...f, location: loc, expensePercent: data.settings.expenseByLocation[loc] ?? f.expensePercent }));

  const totalPurchaseBRL = form ? form.items.reduce((a, it) => {
    const unitBRL = form.location === "Paraguai" ? num(it.unitValue) * num(form.dollarRate) : num(it.unitValue);
    return a + unitBRL * num(it.qty) * (1 + num(form.paymentFee) / 100);
  }, 0) : 0;

  const submit = () => {
    if (!form.items.some((i) => i.name.trim())) return;
    const purchase = { id: uid(), ...form, totalBRL: clamp2(totalPurchaseBRL) };
    save((prev) => {
      let products = prev.products;
      form.items.filter((i) => i.name.trim()).forEach((item) => {
        products = upsertProductFromPurchaseItem({ ...prev, products }, item, form);
      });
      return { ...prev, products, purchases: [...prev.purchases, purchase] };
    });
    setForm(null);
  };

  return (
    <div className="cc-page">
      <div className="cc-page-head">
        <div><h1>Compras e notas fiscais</h1><p className="cc-page-sub">Cotação do dólar e taxas sempre informadas na hora, nunca fixas.</p></div>
        <button className="cc-btn cc-btn-primary" onClick={openNew}><Plus size={16} /> Lançar compra</button>
      </div>

      <Section title={`Compras lançadas (${data.purchases.length})`}>
        {data.purchases.length ? (
          <table className="cc-table">
            <thead><tr><th>Data</th><th>Nota</th><th>Local</th><th>Cotação US$</th><th>Taxa</th><th>Despesa %</th><th>Itens</th><th>Total</th></tr></thead>
            <tbody>
              {[...data.purchases].sort((a, b) => (a.date < b.date ? 1 : -1)).map((p) => (
                <tr key={p.id}>
                  <td>{formatDateBR(p.date)}</td>
                  <td>{p.invoiceNumber || "-"}</td>
                  <td>{p.location}</td>
                  <td>{p.location === "Paraguai" ? p.dollarRate : "-"}</td>
                  <td>{p.paymentFee}%</td>
                  <td>{p.expensePercent}%</td>
                  <td>{p.items.filter((i) => i.name).length}</td>
                  <td className="cc-strong">{formatBRL(p.totalBRL)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty text="Nenhuma compra lançada ainda. Ao lançar, os produtos entram automaticamente no estoque." />}
      </Section>

      {form && (
        <Modal title="Lançar compra / nota fiscal" onClose={() => setForm(null)} wide>
          <div className="cc-form-grid">
            <Field label="Data da compra"><input type="date" className="cc-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Nota fiscal"><input className="cc-input" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></Field>
            <Field label="Local da compra">
              <select className="cc-input" value={form.location} onChange={(e) => onLocationChange(e.target.value)}>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            {form.location === "Paraguai" && (
              <Field label="Cotação do dólar (paga nesta viagem)" hint="Não fica fixa — informe a cada viagem">
                <input type="number" step="0.01" className="cc-input" value={form.dollarRate} onChange={(e) => setForm({ ...form, dollarRate: num(e.target.value) })} />
              </Field>
            )}
            <Field label="Forma de pagamento">
              <select className="cc-input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <option>Dinheiro</option><option>Pix</option><option>Cartão</option><option>Outro</option>
              </select>
            </Field>
            <Field label="Taxa de pagamento (%)" hint="Ex.: taxa do Pix, quando houver"><input type="number" step="0.01" className="cc-input" value={form.paymentFee} onChange={(e) => setForm({ ...form, paymentFee: num(e.target.value) })} /></Field>
            <Field label="% de despesas/custos" hint="Padrão por local, mas editável agora"><input type="number" step="0.01" className="cc-input" value={form.expensePercent} onChange={(e) => setForm({ ...form, expensePercent: num(e.target.value) })} /></Field>
            <Field label="Fornecedor (opcional)"><input className="cc-input" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></Field>
          </div>

          <div className="cc-subhead">Produtos da nota</div>
          <table className="cc-table cc-table-compact">
            <thead><tr><th>Produto</th><th>Categoria</th><th>Qtd</th><th>Valor unit. ({form.location === "Paraguai" ? "US$" : "R$"})</th><th></th></tr></thead>
            <tbody>
              {form.items.map((it) => (
                <tr key={it.id}>
                  <td><input className="cc-input" value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} /></td>
                  <td><input className="cc-input" value={it.category} onChange={(e) => updateItem(it.id, { category: e.target.value })} /></td>
                  <td><input type="number" className="cc-input cc-input-sm" value={it.qty} onChange={(e) => updateItem(it.id, { qty: num(e.target.value) })} /></td>
                  <td><input type="number" step="0.01" className="cc-input cc-input-sm" value={it.unitValue} onChange={(e) => updateItem(it.id, { unitValue: num(e.target.value) })} /></td>
                  <td><IconBtn title="Remover" danger onClick={() => removeItem(it.id)}><Trash2 size={15} /></IconBtn></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={addItem}><Plus size={14} /> Adicionar item</button>

          <div className="cc-total-line">Total estimado da compra: <strong>{formatBRL(totalPurchaseBRL)}</strong></div>

          <div className="cc-modal-actions"><button className="cc-btn cc-btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="cc-btn cc-btn-primary" onClick={submit}><Check size={16} /> Salvar compra</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== CLIENTES ============================== */

function Clientes({ data, save, activeSales, resellersById }) {
  const [form, setForm] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [q, setQ] = useState("");

  const list = data.customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  const submit = () => {
    if (!form.name.trim()) return;
    save((prev) => {
      const exists = prev.customers.some((c) => c.id === form.id);
      return { ...prev, customers: exists ? prev.customers.map((c) => (c.id === form.id ? form : c)) : [...prev.customers, { ...form, id: uid() }] };
    });
    setForm(null);
  };
  const remove = (id) => save((prev) => ({ ...prev, customers: prev.customers.filter((c) => c.id !== id) }));

  const summaryFor = (customerId) => {
    const sales = activeSales.filter((s) => s.customerId === customerId);
    let devendo = 0, atrasado = 0, pago = 0;
    sales.forEach((s) => (s.installments || []).forEach((i) => {
      if (i.status === "cancelada") return;
      if (i.status === "pago") pago += num(i.value);
      else { devendo += num(i.value); if (installmentDisplayStatus(i) === "atrasado") atrasado += num(i.value); }
    }));
    return { sales, devendo, atrasado, pago };
  };

  return (
    <div className="cc-page">
      <div className="cc-page-head">
        <div><h1>Clientes</h1><p className="cc-page-sub">Histórico completo de compras e parcelas de cada cliente.</p></div>
        <button className="cc-btn cc-btn-primary" onClick={() => setForm({ name: "", phone: "" })}><Plus size={16} /> Nova cliente</button>
      </div>

      <div className="cc-search"><Search size={15} /><input placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      <Section title={`Clientes cadastradas (${list.length})`}>
        {list.length ? list.map((c) => {
          const sum = summaryFor(c.id);
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} className="cc-expand-row">
              <button className="cc-expand-head" onClick={() => setExpanded(isOpen ? null : c.id)}>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="cc-strong">{c.name}</span>
                <span className="cc-muted">{c.phone}</span>
                <span className="cc-spacer" />
                {sum.atrasado > 0 && <Badge tone="red">{formatBRL(sum.atrasado)} atrasado</Badge>}
                <Badge tone="gold">deve {formatBRL(sum.devendo)}</Badge>
                <IconBtn title="Editar" onClick={(e) => { e.stopPropagation(); setForm(c); }}><Pencil size={15} /></IconBtn>
                <IconBtn title="Excluir" danger onClick={(e) => { e.stopPropagation(); remove(c.id); }}><Trash2 size={15} /></IconBtn>
              </button>
              {isOpen && (
                <div className="cc-expand-body">
                  {sum.sales.length ? sum.sales.map((s) => (
                    <div key={s.id} className="cc-mini-card">
                      <div className="cc-mini-head">
                        <span>{formatDateBR(s.date)}</span>
                        <span className="cc-strong">{formatBRL(s.total)}</span>
                        {s.resellerId && <span className="cc-muted">via {resellersById[s.resellerId]?.name}</span>}
                      </div>
                      <div className="cc-items-line">{(s.items || []).map((it) => `${it.qty}x ${it.name}`).join(", ")}</div>
                      <table className="cc-table cc-table-compact">
                        <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th></tr></thead>
                        <tbody>
                          {(s.installments || []).map((i) => (
                            <tr key={i.n}><td>{i.n}</td><td>{formatDateBR(i.dueDate)}</td><td>{formatBRL(i.value)}</td><td><StatusBadge status={installmentDisplayStatus(i)} /></td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )) : <Empty text="Nenhuma compra registrada para esta cliente." />}
                </div>
              )}
            </div>
          );
        }) : <Empty text="Nenhuma cliente cadastrada ainda." />}
      </Section>

      {form && (
        <Modal title={form.id ? "Editar cliente" : "Nova cliente"} onClose={() => setForm(null)}>
          <div className="cc-form-grid">
            <Field label="Nome"><input className="cc-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Telefone (opcional)"><input className="cc-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <div className="cc-modal-actions"><button className="cc-btn cc-btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="cc-btn cc-btn-primary" onClick={submit}><Check size={16} /> Salvar</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== VENDAS ============================== */

function Vendas({ data, save, productsById, addCustomerQuick }) {
  const blank = () => ({
    date: todayStr(), customerId: "", newCustomerName: "", resellerId: "",
    items: [{ id: uid(), productId: "", qty: 1, price: 0 }],
    installmentsCount: 1, firstDueDate: addMonths(todayStr(), 1), installments: null,
  });
  const [form, setForm] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const updateItem = (id, patch) => setForm((f) => ({ ...f, items: f.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { id: uid(), productId: "", qty: 1, price: 0 }] }));
  const removeItem = (id) => setForm((f) => ({ ...f, items: f.items.filter((it) => it.id !== id) }));

  const onPickProduct = (id, productId) => {
    const p = productsById[productId];
    updateItem(id, { productId, price: p ? p.precoVenda : 0 });
  };

  const total = form ? form.items.reduce((a, it) => a + num(it.qty) * num(it.price), 0) : 0;

  const gerarParcelas = () => setForm((f) => ({ ...f, installments: genInstallments(total, f.installmentsCount, f.firstDueDate) }));

  const updateInstallment = (n, patch) => setForm((f) => ({ ...f, installments: f.installments.map((i) => (i.n === n ? { ...i, ...patch } : i)) }));

  const submit = () => {
    if (!form.items.some((i) => i.productId)) return;
    let customerId = form.customerId;
    save((prev) => {
      let customers = prev.customers;
      if (!customerId && form.newCustomerName.trim()) {
        const c = { id: uid(), name: form.newCustomerName.trim(), phone: "" };
        customers = [...customers, c]; customerId = c.id;
      }
      const installments = form.installments && form.installments.length ? form.installments : genInstallments(total, form.installmentsCount, form.firstDueDate);
      const items = form.items.filter((i) => i.productId).map((i) => ({ ...i, name: productsById[i.productId]?.name || "?" }));
      const products = prev.products.map((p) => {
        const it = items.find((i) => i.productId === p.id);
        return it ? { ...p, qty: Math.max(0, num(p.qty) - num(it.qty)) } : p;
      });
      const sale = { id: uid(), date: form.date, customerId, resellerId: form.resellerId || null, items, total: clamp2(total), installments, status: "ativa" };
      return { ...prev, customers, products, sales: [...prev.sales, sale] };
    });
    setForm(null);
  };

  const toggleInstallmentPaid = (saleId, n) => save((prev) => ({
    ...prev,
    sales: prev.sales.map((s) => s.id !== saleId ? s : {
      ...s,
      installments: s.installments.map((i) => i.n !== n ? i : (i.status === "pago" ? { ...i, status: "pendente", paidDate: null } : { ...i, status: "pago", paidDate: todayStr() })),
    }),
  }));

  const cancelSale = (saleId) => save((prev) => {
    const sale = prev.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === "cancelada") return prev;
    const products = prev.products.map((p) => {
      const it = sale.items.find((i) => i.productId === p.id);
      return it ? { ...p, qty: num(p.qty) + num(it.qty) } : p;
    });
    const sales = prev.sales.map((s) => s.id !== saleId ? s : { ...s, status: "cancelada", installments: s.installments.map((i) => ({ ...i, status: i.status === "pago" ? i.status : "cancelada" })) });
    return { ...prev, products, sales };
  });

  return (
    <div className="cc-page">
      <div className="cc-page-head">
        <div><h1>Vendas</h1><p className="cc-page-sub">Vendas parceladas, no caderno, do jeito que você já trabalha.</p></div>
        <button className="cc-btn cc-btn-primary" onClick={() => setForm(blank())}><Plus size={16} /> Nova venda</button>
      </div>

      <Section title={`Vendas registradas (${data.sales.length})`}>
        {data.sales.length ? [...data.sales].sort((a, b) => (a.date < b.date ? 1 : -1)).map((s) => {
          const customer = data.customers.find((c) => c.id === s.customerId);
          const reseller = data.resellers.find((r) => r.id === s.resellerId);
          const isOpen = expanded === s.id;
          const pago = (s.installments || []).filter((i) => i.status === "pago").reduce((a, i) => a + num(i.value), 0);
          return (
            <div key={s.id} className="cc-expand-row">
              <button className="cc-expand-head" onClick={() => setExpanded(isOpen ? null : s.id)}>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>{formatDateBR(s.date)}</span>
                <span className="cc-strong">{customer?.name || "Cliente removida"}</span>
                {reseller && <span className="cc-muted">via {reseller.name}</span>}
                <span className="cc-spacer" />
                <span className="cc-strong">{formatBRL(s.total)}</span>
                {s.status === "cancelada" ? <StatusBadge status="cancelada" /> : <Badge tone="green">recebido {formatBRL(pago)}</Badge>}
              </button>
              {isOpen && (
                <div className="cc-expand-body">
                  <div className="cc-items-line">{(s.items || []).map((it) => `${it.qty}x ${it.name} (${formatBRL(it.price)})`).join(", ")}</div>
                  <table className="cc-table cc-table-compact">
                    <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th></th></tr></thead>
                    <tbody>
                      {(s.installments || []).map((i) => (
                        <tr key={i.n}>
                          <td>{i.n}</td><td>{formatDateBR(i.dueDate)}</td><td>{formatBRL(i.value)}</td>
                          <td><StatusBadge status={installmentDisplayStatus(i)} /></td>
                          <td>{s.status === "ativa" && i.status !== "cancelada" && (
                            <button className="cc-btn cc-btn-sm cc-btn-secondary" onClick={() => toggleInstallmentPaid(s.id, i.n)}>
                              {i.status === "pago" ? "Desfazer" : "Marcar pago"}
                            </button>
                          )}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {s.status === "ativa" && (
                    confirmCancel === s.id ? (
                      <div className="cc-confirm">
                        <AlertTriangle size={15} /> Cancelar esta venda e devolver o estoque?
                        <button className="cc-btn cc-btn-sm cc-btn-danger" onClick={() => { cancelSale(s.id); setConfirmCancel(null); }}>Sim, cancelar</button>
                        <button className="cc-btn cc-btn-sm cc-btn-secondary" onClick={() => setConfirmCancel(null)}>Voltar</button>
                      </div>
                    ) : (
                      <button className="cc-btn cc-btn-sm cc-btn-secondary" onClick={() => setConfirmCancel(s.id)}><Ban size={14} /> Cancelar venda</button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        }) : <Empty text="Nenhuma venda registrada ainda." />}
      </Section>

      {form && (
        <Modal title="Nova venda" onClose={() => setForm(null)} wide>
          <div className="cc-form-grid">
            <Field label="Data da venda"><input type="date" className="cc-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Cliente">
              <select className="cc-input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">— nova cliente abaixo —</option>
                {data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {!form.customerId && <Field label="Ou cadastrar cliente nova"><input className="cc-input" placeholder="Nome da cliente" value={form.newCustomerName} onChange={(e) => setForm({ ...form, newCustomerName: e.target.value })} /></Field>}
            <Field label="Revendedora (opcional)">
              <select className="cc-input" value={form.resellerId} onChange={(e) => setForm({ ...form, resellerId: e.target.value })}>
                <option value="">Venda direta</option>
                {data.resellers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="cc-subhead">Produtos da venda</div>
          <table className="cc-table cc-table-compact">
            <thead><tr><th>Produto</th><th>Qtd</th><th>Preço unit.</th><th></th></tr></thead>
            <tbody>
              {form.items.map((it) => {
                const p = productsById[it.productId];
                return (
                  <tr key={it.id}>
                    <td>
                      <select className="cc-input" value={it.productId} onChange={(e) => onPickProduct(it.id, e.target.value)}>
                        <option value="">Selecione…</option>
                        {data.products.map((pr) => <option key={pr.id} value={pr.id} disabled={pr.qty <= 0 && pr.id !== it.productId}>{pr.name} ({pr.qty} em estoque)</option>)}
                      </select>
                    </td>
                    <td><input type="number" min="1" className="cc-input cc-input-sm" value={it.qty} onChange={(e) => updateItem(it.id, { qty: num(e.target.value) })} /></td>
                    <td><input type="number" step="0.01" className="cc-input cc-input-sm" value={it.price} onChange={(e) => updateItem(it.id, { price: num(e.target.value) })} /></td>
                    <td><IconBtn title="Remover" danger onClick={() => removeItem(it.id)}><Trash2 size={15} /></IconBtn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={addItem}><Plus size={14} /> Adicionar produto</button>

          <div className="cc-total-line">Total da venda: <strong>{formatBRL(total)}</strong></div>

          <div className="cc-subhead">Parcelamento</div>
          <div className="cc-form-grid">
            <Field label="Quantidade de parcelas"><input type="number" min="1" className="cc-input" value={form.installmentsCount} onChange={(e) => setForm({ ...form, installmentsCount: num(e.target.value) })} /></Field>
            <Field label="Data da 1ª parcela"><input type="date" className="cc-input" value={form.firstDueDate} onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })} /></Field>
            <div className="cc-field" style={{ justifyContent: "flex-end" }}><button className="cc-btn cc-btn-secondary" onClick={gerarParcelas}><RotateCcw size={14} /> Gerar/Atualizar parcelas</button></div>
          </div>

          {form.installments && (
            <table className="cc-table cc-table-compact">
              <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th></tr></thead>
              <tbody>
                {form.installments.map((i) => (
                  <tr key={i.n}>
                    <td>{i.n}</td>
                    <td><input type="date" className="cc-input cc-input-sm" value={i.dueDate} onChange={(e) => updateInstallment(i.n, { dueDate: e.target.value })} /></td>
                    <td><input type="number" step="0.01" className="cc-input cc-input-sm" value={i.value} onChange={(e) => updateInstallment(i.n, { value: num(e.target.value) })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="cc-modal-actions"><button className="cc-btn cc-btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="cc-btn cc-btn-primary" onClick={submit}><Check size={16} /> Registrar venda</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== REVENDEDORAS ============================== */

function Revendedoras({ data, save, commissionRows }) {
  const [form, setForm] = useState(null);
  const [openReseller, setOpenReseller] = useState(null);

  const submit = () => {
    if (!form.name.trim()) return;
    save((prev) => {
      const exists = prev.resellers.some((r) => r.id === form.id);
      return { ...prev, resellers: exists ? prev.resellers.map((r) => (r.id === form.id ? form : r)) : [...prev.resellers, { ...form, id: uid() }] };
    });
    setForm(null);
  };
  const remove = (id) => save((prev) => ({ ...prev, resellers: prev.resellers.filter((r) => r.id !== id) }));

  return (
    <div className="cc-page">
      <div className="cc-page-head">
        <div><h1>Revendedoras</h1><p className="cc-page-sub">Comissão calculada sobre o total vendido no mês, quitada nas primeiras parcelas do mês seguinte.</p></div>
        <button className="cc-btn cc-btn-primary" onClick={() => setForm({ name: "", commissionPercent: data.settings.defaultCommission, phone: "" })}><Plus size={16} /> Nova revendedora</button>
      </div>

      <Section title={`Revendedoras cadastradas (${data.resellers.length})`}>
        {data.resellers.length ? data.resellers.map((r) => {
          const rows = commissionRows.filter((c) => c.resellerId === r.id);
          const isOpen = openReseller === r.id;
          const totalGeral = rows.reduce((a, c) => a + c.totalVendido, 0);
          const pendente = rows.filter((c) => c.situacao === "pendente").reduce((a, c) => a + (c.comissao - c.valorRevendedora), 0);
          return (
            <div key={r.id} className="cc-expand-row">
              <button className="cc-expand-head" onClick={() => setOpenReseller(isOpen ? null : r.id)}>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="cc-strong">{r.name}</span>
                <span className="cc-muted">{r.commissionPercent}% de comissão</span>
                <span className="cc-spacer" />
                <span className="cc-muted">vendeu {formatBRL(totalGeral)}</span>
                {pendente > 0 && <Badge tone="gold">{formatBRL(pendente)} a receber</Badge>}
                <IconBtn title="Editar" onClick={(e) => { e.stopPropagation(); setForm(r); }}><Pencil size={15} /></IconBtn>
                <IconBtn title="Excluir" danger onClick={(e) => { e.stopPropagation(); remove(r.id); }}><Trash2 size={15} /></IconBtn>
              </button>
              {isOpen && (
                <div className="cc-expand-body">
                  {rows.length ? (
                    <table className="cc-table cc-table-compact">
                      <thead><tr><th>Mês da venda</th><th>Total vendido</th><th>Comissão ({r.commissionPercent}%)</th><th>Recebido (1ª parcela)</th><th>Situação</th></tr></thead>
                      <tbody>
                        {rows.map((c) => (
                          <tr key={c.month}>
                            <td>{monthLabel(c.month)}</td><td>{formatBRL(c.totalVendido)}</td><td>{formatBRL(c.comissao)}</td>
                            <td>{formatBRL(c.valorRevendedora)}</td><td><StatusBadge status={c.situacao} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <Empty text="Ainda sem vendas registradas para esta revendedora." />}
                </div>
              )}
            </div>
          );
        }) : <Empty text="Nenhuma revendedora cadastrada ainda." />}
      </Section>

      {form && (
        <Modal title={form.id ? "Editar revendedora" : "Nova revendedora"} onClose={() => setForm(null)}>
          <div className="cc-form-grid">
            <Field label="Nome"><input className="cc-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="% de comissão" hint="Editável a qualquer momento"><input type="number" step="0.1" className="cc-input" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: num(e.target.value) })} /></Field>
          </div>
          <div className="cc-modal-actions"><button className="cc-btn cc-btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="cc-btn cc-btn-primary" onClick={submit}><Check size={16} /> Salvar</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== ESTOQUE ============================== */

function Estoque({ data, activeSales }) {
  const [openId, setOpenId] = useState(null);

  const movementsFor = (product) => {
    const rows = [];
    data.purchases.forEach((p) => p.items.forEach((it) => { if (it.name.toLowerCase() === product.name.toLowerCase()) rows.push({ date: p.date, tipo: "Entrada", qty: it.qty, ref: `Nota ${p.invoiceNumber || "-"}` }); }));
    activeSales.forEach((s) => (s.items || []).forEach((it) => { if (it.productId === product.id) rows.push({ date: s.date, tipo: "Saída", qty: it.qty, ref: "Venda" }); }));
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  };

  const totalUnidades = data.products.reduce((a, p) => a + num(p.qty), 0);
  const totalEntradas = data.purchases.reduce((a, p) => a + p.items.reduce((x, i) => x + num(i.qty), 0), 0);
  const totalSaidas = activeSales.reduce((a, s) => a + (s.items || []).reduce((x, i) => x + num(i.qty), 0), 0);
  const baixoOuZerado = data.products.filter((p) => num(p.qty) <= num(data.settings.lowStock));

  return (
    <div className="cc-page">
      <div className="cc-page-head"><div><h1>Estoque</h1><p className="cc-page-sub">Quantidade atual, movimentação e alertas de reposição.</p></div></div>

      <div className="cc-kpi-grid">
        <Kpi label="Unidades em estoque" value={totalUnidades} />
        <Kpi label="Total de entradas" value={totalEntradas} tone="green" />
        <Kpi label="Total de saídas (vendas)" value={totalSaidas} />
        <Kpi label="Estoque baixo ou zerado" value={baixoOuZerado.length} tone={baixoOuZerado.length ? "red" : undefined} />
      </div>

      <Section title="Produtos em estoque">
        {data.products.length ? data.products.map((p) => {
          const isOpen = openId === p.id;
          return (
            <div key={p.id} className="cc-expand-row">
              <button className="cc-expand-head" onClick={() => setOpenId(isOpen ? null : p.id)}>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="cc-strong">{p.name}</span>
                <span className="cc-muted">{p.category}</span>
                <span className="cc-spacer" />
                {p.qty <= num(data.settings.lowStock) ? <Badge tone={p.qty === 0 ? "red" : "gold"}>{p.qty} un.</Badge> : <span>{p.qty} un.</span>}
              </button>
              {isOpen && (
                <div className="cc-expand-body">
                  <table className="cc-table cc-table-compact">
                    <thead><tr><th>Data</th><th>Tipo</th><th>Qtd</th><th>Referência</th></tr></thead>
                    <tbody>
                      {movementsFor(p).map((m, idx) => <tr key={idx}><td>{formatDateBR(m.date)}</td><td><Badge tone={m.tipo === "Entrada" ? "green" : "muted"}>{m.tipo}</Badge></td><td>{m.qty}</td><td>{m.ref}</td></tr>)}
                      {!movementsFor(p).length && <tr><td colSpan={4}><Empty text="Sem movimentações registradas." /></td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        }) : <Empty text="Nenhum produto cadastrado ainda." />}
      </Section>
    </div>
  );
}

/* ============================== CATÁLOGO PARAGUAI ============================== */

function Catalogo({ data, save }) {
  const [form, setForm] = useState(null);

  const submit = () => {
    if (!form.name.trim()) return;
    save((prev) => {
      const exists = prev.catalog.some((c) => c.id === form.id);
      return { ...prev, catalog: exists ? prev.catalog.map((c) => (c.id === form.id ? form : c)) : [...prev.catalog, { ...form, id: uid() }] };
    });
    setForm(null);
  };
  const remove = (id) => save((prev) => ({ ...prev, catalog: prev.catalog.filter((c) => c.id !== id) }));

  const lastPurchaseFor = (name) => {
    const matches = data.purchases
      .flatMap((p) => p.items.filter((i) => i.name.toLowerCase() === name.toLowerCase()).map((i) => ({ ...i, purchase: p })))
      .sort((a, b) => (a.purchase.date < b.purchase.date ? 1 : -1));
    if (!matches.length) return null;
    const m = matches[0];
    const usdEquivalent = m.purchase.location === "Paraguai" ? num(m.unitValue) : (num(m.purchase.dollarRate) ? num(m.unitValue) / num(m.purchase.dollarRate) : null);
    return { date: m.purchase.date, unitUSD: m.purchase.location === "Paraguai" ? num(m.unitValue) : usdEquivalent, location: m.purchase.location };
  };

  return (
    <div className="cc-page">
      <div className="cc-page-head">
        <div><h1>Catálogo de preços — Paraguai</h1><p className="cc-page-sub">Compare o preço de hoje com sua última compra para decidir o que levar na próxima viagem.</p></div>
        <button className="cc-btn cc-btn-primary" onClick={() => setForm({ name: "", priceUSD: 0, date: todayStr(), notes: "" })}><Plus size={16} /> Novo item</button>
      </div>

      <Section title={`Itens no catálogo (${data.catalog.length})`}>
        {data.catalog.length ? (
          <table className="cc-table">
            <thead><tr><th>Produto</th><th>Preço atual (US$)</th><th>Verificado em</th><th>Última compra</th><th>Variação</th><th>Notas</th><th></th></tr></thead>
            <tbody>
              {data.catalog.map((c) => {
                const last = lastPurchaseFor(c.name);
                const variacao = last && last.unitUSD ? ((num(c.priceUSD) - last.unitUSD) / last.unitUSD) * 100 : null;
                return (
                  <tr key={c.id}>
                    <td className="cc-strong">{c.name}</td>
                    <td>{formatUSD(c.priceUSD)}</td>
                    <td>{formatDateBR(c.date)}</td>
                    <td>{last ? `${formatUSD(last.unitUSD)} em ${formatDateBR(last.date)}` : "Sem histórico"}</td>
                    <td>{variacao === null ? "-" : <Badge tone={variacao > 0 ? "red" : variacao < 0 ? "green" : "muted"}>{variacao > 0 ? "+" : ""}{variacao.toFixed(1)}%</Badge>}</td>
                    <td className="cc-muted">{c.notes}</td>
                    <td className="cc-row-actions"><IconBtn title="Editar" onClick={() => setForm(c)}><Pencil size={15} /></IconBtn><IconBtn title="Excluir" danger onClick={() => remove(c.id)}><Trash2 size={15} /></IconBtn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <Empty text="Nenhum item no catálogo ainda. Adicione os preços que você encontrar por lá para comparar depois." />}
      </Section>

      {form && (
        <Modal title={form.id ? "Editar item do catálogo" : "Novo item do catálogo"} onClose={() => setForm(null)}>
          <div className="cc-form-grid">
            <Field label="Nome do produto"><input className="cc-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Preço atual (US$)"><input type="number" step="0.01" className="cc-input" value={form.priceUSD} onChange={(e) => setForm({ ...form, priceUSD: num(e.target.value) })} /></Field>
            <Field label="Verificado em"><input type="date" className="cc-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Notas (opcional)"><input className="cc-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <div className="cc-modal-actions"><button className="cc-btn cc-btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="cc-btn cc-btn-primary" onClick={submit}><Check size={16} /> Salvar</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== MODAL / SETTINGS ============================== */

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="cc-modal-overlay" onClick={onClose}>
      <div className={`cc-modal ${wide ? "cc-modal-wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal-head"><h3>{title}</h3><button className="cc-iconbtn" onClick={onClose}><X size={17} /></button></div>
        <div className="cc-modal-body">{children}</div>
      </div>
    </div>
  );
}

function SettingsModal({ data, saveSettings, onClose, onName }) {
  const [local, setLocal] = useState(data.settings);
  const [name, setName] = useState(data.businessName);
  const apply = () => { saveSettings(local); onName(name); onClose(); };
  return (
    <Modal title="Configurações e padrões" onClose={onClose}>
      <div className="cc-form-grid">
        <Field label="Nome do negócio"><input className="cc-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        {LOCATIONS.map((loc) => (
          <Field key={loc} label={`% despesa padrão — ${loc}`} hint="Usado como sugestão inicial em novas compras">
            <input type="number" step="0.1" className="cc-input" value={local.expenseByLocation[loc]} onChange={(e) => setLocal({ ...local, expenseByLocation: { ...local.expenseByLocation, [loc]: num(e.target.value) } })} />
          </Field>
        ))}
        <Field label="% comissão padrão" hint="Sugestão inicial para novas revendedoras"><input type="number" step="0.1" className="cc-input" value={local.defaultCommission} onChange={(e) => setLocal({ ...local, defaultCommission: num(e.target.value) })} /></Field>
        <Field label="Alerta de estoque baixo (unidades)"><input type="number" className="cc-input" value={local.lowStock} onChange={(e) => setLocal({ ...local, lowStock: num(e.target.value) })} /></Field>
      </div>
      <div className="cc-modal-actions"><button className="cc-btn cc-btn-secondary" onClick={onClose}>Cancelar</button><button className="cc-btn cc-btn-primary" onClick={apply}><Check size={16} /> Salvar</button></div>
    </Modal>
  );
}

/* ============================== ESTILO ============================== */

function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Parisienne&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,600&family=Inter:wght@400;500;600;700&display=swap');

      .cc-root { display:flex; min-height:100vh; background:#FBF1E7; font-family:'Inter',sans-serif; color:#3B2430; }
      .cc-loading { align-items:center; justify-content:center; }
      .cc-loading-text { color:#8B6F5D; }

      .cc-sidebar { width:220px; flex-shrink:0; background:#3B1626; color:#FBF1E7; display:flex; flex-direction:column; padding:20px 14px; gap:18px; position:sticky; top:0; height:100vh; }
      .cc-brand { display:flex; align-items:center; gap:10px; padding:0 6px; }
      .cc-brand-mark { width:34px; height:34px; border-radius:8px; background:#C6A15B; color:#3B2430; display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-weight:700; font-size:14px; }
      .cc-brand-title { font-family:'Parisienne',cursive; font-weight:400; font-size:23px; line-height:1.1; }
      .cc-brand-sub { font-size:11.5px; color:#B79A85; margin-top:2px; }
      .cc-nav { display:flex; flex-direction:column; gap:2px; flex:1; }
      .cc-nav-item { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:8px; background:transparent; border:none; color:#D9C3B0; font-size:13.5px; cursor:pointer; text-align:left; font-family:inherit; }
      .cc-nav-item:hover { background:#4A1F30; color:#fff; }
      .cc-nav-item.active { background:#5C2740; color:#fff; font-weight:600; }
      .cc-settings-btn { border-top:1px solid #5C2740; padding-top:14px; margin-top:4px; }
      .cc-save-warn { font-size:11px; color:#E8C48A; background:#5C2740; padding:8px; border-radius:6px; }

      .cc-main { flex:1; padding:32px 40px; max-width:1180px; }
      .cc-page-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:22px; flex-wrap:wrap; }
      .cc-page h1 { font-family:'Playfair Display',serif; font-weight:600; font-size:26px; margin:0; }
      .cc-page-sub { color:#8B6F5D; font-size:13.5px; margin:4px 0 0; }

      .cc-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; margin-bottom:22px; }
      .cc-kpi { background:#fff; border:1px solid #E7D6C4; border-radius:10px; padding:16px 18px; }
      .cc-kpi-label { font-size:12px; color:#8B6F5D; margin-bottom:6px; }
      .cc-kpi-value { font-size:22px; font-weight:700; font-variant-numeric:tabular-nums; }
      .cc-kpi-green { color:#4F7A5D; } .cc-kpi-gold { color:#C6A15B; } .cc-kpi-red { color:#A63B52; }
      .cc-kpi-sub { font-size:11.5px; color:#8B6F5D; margin-top:4px; }

      .cc-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
      @media (max-width: 900px) { .cc-grid-2 { grid-template-columns:1fr; } .cc-main { padding:22px; } .cc-root { flex-direction:column; } .cc-sidebar { width:auto; height:auto; position:static; flex-direction:row; overflow-x:auto; } .cc-nav { flex-direction:row; } }

      .cc-card { background:#fff; border:1px solid #E7D6C4; border-radius:10px; padding:20px 22px; margin-bottom:16px; }
      .cc-section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
      .cc-section-head h2 { font-family:'Playfair Display',serif; font-size:16.5px; font-weight:600; margin:0; }

      .cc-empty { color:#9C8478; font-size:13.5px; padding:18px 4px; text-align:center; }

      .cc-search { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #E7D6C4; border-radius:8px; padding:9px 12px; margin-bottom:16px; color:#8B6F5D; max-width:340px; }
      .cc-search input { border:none; outline:none; font-size:13.5px; flex:1; font-family:inherit; color:#3B2430; }

      .cc-table { width:100%; border-collapse:collapse; font-size:13px; }
      .cc-table th { text-align:left; font-weight:600; color:#8B6F5D; font-size:11.5px; padding:6px 10px; border-bottom:1px solid #E7D6C4; }
      .cc-table td { padding:9px 10px; border-bottom:1px solid #F2E6D8; vertical-align:middle; }
      .cc-table-compact td, .cc-table-compact th { padding:6px 8px; }
      .cc-strong { font-weight:600; }
      .cc-muted { color:#9C8478; font-size:12px; }
      .cc-row-actions { display:flex; gap:4px; }

      .cc-iconbtn { border:none; background:transparent; color:#8B6F5D; cursor:pointer; padding:5px; border-radius:6px; display:flex; align-items:center; }
      .cc-iconbtn:hover { background:#F2E6D8; color:#3B2430; }
      .cc-iconbtn-danger:hover { background:#F3D9DE; color:#A63B52; }

      .cc-btn { display:inline-flex; align-items:center; gap:6px; font-family:inherit; font-size:13px; font-weight:600; padding:9px 15px; border-radius:8px; border:1px solid transparent; cursor:pointer; }
      .cc-btn-primary { background:#C6A15B; color:#fff; }
      .cc-btn-primary:hover { background:#AD8547; }
      .cc-btn-secondary { background:#fff; border-color:#DCC3AC; color:#3B2430; }
      .cc-btn-secondary:hover { background:#F4E6D8; }
      .cc-btn-danger { background:#A63B52; color:#fff; }
      .cc-btn-sm { padding:6px 11px; font-size:12px; }

      .cc-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:99px; display:inline-block; }
      .cc-badge-green { background:#E4F0E8; color:#4F7A5D; }
      .cc-badge-gold { background:#F5E6C8; color:#966018; }
      .cc-badge-red { background:#F3D9DE; color:#A63B52; }
      .cc-badge-muted { background:#F2E6D8; color:#8B6F5D; }

      .cc-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:6px; }
      .cc-field { display:flex; flex-direction:column; gap:5px; }
      .cc-label { font-size:12px; color:#8B6F5D; font-weight:500; }
      .cc-hint { font-size:10.5px; color:#B79A85; }
      .cc-input { border:1px solid #DCC3AC; border-radius:7px; padding:8px 10px; font-size:13.5px; font-family:inherit; color:#3B2430; background:#fff; }
      .cc-input:focus { outline:2px solid #C6A15B44; border-color:#C6A15B; }
      .cc-input-sm { padding:6px 8px; }

      .cc-subhead { font-family:'Playfair Display',serif; font-weight:600; font-size:14.5px; margin:18px 0 10px; }
      .cc-total-line { text-align:right; font-size:14px; margin:12px 0; color:#3B2430; }

      .cc-modal-overlay { position:fixed; inset:0; background:rgba(31,45,61,0.45); display:flex; align-items:center; justify-content:center; z-index:50; padding:20px; }
      .cc-modal { background:#fff; border-radius:12px; width:100%; max-width:520px; max-height:88vh; overflow-y:auto; }
      .cc-modal-wide { max-width:760px; }
      .cc-modal-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #E7D6C4; }
      .cc-modal-head h3 { font-family:'Playfair Display',serif; font-size:16.5px; font-weight:600; margin:0; }
      .cc-modal-body { padding:20px; }
      .cc-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; }

      .cc-expand-row { border:1px solid #E7D6C4; border-radius:8px; margin-bottom:8px; overflow:hidden; }
      .cc-expand-head { width:100%; display:flex; align-items:center; gap:10px; padding:11px 14px; background:#fff; border:none; cursor:pointer; font-family:inherit; font-size:13px; color:#3B2430; }
      .cc-expand-head:hover { background:#FAFBFA; }
      .cc-spacer { flex:1; }
      .cc-expand-body { padding:14px 16px 16px 40px; background:#FAFBFA; border-top:1px solid #F2E6D8; display:flex; flex-direction:column; gap:12px; }

      .cc-mini-card { background:#fff; border:1px solid #E7D6C4; border-radius:8px; padding:12px 14px; }
      .cc-mini-head { display:flex; gap:12px; align-items:center; margin-bottom:6px; font-size:13px; }
      .cc-items-line { font-size:12.5px; color:#8B6F5D; margin-bottom:8px; }

      .cc-rank-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
      .cc-rank-list li { display:flex; align-items:center; gap:10px; font-size:13.5px; }
      .cc-rank-num { width:20px; height:20px; border-radius:5px; background:#F4E6D8; color:#8B6F5D; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; }
      .cc-rank-name { flex:1; }
      .cc-rank-val { font-weight:600; color:#3B2430; }

      .cc-confirm { display:flex; align-items:center; gap:8px; background:#F3D9DE; color:#8A3A20; padding:10px 12px; border-radius:8px; font-size:12.5px; }
    `}</style>
  );
}
