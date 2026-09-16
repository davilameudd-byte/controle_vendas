/* Este arquivo roda direto no navegador via Babel Standalone — sem build.
   React/ReactDOM vêm de <script> globais carregados no index.html. */
const { useState, useEffect, useMemo, useCallback, useRef } = React;

/* ---------------------- Firebase (sincronização) ------------------------ */
/* SUBSTITUA pelos dados do SEU projeto Firebase (Configurações do projeto → Config do app). */
// index.html ja carrega firebase-app-compat.js, firebase-auth-compat.js e
// firebase-firestore-compat.js como <script> globais, por isso usamos a
// API compat (window.firebase) aqui, e nao "import" (que exige um bundler).
const firebaseConfig = {
   apiKey: "AIzaSyBTeyeblOVhgKSbyhaeczixPN4QMGKOw0o",
   authDomain: "peste-5df22.firebaseapp.com",
   projectId: "peste-5df22",
   storageBucket: "peste-5df22.firebasestorage.app",
   messagingSenderId: "703481494502",
   appId: "1:703481494502:web:1560cf8e5f7700ed033427"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const DATA_DOC = db.collection("appData").doc("mala-mia");
const PUBLIC_CATALOG = db.collection("publicCatalog").doc("mala-mia");
function publicCatalog(data) {
  return { products: data.products.filter(p => p.published !== false).map(p => ({
    id: p.id, name: p.name || "", category: p.category || "Perfumes",
    price: Math.max(0, Number(p.precoVenda) || 0),
    imageUrl: /^https:\/\//i.test(p.imageUrl || "") ? p.imageUrl : "",
    imageId: ProductPhotos.validId(p.imageId) ? p.imageId : "",
    available: Number(p.qty) > 0,
  })) };
}

/* ------------------------ Ícones (SVG leve, sem libs) -------------------- */
const makeIcon = (glyph) => ({ size = 16, strokeWidth, style, ...rest }) => (
  <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1, display: "inline-block", ...style }} {...rest}>{glyph}</span>
);
const LayoutDashboard = makeIcon("▤");
const Package = makeIcon("◧");
const ShoppingBag = makeIcon("◨");
const Users = makeIcon("◐");
const Receipt = makeIcon("▤");
const UserCheck = makeIcon("◑");
const Boxes = makeIcon("▥");
const Tag = makeIcon("◈");
const Settings = makeIcon("⚙");
const Plus = makeIcon("+");
const Trash2 = makeIcon("✕");
const Pencil = makeIcon("✎");
const X = makeIcon("✕");
const Check = makeIcon("✓");
const AlertTriangle = makeIcon("!");
const ChevronDown = makeIcon("▾");
const ChevronRight = makeIcon("▸");
const Search = makeIcon("⌕");
const RotateCcw = makeIcon("↺");
const Ban = makeIcon("⊘");

/* ------------------------ Gráficos (SVG leve, sem libs) ------------------ */
function MiniLineChart({ data, xKey, yKey, color = "#C6A15B", height = 240, formatY }) {
  const w = 640, h = height, padL = 46, padR = 16, padT = 16, padB = 28;
  if (!data.length) return null;
  const maxY = Math.max(1, ...data.map((d) => d[yKey]));
  const stepX = data.length > 1 ? (w - padL - padR) / (data.length - 1) : 0;
  const scaleY = (v) => h - padB - (v / maxY) * (h - padT - padB);
  const points = data.map((d, i) => [padL + i * stepX, scaleY(d[yKey])]);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => padT + f * (h - padT - padB));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} style={{ overflow: "visible" }}>
      {gridLines.map((y, i) => <line key={i} x1={padL} x2={w - padR} y1={y} y2={y} stroke="#E7D6C4" strokeWidth={1} />)}
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} />
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={color} />)}
      {data.map((d, i) => (
        <text key={i} x={padL + i * stepX} y={h - 8} fontSize={11} fill="#8B6F5D" textAnchor="middle">{d[xKey]}</text>
      ))}
      <text x={4} y={padT + 4} fontSize={10} fill="#8B6F5D">{formatY ? formatY(maxY) : maxY}</text>
    </svg>
  );
}

