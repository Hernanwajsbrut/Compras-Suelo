// @ts-nocheck
import { useState, useEffect } from "react";

const SB_URL = "https://glgoidruquyjzorbcqxb.supabase.co";
const SB_KEY = "sb_publishable_ahdlCn7ySRvvKHyS7n02Hg_X0AprYS6";
const HDR = {
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

async function sbGet(table, q = "") {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?select=*${q}`, { headers: HDR });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbPost(table, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: HDR, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbPatch(table, id, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: HDR, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

const mapP = (p) => ({ ...p, obraId: p.obra_id, obraNombre: p.obra_nombre, fechaEntrega: p.fecha_entrega, historial: p.historial || [] });

const ROLE_LABELS = { director: "Director", jefe_obra: "Jefe de Obra", arquitecto: "Arquitecto", compras: "Compras", admin: "Administración" };
const ROLE_ORDER = ["director", "jefe_obra", "arquitecto", "compras", "admin"];
const TIPO_LABELS = { compra_chica: "Compra Chica", licitacion: "Licitación", acopio: "Acopio / Compra Grande" };
const TIPO_CODES = { compra_chica: "CC", licitacion: "LC", acopio: "AC" };
const TIPO_COLORS = { compra_chica: "bg-amber-100 text-amber-800 border-amber-200", licitacion: "bg-blue-100 text-blue-800 border-blue-200", acopio: "bg-orange-100 text-orange-800 border-orange-200" };
const ESTADO_LABELS = { nuevo: "Pendiente Compras", cotizado: "Cotizado", aprobado: "Aprobado", rechazado: "Rechazado", pagado: "Pagado", contrato_firmado: "Contrato Firmado" };
const ESTADO_COLORS = { nuevo: "bg-yellow-100 text-yellow-800", cotizado: "bg-sky-100 text-sky-800", aprobado: "bg-green-100 text-green-800", rechazado: "bg-red-100 text-red-800", pagado: "bg-purple-100 text-purple-800", contrato_firmado: "bg-emerald-100 text-emerald-800" };
const URGENCIA_COLORS = { bajo: "bg-green-100 text-green-700", medio: "bg-yellow-100 text-yellow-700", alto: "bg-red-100 text-red-700" };
const BTN_COLORS = { green: "bg-green-600 hover:bg-green-700 text-white", red: "bg-red-500 hover:bg-red-600 text-white", sky: "bg-sky-600 hover:bg-sky-700 text-white", purple: "bg-purple-600 hover:bg-purple-700 text-white", emerald: "bg-emerald-600 hover:bg-emerald-700 text-white" };
const CREATE_PERMS = { director: ["compra_chica", "licitacion", "acopio"], jefe_obra: ["compra_chica", "acopio"], arquitecto: ["licitacion", "acopio"] };
const FLOWS = { compra_chica: ["Obra crea", "Compras aprueba", "Admin paga"], licitacion: ["Arq. crea", "Compras cotiza", "Dirección aprueba", "Admin firma"], acopio: ["Crea pedido", "Compras cotiza", "Dirección aprueba", "Admin paga"] };
const STATE_IDX = { compra_chica: { nuevo: 0, aprobado: 1, rechazado: 1, pagado: 2 }, licitacion: { nuevo: 0, cotizado: 1, aprobado: 2, rechazado: 2, contrato_firmado: 3 }, acopio: { nuevo: 0, cotizado: 1, aprobado: 2, rechazado: 2, pagado: 3 } };

function getActions(pedido, role) {
  const d = role === "director";
  const { tipo, estado } = pedido;
  if (tipo === "compra_chica") {
    if (estado === "nuevo" && (role === "compras" || d)) return [{ label: "Cotizar y Aprobar", estado: "aprobado", color: "green" }, { label: "Rechazar", estado: "rechazado", color: "red" }];
    if (estado === "aprobado" && (role === "admin" || d)) return [{ label: "Marcar Pagado", estado: "pagado", color: "purple" }];
  }
  if (tipo === "licitacion") {
    if (estado === "nuevo" && (role === "compras" || d)) return [{ label: "Marcar Cotizado", estado: "cotizado", color: "sky" }];
    if (estado === "cotizado" && (role === "director" || d)) return [{ label: "Aprobar", estado: "aprobado", color: "green" }, { label: "Rechazar", estado: "rechazado", color: "red" }];
    if (estado === "aprobado" && (role === "admin" || d)) return [{ label: "Contrato Firmado", estado: "contrato_firmado", color: "emerald" }];
  }
  if (tipo === "acopio") {
    if (estado === "nuevo" && (role === "compras" || d)) return [{ label: "Marcar Cotizado", estado: "cotizado", color: "sky" }];
    if (estado === "cotizado" && (role === "director" || d)) return [{ label: "Aprobar", estado: "aprobado", color: "green" }, { label: "Rechazar", estado: "rechazado", color: "red" }];
    if (estado === "aprobado" && (role === "admin" || d)) return [{ label: "Marcar Pagado", estado: "pagado", color: "purple" }];
  }
  return [];
}

const isPending = (p, role) => getActions(p, role).length > 0;
const fmtDate = ts => new Date(ts).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
function addBusinessDays(date, days) { let d = new Date(date), a = 0; while (a < days) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) a++; } return d; }
const minDeliveryStr = () => addBusinessDays(new Date(), 2).toISOString().slice(0, 10);
function getRef(obraCodigo, tipo, pedidos, obraId) { const n = pedidos.filter(p => p.obraId === obraId && p.tipo === tipo).length + 1; return `#${obraCodigo}_${TIPO_CODES[tipo]}_${n}`; }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const emptyNew = { tipo: "", titulo: "", obraId: "", descripcion: "", fechaEntrega: "", urgencia: "" };
const emptyObra = { nombre: "", codigo: "", direccion: "" };
const emptyDashF = { tipo: "", estado: "", obraId: "" };
const emptyUser = { name: "", username: "", password: "", role: "jefe_obra", activo: true };

export default function App() {
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [obras, setObras] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [view, setView] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const [loginF, setLoginF] = useState({ username: "", password: "" });
  const [loginErr, setLoginErr] = useState("");
  const [comment, setComment] = useState("");
  const [newForm, setNewForm] = useState(emptyNew);
  const [newErr, setNewErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [obraF, setObraF] = useState(emptyObra);
  const [obraErr, setObraErr] = useState("");
  const [showObraF, setShowObraF] = useState(false);
  const [dashF, setDashF] = useState(emptyDashF);
  const [allF, setAllF] = useState(emptyDashF);
  const [showDemo, setShowDemo] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [userForm, setUserForm] = useState(emptyUser);
  const [userErr, setUserErr] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [u, o, p] = await Promise.all([
          sbGet("usuarios"),
          sbGet("obras"),
          sbGet("pedidos", "&order=creado_at.desc"),
        ]);
        setUsers(u);
        setObras(o);
        setPedidos(p.map(mapP));
      } catch (e) {
        setLoadErr("No se pudo conectar con la base de datos. Revisá la conexión.");
      }
      setLoaded(true);
    })();
  }, []);

  const login = () => {
    const u = users.find(u => u.username === loginF.username.trim() && u.password === loginF.password && u.activo !== false);
    if (!u) { setLoginErr("Usuario o contraseña incorrectos"); return; }
    setUser(u); setLoginErr("");
  };
  const logout = () => { setUser(null); setView("dashboard"); setSel(null); };
  const nav = (v) => { setView(v); setSel(null); };

  function openNewUser() { setUserForm(emptyUser); setUserErr(""); setShowPass(true); setEditUser({}); }
  function openEditUser(u) { setUserForm({ name: u.name, username: u.username, password: "", role: u.role, activo: u.activo }); setUserErr(""); setShowPass(false); setEditUser(u); }
  function closeUserForm() { setEditUser(null); setUserErr(""); }

  async function saveUser() {
    const name = userForm.name.trim(), username = userForm.username.trim().toLowerCase();
    if (!name || !username) { setUserErr("Nombre y usuario son obligatorios"); return; }
    if (!/^[a-z0-9._-]+$/.test(username)) { setUserErr("Solo letras, números, puntos o guiones"); return; }
    const isNew = !editUser.id;
    if (isNew && !userForm.password) { setUserErr("La contraseña es obligatoria"); return; }
    if (users.find(u => u.username === username && u.id !== editUser.id)) { setUserErr("Ese usuario ya existe"); return; }
    setSaving(true);
    try {
      if (isNew) {
        const data = { id: uid(), name, username, password: userForm.password, role: userForm.role, activo: true };
        await sbPost("usuarios", data);
        setUsers(prev => [...prev, data]);
      } else {
        const data = { name, username, role: userForm.role, activo: userForm.activo, ...(userForm.password ? { password: userForm.password } : {}) };
        await sbPatch("usuarios", editUser.id, data);
        setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...data } : u));
        if (user.id === editUser.id) setUser(prev => ({ ...prev, name, username, role: userForm.role }));
      }
      closeUserForm();
    } catch (e) { setUserErr("Error al guardar. Intentá de nuevo."); }
    setSaving(false);
  }

  async function toggleActive(u) {
    if (u.id === user.id) return;
    const newActivo = !u.activo;
    await sbPatch("usuarios", u.id, { activo: newActivo });
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, activo: newActivo } : x));
  }

  async function saveObra() {
    const nombre = obraF.nombre.trim(), codigo = obraF.codigo.trim().toUpperCase();
    if (!nombre || !codigo) { setObraErr("Nombre y código son obligatorios"); return; }
    if (codigo.length < 2 || codigo.length > 5) { setObraErr("Código: 2-5 caracteres"); return; }
    if (obras.find(o => o.codigo === codigo)) { setObraErr("Ya existe una obra con ese código"); return; }
    setSaving(true);
    try {
      const obra = { id: uid(), nombre, codigo, direccion: obraF.direccion.trim(), activa: true, at: Date.now() };
      await sbPost("obras", obra);
      setObras(prev => [...prev, obra]);
      setObraF(emptyObra); setObraErr(""); setShowObraF(false);
    } catch (e) { setObraErr("Error al guardar. Intentá de nuevo."); }
    setSaving(false);
  }

  async function savePedido() {
    setNewErr("");
    if (!newForm.tipo || !newForm.titulo.trim() || !newForm.obraId) { setNewErr("Tipo, título y obra son obligatorios"); return; }
    if (newForm.tipo === "compra_chica") {
      if (!newForm.fechaEntrega) { setNewErr("La fecha de entrega es obligatoria"); return; }
      if (newForm.fechaEntrega < minDeliveryStr()) { setNewErr("La fecha debe ser al menos 48 hs hábiles desde hoy"); return; }
    }
    if ((newForm.tipo === "licitacion" || newForm.tipo === "acopio") && !newForm.urgencia) { setNewErr("El nivel de urgencia es obligatorio"); return; }
    const obra = obras.find(o => o.id === newForm.obraId);
    const historial = [{ accion: "Pedido creado", usuario: user.name, rol: ROLE_LABELS[user.role], ts: Date.now(), comentario: newForm.descripcion.trim() }];
    const dbP = {
      id: uid().toUpperCase(),
      referencia: getRef(obra.codigo, newForm.tipo, pedidos, newForm.obraId),
      tipo: newForm.tipo, titulo: newForm.titulo.trim(),
      obra_id: newForm.obraId, obra_nombre: obra.nombre,
      descripcion: newForm.descripcion.trim(), estado: "nuevo",
      fecha_entrega: newForm.tipo === "compra_chica" ? newForm.fechaEntrega : null,
      urgencia: (newForm.tipo === "licitacion" || newForm.tipo === "acopio") ? newForm.urgencia : null,
      creado_por: user.id, creado_nombre: user.name, creado_at: Date.now(),
      historial,
    };
    setSaving(true);
    try {
      await sbPost("pedidos", dbP);
      setPedidos(prev => [mapP(dbP), ...prev]);
      setNewForm(emptyNew); nav("dashboard");
    } catch (e) { setNewErr("Error al guardar. Intentá de nuevo."); }
    setSaving(false);
  }

  async function doAction(pedido, action) {
    const entry = { accion: action.label, usuario: user.name, rol: ROLE_LABELS[user.role], ts: Date.now(), comentario: comment.trim() };
    const newHistorial = [...pedido.historial, entry];
    try {
      await sbPatch("pedidos", pedido.id, { estado: action.estado, historial: newHistorial });
      const updated = { ...pedido, estado: action.estado, historial: newHistorial };
      setPedidos(prev => prev.map(p => p.id === pedido.id ? updated : p));
      setSel(updated); setComment("");
    } catch (e) { alert("Error al guardar la acción. Intentá de nuevo."); }
  }

  if (!loaded) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-400 gap-3">
      <div className="text-4xl animate-spin">⚙️</div>
      <p>Conectando con la base de datos...</p>
      {loadErr && <p className="text-red-400 text-sm">{loadErr}</p>}
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="text-4xl mb-2">🏗️</div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Compras</h1>
          <p className="text-slate-400 text-sm mt-1">Iniciá sesión para continuar</p>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Usuario</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" value={loginF.username} placeholder="nombre.apellido" onChange={e => setLoginF(f => ({ ...f, username: e.target.value }))} onKeyDown={e => e.key === "Enter" && login()} /></div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
            <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" value={loginF.password} onChange={e => setLoginF(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && login()} /></div>
          {loginErr && <p className="text-red-500 text-sm">{loginErr}</p>}
          <button onClick={login} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition text-sm">Ingresar</button>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <button onClick={() => setShowDemo(!showDemo)} className="text-xs text-slate-400 hover:text-slate-600">{showDemo ? "▲" : "▼"} Ver usuarios de demo</button>
          {showDemo && <div className="mt-2 text-xs text-slate-500 space-y-1 bg-slate-50 rounded-lg p-3">
            <p>👔 <b>Director:</b> carlos.martinez / dir123</p>
            <p>🪖 <b>Jefe Obra:</b> lucas.rodriguez / obra123</p>
            <p>📐 <b>Arquitecto:</b> sofia.perez / arq123</p>
            <p>🛒 <b>Compras:</b> javier.suarez / comp123</p>
            <p>💳 <b>Admin:</b> maria.gonzalez / adm123</p>
          </div>}
        </div>
      </div>
    </div>
  );

  const canCreate = CREATE_PERMS[user.role] || [];
  const myPending = pedidos.filter(p => isPending(p, user.role));
  const dashPending = myPending.filter(p => (!dashF.tipo || p.tipo === dashF.tipo) && (!dashF.estado || p.estado === dashF.estado) && (!dashF.obraId || p.obraId === dashF.obraId));
  const allFiltered = pedidos.filter(p => (!allF.tipo || p.tipo === allF.tipo) && (!allF.estado || p.estado === allF.estado) && (!allF.obraId || p.obraId === allF.obraId));
  const isDir = user.role === "director";
  const tabs = ["dashboard", "todos", ...(canCreate.length ? ["nuevo"] : []), ...(isDir ? ["obras", "usuarios"] : [])];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏗️</span>
          <div><p className="font-bold text-sm leading-tight">Gestión de Compras</p><p className="text-xs text-slate-400">{user.name} · {ROLE_LABELS[user.role]}</p></div>
        </div>
        <button onClick={logout} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition">Salir</button>
      </header>

      <nav className="bg-white border-b border-slate-200 px-4 flex overflow-x-auto">
        {tabs.map(v => (
          <button key={v} onClick={() => nav(v)} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${view === v && !sel ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {v === "dashboard" ? <>{`Dashboard`}{myPending.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{myPending.length}</span>}</> : v === "todos" ? "Todos los pedidos" : v === "nuevo" ? "➕ Nuevo pedido" : v === "obras" ? "🏢 Obras" : "👥 Usuarios"}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">

        {view === "dashboard" && !sel && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[{ label: "Pendientes", value: myPending.length, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" }, { label: "Total pedidos", value: pedidos.length, color: "text-slate-700", bg: "bg-white border-slate-200" }, { label: "Finalizados", value: pedidos.filter(p => ["pagado", "contrato_firmado", "rechazado"].includes(p.estado)).length, color: "text-green-700", bg: "bg-green-50 border-green-200" }].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}><p className="text-xs text-slate-500">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></div>
              ))}
            </div>
            <Filters f={dashF} setF={setDashF} obras={obras} />
            {dashPending.length === 0
              ? <Empty icon={myPending.length === 0 ? "✅" : "🔍"} title={myPending.length === 0 ? "¡Estás al día!" : "Sin resultados"} sub={myPending.length === 0 ? "No tenés pedidos pendientes." : "Probá cambiando los filtros."} />
              : <><p className="font-semibold text-slate-700 mb-3 text-sm">Requieren tu acción ({dashPending.length})</p><div className="space-y-2">{dashPending.map(p => <PCard key={p.id} p={p} onClick={() => { setSel(p); setView("detalle"); }} />)}</div></>}
          </div>
        )}

        {view === "todos" && !sel && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4 items-center"><Filters f={allF} setF={setAllF} obras={obras} /><span className="text-xs text-slate-400 ml-auto">{allFiltered.length} resultado{allFiltered.length !== 1 ? "s" : ""}</span></div>
            {allFiltered.length === 0 ? <Empty icon="📋" title="Sin resultados" sub="No hay pedidos con esos filtros." /> : <div className="space-y-2">{allFiltered.map(p => <PCard key={p.id} p={p} onClick={() => { setSel(p); setView("detalle"); }} />)}</div>}
          </div>
        )}

        {view === "nuevo" && !sel && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Crear nuevo pedido</h2>
            {obras.length === 0 && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-4">⚠️ No hay obras cargadas. Un Director debe cargarlas primero.</div>}
            <div className="space-y-4">
              <Field label="Obra *"><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newForm.obraId} onChange={e => setNewForm(f => ({ ...f, obraId: e.target.value }))}><option value="">Seleccioná una obra...</option>{obras.filter(o => o.activa).map(o => <option key={o.id} value={o.id}>{o.nombre} ({o.codigo})</option>)}</select></Field>
              <Field label="Tipo de pedido *"><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newForm.tipo} onChange={e => setNewForm(f => ({ ...f, tipo: e.target.value, urgencia: "", fechaEntrega: "" }))}><option value="">Seleccioná...</option>{canCreate.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}</select></Field>
              <Field label="Título / Referencia *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Hierro para columnas torre A" value={newForm.titulo} onChange={e => setNewForm(f => ({ ...f, titulo: e.target.value }))} /></Field>
              {newForm.tipo === "compra_chica" && <Field label={<>Fecha de entrega * <span className="text-slate-400 font-normal text-xs">(mín. 48 hs hábiles)</span></>}><input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" min={minDeliveryStr()} value={newForm.fechaEntrega} onChange={e => setNewForm(f => ({ ...f, fechaEntrega: e.target.value }))} /></Field>}
              {(newForm.tipo === "licitacion" || newForm.tipo === "acopio") && <Field label="Nivel de urgencia *"><div className="flex gap-2">{["bajo", "medio", "alto"].map(u => <button key={u} type="button" onClick={() => setNewForm(f => ({ ...f, urgencia: u }))} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition ${newForm.urgencia === u ? (u === "bajo" ? "border-green-500 bg-green-50 text-green-700" : u === "medio" ? "border-yellow-500 bg-yellow-50 text-yellow-700" : "border-red-500 bg-red-50 text-red-700") : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>{u === "bajo" ? "🟢 Bajo" : u === "medio" ? "🟡 Medio" : "🔴 Alto"}</button>)}</div></Field>}
              <Field label="Observaciones"><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={3} placeholder="Detalles, referencia al servidor interno..." value={newForm.descripcion} onChange={e => setNewForm(f => ({ ...f, descripcion: e.target.value }))} /></Field>
              {newForm.obraId && newForm.tipo && <div className="bg-slate-50 rounded-lg p-3 border border-slate-100"><p className="text-xs text-slate-500">Referencia del pedido:</p><p className="font-mono font-bold text-slate-700 mt-0.5">{getRef(obras.find(o => o.id === newForm.obraId)?.codigo || "???", newForm.tipo, pedidos, newForm.obraId)}</p></div>}
              {newErr && <p className="text-red-500 text-sm">{newErr}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={savePedido} disabled={obras.length === 0 || saving} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-medium px-5 py-2 rounded-lg text-sm transition">{saving ? "Guardando..." : "Crear pedido"}</button>
                <button onClick={() => nav("dashboard")} className="text-slate-500 hover:text-slate-700 text-sm px-3">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {view === "obras" && !sel && isDir && (
          <div>
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-800">Obras</h2><button onClick={() => setShowObraF(!showObraF)} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">{showObraF ? "Cancelar" : "+ Nueva obra"}</button></div>
            {showObraF && <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4 max-w-md"><h3 className="font-semibold text-slate-700 mb-4">Nueva obra</h3><div className="space-y-3">
              <Field label="Nombre *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Edificio Palermo" value={obraF.nombre} onChange={e => setObraF(f => ({ ...f, nombre: e.target.value }))} /></Field>
              <Field label="Código * (2-5 letras)"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase" placeholder="PAL" maxLength={5} value={obraF.codigo} onChange={e => setObraF(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} /></Field>
              <Field label="Dirección"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Av. Santa Fe 1234" value={obraF.direccion} onChange={e => setObraF(f => ({ ...f, direccion: e.target.value }))} /></Field>
              {obraErr && <p className="text-red-500 text-sm">{obraErr}</p>}
              <button onClick={saveObra} disabled={saving} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition">{saving ? "Guardando..." : "Guardar obra"}</button>
            </div></div>}
            {obras.length === 0 ? <Empty icon="🏢" title="No hay obras cargadas" sub="Creá la primera obra para comenzar." /> : <div className="space-y-2">{obras.map(o => <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2"><span className="font-bold text-slate-800">{o.nombre}</span><span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{o.codigo}</span></div>{o.direccion && <p className="text-xs text-slate-500 mt-0.5">📍 {o.direccion}</p>}<p className="text-xs text-slate-400 mt-1">{pedidos.filter(p => p.obraId === o.id).length} pedido(s)</p></div>)}</div>}
          </div>
        )}

        {view === "usuarios" && !sel && isDir && (
          <div>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold text-slate-800">Usuarios del sistema</h2><button onClick={openNewUser} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">+ Nuevo usuario</button></div>
            {editUser !== null && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-slate-800 text-lg mb-5">{editUser.id ? "Editar usuario" : "Nuevo usuario"}</h3>
                  <div className="space-y-4">
                    <Field label="Nombre completo *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Juan Pérez" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} /></Field>
                    <Field label="Usuario *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="juan.perez" value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} /></Field>
                    <Field label={editUser.id ? "Nueva contraseña (vacío = no cambiar)" : "Contraseña *"}>
                      <div className="relative"><input type={showPass ? "text" : "password"} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-16" placeholder={editUser.id ? "••••••••" : "Mínimo 6 caracteres"} value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600">{showPass ? "Ocultar" : "Mostrar"}</button></div>
                    </Field>
                    <Field label="Rol *"><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>{ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
                    {editUser.id && editUser.id !== user.id && <div className="flex items-center gap-3"><button type="button" onClick={() => setUserForm(f => ({ ...f, activo: !f.activo }))} className={`relative w-11 h-6 rounded-full transition ${userForm.activo ? "bg-green-500" : "bg-slate-300"}`}><span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${userForm.activo ? "left-5" : "left-0.5"}`} /></button><span className="text-sm text-slate-600">{userForm.activo ? "Activo" : "Inactivo"}</span></div>}
                    {userErr && <p className="text-red-500 text-sm">{userErr}</p>}
                    <div className="flex gap-3 pt-2"><button onClick={saveUser} disabled={saving} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-medium px-5 py-2 rounded-lg text-sm transition">{saving ? "Guardando..." : editUser.id ? "Guardar cambios" : "Crear usuario"}</button><button onClick={closeUserForm} className="text-slate-500 hover:text-slate-700 text-sm px-3">Cancelar</button></div>
                  </div>
                </div>
              </div>
            )}
            {ROLE_ORDER.map(role => {
              const grupo = users.filter(u => u.role === role);
              if (!grupo.length) return null;
              return <div key={role} className="mb-6"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{ROLE_LABELS[role]} ({grupo.length})</p><div className="space-y-2">{grupo.map(u => <div key={u.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${u.activo === false ? "opacity-50 border-slate-100" : "border-slate-200"}`}><div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${u.activo === false ? "bg-slate-300" : role === "director" ? "bg-slate-700" : role === "jefe_obra" ? "bg-orange-400" : role === "arquitecto" ? "bg-blue-400" : role === "compras" ? "bg-green-500" : "bg-purple-400"}`}>{u.name.charAt(0)}</div><div className="flex-1 min-w-0"><p className="font-medium text-slate-800 text-sm">{u.name}{u.id === user.id && <span className="text-xs text-slate-400 ml-1">(vos)</span>}</p><p className="text-xs text-slate-400 font-mono">{u.username}</p></div>{u.activo === false && <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Inactivo</span>}<div className="flex gap-2 flex-shrink-0"><button onClick={() => openEditUser(u)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition">Editar</button>{u.id !== user.id && <button onClick={() => toggleActive(u)} className={`text-xs px-3 py-1.5 rounded-lg transition ${u.activo === false ? "bg-green-100 hover:bg-green-200 text-green-700" : "bg-red-100 hover:bg-red-200 text-red-600"}`}>{u.activo === false ? "Activar" : "Desactivar"}</button>}</div></div>)}</div></div>;
            })}
          </div>
        )}

        {view === "detalle" && sel && <DetailView pedido={sel} user={user} onAction={doAction} onBack={() => { setSel(null); setView("dashboard"); }} comment={comment} setComment={setComment} />}
      </main>
    </div>
  );
}

function Field({ label, children }) { return <div><label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>{children}</div>; }
function Empty({ icon, title, sub }) { return <div className="text-center py-14 text-slate-400"><div className="text-4xl mb-2">{icon}</div><p className="font-medium">{title}</p><p className="text-sm mt-1">{sub}</p></div>; }
function Filters({ f, setF, obras }) {
  return <div className="flex flex-wrap gap-2 mb-4">
    <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={f.tipo} onChange={e => setF(p => ({ ...p, tipo: e.target.value }))}><option value="">Todos los tipos</option>{Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={f.estado} onChange={e => setF(p => ({ ...p, estado: e.target.value }))}><option value="">Todos los estados</option>{Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    {obras.length > 0 && <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={f.obraId} onChange={e => setF(p => ({ ...p, obraId: e.target.value }))}><option value="">Todas las obras</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select>}
    {(f.tipo || f.estado || f.obraId) && <button onClick={() => setF({ tipo: "", estado: "", obraId: "" })} className="text-xs text-slate-400 hover:text-slate-600 px-1">✕ Limpiar</button>}
  </div>;
}
function PCard({ p, onClick }) {
  return <div onClick={onClick} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition"><div className="flex-1 min-w-0"><div className="flex flex-wrap gap-1.5 mb-1.5 items-center"><span className="font-mono text-xs text-slate-500 font-semibold">{p.referencia}</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TIPO_COLORS[p.tipo]}`}>{TIPO_LABELS[p.tipo]}</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLORS[p.estado]}`}>{ESTADO_LABELS[p.estado]}</span>{p.urgencia && <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${URGENCIA_COLORS[p.urgencia]}`}>⚡ {p.urgencia}</span>}</div><p className="font-semibold text-slate-800 truncate">{p.titulo}</p><p className="text-xs text-slate-500 mt-0.5">🏢 {p.obraNombre}</p>{p.fechaEntrega && <p className="text-xs text-slate-400 mt-0.5">📅 Entrega: {p.fechaEntrega}</p>}<p className="text-xs text-slate-400 mt-1">Por {p.creado_nombre} · {fmtDate(p.creado_at)}</p></div><span className="text-slate-300 text-lg mt-1">›</span></div>;
}
function DetailView({ pedido, user, onAction, onBack, comment, setComment }) {
  const actions = getActions(pedido, user.role);
  const steps = FLOWS[pedido.tipo] || [];
  const curr = STATE_IDX[pedido.tipo]?.[pedido.estado] ?? 0;
  return <div className="max-w-2xl"><button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm mb-4 flex items-center gap-1">← Volver</button><div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"><div className="flex flex-wrap items-center gap-2 mb-3"><span className="font-mono text-sm font-bold text-slate-600">{pedido.referencia}</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TIPO_COLORS[pedido.tipo]}`}>{TIPO_LABELS[pedido.tipo]}</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLORS[pedido.estado]}`}>{ESTADO_LABELS[pedido.estado]}</span>{pedido.urgencia && <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${URGENCIA_COLORS[pedido.urgencia]}`}>⚡ {pedido.urgencia}</span>}</div><h2 className="text-xl font-bold text-slate-800">{pedido.titulo}</h2><p className="text-sm text-slate-500 mt-1">🏢 {pedido.obraNombre}</p>{pedido.fechaEntrega && <p className="text-sm text-slate-600 mt-1">📅 Entrega esperada: <b>{pedido.fechaEntrega}</b></p>}{pedido.descripcion && <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100"><p className="text-xs font-medium text-slate-500 mb-1">Observaciones</p><p className="text-sm text-slate-600">{pedido.descripcion}</p></div>}<div className="mt-4 flex items-center gap-1 flex-wrap">{steps.map((s, i) => <div key={i} className="flex items-center gap-1"><span className={`text-xs px-2 py-1 rounded-full font-medium ${i < curr ? "bg-slate-200 text-slate-500" : i === curr ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400"}`}>{s}</span>{i < steps.length - 1 && <span className="text-slate-300 text-xs">→</span>}</div>)}</div>{actions.length > 0 && <div className="mt-5 border-t border-slate-100 pt-5"><h3 className="font-semibold text-slate-700 mb-3">Tu acción requerida</h3><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none mb-3" rows={2} placeholder="Comentario opcional..." value={comment} onChange={e => setComment(e.target.value)} /><div className="flex flex-wrap gap-2">{actions.map(a => <button key={a.estado} onClick={() => onAction(pedido, a)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${BTN_COLORS[a.color]}`}>{a.label}</button>)}</div></div>}<div className="mt-5 border-t border-slate-100 pt-5"><h3 className="font-semibold text-slate-700 mb-3">Historial</h3><div className="space-y-3">{[...pedido.historial].reverse().map((h, i) => <div key={i} className="flex gap-3 text-sm"><div className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-slate-400" /><div><span className="font-medium text-slate-700">{h.accion}</span><span className="text-slate-400"> · {h.usuario} ({h.rol}) · {fmtDate(h.ts)}</span>{h.comentario && <p className="text-slate-500 mt-0.5 italic">"{h.comentario}"</p>}</div></div>)}</div></div></div></div>;
}