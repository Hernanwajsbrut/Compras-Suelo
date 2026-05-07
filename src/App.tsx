// @ts-nocheck
import { useState, useEffect } from "react";

const SB_URL = "https://glgoidruquyjzorbcqxb.supabase.co";
const SB_KEY = "sb_publishable_ahdlCn7ySRvvKHyS7n02Hg_X0AprYS6";
const H = { "apikey":SB_KEY, "Authorization":`Bearer ${SB_KEY}`, "Content-Type":"application/json", "Prefer":"return=representation" };
const sb = {
  get:   async (t,q="")  => { const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*${q}`,{headers:H}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  post:  async (t,d)     => { const r=await fetch(`${SB_URL}/rest/v1/${t}`,{method:"POST",headers:H,body:JSON.stringify(d)}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  patch: async (t,id,d)  => { const r=await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:H,body:JSON.stringify(d)}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  del:   async (t,id)    => { const r=await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:H}); if(!r.ok) throw new Error(await r.text()); },
};
const mapP = p => ({...p, obraId:p.obra_id, obraNombre:p.obra_nombre, fechaEntrega:p.fecha_entrega, historial:p.historial||[], metadata:p.metadata||{}});

// ── Constants ──────────────────────────────────────────────────
const RL = { director:"Director", jefe_obra:"Jefe de Obra", arquitecto:"Arquitecto", compras:"Compras", admin:"Administración" };
const RO = ["director","jefe_obra","arquitecto","compras","admin"];
const TL = { compra_chica:"Compra Chica", compra_grande:"Compra Grande", licitacion:"Licitación", acopio:"Acopio" };
const TC = { compra_chica:"CC", compra_grande:"CG", licitacion:"LC", acopio:"AC" };
const TIPO_CLR = {
  compra_chica:"bg-amber-100 text-amber-800 border-amber-200",
  compra_grande:"bg-orange-100 text-orange-800 border-orange-200",
  licitacion:"bg-blue-100 text-blue-800 border-blue-200",
  acopio:"bg-purple-100 text-purple-800 border-purple-200",
};
const EL = {
  nuevo:"Nuevo", cotizado:"Cotizado", desacopiado:"Desacopiado",
  pendiente_dir:"Pend. Aprobación Dir.", pend_pago:"Pendiente Pago",
  pend_pago_anticipo:"Pend. Pago Anticipo", pend_entrega:"Pendiente Entrega",
  pend_pago_saldo:"Pend. Saldo", pendiente_firma:"Pend. Firma Contrato",
  rechazado:"Rechazado", archivado:"Archivado",
};
const EC = {
  nuevo:"bg-yellow-100 text-yellow-800", cotizado:"bg-sky-100 text-sky-800",
  desacopiado:"bg-teal-100 text-teal-800", pendiente_dir:"bg-orange-100 text-orange-800",
  pend_pago:"bg-violet-100 text-violet-800", pend_pago_anticipo:"bg-violet-100 text-violet-800",
  pend_entrega:"bg-green-100 text-green-800", pend_pago_saldo:"bg-violet-100 text-violet-800",
  pendiente_firma:"bg-emerald-100 text-emerald-800",
  rechazado:"bg-red-100 text-red-800", archivado:"bg-slate-100 text-slate-500",
};
const BC = {
  green:"bg-green-600 hover:bg-green-700 text-white", red:"bg-red-500 hover:bg-red-600 text-white",
  sky:"bg-sky-600 hover:bg-sky-700 text-white", purple:"bg-purple-600 hover:bg-purple-700 text-white",
  emerald:"bg-emerald-600 hover:bg-emerald-700 text-white", teal:"bg-teal-600 hover:bg-teal-700 text-white",
};
const UC = { bajo:"bg-green-100 text-green-700", medio:"bg-yellow-100 text-yellow-700", alto:"bg-red-100 text-red-700" };
const CREATE_PERMS = {
  director:["compra_chica","compra_grande","licitacion","acopio"],
  jefe_obra:["compra_chica","compra_grande"],
  arquitecto:["compra_chica","compra_grande","licitacion"],
  compras:[], admin:[],
};
const ACTIVE_ESTADOS = ["nuevo","cotizado","desacopiado","pendiente_dir","pend_pago","pend_pago_anticipo","pend_entrega","pend_pago_saldo","pendiente_firma"];
const fmtDate = ts => new Date(ts).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"short"});
const fmtMoney = n => n ? new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",minimumFractionDigits:0}).format(Number(n)) : "";
function addBD(d,n){let r=new Date(d),a=0;while(a<n){r.setDate(r.getDate()+1);if(r.getDay()!==0&&r.getDay()!==6)a++;}return r;}
const minDel = () => addBD(new Date(),2).toISOString().slice(0,10);
function getRef(cod,tipo,pedidos,obraId){
  const fecha=new Date().toISOString().slice(0,10).replace(/-/g,"");
  const n=pedidos.filter(p=>p.obraId===obraId&&p.tipo===tipo).length+1;
  return `#${cod}_${fecha}_${TC[tipo]}_${n}`;
}
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,5);