function MiniBarChartH({ data, nameKey, valueKey, color = "#4F7A5D", formatX, rowHeight = 30 }) {
  const w = 640, padL = 110, padR = 60, padT = 6;
  const h = padT * 2 + data.length * rowHeight;
  if (!data.length) return null;
  const maxV = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const y = padT + i * rowHeight;
        const barW = ((w - padL - padR) * d[valueKey]) / maxV;
        return (
          <g key={i}>
            <text x={padL - 8} y={y + rowHeight / 2 + 4} fontSize={12} fill="#3B2430" textAnchor="end">{d[nameKey]}</text>
            <rect x={padL} y={y + 4} width={Math.max(2, barW)} height={rowHeight - 12} rx={4} fill={color} />
            <text x={padL + barW + 8} y={y + rowHeight / 2 + 4} fontSize={11} fill="#8B6F5D">{formatX ? formatX(d[valueKey]) : d[valueKey]}</text>
          </g>
        );
      })}
    </svg>
  );
}

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
const localDate = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
const todayStr = () => localDate(new Date());
const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
const formatBRL = (v) => (num(v)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatUSD = (v) => (num(v)).toLocaleString("en-US", { style: "currency", currency: "USD" });
const formatDateBR = (s) => { if (!s) return "-"; const p = s.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s; };
const monthKey = (s) => (s ? s.slice(0, 7) : "");
const monthLabel = (key) => { if (!key) return "-"; const [y, m] = key.split("-"); return `${MESES[parseInt(m, 10) - 1]}/${y}`; };
const addMonths = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) throw new Error("Informe uma data válida para as parcelas.");
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return localDate(d);
};
const thisMonthKey = () => todayStr().slice(0, 7);
const clamp2 = (v) => Math.round(num(v) * 100) / 100;

function genInstallments(total, count, firstDate) {
  const n = Math.max(1, parseInt(count, 10) || 1);
  const base = Math.floor(clamp2(total) * 100 / n) / 100;
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

function App({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(DEFAULT_DATA);
  const [tab, setTab] = useState("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState("");
  const dataRef = useRef(DEFAULT_DATA);
  const ready = useRef(false);

  useEffect(() => {
    const unsub = DATA_DOC.onSnapshot(
      (snap) => {
        if (snap.exists) {
          const parsed = snap.data();
          const next = { ...DEFAULT_DATA, ...parsed, settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}), expenseByLocation: { ...DEFAULT_DATA.settings.expenseByLocation, ...parsed.settings?.expenseByLocation } } };
          for (const key of ["products", "purchases", "customers", "resellers", "sales", "catalog"]) {
            if (!Array.isArray(next[key])) { setLoadErr(true); setLoading(false); ready.current = false; return; }
          }
          dataRef.current = next;
          setData(next);
        }
        ready.current = true;
        setLoading(false);
      },
      () => { ready.current = false; setLoadErr(true); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const save = useCallback((updater, photo) => {
    if (!ready.current) return;
    const next = typeof updater === "function" ? updater(dataRef.current) : updater;
    dataRef.current = next;
    setData(next);
    const batch = db.batch();
    if (photo) batch.set(db.collection("productImages").doc(photo.id), { dataUrl: photo.dataUrl });
    batch.set(DATA_DOC, next);
    batch.set(PUBLIC_CATALOG, publicCatalog(next));
    return batch.commit().then(() => { setSaveErr(false); setCatalogStatus("Catálogo atualizado no site."); return true; }).catch(() => { setSaveErr(true); setCatalogStatus("Falha ao salvar e atualizar o site. Tente novamente."); return false; });
  }, []);

  const publishCatalog = () => {
    if (!ready.current) return;
    setCatalogStatus("Atualizando catálogo…");
    PUBLIC_CATALOG.set(publicCatalog(dataRef.current)).then(() => setCatalogStatus("Catálogo atualizado no site.")).catch(() => setCatalogStatus("Não foi possível publicar. Verifique sua conexão e tente novamente."));
  };

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
      (p) => p.name.toLowerCase() === item.name.toLowerCase() && (p.category || "Geral").trim().toLowerCase() === (item.category || "Geral").trim().toLowerCase()
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

  if (loadErr) return <div className="cc-root cc-loading"><Style /><div className="cc-card" role="alert">Não foi possível carregar os dados. Verifique a conexão e a permissão de acesso ao banco.<br /><button className="cc-btn" onClick={() => window.location.reload()}>Tentar novamente</button><button className="cc-btn" onClick={onLogout}>Sair</button></div></div>;

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
        <button className="cc-nav-item" onClick={onLogout}>
          <X size={17} strokeWidth={1.8} /> <span>Sair</span>
        </button>
        {saveErr && <div className="cc-save-warn">Não consegui sincronizar agora. Verifique sua internet — suas alterações locais podem não ter sido salvas.</div>}
      </aside>

      <main className="cc-main">
        <div className="cc-catalog-sync"><button className="cc-btn cc-btn-secondary" onClick={publishCatalog}>Atualizar catálogo no site</button><span role="status">{catalogStatus}</span></div>
        <div className="cc-welcome"><div><strong>Mala Mia · Gestão</strong>Um cuidado especial com cada detalhe do seu negócio.</div><a href="../" target="_blank" rel="noopener noreferrer">Ver loja ↗</a></div>
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
            <MiniLineChart data={evolucaoMensal} xKey="mes" yKey="total" color="#C6A15B" formatY={(v) => formatBRL(v)} />
          ) : <Empty text="Ainda não há vendas registradas para mostrar aqui." />}
        </Section>

        <Section title="Ranking de revendedoras">
          {rankingRevendedoras.length ? (
            <MiniBarChartH data={rankingRevendedoras} nameKey="name" valueKey="total" color="#4F7A5D" formatX={(v) => formatBRL(v)} />
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

function ProductPhoto({product, className, preview}) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    setSrc("");
    ProductPhotos.resolve(db,product).then(value => { if (active) setSrc(value); }).catch(() => {});
    return () => { active = false; };
  }, [product.imageId, product.imageUrl]);
  return src ? <img src={src} className={className} alt={preview ? "Foto atual do produto" : ""} style={preview ? {width:120,height:140,objectFit:"contain",marginTop:12} : undefined} onError={() => setSrc("")} /> : null;
}

/* Classificação dos produtos importados do catálogo. */
function suggestedCategory(name) {
  const n = (name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/bolsa|mochila|mala de viagem|malas de bordo/.test(n)) return "Bolsas e malas";
  if (/relogio|pulseiras/.test(n)) return "Relógios e acessórios";
  if (/^tester\b/.test(n)) return "Perfumes testers";
  if (/^kit\b|^cofretti\b/.test(n)) return "Kits e presentes";
  if (/miniatura/.test(n)) return "Miniaturas de perfumes";
  if (/body splash|body spray/.test(n)) return "Body splash e sprays";
  if (/siage|shampoo|condicionador|leave in|hair mask|combo volume/.test(n)) return "Cuidados com os cabelos";
  if (/hidratante|locao corporal|retinal|pads |mascaras faciais/.test(n)) return "Cuidados com a pele";
  if (/lip oil|palleta|paleta|pincel/.test(n)) return "Maquiagem";
  return "Perfumes";
}

function Produtos({ data, save }) {
  const blank = { name: "", category: "", qty: 0, valorPago: 0, custoFinal: 0, precoVenda: 0, local: "Paraguai", dataCompra: todayStr(), fornecedor: "", imageUrl: "", published: true };
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [saving, setSaving] = useState(false);
  const photoInput = useRef(null);
  const photoVersion = useRef(0);
  const openForm = value => { photoVersion.current++; setPhoto(null); setPhotoBusy(false); setPhotoError(""); setForm(value); };
  const closeForm = () => { if (!saving) openForm(null); };
  const choosePhoto = async event => {
    const file = event.target.files[0]; event.target.value = "";
    if (!file) return;
    const version = ++photoVersion.current;
    setPhotoBusy(true); setPhotoError("");
    try {
      const dataUrl = await ProductPhotos.prepare(file);
      if (version !== photoVersion.current) return;
      const id = uid();
      setPhoto({id,dataUrl});
      setForm(prev => prev && ({...prev,imageId:id,imageUrl:""}));
    } catch (err) { if (version === photoVersion.current) setPhotoError(err.message); }
    finally { if (version === photoVersion.current) setPhotoBusy(false); }
  };
  const [q, setQ] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("");
  const [categorizing, setCategorizing] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState("");
  const categories = [...new Set(data.products.map(p => (p.category || "Sem categoria").trim()))].sort((a,b) => a.localeCompare(b,"pt-BR"));
  const uncategorized = p => !p.category || ["sem categoria", "geral"].includes(p.category.trim().toLowerCase());
  const pendingCategories = data.products.filter(uncategorized).length;
  const categorize = async () => {
    setCategorizing(true);
    try {
      const ok = await save(prev => ({...prev, products: prev.products.map(p => uncategorized(p) ? {...p, category: suggestedCategory(p.name)} : p)}));
      setCategoryMessage(ok ? "Categorias salvas e publicadas no catálogo." : "Falha ao salvar categorias. Tente novamente.");
    } finally { setCategorizing(false); }
  };
  const list = data.products.filter(p => (!categoryFilter || (p.category || "Sem categoria").trim() === categoryFilter) && (p.name.toLowerCase().includes(q.toLowerCase()) || (p.category || "").toLowerCase().includes(q.toLowerCase())));

  const submit = async () => {
    if (photoBusy || saving) return;
    if (!form.name.trim()) return;
    if (form.imageUrl && !/^https:\/\//i.test(form.imageUrl)) return alert("Use um endereço de imagem que comece com https://.");
    if (num(form.precoVenda) < 0 || num(form.qty) < 0) return alert("Preço e estoque não podem ser negativos.");
    const product = { ...form, id: form.id || uid() };
    setForm(product);
    setSaving(true);
    const saved = await save((prev) => {
      const exists = prev.products.some((p) => p.id === product.id);
      return { ...prev, products: exists ? prev.products.map((p) => (p.id === product.id ? product : p)) : [...prev.products, product] };
    }, photo);
    setSaving(false);
    if (saved) openForm(null);
    else setPhotoError("Não foi possível salvar. Verifique sua conexão e tente novamente.");
  };

  const remove = (id) => save((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== id) }));

  return (
    <div className="cc-page">
      <div className="cc-page-head">
        <div><h1>Produtos</h1><p className="cc-page-sub">Seu catálogo completo, com preços sempre editáveis.</p></div>
        <button className="cc-btn cc-btn-primary" onClick={() => openForm(blank)}><Plus size={16} /> Novo produto</button>
      </div>

      <div className="cc-search"><Search size={15} /><input placeholder="Buscar por nome ou categoria…" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end",marginBottom:16}}>
        <Field label="Filtrar por categoria"><select className="cc-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="">Todas as categorias</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
        {pendingCategories > 0 && <button className="cc-btn cc-btn-secondary" disabled={categorizing} onClick={categorize}>{categorizing ? "Categorizando…" : `Categorizar produtos sem categoria (${pendingCategories})`}</button>}
      </div>
      {categoryMessage && <p role="status">{categoryMessage}</p>}
      <Section title={`Produtos cadastrados (${list.length})`}>
        {list.length ? (
          <table className="cc-table">
            <thead><tr><th>Nome</th><th>Categoria</th><th>Estoque</th><th>Paguei</th><th>Custo final</th><th>Preço venda</th><th>Local</th><th></th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="cc-strong"><ProductPhoto product={p} className="cc-product-thumb" />{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.qty <= num(data.settings.lowStock) ? <Badge tone={p.qty === 0 ? "red" : "gold"}>{p.qty}</Badge> : p.qty}</td>
                  <td>{formatBRL(p.valorPago)}</td>
                  <td>{formatBRL(p.custoFinal)}</td>
                  <td className="cc-strong">{formatBRL(p.precoVenda)}</td>
                  <td>{p.local}</td>
                  <td className="cc-row-actions">
                    <IconBtn title="Editar" onClick={() => openForm(p)}><Pencil size={15} /></IconBtn>
                    <IconBtn title="Excluir" danger onClick={() => remove(p.id)}><Trash2 size={15} /></IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty text="Nenhum produto ainda. Cadastre manualmente aqui ou lance uma compra na aba Compras." />}
      </Section>

      {form && (
        <Modal title={form.id ? "Editar produto" : "Novo produto"} onClose={closeForm}>
          <div className="cc-form-grid">
            <Field label="Nome do produto"><input className="cc-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Foto do produto" hint="Escolha uma imagem JPG, PNG ou WebP de até 20 MB. Ela será publicada ao salvar.">
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Arquivo da foto" style={{display:"none"}} onChange={choosePhoto} />
              <button type="button" className="cc-btn cc-btn-secondary" disabled={photoBusy || saving} onClick={() => photoInput.current.click()}>{photoBusy ? "Preparando foto…" : "Escolher foto"}</button>
              {photo ? <img src={photo.dataUrl} alt="Prévia da foto escolhida" style={{width:120,height:140,objectFit:"contain",marginTop:12}} /> : <ProductPhoto product={form} preview />}
              {photoError && <p role="alert" style={{color:"#9c3030"}}>{photoError}</p>}
            </Field>
            <Field label="Imagem do produto (URL)" hint="Cole o link direto da foto (https://). A foto aparecerá automaticamente no site."><input type="url" className="cc-input" value={form.imageUrl || ""} disabled={photoBusy || saving} onChange={(e) => { setPhoto(null); setForm({ ...form, imageId: "", imageUrl: e.target.value.trim() }); }} /></Field>
            <Field label="Exibir no site"><select className="cc-input" value={form.published === false ? "nao" : "sim"} onChange={(e) => setForm({ ...form, published: e.target.value === "sim" })}><option value="sim">Sim</option><option value="nao">Não</option></select></Field>
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
          <div className="cc-modal-actions"><button className="cc-btn cc-btn-secondary" disabled={saving} onClick={closeForm}>Cancelar</button><button className="cc-btn cc-btn-primary" disabled={photoBusy || saving} onClick={submit}><Check size={16} /> {saving ? "Salvando…" : "Salvar"}</button></div>
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
    if (!form.date || (form.location === "Paraguai" && form.dollarRate <= 0)) return alert("Informe a data e uma cotação do dólar positiva.");
    if (!form.items.length || form.items.some((i) => !i.name.trim() || !Number.isInteger(i.qty) || i.qty <= 0 || i.unitValue < 0)) return alert("Preencha os produtos com quantidades positivas e valores válidos.");
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

  const gerarParcelas = () => {
    if (!form.firstDueDate || !Number.isInteger(form.installmentsCount) || form.installmentsCount < 1 || form.installmentsCount > 360) return alert("Informe a data e uma quantidade de parcelas entre 1 e 360.");
    setForm((f) => ({ ...f, installments: genInstallments(total, f.installmentsCount, f.firstDueDate) }));
  };

  const updateInstallment = (n, patch) => setForm((f) => ({ ...f, installments: f.installments.map((i) => (i.n === n ? { ...i, ...patch } : i)) }));

  const submit = () => {
    if (!form.date || !form.firstDueDate || !Number.isInteger(form.installmentsCount) || form.installmentsCount < 1 || form.installmentsCount > 360) return alert("Informe as datas e uma quantidade de parcelas entre 1 e 360.");
    if (!form.customerId && !form.newCustomerName.trim()) return alert("Selecione ou cadastre uma cliente.");
    if (!form.items.length || form.items.some((i) => !productsById[i.productId] || !Number.isInteger(i.qty) || i.qty <= 0 || i.price < 0)) return alert("Informe produtos, quantidades positivas e preços válidos.");
    const quantities = {};
    form.items.forEach((i) => { quantities[i.productId] = (quantities[i.productId] || 0) + i.qty; });
    if (Object.entries(quantities).some(([id, qty]) => qty > num(productsById[id].qty))) return alert("Estoque insuficiente para esta venda.");
    if (form.installments && (form.installments.length !== form.installmentsCount || form.installments.some((i) => !i.dueDate || i.value < 0) || clamp2(form.installments.reduce((a, i) => a + num(i.value), 0)) !== clamp2(total))) return alert("Atualize as parcelas: a soma deve corresponder ao total da venda.");
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
        const qty = items.filter((i) => i.productId === p.id).reduce((sum, i) => sum + num(i.qty), 0);
        return qty ? { ...p, qty: num(p.qty) - qty } : p;
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
      const qty = sale.items.filter((i) => i.productId === p.id).reduce((sum, i) => sum + num(i.qty), 0);
      return qty ? { ...p, qty: num(p.qty) + qty } : p;
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



function paraguayDifference(value, base) {
  if (!Number.isFinite(value) || !Number.isFinite(base) || base <= 0) return "sem-base";
  const cents = Math.round(value * 100) - Math.round(base * 100);
  return cents === 0 ? "igual" : cents > 0 ? "caro" : "barato";
}
function replenishmentRows(data, coverageDays, today) {
  const start = new Date(today + "T12:00:00"); start.setDate(start.getDate() - 89);
  const since = localDate(start);
  const sold = {};
  for (const sale of data.sales || []) {
    if (sale.status !== "ativa" || !sale.date || sale.date < since || sale.date > today) continue;
    for (const item of sale.items || []) sold[item.productId] = (sold[item.productId] || 0) + Math.max(0, num(item.qty));
  }
  return data.products.map(p => {
    const units = sold[p.id] || 0, stock = Math.max(0, num(p.qty));
    const target = units > 0 ? Math.max(Math.floor(Math.max(0,num(data.settings.lowStock))) + 1, Math.ceil(units * coverageDays / 90)) : 0;
    return { product:p, sold:units, stock, target, suggested:units > 0 ? Math.max(0, Math.ceil(target-stock)) : 0, coverage:units > 0 ? Math.floor(stock / (units/90)) : null };
  }).sort((a,b) => (a.stock===0?0:1)-(b.stock===0?0:1) || b.sold-a.sold || a.product.name.localeCompare(b.product.name,"pt-BR"));
}
function ComparacaoParaguai({data}) {
  const [feed,setFeed]=useState(null), [error,setError]=useState(""), [loading,setLoading]=useState(false);
  const [fx,setFx]=useState(null), [fxError,setFxError]=useState(""), [fxLoading,setFxLoading]=useState(false);
  const [manual,setManual]=useState(false), [manualRate,setManualRate]=useState(0);
  const [expenses,setExpenses]=useState(()=>num(data.settings.expenseByLocation.Paraguai));
  const [filter,setFilter]=useState("todos"), [basis,setBasis]=useState("custo"), [coverageDays,setCoverageDays]=useState(30);
  const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
  const reloadPrices=useCallback(async()=>{
    setLoading(true);
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch("../assets/paraguay-prices.json?t="+Date.now(),{cache:"no-store",signal:controller.signal});
      if(!response.ok) throw Error();
      const next=await response.json();
      if(next.schemaVersion!==1 || !Array.isArray(next.items)) throw Error();
      setFeed(next);setError("");
    }catch(_){setError("Não foi possível atualizar os preços. Confira a data das referências exibidas.");}
    finally{clearTimeout(timer);setLoading(false);}
  },[]);
  const reloadDollar=useCallback(async()=>{
    setFxLoading(true);
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL",{signal:controller.signal});
      if(!response.ok) throw Error();
      const quote=(await response.json()).USDBRL;
      const value=Number(quote?.ask), timestamp=Number(quote?.timestamp)*1000;
      if(!Number.isFinite(value)||value<=0||!Number.isFinite(timestamp)||timestamp<=0||timestamp>Date.now()+300000) throw Error();
      setFx({value,timestamp});setFxError("");
    }catch(_){setFxError("Não foi possível atualizar o dólar. A última cotação, se disponível, permanece com sua data. Você também pode informar a taxa manualmente.");}
    finally{clearTimeout(timer);setFxLoading(false);}
  },[]);
  useEffect(()=>{reloadPrices();reloadDollar();const timer=setInterval(()=>{reloadPrices();reloadDollar();},300000);return()=>clearInterval(timer);},[reloadPrices,reloadDollar]);
  const rate=manual?manualRate:(fx?.value||0);
  const rows=data.products.map(p=>{
    const quote=feed?.items.find(q=>normalize(q.name)===normalize(p.name));
    const valid=quote&&["quoted","historical"].includes(quote.status)&&Number.isFinite(quote.priceUSD)&&quote.priceUSD>0;
    const converted=valid&&rate>0?clamp2(quote.priceUSD*rate):null;
    const landed=converted!==null?clamp2(converted*(1+expenses/100)):null;
    const old=quote?.status!=="quoted"||quote?.sourceDate!==todayStr();
    const url=quote?.sourceUrl&&/^https:\/\/(www\.|mobile\.)?comprasparaguai\.com\.br\//.test(quote.sourceUrl)?quote.sourceUrl:null;
    return {p,quote,valid,converted,landed,old,url,comparison:paraguayDifference(basis==="custo"?landed:converted,num(basis==="custo"?p.custoFinal:p.precoVenda))};
  });
  const filtered=rows.filter(r=>filter==="todos"||r.comparison===filter);
  const labels={caro:"Mais caro",barato:"Mais barato",igual:"Igual","sem-base":"Sem comparação"};
  const change=(value,base)=>{
    const kind=paraguayDifference(value,base);
    if(kind==="sem-base")return "Sem base";
    return <Badge tone={kind==="caro"?"red":kind==="barato"?"green":"muted"}>{labels[kind]}{kind!=="igual"&&" "+formatBRL(Math.abs(value-base))+" ("+Math.abs((value-base)/base*100).toFixed(1)+"%)"}</Badge>;
  };
  const stockRows=replenishmentRows(data,coverageDays,todayStr());
  const suggestions=stockRows.filter(r=>r.suggested>0);
  const unverified=stockRows.filter(r=>r.sold===0&&r.stock===0).length;
  return <>
    <Section title="Comparação automática · Compras Paraguai">
      <p className="cc-muted">Preços consultados diariamente às 9h (Brasília). O painel atualiza os resultados e o dólar a cada 5 minutos enquanto esta aba estiver aberta.</p>
      <p className="cc-muted">Última consulta de produtos: {feed?.checkedAt?new Date(feed.checkedAt).toLocaleString("pt-BR"):"Aguardando"}{feed?.checkedAt&&Date.now()-Date.parse(feed.checkedAt)>36*3600000?" · Consulta atrasada":""}</p>
      <div className="cc-form-grid" style={{marginBottom:20}}>
        <Field label="Modo da cotação"><select className="cc-input" value={manual?"manual":"auto"} onChange={e=>{setManual(e.target.value==="manual");if(e.target.value==="manual"&&!manualRate)setManualRate(fx?.value||0);}}><option value="auto">Dólar automático</option><option value="manual">Informar minha taxa de câmbio</option></select></Field>
        <Field label="Dólar para comparar (R$)" hint={manual?"Taxa informada por você para esta simulação.":"Dólar comercial de venda (ask). A taxa da loja ou casa de câmbio pode ser diferente."}><input className="cc-input" type="number" min="0" step="0.0001" value={rate||""} readOnly={!manual} placeholder={fxLoading?"Consultando…":"Indisponível"} onChange={e=>setManualRate(Math.max(0,num(e.target.value)))}/></Field>
        <Field label="Despesas para comparar (%)" hint="Percentual estimado de despesas de compra e viagem."><input className="cc-input" type="number" min="0" step="0.1" value={expenses} onChange={e=>setExpenses(Math.max(0,num(e.target.value)))}/></Field>
        <Field label="Comparar com"><select className="cc-input" value={basis} onChange={e=>setBasis(e.target.value)}><option value="custo">Meu custo atual × reposição com despesas</option><option value="venda">Meu preço de venda × Paraguai convertido</option></select></Field>
        <Field label="Filtrar comparação"><select className="cc-input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="todos">Todos</option><option value="caro">Mais caro</option><option value="barato">Mais barato</option><option value="igual">Igual</option><option value="sem-base">Sem comparação</option></select></Field>
      </div>
      <p className="cc-muted">Dólar: <a href="https://docs.awesomeapi.com.br/api-de-moedas" target="_blank" rel="noopener noreferrer">AwesomeAPI · USD/BRL</a>{fx?" · Cotação de "+new Date(fx.timestamp).toLocaleString("pt-BR"):" · Aguardando cotação"}{fx&&Date.now()-fx.timestamp>36*3600000?" · Referência antiga (mercado fechado ou fonte sem atualização)":""}</p>
      <button className="cc-btn cc-btn-secondary" disabled={loading||fxLoading} onClick={()=>{reloadPrices();reloadDollar();}}>{loading||fxLoading?"Atualizando…":"Atualizar preços e dólar"}</button>
      {error&&<p role="alert">{error}</p>}{fxError&&<p role="alert">{fxError}</p>}
      <p role="status" className="cc-muted">{filtered.length} de {rows.length} produtos · {basis==="custo"?"Reposição com despesas comparada ao seu custo atual":"Paraguai convertido comparado ao seu preço de venda"}</p>
      <div style={{overflowX:"auto",marginTop:16}}><table className="cc-table">
        <thead><tr><th>Produto</th><th>Paraguai (US$)</th><th>Fonte / data</th><th>Convertido (R$)</th><th>Custo estimado com despesas</th><th>Seu custo atual</th><th>Reposição × seu custo</th><th>Sua venda</th><th>Paraguai convertido × sua venda</th></tr></thead>
        <tbody>{filtered.map(({p,quote,valid,converted,landed,old,url})=><tr key={p.id}>
          <td className="cc-strong">{p.name}</td><td>{valid?formatUSD(quote.priceUSD):"Sem cotação"}{old&&valid&&<div className="cc-muted">Referência antiga</div>}</td>
          <td>{url&&<a href={url} target="_blank" rel="noopener noreferrer">Ver fonte</a>}<div>{quote?.sourceDate?formatDateBR(quote.sourceDate):"Pendente"}</div><small>{quote?.basis}</small>{quote?.note&&<p className="cc-muted">{quote.note}</p>}</td>
          <td>{converted!==null?formatBRL(converted):"—"}</td><td>{landed!==null?formatBRL(landed):"—"}</td><td>{formatBRL(p.custoFinal)}</td><td>{change(landed,num(p.custoFinal))}</td><td>{formatBRL(p.precoVenda)}</td><td>{change(converted,num(p.precoVenda))}</td>
        </tr>)}</tbody>
      </table></div>
      {!filtered.length&&<Empty text="Nenhum produto corresponde a este filtro."/>}
      <p className="cc-muted">“Mais caro” e “Mais barato” descrevem o valor do Paraguai em relação à base selecionada. “Igual” considera o centavo. Produtos sem preço ou custo válido ficam em “Sem comparação”.</p>
    </Section>
    <Section title="Sugestões de reposição">
      <p className="cc-muted">Base: unidades vendidas nos últimos 90 dias, sem vendas canceladas. A meta considera a cobertura escolhida e pelo menos uma unidade acima do alerta de estoque baixo. Quantidades são sugestões para revisão.</p>
      <Field label="Cobertura desejada (dias)"><input className="cc-input" style={{maxWidth:160}} type="number" min="1" max="365" step="1" value={coverageDays} onChange={e=>setCoverageDays(Math.min(365,Math.max(1,Math.floor(num(e.target.value)))))}/></Field>
      <p className="cc-muted">{suggestions.length} produto(s) com sugestão · {unverified} produto(s) sem estoque e sem vendas recentes: confira o estoque e a demanda antes de comprar.</p>
      {suggestions.length?<div style={{overflowX:"auto"}}><table className="cc-table"><thead><tr><th>Produto</th><th>Prioridade</th><th>Estoque</th><th>Vendidos em 90 dias</th><th>Meta de estoque</th><th>Comprar (un.)</th><th>Estimativa da compra</th><th>Orientação</th></tr></thead>
        <tbody>{suggestions.map(r=>{
          const quote=rows.find(v=>v.p.id===r.product.id);
          const cost=quote?.landed;
          const fresh=cost!==null&&cost!==undefined&&!quote.old&&!error&&(manual?rate>0:fx&&!fxError&&Date.now()-fx.timestamp<=36*3600000);
          const marginOK=cost!==null&&cost!==undefined&&num(r.product.precoVenda)>cost;
          const kind=paraguayDifference(cost,num(r.product.custoFinal));
          return <tr key={r.product.id}><td className="cc-strong">{r.product.name}</td><td><Badge tone={r.stock===0?"red":"gold"}>{r.stock===0?"Sem estoque":"Estoque baixo"}</Badge></td><td>{r.stock}</td><td>{r.sold}</td><td>{r.target}</td><td className="cc-strong">{r.suggested}</td><td>{fresh?formatBRL(cost*r.suggested):"Consultar preço atualizado"}</td><td>{!fresh?"Confirmar preço e câmbio antes de comprar":!marginOK?"Custo estimado atinge ou supera a venda: revisar preço":kind==="barato"?"Reposição abaixo do custo atual":kind==="caro"?"Reposição mais cara: revisar margem":kind==="igual"?"Reposição no mesmo custo":"Sem custo anterior para comparar"}</td></tr>;
        })}</tbody></table></div>:<Empty text="Sem sugestão de compra com base nas vendas recentes. Registre as vendas e confirme os estoques para melhorar as recomendações."/>}
    </Section>
  </>;
}

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

      <ComparacaoParaguai data={data} />
      <Section title={`Itens manuais no catálogo (${data.catalog.length})`}>
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

      body { margin:0; }
      .cc-root, .cc-root * { box-sizing:border-box; }
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

/* ============================== LOGIN / AUTENTICAÇÃO ============================== */

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    auth.signInWithEmailAndPassword(email.trim(), password)
      .catch((err) => {
        const messages = {
          "auth/network-request-failed": "Não foi possível conectar. Verifique sua internet e tente novamente.",
          "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
          "auth/operation-not-allowed": "O acesso por e-mail e senha precisa ser habilitado no Firebase.",
          "auth/invalid-api-key": "A configuração de acesso ao Firebase é inválida.",
          "auth/user-disabled": "Esta conta está desativada. Entre em contato com o administrador.",
        };
        setError(messages[err.code] || "Não foi possível entrar. Confira o e-mail e a senha e tente novamente.");
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="cc-root cc-loading cc-login">
      <Style />
      <img className="cc-login-art" src="../assets/mala-mia-banner.jpg" alt="Mala Mia — Perfumes exclusivos" width="1961" height="544" />
      <form onSubmit={submit} className="cc-card" style={{ maxWidth: 360, width: "90%" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div className="cc-brand-title" style={{ fontSize: 34 }}>Mala Mia</div>
          <div className="cc-muted">Bem-vinda ao seu espaço de gestão</div>
        </div>
        <div className="cc-form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <Field label="E-mail">
            <input className="cc-input" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Senha">
            <input className="cc-input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
        {error && <div className="cc-confirm" style={{ marginTop: 10 }}><AlertTriangle size={15} /> {error}</div>}
        <div className="cc-modal-actions" style={{ justifyContent: "center", marginTop: 16 }}>
          <button className="cc-btn cc-btn-primary" disabled={busy} type="submit">{busy ? "Entrando…" : "Entrar"}</button>
        </div>
      <p className="cc-login-footer"><a href="../">← Voltar para a loja</a></p>
      </form>
    </div>
  );
}

function Root() {
  const [user, setUser] = useState(undefined); // undefined = carregando · null = deslogado

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  if (user === undefined) {
    return (
      <div className="cc-root cc-loading">
        <Style />
        <div className="cc-loading-text">Carregando…</div>
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return <App onLogout={() => auth.signOut()} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