// ── State machine ──────────────────────────────────────────────
function getActions(pedido, role) {
  const {tipo, estado} = pedido;
  const meta = pedido.metadata||{};
  const d=role==="director", isCo=role==="compras", isAd=role==="admin", isOb=role==="jefe_obra";
  if(["rechazado","archivado"].includes(estado)) return [];
  const rej = {label:"Rechazar", newEstado:"rechazado", color:"red"};

  // COMPRA CHICA ─────────────────────────────────────────────
  if(tipo==="compra_chica"){
    if(estado==="nuevo"&&(isCo||d)) return [
      {label:"Aprobar Compra", newEstado:null, color:"green", formType:"approve_cc"},
      {label:"Desacopiar",     newEstado:"desacopiado", color:"teal"},
      rej,
    ];
    if(estado==="desacopiado"&&(isOb||d))
      return [{label:"Marcar Entregado", newEstado:"archivado", color:"green"}];
    if(estado==="pendiente_dir"){
      if(d) return [{label:"Confirmar Aprobación", newEstado:null, color:"green", formType:"approve_cc_dir"}, rej];
      if(isCo) return [rej];
    }
    if(estado==="pend_pago"&&(isAd||d)){
      const next = meta.route==="anticipado" ? "pend_entrega" : "archivado";
      return [{label:"Marcar Pagado", newEstado:next, color:"purple"}];
    }
    if(estado==="pend_entrega"&&(isOb||d)){
      if(meta.route==="anticipado") return [{label:"Marcar Recibido", newEstado:"archivado", color:"green"}];
      return [{label:"Marcar Entregado", newEstado:"pend_pago", color:"green"}];
    }
  }

  // COMPRA GRANDE ────────────────────────────────────────────
  if(tipo==="compra_grande"){
    if(estado==="nuevo"&&(isCo||d)) return [
      {label:"Marcar Cotizado", newEstado:"cotizado", color:"sky"},
      {label:"Desacopiar",      newEstado:"desacopiado", color:"teal"},
      rej,
    ];
    if(estado==="cotizado"){
      if(d)   return [{label:"Aprobar", newEstado:null, color:"green", formType:"approve_dir_grande"}, rej];
      if(isCo) return [rej];
    }
    if(estado==="desacopiado"&&(isOb||d))
      return [{label:"Marcar Entregado", newEstado:"archivado", color:"green"}];
    if(estado==="pend_pago_anticipo"&&(isAd||d))
      return [{label:"Marcar Anticipo Pagado", newEstado:"pend_entrega", color:"purple"}];
    if(estado==="pend_entrega"&&(isOb||d)){
      if(meta.route==="anticipado")   return [{label:"Marcar Recibido",  newEstado:"archivado",      color:"green"}];
      if(meta.route==="pago_parcial") return [{label:"Marcar Entregado", newEstado:"pend_pago_saldo", color:"green"}];
      return [{label:"Marcar Entregado", newEstado:"pend_pago", color:"green"}];
    }
    if(estado==="pend_pago"&&(isAd||d)){
      const next = meta.route==="anticipado" ? "pend_entrega" : "archivado";
      return [{label:"Marcar Pagado", newEstado:next, color:"purple"}];
    }
    if(estado==="pend_pago_saldo"&&(isAd||d))
      return [{label:"Marcar Saldo Pagado", newEstado:"archivado", color:"purple"}];
  }

  // LICITACIÓN ───────────────────────────────────────────────
  if(tipo==="licitacion"){
    if(estado==="nuevo"&&(isCo||d)) return [{label:"Marcar Cotizado", newEstado:"cotizado", color:"sky"}, rej];
    if(estado==="cotizado"){
      if(d)    return [{label:"Aprobar", newEstado:null, color:"green", formType:"approve_dir_licitacion"}, rej];
      if(isCo) return [rej];
    }
    if(estado==="pendiente_firma"&&(isAd||d)) return [{label:"Marcar Contrato Firmado", newEstado:"archivado", color:"emerald"}];
    if(estado==="pend_pago"&&(isAd||d))       return [{label:"Marcar Anticipo Pagado",  newEstado:"archivado", color:"purple"}];
  }

  // ACOPIO ───────────────────────────────────────────────────
  if(tipo==="acopio"){
    if(estado==="nuevo"&&(isCo||d)) return [{label:"Marcar Cotizado", newEstado:"cotizado", color:"sky"}, rej];
    if(estado==="cotizado"){
      if(d)    return [{label:"Aprobar", newEstado:null, color:"green", formType:"approve_dir_acopio"}, rej];
      if(isCo) return [rej];
    }
    if(estado==="pendiente_firma"&&(isAd||d)) return [{label:"Marcar Contrato Firmado", newEstado:"archivado", color:"emerald"}];
    if(estado==="pend_pago"&&(isAd||d))       return [{label:"Marcar Pagado",            newEstado:"archivado", color:"purple"}];
  }

  return [];
}
const isPending = (p,role) => getActions(p,role).length>0;

// ── Form submit logic ──────────────────────────────────────────
function resolveAction(action, pedido, form) {
  const ft = action.formType;
  let newEstado, newMeta = {...(pedido.metadata||{})};

  if(ft==="approve_cc"){
    const monto = parseFloat(form.monto)||0;
    Object.assign(newMeta, {
      proveedor:form.proveedor, contacto_nombre:form.contacto_nombre, contacto_tel:form.contacto_tel,
      monto, info_pago:form.info_pago, info_entrega:form.info_entrega,
      tipo_pago:form.tipo_pago, route:form.tipo_pago,
    });
    if(monto > 4_000_000)             newEstado="pendiente_dir";
    else if(form.tipo_pago==="anticipado")  newEstado="pend_pago";
    else                                    newEstado="pend_entrega";
  }
  else if(ft==="approve_cc_dir"){
    const route = pedido.metadata?.route;
    newEstado = route==="anticipado" ? "pend_pago" : "pend_entrega";
  }
  else if(ft==="approve_dir_grande"){
    Object.assign(newMeta, {
      proveedor:form.proveedor, contacto_nombre:form.contacto_nombre, contacto_tel:form.contacto_tel,
      condiciones_pago:form.condiciones_pago, condiciones_entrega:form.condiciones_entrega,
      tipo_pago:form.tipo_pago, route:form.tipo_pago,
    });
    if(form.tipo_pago==="pago_parcial")  newEstado="pend_pago_anticipo";
    else if(form.tipo_pago==="anticipado") newEstado="pend_pago";
    else                                   newEstado="pend_entrega";
  }
  else if(ft==="approve_dir_licitacion"||ft==="approve_dir_acopio"){
    Object.assign(newMeta, {
      proveedor:form.proveedor, contacto_nombre:form.contacto_nombre,
      contacto_tel:form.contacto_tel, contacto_mail:form.contacto_mail,
      firma_contrato:form.firma_contrato, anexos:form.anexos,
      condiciones_pago:form.condiciones_pago, condiciones_entrega:form.condiciones_entrega,
    });
    newEstado = form.firma_contrato ? "pendiente_firma" : "pend_pago";
  }

  return {newEstado, newMeta};
}

// ── Main App ───────────────────────────────────────────────────
const emptyNew={tipo:"",titulo:"",obraId:"",descripcion:"",fechaEntrega:"",urgencia:""};
const emptyObra={nombre:"",codigo:"",direccion:""};
const emptyDashF={tipo:"",estado:"",obraId:"",archivo:"no"};
const emptyUser={name:"",username:"",password:"",role:"jefe_obra",activo:true};

export default function App(){
  const [users,   setUsers]   = useState([]);
  const [user,    setUser]    = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [obras,   setObras]   = useState([]);
  const [loaded,  setLoaded]  = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [view,    setView]    = useState("dashboard");
  const [sel,     setSel]     = useState(null);
  const [loginF,  setLoginF]  = useState({username:"",password:""});
  const [loginErr,setLoginErr]= useState("");
  const [newForm, setNewForm] = useState(emptyNew);
  const [newErr,  setNewErr]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [obraF,   setObraF]   = useState(emptyObra);
  const [obraErr, setObraErr] = useState("");
  const [showObraF,setShowObraF]=useState(false);
  const [dashF,   setDashF]   = useState(emptyDashF);
  const [allF,    setAllF]    = useState({...emptyDashF, archivo:"todos"});
  const [editUser, setEditUser] = useState(null);
  const [userForm, setUserForm] = useState(emptyUser);
  const [userErr,  setUserErr]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [actionModal, setActionModal] = useState(null); // {action, pedido}
  const [delConfirm,  setDelConfirm]  = useState(null);

  useEffect(()=>{
    (async()=>{
      try{
        const [u,o,p]=await Promise.all([
          sb.get("usuarios"),
          sb.get("obras"),
          sb.get("pedidos","&order=creado_at.desc"),
        ]);
        setUsers(u); setObras(o); setPedidos(p.map(mapP));
      }catch(e){ setLoadErr("No se pudo conectar con la base de datos."); }
      setLoaded(true);
    })();
  },[]);

  const login=()=>{
    const u=users.find(u=>u.username===loginF.username.trim()&&u.password===loginF.password&&u.activo!==false);
    if(!u){setLoginErr("Usuario o contraseña incorrectos");return;}
    setUser(u);setLoginErr("");
  };
  const logout=()=>{setUser(null);setView("dashboard");setSel(null);};
  const nav=(v)=>{setView(v);setSel(null);};

  // User CRUD
  function openNewUser(){setUserForm(emptyUser);setUserErr("");setShowPass(true);setEditUser({});}
  function openEditUser(u){setUserForm({name:u.name,username:u.username,password:"",role:u.role,activo:u.activo});setUserErr("");setShowPass(false);setEditUser(u);}
  async function saveUser(){
    const name=userForm.name.trim(),username=userForm.username.trim().toLowerCase();
    if(!name||!username){setUserErr("Nombre y usuario son obligatorios");return;}
    if(!/^[a-z0-9._-]+$/.test(username)){setUserErr("Solo letras, números, puntos o guiones");return;}
    const isNew=!editUser.id;
    if(isNew&&!userForm.password){setUserErr("La contraseña es obligatoria");return;}
    if(users.find(u=>u.username===username&&u.id!==editUser.id)){setUserErr("Ese usuario ya existe");return;}
    setSaving(true);
    try{
      if(isNew){
        const d={id:uid(),name,username,password:userForm.password,role:userForm.role,activo:true};
        await sb.post("usuarios",d);setUsers(prev=>[...prev,d]);
      }else{
        const d={name,username,role:userForm.role,activo:userForm.activo,...(userForm.password?{password:userForm.password}:{})};
        await sb.patch("usuarios",editUser.id,d);
        setUsers(prev=>prev.map(u=>u.id===editUser.id?{...u,...d}:u));
        if(user.id===editUser.id)setUser(prev=>({...prev,name,username,role:userForm.role}));
      }
      setEditUser(null);setUserErr("");
    }catch(e){setUserErr("Error al guardar.");}
    setSaving(false);
  }
  async function toggleActive(u){
    if(u.id===user.id)return;
    const a=!u.activo;
    await sb.patch("usuarios",u.id,{activo:a});
    setUsers(prev=>prev.map(x=>x.id===u.id?{...x,activo:a}:x));
  }

  // Obras
  async function saveObra(){
    const nombre=obraF.nombre.trim(),codigo=obraF.codigo.trim().toUpperCase();
    if(!nombre||!codigo){setObraErr("Nombre y código son obligatorios");return;}
    if(codigo.length<2||codigo.length>5){setObraErr("Código: 2-5 caracteres");return;}
    if(obras.find(o=>o.codigo===codigo)){setObraErr("Ya existe una obra con ese código");return;}
    setSaving(true);
    try{
      const obra={id:uid(),nombre,codigo,direccion:obraF.direccion.trim(),activa:true,at:Date.now()};
      await sb.post("obras",obra);setObras(prev=>[...prev,obra]);
      setObraF(emptyObra);setObraErr("");setShowObraF(false);
    }catch(e){setObraErr("Error al guardar.");}
    setSaving(false);
  }

  // Pedidos
  async function savePedido(){
    setNewErr("");
    if(!newForm.tipo||!newForm.titulo.trim()||!newForm.obraId){setNewErr("Tipo, título y obra son obligatorios");return;}
    if(newForm.tipo==="compra_chica"&&!newForm.fechaEntrega){setNewErr("La fecha de entrega es obligatoria");return;}
    if(newForm.tipo==="compra_chica"&&newForm.fechaEntrega<minDel()){setNewErr("Mínimo 48 hs hábiles desde hoy");return;}
    if(["compra_grande","licitacion","acopio"].includes(newForm.tipo)&&!newForm.urgencia){setNewErr("El nivel de urgencia es obligatorio");return;}
    const obra=obras.find(o=>o.id===newForm.obraId);
    const historial=[{accion:"Pedido creado",usuario:user.name,rol:RL[user.role],ts:Date.now(),comentario:newForm.descripcion.trim()}];
    const dbP={
      id:uid().toUpperCase(), referencia:getRef(obra.codigo,newForm.tipo,pedidos,newForm.obraId),
      tipo:newForm.tipo, titulo:newForm.titulo.trim(),
      obra_id:newForm.obraId, obra_nombre:obra.nombre,
      descripcion:newForm.descripcion.trim(), estado:"nuevo",
      fecha_entrega:newForm.tipo==="compra_chica"?newForm.fechaEntrega:null,
      urgencia:newForm.urgencia||null,
      creado_por:user.id, creado_nombre:user.name, creado_at:Date.now(),
      historial, metadata:{},
    };
    setSaving(true);
    try{
      await sb.post("pedidos",dbP);
      setPedidos(prev=>[mapP(dbP),...prev]);
      setNewForm(emptyNew);nav("dashboard");
    }catch(e){setNewErr("Error al guardar.");}
    setSaving(false);
  }

  async function doSimpleAction(pedido, action, comment="", extraMeta={}){
    const entry={accion:action.label,usuario:user.name,rol:RL[user.role],ts:Date.now(),comentario:comment};
    const newH=[...pedido.historial,entry];
    const newMeta={...pedido.metadata,...extraMeta};
    try{
      await sb.patch("pedidos",pedido.id,{estado:action.newEstado,historial:newH,metadata:newMeta});
      const up={...pedido,estado:action.newEstado,historial:newH,metadata:newMeta};
      setPedidos(prev=>prev.map(p=>p.id===pedido.id?up:p));
      setSel(up);
    }catch(e){alert("Error al guardar la acción.");}
  }

  async function doFormAction(pedido,action,form){
    const {newEstado,newMeta}=resolveAction(action,pedido,form);
    const entry={accion:action.label,usuario:user.name,rol:RL[user.role],ts:Date.now(),comentario:form.comment||""};
    const newH=[...pedido.historial,entry];
    try{
      await sb.patch("pedidos",pedido.id,{estado:newEstado,historial:newH,metadata:newMeta});
      const up={...pedido,estado:newEstado,historial:newH,metadata:newMeta};
      setPedidos(prev=>prev.map(p=>p.id===pedido.id?up:p));
      setSel(up);setActionModal(null);
    }catch(e){alert("Error al guardar.");}
  }

  async function deletePedido(pedido){
    try{
      await sb.del("pedidos",pedido.id);
      setPedidos(prev=>prev.filter(p=>p.id!==pedido.id));
      setSel(null);nav("dashboard");setDelConfirm(null);
    }catch(e){alert("Error al eliminar.");}
  }

  if(!loaded) return(
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-400 gap-3">
      <div className="text-4xl">⚙️</div><p>Conectando...</p>
      {loadErr&&<p className="text-red-400 text-sm">{loadErr}</p>}
    </div>
  );

  // LOGIN ──────────────────────────────────────────────────────
  if(!user) return(
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="text-4xl mb-2">🏗️</div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Compras</h1>
          <p className="text-slate-400 text-sm mt-1">Iniciá sesión para continuar</p>
        </div>
        <div className="space-y-4">
          <Fld label="Usuario"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={loginF.username} placeholder="nombre.apellido" onChange={e=>setLoginF(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()}/></Fld>
          <Fld label="Contraseña"><input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={loginF.password} onChange={e=>setLoginF(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()}/></Fld>
          {loginErr&&<p className="text-red-500 text-sm">{loginErr}</p>}
          <button onClick={login} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg text-sm">Ingresar</button>
        </div>
        <div className="mt-5 border-t pt-4">
          <button onClick={()=>setShowDemo(!showDemo)} className="text-xs text-slate-400 hover:text-slate-600">{showDemo?"▲":"▼"} Ver usuarios de demo</button>
          {showDemo&&<div className="mt-2 text-xs text-slate-500 space-y-1 bg-slate-50 rounded-lg p-3">
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

  // MAIN APP ───────────────────────────────────────────────────
  const canCreate=CREATE_PERMS[user.role]||[];
  const isDir=user.role==="director";
  const myPending=pedidos.filter(p=>isPending(p,user.role));
  const dashPending=myPending.filter(p=>
    (!dashF.tipo||p.tipo===dashF.tipo)&&
    (!dashF.obraId||p.obraId===dashF.obraId)
  );
  const allFiltered=pedidos.filter(p=>{
    const activo=ACTIVE_ESTADOS.includes(p.estado);
    const archivoMatch = allF.archivo==="todos" || (allF.archivo==="activos"&&activo) || (allF.archivo==="archivados"&&!activo);
    return archivoMatch &&
      (!allF.tipo||p.tipo===allF.tipo)&&
      (!allF.estado||p.estado===allF.estado)&&
      (!allF.obraId||p.obraId===allF.obraId);
  });
  const tabs=["dashboard","todos",...(canCreate.length?["nuevo"]:[]),...(isDir?["obras","usuarios"]:[])];

  return(
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏗️</span>
          <div><p className="font-bold text-sm leading-tight">Gestión de Compras</p><p className="text-xs text-slate-400">{user.name} · {RL[user.role]}</p></div>
        </div>
        <button onClick={logout} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg">Salir</button>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-4 flex overflow-x-auto">
        {tabs.map(v=>(
          <button key={v} onClick={()=>nav(v)} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${view===v&&!sel?"border-slate-800 text-slate-800":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {v==="dashboard"?<>Dashboard{myPending.length>0&&<span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{myPending.length}</span>}</>
              :v==="todos"?"Todos los pedidos":v==="nuevo"?"➕ Nuevo":v==="obras"?"🏢 Obras":"👥 Usuarios"}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">

        {/* DASHBOARD */}
        {view==="dashboard"&&!sel&&(
          <div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                {label:"Pendientes mías",value:myPending.length,color:"text-yellow-600",bg:"bg-yellow-50 border-yellow-200"},
                {label:"Total activos",value:pedidos.filter(p=>ACTIVE_ESTADOS.includes(p.estado)).length,color:"text-slate-700",bg:"bg-white border-slate-200"},
                {label:"Archivados",value:pedidos.filter(p=>["archivado","rechazado"].includes(p.estado)).length,color:"text-slate-500",bg:"bg-slate-50 border-slate-200"},
              ].map(s=><div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}><p className="text-xs text-slate-500">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></div>)}
            </div>
            <FiltersBar f={dashF} setF={setDashF} obras={obras} showArchivo={false}/>
            {dashPending.length===0
              ?<Empty icon={myPending.length===0?"✅":"🔍"} title={myPending.length===0?"¡Estás al día!":"Sin resultados"} sub={myPending.length===0?"No tenés pedidos pendientes.":"Probá cambiando los filtros."}/>
              :<><p className="font-semibold text-slate-700 mb-3 text-sm">Requieren tu acción ({dashPending.length})</p><div className="space-y-2">{dashPending.map(p=><PCard key={p.id} p={p} onClick={()=>{setSel(p);setView("detalle");}}/>)}</div></>
            }
          </div>
        )}

        {/* TODOS */}
        {view==="todos"&&!sel&&(
          <div>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <FiltersBar f={allF} setF={setAllF} obras={obras} showArchivo={true}/>
              <span className="text-xs text-slate-400 ml-auto">{allFiltered.length} resultado{allFiltered.length!==1?"s":""}</span>
            </div>
            {allFiltered.length===0?<Empty icon="📋" title="Sin resultados" sub="No hay pedidos con esos filtros."/>
              :<div className="space-y-2">{allFiltered.map(p=><PCard key={p.id} p={p} onClick={()=>{setSel(p);setView("detalle");}}/>)}</div>}
          </div>
        )}

        {/* NUEVO */}
        {view==="nuevo"&&!sel&&(
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Crear nuevo pedido</h2>
            {obras.length===0&&<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-4">⚠️ No hay obras cargadas. Un Director debe crearlas primero.</div>}
            <div className="space-y-4">
              <Fld label="Obra *">
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newForm.obraId} onChange={e=>setNewForm(f=>({...f,obraId:e.target.value}))}>
                  <option value="">Seleccioná una obra...</option>
                  {obras.filter(o=>o.activa).map(o=><option key={o.id} value={o.id}>{o.nombre} ({o.codigo})</option>)}
                </select>
              </Fld>
              <Fld label="Tipo de pedido *">
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newForm.tipo} onChange={e=>setNewForm(f=>({...f,tipo:e.target.value,urgencia:"",fechaEntrega:""}))}>
                  <option value="">Seleccioná...</option>
                  {canCreate.map(t=><option key={t} value={t}>{TL[t]}</option>)}
                </select>
              </Fld>
              <Fld label="Título / Referencia *">
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Hierro para columnas torre A" value={newForm.titulo} onChange={e=>setNewForm(f=>({...f,titulo:e.target.value}))}/>
              </Fld>
              {newForm.tipo==="compra_chica"&&(
                <Fld label={<>Fecha de entrega * <span className="text-slate-400 font-normal text-xs">(mín. 48 hs hábiles)</span></>}>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" min={minDel()} value={newForm.fechaEntrega} onChange={e=>setNewForm(f=>({...f,fechaEntrega:e.target.value}))}/>
                </Fld>
              )}
              {["compra_grande","licitacion","acopio"].includes(newForm.tipo)&&(
                <Fld label="Nivel de urgencia *">
                  <div className="flex gap-2">
                    {["bajo","medio","alto"].map(u=>(
                      <button key={u} type="button" onClick={()=>setNewForm(f=>({...f,urgencia:u}))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition capitalize ${newForm.urgencia===u?(u==="bajo"?"border-green-500 bg-green-50 text-green-700":u==="medio"?"border-yellow-500 bg-yellow-50 text-yellow-700":"border-red-500 bg-red-50 text-red-700"):"border-slate-200 text-slate-400"}`}>
                        {u==="bajo"?"🟢 Bajo":u==="medio"?"🟡 Medio":"🔴 Alto"}
                      </button>
                    ))}
                  </div>
                </Fld>
              )}
              <Fld label="Observaciones">
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={3} placeholder="Detalles, referencia al servidor interno..." value={newForm.descripcion} onChange={e=>setNewForm(f=>({...f,descripcion:e.target.value}))}/>
              </Fld>
              {newForm.obraId&&newForm.tipo&&(
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Referencia del pedido:</p>
                  <p className="font-mono font-bold text-slate-700 mt-0.5">{getRef(obras.find(o=>o.id===newForm.obraId)?.codigo||"???",newForm.tipo,pedidos,newForm.obraId)}</p>
                </div>
              )}
              {newErr&&<p className="text-red-500 text-sm">{newErr}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={savePedido} disabled={obras.length===0||saving} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-medium px-5 py-2 rounded-lg text-sm">{saving?"Guardando...":"Crear pedido"}</button>
                <button onClick={()=>nav("dashboard")} className="text-slate-500 hover:text-slate-700 text-sm px-3">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* OBRAS */}
        {view==="obras"&&!sel&&isDir&&(
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Obras</h2>
              <button onClick={()=>setShowObraF(!showObraF)} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg">{showObraF?"Cancelar":"+ Nueva obra"}</button>
            </div>
            {showObraF&&(
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4 max-w-md">
                <div className="space-y-3">
                  <Fld label="Nombre *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Edificio Palermo" value={obraF.nombre} onChange={e=>setObraF(f=>({...f,nombre:e.target.value}))}/></Fld>
                  <Fld label="Código * (2-5 letras)"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase" placeholder="PAL" maxLength={5} value={obraF.codigo} onChange={e=>setObraF(f=>({...f,codigo:e.target.value.toUpperCase()}))}/></Fld>
                  <Fld label="Dirección"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Av. Santa Fe 1234" value={obraF.direccion} onChange={e=>setObraF(f=>({...f,direccion:e.target.value}))}/></Fld>
                  {obraErr&&<p className="text-red-500 text-sm">{obraErr}</p>}
                  <button onClick={saveObra} disabled={saving} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg">{saving?"Guardando...":"Guardar obra"}</button>
                </div>
              </div>
            )}
            {obras.length===0?<Empty icon="🏢" title="No hay obras cargadas" sub="Creá la primera."/>
              :<div className="space-y-2">{obras.map(o=>(
                <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2"><span className="font-bold text-slate-800">{o.nombre}</span><span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{o.codigo}</span></div>
                  {o.direccion&&<p className="text-xs text-slate-500 mt-0.5">📍 {o.direccion}</p>}
                  <p className="text-xs text-slate-400 mt-1">{pedidos.filter(p=>p.obraId===o.id).length} pedido(s)</p>
                </div>
              ))}</div>}
          </div>
        )}

        {/* USUARIOS */}
        {view==="usuarios"&&!sel&&isDir&&(
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Usuarios del sistema</h2>
              <button onClick={openNewUser} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Nuevo usuario</button>
            </div>
            {editUser!==null&&(
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-slate-800 text-lg mb-5">{editUser.id?"Editar usuario":"Nuevo usuario"}</h3>
                  <div className="space-y-4">
                    <Fld label="Nombre *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={userForm.name} onChange={e=>setUserForm(f=>({...f,name:e.target.value}))}/></Fld>
                    <Fld label="Usuario *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" value={userForm.username} onChange={e=>setUserForm(f=>({...f,username:e.target.value.toLowerCase()}))}/></Fld>
                    <Fld label={editUser.id?"Nueva contraseña (vacío = no cambiar)":"Contraseña *"}>
                      <div className="relative">
                        <input type={showPass?"text":"password"} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-16" value={userForm.password} onChange={e=>setUserForm(f=>({...f,password:e.target.value}))}/>
                        <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-2 text-xs text-slate-400">{showPass?"Ocultar":"Mostrar"}</button>
                      </div>
                    </Fld>
                    <Fld label="Rol *">
                      <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={userForm.role} onChange={e=>setUserForm(f=>({...f,role:e.target.value}))}>
                        {RO.map(r=><option key={r} value={r}>{RL[r]}</option>)}
                      </select>
                    </Fld>
                    {editUser.id&&editUser.id!==user.id&&(
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={()=>setUserForm(f=>({...f,activo:!f.activo}))} className={`relative w-11 h-6 rounded-full transition ${userForm.activo?"bg-green-500":"bg-slate-300"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${userForm.activo?"left-5":"left-0.5"}`}/>
                        </button>
                        <span className="text-sm text-slate-600">{userForm.activo?"Activo":"Inactivo"}</span>
                      </div>
                    )}
                    {userErr&&<p className="text-red-500 text-sm">{userErr}</p>}
                    <div className="flex gap-3 pt-2">
                      <button onClick={saveUser} disabled={saving} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-medium px-5 py-2 rounded-lg text-sm">{saving?"Guardando...":editUser.id?"Guardar cambios":"Crear usuario"}</button>
                      <button onClick={()=>setEditUser(null)} className="text-slate-500 text-sm px-3">Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {RO.map(role=>{
              const g=users.filter(u=>u.role===role);
              if(!g.length) return null;
              return(
                <div key={role} className="mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{RL[role]} ({g.length})</p>
                  <div className="space-y-2">
                    {g.map(u=>(
                      <div key={u.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${u.activo===false?"opacity-50 border-slate-100":"border-slate-200"}`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${u.activo===false?"bg-slate-300":role==="director"?"bg-slate-700":role==="jefe_obra"?"bg-orange-400":role==="arquitecto"?"bg-blue-400":role==="compras"?"bg-green-500":"bg-purple-400"}`}>{u.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm">{u.name}{u.id===user.id&&<span className="text-xs text-slate-400 ml-1">(vos)</span>}</p>
                          <p className="text-xs text-slate-400 font-mono">{u.username}</p>
                        </div>
                        {u.activo===false&&<span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Inactivo</span>}
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={()=>openEditUser(u)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg">Editar</button>
                          {u.id!==user.id&&<button onClick={()=>toggleActive(u)} className={`text-xs px-3 py-1.5 rounded-lg ${u.activo===false?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>{u.activo===false?"Activar":"Desactivar"}</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DETALLE */}
        {view==="detalle"&&sel&&(
          <DetailView
            pedido={sel} user={user}
            onSimpleAction={doSimpleAction}
            onFormAction={(action)=>setActionModal({action,pedido:sel})}
            onDelete={isDir?()=>setDelConfirm(sel):null}
            onBack={()=>{setSel(null);setView("dashboard");}}
          />
        )}

      </main>

      {/* ACTION MODAL */}
      {actionModal&&(
        <ActionModal
          modal={actionModal}
          onSubmit={(form)=>doFormAction(actionModal.pedido, actionModal.action, form)}
          onClose={()=>setActionModal(null)}
        />
      )}

      {/* DELETE CONFIRM */}
      {delConfirm&&(
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Eliminar pedido</h3>
            <p className="text-slate-500 text-sm mb-5">¿Seguro que querés eliminar <b>{delConfirm.referencia}</b>? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={()=>deletePedido(delConfirm)} className="bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2 rounded-lg text-sm">Eliminar</button>
              <button onClick={()=>setDelConfirm(null)} className="text-slate-500 hover:text-slate-700 text-sm px-4">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Detail View ─────────────────────────────────────────────────
function DetailView({pedido, user, onSimpleAction, onFormAction, onDelete, onBack}){
  const [comment, setComment]=useState("");
  const [fechaRecepcion, setFechaRecepcion]=useState("");
  const [nroRemito, setNroRemito]=useState("");
  const actions=getActions(pedido,user.role);
  const meta=pedido.metadata||{};

  const isDeliveryAction = a => ["Marcar Entregado","Marcar Recibido"].includes(a.label);
  const hasDelivery = actions.some(isDeliveryAction);

  return(
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1">← Volver</button>
        {onDelete&&!["archivado","rechazado"].includes(pedido.estado)&&(
          <button onClick={onDelete} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg">🗑️ Eliminar pedido</button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-mono text-sm font-bold text-slate-600">{pedido.referencia}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TIPO_CLR[pedido.tipo]}`}>{TL[pedido.tipo]}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EC[pedido.estado]}`}>{EL[pedido.estado]}</span>
          {pedido.urgencia&&<span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${UC[pedido.urgencia]}`}>⚡ {pedido.urgencia}</span>}
        </div>
        <h2 className="text-xl font-bold text-slate-800">{pedido.titulo}</h2>
        <p className="text-sm text-slate-500 mt-1">🏢 {pedido.obraNombre}</p>
        {pedido.fechaEntrega&&<p className="text-sm text-slate-600 mt-1">📅 Entrega esperada: <b>{pedido.fechaEntrega}</b></p>}
        {pedido.descripcion&&(
          <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1">Observaciones</p>
            <p className="text-sm text-slate-600">{pedido.descripcion}</p>
          </div>
        )}

        {/* Metadata (approval info) */}
        {meta.proveedor&&(
          <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-100 space-y-1">
            <p className="text-xs font-semibold text-blue-700 mb-2">📋 Datos de la compra</p>
            {meta.proveedor&&<InfoRow label="Proveedor" val={meta.proveedor}/>}
            {meta.contacto_nombre&&<InfoRow label="Contacto" val={meta.contacto_nombre}/>}
            {meta.contacto_tel&&<InfoRow label="Teléfono" val={meta.contacto_tel}/>}
            {meta.contacto_mail&&<InfoRow label="Mail" val={meta.contacto_mail}/>}
            {meta.monto&&<InfoRow label="Monto" val={fmtMoney(meta.monto)}/>}
            {meta.tipo_pago&&<InfoRow label="Forma de pago" val={{contra_entrega:"Contra entrega",anticipado:"Anticipado",pago_parcial:"Pago parcial anticipado"}[meta.tipo_pago]||meta.tipo_pago}/>}
            {meta.info_pago&&<InfoRow label="Info. pago" val={meta.info_pago}/>}
            {meta.info_entrega&&<InfoRow label="Info. entrega" val={meta.info_entrega}/>}
            {meta.condiciones_pago&&<InfoRow label="Cond. pago" val={meta.condiciones_pago}/>}
            {meta.condiciones_entrega&&<InfoRow label="Cond. entrega" val={meta.condiciones_entrega}/>}
            {meta.firma_contrato!==undefined&&<InfoRow label="Firma contrato" val={meta.firma_contrato?"Sí":"No"}/>}
            {meta.firma_contrato&&meta.anexos&&<InfoRow label="Anexos" val={meta.anexos}/>}
          </div>
        )}

        {/* Datos de recepción (si ya fue entregado) */}
        {meta.fecha_recepcion&&(
          <div className="mt-4 bg-green-50 rounded-lg p-4 border border-green-100 space-y-1">
            <p className="text-xs font-semibold text-green-700 mb-2">📦 Datos de recepción</p>
            <InfoRow label="Fecha de recepción" val={meta.fecha_recepcion}/>
            {meta.nro_remito&&<InfoRow label="N° de remito" val={meta.nro_remito}/>}
          </div>
        )}

        {/* Actions */}
        {actions.length>0&&(
          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="font-semibold text-slate-700 mb-3">Tu acción requerida</h3>

            {/* Campos de entrega — solo cuando hay acción de entrega */}
            {hasDelivery&&(
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 space-y-3">
                <p className="text-xs font-semibold text-green-700">📦 Datos de recepción</p>
                <Fld label="Fecha de recepción *">
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={fechaRecepcion} onChange={e=>setFechaRecepcion(e.target.value)}/>
                </Fld>
                <Fld label="N° de remito">
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                    placeholder="Ej: 0001-00012345"
                    value={nroRemito} onChange={e=>setNroRemito(e.target.value)}/>
                </Fld>
              </div>
            )}

            {!actions.some(a=>a.formType)&&(
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none mb-3" rows={2}
                placeholder="Comentario opcional..." value={comment} onChange={e=>setComment(e.target.value)}/>
            )}

            <div className="flex flex-wrap gap-2">
              {actions.map(a=>(
                <button key={a.label} onClick={()=>{
                  if(a.formType){ onFormAction(a); return; }
                  if(isDeliveryAction(a)&&!fechaRecepcion){ alert("Ingresá la fecha de recepción"); return; }
                  const extra = isDeliveryAction(a) ? {fecha_recepcion:fechaRecepcion, nro_remito:nroRemito} : {};
                  onSimpleAction(pedido,a,comment,extra).then(()=>{ setComment(""); setFechaRecepcion(""); setNroRemito(""); });
                }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${BC[a.color]}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="mt-5 border-t border-slate-100 pt-5">
          <h3 className="font-semibold text-slate-700 mb-3">Historial</h3>
          <div className="space-y-3">
            {[...pedido.historial].reverse().map((h,i)=>(
              <div key={i} className="flex gap-3 text-sm">
                <div className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-slate-400"/>
                <div>
                  <span className="font-medium text-slate-700">{h.accion}</span>
                  <span className="text-slate-400"> · {h.usuario} ({h.rol}) · {fmtDate(h.ts)}</span>
                  {h.comentario&&<p className="text-slate-500 mt-0.5 italic">"{h.comentario}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Action Modal ────────────────────────────────────────────────
function ActionModal({modal, onSubmit, onClose}){
  const {action, pedido} = modal;
  const ft = action.formType;
  const meta = pedido.metadata||{};
  const [f, setF] = useState({
    proveedor:"", contacto_nombre:"", contacto_tel:"", contacto_mail:"",
    monto:"", info_pago:"", info_entrega:"", tipo_pago:"",
    condiciones_pago:"", condiciones_entrega:"",
    firma_contrato:false, anexos:"", comment:"",
  });
  const [err, setErr]=useState("");
  const set = k => e => setF(p=>({...p,[k]:e.target?e.target.value:e}));

  function handleSubmit(){
    setErr("");
    if(ft==="approve_cc"){
      if(!f.proveedor||!f.contacto_nombre||!f.monto||!f.tipo_pago||!f.info_pago||!f.info_entrega)
        {setErr("Completá todos los campos obligatorios");return;}
    }
    if(ft==="approve_dir_grande"){
      if(!f.proveedor||!f.contacto_nombre||!f.tipo_pago||!f.condiciones_pago||!f.condiciones_entrega)
        {setErr("Completá todos los campos obligatorios");return;}
    }
    if(ft==="approve_dir_licitacion"||ft==="approve_dir_acopio"){
      if(!f.proveedor||!f.contacto_nombre)
        {setErr("Proveedor y contacto son obligatorios");return;}
      if(f.firma_contrato&&!f.anexos){setErr("Especificá los anexos a firmar");return;}
    }
    onSubmit(f);
  }

  const routeInfo = meta.route ? {contra_entrega:"Contra entrega",anticipado:"Anticipado",pago_parcial:"Pago parcial"}[meta.route] : null;

  return(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg my-4">
        <h3 className="font-bold text-slate-800 text-lg mb-1">{action.label}</h3>
        <p className="text-xs text-slate-400 mb-5">{pedido.referencia} · {TL[pedido.tipo]}</p>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">

          {/* approve_cc_dir: Director approves chica >4M (info already loaded by compras) */}
          {ft==="approve_cc_dir"&&(
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 space-y-1 text-sm">
              <p className="font-semibold text-blue-800 mb-2">Datos cargados por Compras:</p>
              {meta.proveedor&&<InfoRow label="Proveedor" val={meta.proveedor}/>}
              {meta.contacto_nombre&&<InfoRow label="Contacto" val={meta.contacto_nombre}/>}
              {meta.monto&&<InfoRow label="Monto" val={fmtMoney(meta.monto)}/>}
              {routeInfo&&<InfoRow label="Forma de pago" val={routeInfo}/>}
              <p className="text-blue-600 text-xs mt-2">⚠️ El monto supera $4.000.000. Requiere tu aprobación.</p>
            </div>
          )}

          {/* approve_cc: Compras approves compra chica */}
          {ft==="approve_cc"&&<>
            <Fld label="Proveedor elegido *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Nombre del proveedor" value={f.proveedor} onChange={set("proveedor")}/></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Nombre contacto *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={f.contacto_nombre} onChange={set("contacto_nombre")}/></Fld>
              <Fld label="Teléfono contacto *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={f.contacto_tel} onChange={set("contacto_tel")}/></Fld>
            </div>
            <Fld label="Monto (ARS) *"><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: 250000" value={f.monto} onChange={set("monto")}/>
              {parseFloat(f.monto)>4_000_000&&<p className="text-orange-600 text-xs mt-1">⚠️ Monto supera $4.000.000 → irá a Dirección para aprobación</p>}
            </Fld>
            <Fld label="Información para el pago *"><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} placeholder="CBU, alias, etc." value={f.info_pago} onChange={set("info_pago")}/></Fld>
            <Fld label="Información para la entrega *"><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} placeholder="Dirección, horario, contacto en obra, etc." value={f.info_entrega} onChange={set("info_entrega")}/></Fld>
            <Fld label="Forma de pago *">
              <div className="flex gap-2">
                {[["contra_entrega","Contra Entrega"],["anticipado","Anticipado"]].map(([v,l])=>(
                  <button key={v} type="button" onClick={()=>setF(p=>({...p,tipo_pago:v}))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition ${f.tipo_pago===v?"border-slate-700 bg-slate-800 text-white":"border-slate-200 text-slate-500"}`}>{l}</button>
                ))}
              </div>
            </Fld>
          </>}

          {/* approve_dir_grande: Director approves compra grande */}
          {ft==="approve_dir_grande"&&<>
            <Fld label="Proveedor *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={f.proveedor} onChange={set("proveedor")}/></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Nombre contacto *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={f.contacto_nombre} onChange={set("contacto_nombre")}/></Fld>
              <Fld label="Teléfono *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={f.contacto_tel} onChange={set("contacto_tel")}/></Fld>
            </div>
            <Fld label="Condiciones de pago *"><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={f.condiciones_pago} onChange={set("condiciones_pago")}/></Fld>
            <Fld label="Condiciones de entrega *"><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={f.condiciones_entrega} onChange={set("condiciones_entrega")}/></Fld>
            <Fld label="Forma de pago *">
              <div className="flex flex-col gap-2">
                {[["contra_entrega","Pago contra entrega"],["pago_parcial","Pago parcial anticipado"],["anticipado","Pago anticipado"]].map(([v,l])=>(
                  <button key={v} type="button" onClick={()=>setF(p=>({...p,tipo_pago:v}))}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition text-left ${f.tipo_pago===v?"border-slate-700 bg-slate-800 text-white":"border-slate-200 text-slate-500"}`}>{l}</button>
                ))}
              </div>
            </Fld>
          </>}

          {/* approve_dir_licitacion / approve_dir_acopio */}
          {(ft==="approve_dir_licitacion"||ft==="approve_dir_acopio")&&<>
            <Fld label="Proveedor *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={f.proveedor} onChange={set("proveedor")}/></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Nombre contacto *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={f.contacto_nombre} onChange={set("contacto_nombre")}/></Fld>
              <Fld label="Teléfono *"><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={f.contacto_tel} onChange={set("contacto_tel")}/></Fld>
            </div>
            <Fld label="Mail de contacto"><input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={f.contacto_mail} onChange={set("contacto_mail")}/></Fld>
            <Fld label="Condiciones de entrega"><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={f.condiciones_entrega} onChange={set("condiciones_entrega")}/></Fld>
            <Fld label="Condiciones de pago"><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={f.condiciones_pago} onChange={set("condiciones_pago")}/></Fld>
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setF(p=>({...p,firma_contrato:!p.firma_contrato,anexos:""}))} className={`relative w-11 h-6 rounded-full transition ${f.firma_contrato?"bg-slate-800":"bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${f.firma_contrato?"left-5":"left-0.5"}`}/>
              </button>
              <span className="text-sm text-slate-600">¿Requiere firma de contrato?</span>
            </div>
            {f.firma_contrato&&(
              <Fld label="Anexos a firmar *"><textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={3} placeholder="Ej: Anexo A – Especificaciones técnicas, Anexo B – Planos..." value={f.anexos} onChange={set("anexos")}/></Fld>
            )}
          </>}

          <Fld label="Comentario (opcional)">
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={f.comment} onChange={set("comment")}/>
          </Fld>
          {err&&<p className="text-red-500 text-sm">{err}</p>}
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
          <button onClick={handleSubmit} className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition ${BC[action.color]}`}>Confirmar</button>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm px-3">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Small components ────────────────────────────────────────────
function Fld({label,children}){return <div><label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>{children}</div>;}
function Empty({icon,title,sub}){return <div className="text-center py-14 text-slate-400"><div className="text-4xl mb-2">{icon}</div><p className="font-medium">{title}</p><p className="text-sm mt-1">{sub}</p></div>;}
function InfoRow({label,val}){return <div className="flex gap-2 text-xs"><span className="text-slate-500 w-28 flex-shrink-0">{label}:</span><span className="text-slate-700 font-medium">{val}</span></div>;}

function FiltersBar({f,setF,obras,showArchivo}){
  return(
    <div className="flex flex-wrap gap-2 mb-4">
      <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={f.tipo} onChange={e=>setF(p=>({...p,tipo:e.target.value}))}>
        <option value="">Todos los tipos</option>
        {Object.entries(TL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select>
      <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={f.estado} onChange={e=>setF(p=>({...p,estado:e.target.value}))}>
        <option value="">Todos los estados</option>
        {Object.entries(EL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select>
      {obras.length>0&&<select className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={f.obraId} onChange={e=>setF(p=>({...p,obraId:e.target.value}))}>
        <option value="">Todas las obras</option>
        {obras.map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}
      </select>}
      {showArchivo&&<select className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={f.archivo} onChange={e=>setF(p=>({...p,archivo:e.target.value}))}>
        <option value="todos">Activos + Archivados</option>
        <option value="activos">Solo activos</option>
        <option value="archivados">Solo archivados/rechazados</option>
      </select>}
      {(f.tipo||f.estado||f.obraId)&&<button onClick={()=>setF(p=>({...p,tipo:"",estado:"",obraId:""}))} className="text-xs text-slate-400 hover:text-slate-600 px-1">✕ Limpiar</button>}
    </div>
  );
}

function PCard({p,onClick}){
  return(
    <div onClick={onClick} className={`bg-white rounded-xl border p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition ${["archivado","rechazado"].includes(p.estado)?"border-slate-100 opacity-70":"border-slate-200 hover:border-slate-300"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1.5 mb-1.5 items-center">
          <span className="font-mono text-xs text-slate-500 font-semibold">{p.referencia}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TIPO_CLR[p.tipo]}`}>{TL[p.tipo]}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EC[p.estado]}`}>{EL[p.estado]}</span>
          {p.urgencia&&<span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${UC[p.urgencia]}`}>⚡ {p.urgencia}</span>}
        </div>
        <p className="font-semibold text-slate-800 truncate">{p.titulo}</p>
        <p className="text-xs text-slate-500 mt-0.5">🏢 {p.obraNombre}</p>
        {p.fechaEntrega&&<p className="text-xs text-slate-400 mt-0.5">📅 Entrega: {p.fechaEntrega}</p>}
        <p className="text-xs text-slate-400 mt-1">Por {p.creado_nombre} · {fmtDate(p.creado_at)}</p>
      </div>
      <span className="text-slate-300 text-lg mt-1">›</span>
    </div>
  );
}