// @ts-nocheck
import { useState, useEffect } from "react";

const SB_URL = "https://glgoidruquyjzorbcqxb.supabase.co";
const SB_KEY = "sb_publishable_ahdlCn7ySRvvKHyS7n02Hg_X0AprYS6";
const H = {"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"};
const sb = {
  get:   async(t,q="") => { const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*${q}`,{headers:H}); if(!r.ok)throw new Error(await r.text()); return r.json(); },
  post:  async(t,d)    => { const r=await fetch(`${SB_URL}/rest/v1/${t}`,{method:"POST",headers:H,body:JSON.stringify(d)}); if(!r.ok)throw new Error(await r.text()); return r.json(); },
  patch: async(t,id,d) => { const r=await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:H,body:JSON.stringify(d)}); if(!r.ok)throw new Error(await r.text()); return r.json(); },
  del:   async(t,id)   => { const r=await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:H}); if(!r.ok)throw new Error(await r.text()); },
};

async function uploadFile(file,pedidoId){
  const ext=file.name.split('.').pop().toLowerCase();
  const path=`pedidos/${pedidoId}/${Date.now()}_${Math.random().toString(36).slice(2,5)}.${ext}`;
  const r=await fetch(`${SB_URL}/storage/v1/object/archivos/${path}`,{method:"POST",headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":file.type},body:file});
  if(!r.ok)throw new Error(await r.text());
  return{url:`${SB_URL}/storage/v1/object/public/archivos/${path}`,nombre:file.name,tipo:file.type,ts:Date.now()};
}

const mapP = p=>({...p,obraId:p.obra_id,obraNombre:p.obra_nombre,fechaEntrega:p.fecha_entrega,historial:p.historial||[],metadata:p.metadata||{}});

const G="#1B7B74", TX="#111111", TM="#777777", BG="#FAFAF8", CB="#FFFFFF", BD="#E5E0DA";
const css = {
  card:  {background:CB,border:`1px solid ${BD}`},
  lbl:   {fontSize:10,letterSpacing:"0.13em",textTransform:"uppercase",fontWeight:700,fontFamily:"inherit"},
  input: {width:"100%",border:`1px solid ${BD}`,padding:"10px 12px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff",boxSizing:"border-box"},
  ta:    {width:"100%",border:`1px solid ${BD}`,padding:"10px 12px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff",resize:"none",boxSizing:"border-box"},
};
const TIPOS = {
  compra_chica: {label:"Compra Chica",  code:"CC",color:"#C47820"},
  compra_grande:{label:"Compra Grande", code:"CG",color:"#8B4513"},
  licitacion:   {label:"Licitación",    code:"LC",color:G},
  acopio:       {label:"Acopio",        code:"AC",color:"#6B4B8F"},
};
const ESTADOS = {
  nuevo:             {label:"NUEVO",           color:"#C47820"},
  doc_lista:         {label:"DOC. LISTA",      color:G},
  cotizado:          {label:"COTIZADO",        color:G},
  desacopiado:       {label:"DESACOPIADO",     color:G},
  pendiente_dir:     {label:"PEND. DIRECCIÓN", color:"#C47820"},
  pend_pago:         {label:"PEND. PAGO",      color:"#6B4B8F"},
  pend_pago_anticipo:{label:"PEND. ANTICIPO",  color:"#6B4B8F"},
  pend_entrega:      {label:"PEND. ENTREGA",   color:"#2D7A3A"},
  pend_pago_saldo:   {label:"PEND. SALDO",     color:"#6B4B8F"},
  pendiente_firma:   {label:"PEND. FIRMA",     color:"#2D7A3A"},
  rechazado:         {label:"RECHAZADO",       color:"#CC3333"},
  archivado:         {label:"ARCHIVADO",       color:TM},
};
const URG = {bajo:{label:"↓ BAJO",color:"#2D7A3A"},medio:{label:"→ MEDIO",color:"#C47820"},alto:{label:"↑ ALTO",color:"#CC3333"}};
const btnS = (v="primary",extra={})=>{
  const base={border:"none",padding:"10px 18px",fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:700,cursor:"pointer",fontFamily:"inherit",...extra};
  const map={primary:{background:TX,color:"#fff"},outline:{background:"transparent",color:TX,border:`1px solid ${TX}`},green:{background:G,color:"#fff"},
    "outline-green":{background:"transparent",color:G,border:`1px solid ${G}`},danger:{background:"transparent",color:"#CC3333",border:"1px solid #CC3333"},
    purple:{background:"#6B4B8F",color:"#fff"},forest:{background:"#2D7A3A",color:"#fff"},amber:{background:"#C47820",color:"#fff"},
    indigo:{background:"transparent",color:"#4B5EA0",border:"1px solid #4B5EA0"},teal:{background:G,color:"#fff"},ghost:{background:"transparent",color:TM,border:"none"}};
  return {...base,...(map[v]||map.primary)};
};
const ACT_BTN={green:"green",red:"danger",sky:"outline-green",purple:"purple",emerald:"forest",teal:"teal",indigo:"indigo",amber:"amber"};

const RL={director:"Director",jefe_obra:"Jefe de Obra",arquitecto:"Arquitecto",compras:"Compras",admin:"Administración"};
const RO=["director","jefe_obra","arquitecto","compras","admin"];
const TL={compra_chica:"Compra Chica",compra_grande:"Compra Grande",licitacion:"Licitación",acopio:"Acopio"};
const TC={compra_chica:"CC",compra_grande:"CG",licitacion:"LC",acopio:"AC"};
const CREATE_PERMS={director:["compra_chica","compra_grande","licitacion","acopio"],jefe_obra:["compra_chica","compra_grande","licitacion"],arquitecto:["compra_chica","compra_grande","licitacion"],compras:[],admin:[]};
const ACTIVE_ESTADOS=["nuevo","doc_lista","cotizado","desacopiado","pendiente_dir","pend_pago","pend_pago_anticipo","pend_entrega","pend_pago_saldo","pendiente_firma"];

const fmtDate=ts=>new Date(ts).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"short"});
const fmtMoney=n=>n?new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",minimumFractionDigits:0}).format(Number(n)):"";
function addBD(d,n){let r=new Date(d),a=0;while(a<n){r.setDate(r.getDate()+1);if(r.getDay()!==0&&r.getDay()!==6)a++;}return r;}
const minDel=()=>addBD(new Date(),2).toISOString().slice(0,10);
function getRef(cod,tipo,pedidos,obraId){const fecha=new Date().toISOString().slice(0,10).replace(/-/g,"");const n=pedidos.filter(p=>p.obraId===obraId&&p.tipo===tipo).length+1;return `#${cod}_${fecha}_${TC[tipo]}_${n}`;}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);

function getActions(pedido,role){
  const{tipo,estado}=pedido;const meta=pedido.metadata||{};
  const d=role==="director",isCo=role==="compras",isAd=role==="admin",isOb=role==="jefe_obra",isAr=role==="arquitecto";
  if(["rechazado","archivado"].includes(estado))return[];
  const rej={label:"Rechazar",newEstado:"rechazado",color:"red"};
  const canDeliver=isOb||isCo||d;
  if(tipo==="compra_chica"){
    if(estado==="nuevo"&&(isCo||d))return[{label:"Aprobar Compra",newEstado:null,color:"green",formType:"approve_cc"},{label:"Desacopiar",newEstado:"desacopiado",color:"teal"},rej];
    if(estado==="desacopiado"&&canDeliver)return[{label:"Marcar Entregado",newEstado:"archivado",color:"green"}];
    if(estado==="pendiente_dir"){if(d)return[{label:"Confirmar Aprobación",newEstado:null,color:"green",formType:"approve_cc_dir"},rej];if(isCo)return[rej];}
    if(estado==="pend_pago"&&(isAd||d)){const next=meta.route==="anticipado"?"pend_entrega":"archivado";return[{label:"Marcar Pagado",newEstado:next,color:"purple"}];}
    if(estado==="pend_entrega"&&canDeliver){if(meta.route==="anticipado")return[{label:"Marcar Recibido",newEstado:"archivado",color:"green"}];return[{label:"Marcar Entregado",newEstado:"pend_pago",color:"green"}];}
  }
  if(tipo==="compra_grande"){
    if(estado==="nuevo"&&(isCo||d))return[{label:"Marcar Cotizado",newEstado:"cotizado",color:"sky"},{label:"Desacopiar",newEstado:"desacopiado",color:"teal"},rej];
    if(estado==="cotizado"){if(d)return[{label:"Aprobar",newEstado:null,color:"green",formType:"approve_dir_grande"},rej];if(isCo)return[rej];}
    if(estado==="desacopiado"&&canDeliver)return[{label:"Marcar Entregado",newEstado:"archivado",color:"green"}];
    if(estado==="pend_pago_anticipo"&&(isAd||d))return[{label:"Marcar Anticipo Pagado",newEstado:"pend_entrega",color:"purple"}];
    if(estado==="pend_entrega"&&canDeliver){if(meta.route==="anticipado")return[{label:"Marcar Recibido",newEstado:"archivado",color:"green"}];if(meta.route==="pago_parcial")return[{label:"Marcar Entregado",newEstado:"pend_pago_saldo",color:"green"}];return[{label:"Marcar Entregado",newEstado:"pend_pago",color:"green"}];}
    if(estado==="pend_pago"&&(isAd||d)){const next=meta.route==="anticipado"?"pend_entrega":"archivado";return[{label:"Marcar Pagado",newEstado:next,color:"purple"}];}
    if(estado==="pend_pago_saldo"&&(isAd||d))return[{label:"Marcar Saldo Pagado",newEstado:"archivado",color:"purple"}];
  }
  if(tipo==="licitacion"){
    if(estado==="nuevo"){if(isAr)return[{label:"Documentación Lista",newEstado:"doc_lista",color:"indigo"}];if(isCo||d)return[rej];}
    if(estado==="doc_lista"&&(isCo||d))return[{label:"Marcar Cotizado",newEstado:"cotizado",color:"sky"},rej];
    if(estado==="cotizado"){if(d)return[{label:"Aprobar",newEstado:null,color:"green",formType:"approve_dir_licitacion"},rej];if(isCo)return[rej];}
    if(estado==="pendiente_firma"&&(isAd||d))return[{label:"Marcar Contrato Firmado",newEstado:"archivado",color:"emerald"}];
    if(estado==="pend_pago"&&(isAd||d))return[{label:"Marcar Anticipo Pagado",newEstado:"archivado",color:"purple"}];
  }
  if(tipo==="acopio"){
    if(estado==="nuevo"&&(isCo||d))return[{label:"Marcar Cotizado",newEstado:"cotizado",color:"sky"},rej];
    if(estado==="cotizado"){if(d)return[{label:"Aprobar",newEstado:null,color:"green",formType:"approve_dir_acopio"},rej];if(isCo)return[rej];}
    if(estado==="pendiente_firma"&&(isAd||d))return[{label:"Marcar Contrato Firmado",newEstado:"archivado",color:"emerald"}];
    if(estado==="pend_pago"&&(isAd||d))return[{label:"Marcar Pagado",newEstado:"archivado",color:"purple"}];
  }
  return[];
}
const isPending=(p,role)=>getActions(p,role).length>0;

function resolveAction(action,pedido,form){
  const ft=action.formType;let newEstado,newMeta={...(pedido.metadata||{})};
  if(ft==="approve_cc"){
    const monto=parseFloat(form.monto)||0;
    Object.assign(newMeta,{proveedor:form.proveedor,contacto_nombre:form.contacto_nombre,contacto_tel:form.contacto_tel,monto,info_pago:form.info_pago,info_entrega:form.info_entrega,tipo_pago:form.tipo_pago,route:form.tipo_pago});
    if(monto>4_000_000)newEstado="pendiente_dir";
    else if(form.tipo_pago==="anticipado")newEstado="pend_pago";
    else newEstado="pend_entrega";
  }else if(ft==="approve_cc_dir"){
    newEstado=pedido.metadata?.route==="anticipado"?"pend_pago":"pend_entrega";
  }else if(ft==="approve_dir_grande"){
    Object.assign(newMeta,{proveedor:form.proveedor,contacto_nombre:form.contacto_nombre,contacto_tel:form.contacto_tel,condiciones_pago:form.condiciones_pago,condiciones_entrega:form.condiciones_entrega,tipo_pago:form.tipo_pago,route:form.tipo_pago});
    if(form.tipo_pago==="pago_parcial")newEstado="pend_pago_anticipo";
    else if(form.tipo_pago==="anticipado")newEstado="pend_pago";
    else newEstado="pend_entrega";
  }else if(ft==="approve_dir_licitacion"||ft==="approve_dir_acopio"){
    Object.assign(newMeta,{proveedor:form.proveedor,contacto_nombre:form.contacto_nombre,contacto_tel:form.contacto_tel,contacto_mail:form.contacto_mail,firma_contrato:form.firma_contrato,anexos:form.anexos,condiciones_pago:form.condiciones_pago,condiciones_entrega:form.condiciones_entrega});
    newEstado=form.firma_contrato?"pendiente_firma":"pend_pago";
  }
  return{newEstado,newMeta};
}

const emptyNew={tipo:"",titulo:"",obraId:"",descripcion:"",fechaEntrega:"",urgencia:"",docLista:false,proveedores:[],provNuevo:"",archivosNuevo:[]};
const emptyObra={nombre:"",codigo:"",direccion:""};
const emptyUser={name:"",username:"",password:"",role:"jefe_obra",activo:true};

function SueloLogo({size=56, color="#fff"}) {
  return (
    <div style={{display:"inline-flex",alignItems:"flex-end",userSelect:"none",lineHeight:1}}>
      <span style={{fontFamily:"'Inter',system-ui,sans-serif",fontWeight:900,fontSize:size,color,letterSpacing:-size*0.03,lineHeight:1}}>S</span>
      <svg viewBox="0 0 58 72" style={{width:size*0.58,height:size*0.76,marginBottom:size*0.05}} fill={color}>
        <rect x="1"  y="0" width="17" height="58" rx="2"/>
        <rect x="40" y="0" width="17" height="58" rx="2"/>
        <rect x="1"  y="47" width="56" height="13" rx="2"/>
      </svg>
      <span style={{fontFamily:"'Inter',system-ui,sans-serif",fontWeight:900,fontSize:size,color,letterSpacing:-size*0.03,lineHeight:1}}>elo</span>
    </div>
  );
}

export default function App(){
  const[users,setUsers]=useState([]);
  const[user,setUser]=useState(null);
  const[pedidos,setPedidos]=useState([]);
  const[obras,setObras]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[loadErr,setLoadErr]=useState("");
  const[view,setView]=useState("dashboard");
  const[sel,setSel]=useState(null);
  const[loginF,setLoginF]=useState({username:"",password:""});
  const[loginErr,setLoginErr]=useState("");
  const[newForm,setNewForm]=useState(emptyNew);
  const[newErr,setNewErr]=useState("");
  const[saving,setSaving]=useState(false);
  const[obraF,setObraF]=useState(emptyObra);
  const[obraErr,setObraErr]=useState("");
  const[showObraF,setShowObraF]=useState(false);
  const[dashF,setDashF]=useState({tipo:"",obraId:""});
  const[allF,setAllF]=useState({tipo:"",estado:"",obraId:"",archivo:"activos"});
  const[editUser,setEditUser]=useState(null);
  const[userForm,setUserForm]=useState(emptyUser);
  const[userErr,setUserErr]=useState("");
  const[showPass,setShowPass]=useState(false);
  const[showDemo,setShowDemo]=useState(false);
  const[actionModal,setActionModal]=useState(null);
  const[delConfirm,setDelConfirm]=useState(null);

  useEffect(()=>{
    (async()=>{
      try{const[u,o,p]=await Promise.all([sb.get("usuarios"),sb.get("obras"),sb.get("pedidos","&order=creado_at.desc")]);setUsers(u);setObras(o);setPedidos(p.map(mapP));}
      catch(e){setLoadErr("No se pudo conectar con la base de datos.");}
      setLoaded(true);
    })();
  },[]);

  const login=()=>{const u=users.find(u=>u.username===loginF.username.trim()&&u.password===loginF.password&&u.activo!==false);if(!u){setLoginErr("Usuario o contraseña incorrectos");return;}setUser(u);setLoginErr("");};
  const logout=()=>{setUser(null);setView("dashboard");setSel(null);};
  const nav=v=>{setView(v);setSel(null);};

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
      if(isNew){const d={id:uid(),name,username,password:userForm.password,role:userForm.role,activo:true};await sb.post("usuarios",d);setUsers(prev=>[...prev,d]);}
      else{const d={name,username,role:userForm.role,activo:userForm.activo,...(userForm.password?{password:userForm.password}:{})};await sb.patch("usuarios",editUser.id,d);setUsers(prev=>prev.map(u=>u.id===editUser.id?{...u,...d}:u));if(user.id===editUser.id)setUser(prev=>({...prev,name,username,role:userForm.role}));}
      setEditUser(null);setUserErr("");
    }catch(e){setUserErr("Error al guardar.");}
    setSaving(false);
  }
  async function toggleActive(u){if(u.id===user.id)return;const a=!u.activo;await sb.patch("usuarios",u.id,{activo:a});setUsers(prev=>prev.map(x=>x.id===u.id?{...x,activo:a}:x));}

  async function saveObra(){
    const nombre=obraF.nombre.trim(),codigo=obraF.codigo.trim().toUpperCase();
    if(!nombre||!codigo){setObraErr("Nombre y código son obligatorios");return;}
    if(codigo.length<2||codigo.length>5){setObraErr("Código: 2-5 caracteres");return;}
    if(obras.find(o=>o.codigo===codigo)){setObraErr("Ya existe ese código");return;}
    setSaving(true);
    try{const obra={id:uid(),nombre,codigo,direccion:obraF.direccion.trim(),activa:true,at:Date.now()};await sb.post("obras",obra);setObras(prev=>[...prev,obra]);setObraF(emptyObra);setObraErr("");setShowObraF(false);}
    catch(e){setObraErr("Error al guardar.");}
    setSaving(false);
  }

  async function savePedido(){
    setNewErr("");
    if(!newForm.tipo||!newForm.titulo.trim()||!newForm.obraId){setNewErr("Tipo, título y obra son obligatorios");return;}
    const hasFiles=(newForm.archivosNuevo||[]).length>0;
    if(!hasFiles&&!newForm.descripcion.trim()){setNewErr("Agregá una descripción o al menos un archivo");return;}
    if(newForm.tipo==="compra_chica"&&!newForm.fechaEntrega){setNewErr("La fecha de entrega es obligatoria");return;}
    if(newForm.tipo==="compra_chica"&&newForm.fechaEntrega<minDel()){setNewErr("Mínimo 48 hs hábiles desde hoy");return;}
    if(["compra_grande","licitacion","acopio"].includes(newForm.tipo)&&!newForm.urgencia){setNewErr("El nivel de urgencia es obligatorio");return;}
    setSaving(true);
    const pedidoId=uid().toUpperCase();
    let archivosData=[];
    try{
      for(const file of (newForm.archivosNuevo||[])){
        const up=await uploadFile(file,pedidoId);
        archivosData.push(up);
      }
    }catch(e){setNewErr("Error al subir archivos.");setSaving(false);return;}
    const obra=obras.find(o=>o.id===newForm.obraId);
    const initMeta={
      ...(newForm.proveedores?.length?{proveedores_cotizacion:newForm.proveedores.map(n=>({id:uid(),nombre:n,estado:"enviado_a_cotizar",ts:Date.now()}))}:{}),
      ...(archivosData.length?{archivos:archivosData}:{}),
    };
    const historial=[{accion:"Pedido creado",usuario:user.name,rol:RL[user.role],ts:Date.now(),comentario:newForm.descripcion.trim()||(hasFiles?"(ver archivos adjuntos)":"")}];
    const dbP={id:pedidoId,referencia:getRef(obra.codigo,newForm.tipo,pedidos,newForm.obraId),tipo:newForm.tipo,titulo:newForm.titulo.trim(),obra_id:newForm.obraId,obra_nombre:obra.nombre,descripcion:newForm.descripcion.trim(),estado:newForm.tipo==="licitacion"&&newForm.docLista?"doc_lista":"nuevo",fecha_entrega:newForm.tipo==="compra_chica"?newForm.fechaEntrega:null,urgencia:newForm.urgencia||null,creado_por:user.id,creado_nombre:user.name,creado_at:Date.now(),historial,metadata:initMeta};
    try{await sb.post("pedidos",dbP);setPedidos(prev=>[mapP(dbP),...prev]);setNewForm(emptyNew);nav("dashboard");}
    catch(e){setNewErr("Error al guardar.");}
    setSaving(false);
  }

  async function doSimpleAction(pedido,action,comment="",extraMeta={}){
    const entry={accion:action.label,usuario:user.name,rol:RL[user.role],ts:Date.now(),comentario:comment,prev_estado:pedido.estado,prev_metadata:JSON.parse(JSON.stringify(pedido.metadata||{}))};
    const newH=[...pedido.historial,entry];const newMeta={...pedido.metadata,...extraMeta};
    try{await sb.patch("pedidos",pedido.id,{estado:action.newEstado,historial:newH,metadata:newMeta});const up={...pedido,estado:action.newEstado,historial:newH,metadata:newMeta};setPedidos(prev=>prev.map(p=>p.id===pedido.id?up:p));setSel(up);}
    catch(e){alert("Error al guardar la acción.");}
  }

  async function doFormAction(pedido,action,form){
    const{newEstado,newMeta}=resolveAction(action,pedido,form);
    if(!newEstado){alert("Error: no se pudo determinar el estado.");return;}
    const entry={accion:action.label,usuario:user.name,rol:RL[user.role],ts:Date.now(),comentario:form.comment||"",prev_estado:pedido.estado,prev_metadata:JSON.parse(JSON.stringify(pedido.metadata||{}))};
    const newH=[...pedido.historial,entry];
    try{await sb.patch("pedidos",pedido.id,{estado:newEstado,historial:newH,metadata:newMeta});const up={...pedido,estado:newEstado,historial:newH,metadata:newMeta};setPedidos(prev=>prev.map(p=>p.id===pedido.id?up:p));setSel(up);setActionModal(null);}
    catch(e){alert("Error al guardar.");}
  }

  async function updateMeta(pedido,newMeta){
    try{await sb.patch("pedidos",pedido.id,{metadata:newMeta});const up={...pedido,metadata:newMeta};setPedidos(prev=>prev.map(p=>p.id===pedido.id?up:p));setSel(up);}
    catch(e){alert("Error al guardar.");}
  }

  async function deletePedido(pedido){
    try{await sb.del("pedidos",pedido.id);setPedidos(prev=>prev.filter(p=>p.id!==pedido.id));setSel(null);nav("dashboard");setDelConfirm(null);}
    catch(e){alert("Error al eliminar.");}
  }

  async function editPedido(pedido,form){
    const entry={accion:"Pedido editado",usuario:user.name,rol:RL[user.role],ts:Date.now(),comentario:"Pedido modificado por el creador"};
    const newH=[...pedido.historial,entry];
    const updates={titulo:form.titulo.trim(),descripcion:form.descripcion.trim(),historial:newH,...(form.fechaEntrega?{fecha_entrega:form.fechaEntrega}:{}),...(form.urgencia?{urgencia:form.urgencia}:{})};
    try{
      await sb.patch("pedidos",pedido.id,updates);
      const up={...pedido,...updates,fechaEntrega:form.fechaEntrega,historial:newH};
      setPedidos(prev=>prev.map(p=>p.id===pedido.id?up:p));setSel(up);
    }catch(e){alert("Error al editar.");}
  }

  async function doUndoLastStep(pedido,motivo){
    const hist=[...pedido.historial];
    if(hist.length<=1){alert("No se puede deshacer la creación del pedido.");return;}
    const lastEntry=hist[hist.length-1];
    const prevEstado=lastEntry.prev_estado;
    const prevMeta=lastEntry.prev_metadata!==undefined?lastEntry.prev_metadata:(pedido.metadata||{});
    if(!prevEstado){alert("No hay información suficiente para deshacer este paso.");return;}
    const undoEntry={accion:"↩ Paso deshecho",usuario:user.name,rol:RL[user.role],ts:Date.now(),comentario:motivo};
    const newH=[...hist.slice(0,-1),undoEntry];
    try{
      await sb.patch("pedidos",pedido.id,{estado:prevEstado,historial:newH,metadata:prevMeta});
      const up={...pedido,estado:prevEstado,historial:newH,metadata:prevMeta};
      setPedidos(prev=>prev.map(p=>p.id===pedido.id?up:p));setSel(up);
    }catch(e){alert("Error al deshacer.");}
  }

  if(!loaded)return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:BG,color:TM,fontFamily:"inherit",gap:8}}>
      <div style={{fontWeight:900,fontSize:20,letterSpacing:"-0.5px",color:TX}}>SUELO™</div>
      <div style={{...css.lbl,color:TM,fontSize:9}}>Conectando...</div>
      {loadErr&&<div style={{color:"#CC3333",fontSize:12,marginTop:8}}>{loadErr}</div>}
    </div>
  );

  if(!user)return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"Inter, system-ui, sans-serif"}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{background:"#0F0D0B",padding:"44px 40px 36px",textAlign:"center"}}>
          <SueloLogo size={58} color="#fff"/>
          <div style={{fontSize:9,letterSpacing:"0.22em",color:"rgba(255,255,255,0.35)",textTransform:"uppercase",fontWeight:600,marginTop:14,fontFamily:"'Inter',system-ui,sans-serif"}}>Gestión de Compras</div>
        </div>
        <div style={{background:CB,border:`1px solid ${BD}`,borderTop:"none",padding:"32px 28px"}}>
          <Fld label="Usuario">
            <input style={css.input} value={loginF.username} placeholder="nombre.apellido" onChange={e=>setLoginF(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()}/>
          </Fld>
          <div style={{marginTop:16}}>
            <Fld label="Contraseña">
              <input type="password" style={css.input} value={loginF.password} onChange={e=>setLoginF(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()}/>
            </Fld>
          </div>
          {loginErr&&<div style={{color:"#CC3333",fontSize:12,marginTop:12,letterSpacing:"0.04em"}}>{loginErr}</div>}
          <button onClick={login} style={{...btnS("primary"),width:"100%",marginTop:20,padding:"12px 20px"}}>Ingresar</button>
        </div>
        <div style={{marginTop:16,textAlign:"center"}}>
          <button onClick={()=>setShowDemo(!showDemo)} style={{...btnS("ghost"),fontSize:10,letterSpacing:"0.1em"}}>{showDemo?"▲":"▼"} Usuarios de demo</button>
          {showDemo&&(
            <div style={{background:CB,border:`1px solid ${BD}`,padding:"12px 16px",textAlign:"left",marginTop:4}}>
              {[["👔 Director","carlos.martinez","dir123"],["🪖 Jefe Obra","lucas.rodriguez","obra123"],["📐 Arquitecto","sofia.perez","arq123"],["🛒 Compras","javier.suarez","comp123"],["💳 Admin","maria.gonzalez","adm123"]].map(([r,u,p])=>(
                <div key={u} style={{fontSize:11,color:TM,marginBottom:4,fontFamily:"monospace"}}><span style={{color:TX,fontFamily:"inherit"}}>{r}:</span> {u} / {p}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const canCreate=CREATE_PERMS[user.role]||[];
  const isDir=user.role==="director";
  const myPending=pedidos.filter(p=>isPending(p,user.role));
  const dashPending=myPending.filter(p=>(!dashF.tipo||p.tipo===dashF.tipo)&&(!dashF.obraId||p.obraId===dashF.obraId));
  const allFiltered=pedidos.filter(p=>{
    const activo=ACTIVE_ESTADOS.includes(p.estado);
    const archMatch=allF.archivo==="todos"||(allF.archivo==="activos"&&activo)||(allF.archivo==="archivados"&&!activo);
    return archMatch&&(!allF.tipo||p.tipo===allF.tipo)&&(!allF.estado||p.estado===allF.estado)&&(!allF.obraId||p.obraId===allF.obraId);
  });
  const tabs=["dashboard","todos",...(canCreate.length?["nuevo"]:[]),...(isDir?["obras","usuarios"]:[])];
  const TAB_LABELS={dashboard:"Dashboard",todos:"Pedidos",nuevo:"+ Nuevo",obras:"Obras",usuarios:"Usuarios"};

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:"Inter, system-ui, sans-serif"}}>
      <header style={{background:G,padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontFamily:"'Inter',system-ui,sans-serif",fontWeight:900,fontSize:19,letterSpacing:"0.05em",color:"#fff",lineHeight:1}}>SUELO<sup style={{fontSize:9,letterSpacing:0,verticalAlign:"super"}}>®</sup></span>
          <div style={{width:1,height:16,background:"rgba(255,255,255,0.2)"}}/>
          <div style={{...css.lbl,color:"rgba(255,255,255,0.55)",fontSize:9}}>Gestión de Compras</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{...css.lbl,color:"rgba(255,255,255,0.75)",fontSize:9}}>{user.name} · {RL[user.role].toUpperCase()}</div>
          <button onClick={logout} style={{...btnS("outline"),padding:"6px 14px",fontSize:10,color:"#fff",borderColor:"rgba(255,255,255,0.35)"}}>Salir</button>
        </div>
      </header>

      <nav style={{background:CB,borderBottom:`1px solid ${BD}`,padding:"0 24px",display:"flex",gap:0,overflowX:"auto"}}>
        {tabs.map(v=>(
          <button key={v} onClick={()=>nav(v)} style={{background:"transparent",border:"none",borderBottom:view===v&&!sel?`2px solid ${TX}`:"2px solid transparent",padding:"14px 18px",fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:view===v&&!sel?700:500,color:view===v&&!sel?TX:TM,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",marginBottom:-1}}>
            {v==="dashboard"?(
              <span>{TAB_LABELS[v]}{myPending.length>0&&<span style={{marginLeft:6,background:"#CC3333",color:"#fff",fontSize:9,padding:"2px 6px",fontWeight:700,letterSpacing:"0.08em"}}>{myPending.length}</span>}</span>
            ):TAB_LABELS[v]}
          </button>
        ))}
      </nav>

      <main style={{padding:24,maxWidth:900,margin:"0 auto"}}>

        {view==="dashboard"&&!sel&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:24}}>
              {[{label:"Pendientes",value:myPending.length,color:"#CC3333"},{label:"Total activos",value:pedidos.filter(p=>ACTIVE_ESTADOS.includes(p.estado)).length,color:TX},{label:"Archivados",value:pedidos.filter(p=>["archivado","rechazado"].includes(p.estado)).length,color:TM}].map(s=>(
                <div key={s.label} style={{...css.card,padding:"20px 24px"}}>
                  <div style={{fontSize:36,fontWeight:900,color:s.color,letterSpacing:"-2px",lineHeight:1}}>{s.value}</div>
                  <div style={{...css.lbl,color:TM,fontSize:9,marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
            <FiltersBar f={dashF} setF={setDashF} obras={obras} showArchivo={false} showEstado={false}/>
            {dashPending.length===0
              ?<Empty icon={myPending.length===0?"✓":"○"} title={myPending.length===0?"Al día":"Sin resultados"} sub={myPending.length===0?"No tenés pedidos pendientes.":"Probá cambiando los filtros."}/>
              :<><SectionLabel text={`Requieren tu acción (${dashPending.length})`}/><div style={{display:"flex",flexDirection:"column",gap:2}}>{dashPending.map(p=><PCard key={p.id} p={p} onClick={()=>{setSel(p);setView("detalle");}}/>)}</div></>
            }
          </div>
        )}

        {view==="todos"&&!sel&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <FiltersBar f={allF} setF={setAllF} obras={obras} showArchivo={true} showEstado={true}/>
              <div style={{...css.lbl,color:TM,fontSize:9}}>{allFiltered.length} resultado{allFiltered.length!==1?"s":""}</div>
            </div>
            {allFiltered.length===0?<Empty icon="○" title="Sin resultados" sub="No hay pedidos con esos filtros."/>
              :<div style={{display:"flex",flexDirection:"column",gap:2}}>{allFiltered.map(p=><PCard key={p.id} p={p} onClick={()=>{setSel(p);setView("detalle");}}/>)}</div>}
          </div>
        )}

        {view==="nuevo"&&!sel&&(
          <div style={{maxWidth:560}}>
            <SectionLabel text="Nuevo pedido"/>
            {obras.length===0&&<div style={{border:`1px solid #C47820`,padding:"12px 16px",marginBottom:16,color:"#C47820",fontSize:12,letterSpacing:"0.04em"}}>⚠ No hay obras cargadas. Un Director debe crearlas primero.</div>}
            <div style={{...css.card,padding:"28px 24px"}}>
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <Fld label="Obra *">
                  <select style={css.input} value={newForm.obraId} onChange={e=>setNewForm(f=>({...f,obraId:e.target.value}))}>
                    <option value="">Seleccioná una obra...</option>
                    {obras.filter(o=>o.activa).map(o=><option key={o.id} value={o.id}>{o.nombre} ({o.codigo})</option>)}
                  </select>
                </Fld>
                <Fld label="Tipo de pedido *">
                  <select style={css.input} value={newForm.tipo} onChange={e=>setNewForm(f=>({...f,tipo:e.target.value,urgencia:"",fechaEntrega:"",docLista:false}))}>
                    <option value="">Seleccioná...</option>
                    {canCreate.map(t=><option key={t} value={t}>{TL[t]}</option>)}
                  </select>
                </Fld>
                <Fld label="Título / Referencia *">
                  <input style={css.input} placeholder="Ej: Hierro corrugado Ø12 para columnas" value={newForm.titulo} onChange={e=>setNewForm(f=>({...f,titulo:e.target.value}))}/>
                </Fld>
                {newForm.tipo==="compra_chica"&&(
                  <Fld label={<>Fecha de entrega * <span style={{color:TM,fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:11}}>(mín. 48 hs hábiles)</span></>}>
                    <input type="date" style={css.input} min={minDel()} value={newForm.fechaEntrega} onChange={e=>setNewForm(f=>({...f,fechaEntrega:e.target.value}))}/>
                  </Fld>
                )}
                {["compra_grande","licitacion","acopio"].includes(newForm.tipo)&&(
                  <Fld label="Urgencia *">
                    <div style={{display:"flex",gap:0}}>
                      {["bajo","medio","alto"].map((u,i)=>(
                        <button key={u} type="button" onClick={()=>setNewForm(f=>({...f,urgencia:u}))}
                          style={{flex:1,padding:"10px 8px",fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${BD}`,borderLeft:i>0?"none":undefined,background:newForm.urgencia===u?URG[u].color:"transparent",color:newForm.urgencia===u?"#fff":TM,transition:"all 0.1s"}}>
                          {u==="bajo"?"↓ Bajo":u==="medio"?"→ Medio":"↑ Alto"}
                        </button>
                      ))}
                    </div>
                  </Fld>
                )}
                {newForm.tipo==="licitacion"&&user.role==="arquitecto"&&(
                  <div style={{border:`1px solid ${G}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                    <button type="button" onClick={()=>setNewForm(f=>({...f,docLista:!f.docLista}))}
                      style={{position:"relative",width:40,height:22,borderRadius:11,border:"none",background:newForm.docLista?G:BD,cursor:"pointer",flexShrink:0,transition:"background 0.2s"}}>
                      <span style={{position:"absolute",top:2,width:18,height:18,borderRadius:9,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",transition:"left 0.2s",left:newForm.docLista?20:2}}/>
                    </button>
                    <div>
                      <div style={{...css.lbl,color:G,fontSize:10}}>Documentación lista</div>
                      <div style={{fontSize:11,color:TM,marginTop:1}}>{newForm.docLista?"Pasa directo a Compras":"Queda en espera en Proyecto"}</div>
                    </div>
                  </div>
                )}
                {newForm.tipo==="licitacion"&&user.role==="arquitecto"&&(
                  <Fld label="Proveedores a cotizar">
                    <div style={{border:`1px solid ${BD}`,background:"#fff"}}>
                      {(newForm.proveedores||[]).map((p,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",padding:"8px 12px",borderBottom:`1px solid ${BD}`}}>
                          <span style={{flex:1,fontSize:13,color:TX}}>{p}</span>
                          <button type="button" onClick={()=>setNewForm(f=>({...f,proveedores:f.proveedores.filter((_,j)=>j!==i)}))} style={{...btnS("ghost"),padding:"0 4px",fontSize:12,color:TM}}>✕</button>
                        </div>
                      ))}
                      <div style={{display:"flex"}}>
                        <input style={{...css.input,border:"none",borderTop:(newForm.proveedores||[]).length>0?`1px solid ${BD}`:"none"}} placeholder="Nombre del proveedor..."
                          value={newForm.provNuevo||""} onChange={e=>setNewForm(f=>({...f,provNuevo:e.target.value}))}
                          onKeyDown={e=>{if(e.key==="Enter"&&newForm.provNuevo?.trim())setNewForm(f=>({...f,proveedores:[...(f.proveedores||[]),f.provNuevo.trim()],provNuevo:""}));}}/>
                        <button type="button" onClick={()=>{if(newForm.provNuevo?.trim())setNewForm(f=>({...f,proveedores:[...(f.proveedores||[]),f.provNuevo.trim()],provNuevo:""}));}}
                          style={{...btnS("outline"),whiteSpace:"nowrap",borderLeft:"none",padding:"10px 14px"}}>+ Agregar</button>
                      </div>
                    </div>
                  </Fld>
                )}
                <Fld label={`Observaciones${(newForm.archivosNuevo||[]).length>0?" (opcional)":"*"}`}>
                  <textarea style={{...css.ta,height:72}} placeholder="Detalles, referencia al servidor interno..." value={newForm.descripcion} onChange={e=>setNewForm(f=>({...f,descripcion:e.target.value}))}/>
                </Fld>
                <Fld label="Archivos adjuntos (fotos o PDF)">
                  <div style={{border:`1px solid ${BD}`}}>
                    {(newForm.archivosNuevo||[]).map((f,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${BD}`}}>
                        <span style={{fontSize:13}}>{f.type.startsWith("image/")?"🖼":"📄"}</span>
                        <span style={{fontSize:12,flex:1,color:TX,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                        <button type="button" onClick={()=>setNewForm(f=>({...f,archivosNuevo:f.archivosNuevo.filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",cursor:"pointer",color:TM,fontSize:12}}>✕</button>
                      </div>
                    ))}
                    <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}}>
                      <input type="file" accept="image/*,application/pdf" multiple style={{display:"none"}} onChange={e=>{const files=Array.from(e.target.files);setNewForm(f=>({...f,archivosNuevo:[...(f.archivosNuevo||[]),...files]}));e.target.value="";}}/>
                      <span style={{...btnS("outline"),padding:"6px 12px",fontSize:10,pointerEvents:"none"}}>+ Adjuntar foto o PDF</span>
                      <span style={{fontSize:11,color:TM}}>Desde el celular o computadora</span>
                    </label>
                  </div>
                </Fld>
                {newForm.obraId&&newForm.tipo&&(
                  <div style={{borderLeft:`3px solid ${G}`,paddingLeft:12}}>
                    <div style={{...css.lbl,color:TM,fontSize:9}}>Referencia del pedido</div>
                    <div style={{fontFamily:"monospace",fontWeight:700,color:TX,fontSize:13,marginTop:2}}>{getRef(obras.find(o=>o.id===newForm.obraId)?.codigo||"???",newForm.tipo,pedidos,newForm.obraId)}</div>
                  </div>
                )}
                {newErr&&<div style={{color:"#CC3333",fontSize:12,letterSpacing:"0.04em"}}>{newErr}</div>}
                <div style={{display:"flex",gap:8,paddingTop:4}}>
                  <button onClick={savePedido} disabled={obras.length===0||saving} style={{...btnS("primary"),opacity:obras.length===0||saving?0.4:1}}>{saving?"Guardando...":"Crear pedido"}</button>
                  <button onClick={()=>nav("dashboard")} style={btnS("ghost")}>Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view==="obras"&&!sel&&isDir&&(
          <div style={{maxWidth:560}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <SectionLabel text="Obras"/>
              <button onClick={()=>setShowObraF(!showObraF)} style={btnS(showObraF?"outline":"primary",{padding:"8px 16px"})}>{showObraF?"Cancelar":"+ Nueva obra"}</button>
            </div>
            {showObraF&&(
              <div style={{...css.card,padding:"24px",marginBottom:16}}>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <Fld label="Nombre *"><input style={css.input} placeholder="Ej: Edificio Palermo" value={obraF.nombre} onChange={e=>setObraF(f=>({...f,nombre:e.target.value}))}/></Fld>
                  <Fld label="Código * (2-5 letras)"><input style={{...css.input,fontFamily:"monospace",textTransform:"uppercase"}} placeholder="PAL" maxLength={5} value={obraF.codigo} onChange={e=>setObraF(f=>({...f,codigo:e.target.value.toUpperCase()}))}/></Fld>
                  <Fld label="Dirección"><input style={css.input} placeholder="Av. Santa Fe 1234" value={obraF.direccion} onChange={e=>setObraF(f=>({...f,direccion:e.target.value}))}/></Fld>
                  {obraErr&&<div style={{color:"#CC3333",fontSize:12}}>{obraErr}</div>}
                  <button onClick={saveObra} disabled={saving} style={{...btnS("primary"),alignSelf:"flex-start",opacity:saving?0.4:1}}>{saving?"Guardando...":"Guardar obra"}</button>
                </div>
              </div>
            )}
            {obras.length===0?<Empty icon="○" title="No hay obras cargadas" sub="Creá la primera obra para comenzar."/>
              :<div style={{display:"flex",flexDirection:"column",gap:2}}>{obras.map(o=>(
                <div key={o.id} style={{...css.card,padding:"16px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontWeight:700,color:TX}}>{o.nombre}</span>
                    <span style={{...css.lbl,color:G,fontSize:9,border:`1px solid ${G}`,padding:"2px 6px"}}>{o.codigo}</span>
                  </div>
                  {o.direccion&&<div style={{fontSize:12,color:TM,marginTop:4}}>📍 {o.direccion}</div>}
                  <div style={{...css.lbl,color:TM,fontSize:9,marginTop:6}}>{pedidos.filter(p=>p.obraId===o.id).length} pedido(s)</div>
                </div>
              ))}</div>}
          </div>
        )}

        {view==="usuarios"&&!sel&&isDir&&(
          <div style={{maxWidth:700}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <SectionLabel text="Usuarios del sistema"/>
              <button onClick={openNewUser} style={btnS("primary",{padding:"8px 16px"})}>+ Nuevo usuario</button>
            </div>
            {editUser!==null&&(
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:24}}>
                <div style={{background:CB,border:`1px solid ${BD}`,padding:28,width:"100%",maxWidth:440}}>
                  <div style={{...css.lbl,color:TX,fontSize:11,marginBottom:20}}>{editUser.id?"Editar usuario":"Nuevo usuario"}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <Fld label="Nombre *"><input style={css.input} value={userForm.name} onChange={e=>setUserForm(f=>({...f,name:e.target.value}))}/></Fld>
                    <Fld label="Usuario *"><input style={{...css.input,fontFamily:"monospace"}} value={userForm.username} onChange={e=>setUserForm(f=>({...f,username:e.target.value.toLowerCase()}))}/></Fld>
                    <Fld label={editUser.id?"Nueva contraseña (vacío = no cambiar)":"Contraseña *"}>
                      <div style={{position:"relative"}}>
                        <input type={showPass?"text":"password"} style={{...css.input,paddingRight:70}} value={userForm.password} onChange={e=>setUserForm(f=>({...f,password:e.target.value}))}/>
                        <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:11,color:TM,fontFamily:"inherit"}}>{showPass?"Ocultar":"Mostrar"}</button>
                      </div>
                    </Fld>
                    <Fld label="Rol *">
                      <select style={css.input} value={userForm.role} onChange={e=>setUserForm(f=>({...f,role:e.target.value}))}>
                        {RO.map(r=><option key={r} value={r}>{RL[r]}</option>)}
                      </select>
                    </Fld>
                    {editUser.id&&editUser.id!==user.id&&(
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <button type="button" onClick={()=>setUserForm(f=>({...f,activo:!f.activo}))}
                          style={{position:"relative",width:40,height:22,borderRadius:11,border:"none",background:userForm.activo?G:BD,cursor:"pointer",flexShrink:0}}>
                          <span style={{position:"absolute",top:2,width:18,height:18,borderRadius:9,background:"#fff",boxShadow:"0 1px 2px rgba(0,0,0,0.2)",left:userForm.activo?20:2,transition:"left 0.15s"}}/>
                        </button>
                        <span style={{fontSize:12,color:TX}}>{userForm.activo?"Usuario activo":"Usuario inactivo"}</span>
                      </div>
                    )}
                    {userErr&&<div style={{color:"#CC3333",fontSize:12}}>{userErr}</div>}
                    <div style={{display:"flex",gap:8,paddingTop:4}}>
                      <button onClick={saveUser} disabled={saving} style={{...btnS("primary"),opacity:saving?0.4:1}}>{saving?"Guardando...":editUser.id?"Guardar cambios":"Crear usuario"}</button>
                      <button onClick={()=>setEditUser(null)} style={btnS("ghost")}>Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {RO.map(role=>{
              const g=users.filter(u=>u.role===role);
              if(!g.length)return null;
              const roleColors={director:TX,jefe_obra:"#8B4513",arquitecto:G,compras:"#2D7A3A",admin:"#6B4B8F"};
              return(
                <div key={role} style={{marginBottom:20}}>
                  <div style={{...css.lbl,color:roleColors[role],fontSize:9,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${BD}`}}>{RL[role]} ({g.length})</div>
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {g.map(u=>(
                      <div key={u.id} style={{...css.card,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,opacity:u.activo===false?0.5:1}}>
                        <div style={{width:32,height:32,background:u.activo===false?BD:roleColors[role],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13,flexShrink:0}}>{u.name.charAt(0)}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,color:TX}}>{u.name}{u.id===user.id&&<span style={{...css.lbl,color:TM,fontSize:9,marginLeft:8}}>( VOS )</span>}</div>
                          <div style={{fontFamily:"monospace",fontSize:11,color:TM}}>{u.username}</div>
                        </div>
                        {u.activo===false&&<span style={{...css.lbl,color:TM,fontSize:9,border:`1px solid ${BD}`,padding:"2px 6px"}}>INACTIVO</span>}
                        <div style={{display:"flex",gap:6,flexShrink:0}}>
                          <button onClick={()=>openEditUser(u)} style={{...btnS("outline"),padding:"6px 12px"}}>Editar</button>
                          {u.id!==user.id&&<button onClick={()=>toggleActive(u)} style={{...btnS(u.activo===false?"outline-green":"danger"),padding:"6px 12px"}}>{u.activo===false?"Activar":"Desactivar"}</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view==="detalle"&&sel&&(
          <DetailView pedido={sel} user={user} onSimpleAction={doSimpleAction}
            onFormAction={action=>setActionModal({action,pedido:sel})}
            onDelete={isDir?()=>setDelConfirm(sel):null}
            onBack={()=>{setSel(null);setView("dashboard");}}
            onUpdateMeta={newMeta=>updateMeta(sel,newMeta)}
            onEdit={form=>editPedido(sel,form)}
            onUndo={(motivo)=>doUndoLastStep(sel,motivo)}/>
        )}
      </main>

      {actionModal&&<ActionModal modal={actionModal} onSubmit={form=>doFormAction(actionModal.pedido,actionModal.action,form)} onClose={()=>setActionModal(null)}/>}

      {delConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:24}}>
          <div style={{background:CB,border:`1px solid ${BD}`,padding:28,width:"100%",maxWidth:380,textAlign:"center"}}>
            <div style={{...css.lbl,color:"#CC3333",fontSize:10,marginBottom:12}}>Eliminar pedido</div>
            <div style={{fontSize:13,color:TX,marginBottom:6,fontWeight:700,fontFamily:"monospace"}}>{delConfirm.referencia}</div>
            <div style={{fontSize:12,color:TM,marginBottom:20}}>Esta acción no se puede deshacer.</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={()=>deletePedido(delConfirm)} style={btnS("danger")}>Eliminar</button>
              <button onClick={()=>setDelConfirm(null)} style={btnS("ghost")}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailView({pedido,user,onSimpleAction,onFormAction,onDelete,onBack,onUpdateMeta,onEdit,onUndo}){
  const[comment,setComment]=useState("");
  const[fechaRecepcion,setFechaRecepcion]=useState("");
  const[nroRemito,setNroRemito]=useState("");
  const[recepTipo,setRecepTipo]=useState("total");
  const[recibidoDesc,setRecibidoDesc]=useState("");
  const[pendienteDesc,setPendienteDesc]=useState("");
  const[provNombre,setProvNombre]=useState("");
  const[recepArchivos,setRecepArchivos]=useState([]);
  const[savingRecep,setSavingRecep]=useState(false);
  // PUNTO 1 — editar pedido
  const[editMode,setEditMode]=useState(false);
  const[editForm,setEditForm]=useState({titulo:"",descripcion:"",fechaEntrega:"",urgencia:""});
  const[editErr,setEditErr]=useState("");
  const[savingEdit,setSavingEdit]=useState(false);
  // PUNTO 3 — deshacer
  const[undoMode,setUndoMode]=useState(false);
  const[undoMotivo,setUndoMotivo]=useState("");
  const[savingUndo,setSavingUndo]=useState(false);

  const actions=getActions(pedido,user.role);
  const meta=pedido.metadata||{};
  const proveedores=meta.proveedores_cotizacion||[];
  const recepParciales=meta.recepciones_parciales||[];
  const isDelivery=a=>["Marcar Entregado","Marcar Recibido"].includes(a.label);
  const hasDelivery=actions.some(isDelivery);
  const canManageProvs=user.role==="compras"||user.role==="director"||(user.role==="arquitecto"&&pedido.tipo==="licitacion");
  const isActive=ACTIVE_ESTADOS.includes(pedido.estado);
  // PUNTO 1: puede editar si es el creador y el pedido está en estado inicial
  const canEdit=pedido.creado_por===user.id&&(pedido.estado==="nuevo"||(pedido.estado==="doc_lista"&&pedido.tipo==="licitacion"));
  // PUNTO 2: puede cargar/modificar fecha pactada
  const canFechaPactada=["compras","jefe_obra","admin","director"].includes(user.role)&&pedido.estado==="pend_entrega";
  const PROV_EST={enviado_a_cotizar:{label:"Enviado",color:"#2D7A3A"},presup_recibido:{label:"Recibido",color:G},recibido_con_error:{label:"Con error",color:"#CC3333"}};

  function toggleEnProceso(){onUpdateMeta({...meta,en_proceso:!meta.en_proceso});}
  function addProveedor(){if(!provNombre.trim())return;onUpdateMeta({...meta,proveedores_cotizacion:[...proveedores,{id:uid(),nombre:provNombre.trim(),estado:"enviado_a_cotizar",ts:Date.now()}]});setProvNombre("");}
  function updateProvEstado(id,estado){onUpdateMeta({...meta,proveedores_cotizacion:proveedores.map(p=>p.id===id?{...p,estado}:p)});}
  function removeProveedor(id){onUpdateMeta({...meta,proveedores_cotizacion:proveedores.filter(p=>p.id!==id)});}

  function openEdit(){setEditForm({titulo:pedido.titulo,descripcion:pedido.descripcion||"",fechaEntrega:pedido.fechaEntrega||"",urgencia:pedido.urgencia||""});setEditErr("");setEditMode(true);}
  async function submitEdit(){
    if(!editForm.titulo.trim()){setEditErr("El título es obligatorio");return;}
    if(pedido.tipo==="compra_chica"&&!editForm.fechaEntrega){setEditErr("La fecha de entrega es obligatoria");return;}
    setSavingEdit(true);
    await onEdit(editForm);
    setSavingEdit(false);setEditMode(false);
  }

  async function submitUndo(){
    if(!undoMotivo.trim()){alert("Escribí el motivo del deshacer");return;}
    setSavingUndo(true);
    await onUndo(undoMotivo);
    setSavingUndo(false);setUndoMode(false);setUndoMotivo("");
  }

  async function handleDelivery(action){
    if(!fechaRecepcion){alert("Ingresá la fecha de recepción");return;}
    const hasFiles=recepArchivos.length>0;
    setSavingRecep(true);
    try{
      let archivosUrls=[];
      for(const file of recepArchivos){
        const up=await uploadFile(file,pedido.id);
        archivosUrls.push(up);
      }
      if(recepTipo==="parcial"){
        if(!hasFiles&&!recibidoDesc.trim()){alert("Adjuntá archivos o detallá qué se recibió");setSavingRecep(false);return;}
        const nueva={id:uid(),fecha:fechaRecepcion,nro_remito:nroRemito,recibido:recibidoDesc||(hasFiles?"(ver archivos adjuntos)":""),pendiente:pendienteDesc,ts:Date.now(),usuario:user.name,...(archivosUrls.length?{archivos:archivosUrls}:{})};
        await onSimpleAction(pedido,{label:"Recepción Parcial",newEstado:pedido.estado},`Recibido: ${recibidoDesc||"(ver archivos)"}${pendienteDesc?`. Pend: ${pendienteDesc}`:""}`,{recepciones_parciales:[...(meta.recepciones_parciales||[]),nueva]});
      }else{
        await onSimpleAction(pedido,action,comment,{fecha_recepcion:fechaRecepcion,nro_remito:nroRemito,...(archivosUrls.length?{archivos_recepcion:archivosUrls}:{})});
      }
      setFechaRecepcion("");setNroRemito("");setRecibidoDesc("");setPendienteDesc("");setRecepTipo("total");setComment("");setRecepArchivos([]);
    }catch(e){alert("Error al subir archivos.");}
    setSavingRecep(false);
  }

  const est=ESTADOS[pedido.estado]||{label:pedido.estado.toUpperCase(),color:TM};
  const tip=TIPOS[pedido.tipo]||{label:pedido.tipo,color:TM};

  const FileList=({archivos,compact=false})=>archivos?.length>0?(
    <div style={compact?{marginTop:6}:{border:`1px solid ${BD}`,marginTop:8}}>
      {archivos.map((a,i)=>(
        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
          style={{display:"flex",alignItems:"center",gap:8,padding:compact?"3px 0":"8px 14px",borderBottom:(!compact&&i<archivos.length-1)?`1px solid ${BD}`:"none",textDecoration:"none"}}>
          <span style={{fontSize:13}}>{a.tipo?.startsWith("image/")?"🖼":"📄"}</span>
          <span style={{fontSize:12,color:G,flex:1}}>{a.nombre}</span>
          <span style={{fontSize:10,color:TM}}>↗</span>
        </a>
      ))}
    </div>
  ):null;

  return(
    <div style={{maxWidth:680}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <button onClick={onBack} style={{...btnS("ghost"),padding:"0",color:TM,letterSpacing:"0.08em",fontSize:11}}>← VOLVER</button>
        <div style={{display:"flex",gap:8}}>
          {canEdit&&<button onClick={openEdit} style={{...btnS("outline"),padding:"6px 12px",fontSize:10}}>✏ Editar pedido</button>}
          {onDelete&&isActive&&<button onClick={onDelete} style={{...btnS("danger"),padding:"6px 12px",fontSize:10}}>Eliminar pedido</button>}
        </div>
      </div>

      <div style={{...css.card,padding:"24px 28px"}}>
        <div style={{borderBottom:`1px solid ${BD}`,paddingBottom:16,marginBottom:20}}>
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontFamily:"monospace",fontWeight:700,fontSize:13,color:TX}}>{pedido.referencia}</span>
            <span style={{...css.lbl,color:tip.color,border:`1px solid ${tip.color}`,padding:"3px 8px",fontSize:9}}>{tip.label.toUpperCase()}</span>
            <span style={{...css.lbl,color:est.color,border:`1px solid ${est.color}`,padding:"3px 8px",fontSize:9}}>{est.label}</span>
            {pedido.urgencia&&<span style={{...css.lbl,color:URG[pedido.urgencia].color,fontSize:9}}>{URG[pedido.urgencia].label}</span>}
            {meta.en_proceso&&<span style={{...css.lbl,color:"#C47820",border:"1px solid #C47820",padding:"3px 8px",fontSize:9}}>🔄 EN PROCESO</span>}
          </div>
          <h2 style={{fontSize:20,fontWeight:800,color:TX,margin:0,letterSpacing:"-0.3px"}}>{pedido.titulo}</h2>
          <div style={{fontSize:12,color:TM,marginTop:4}}>🏢 {pedido.obraNombre}</div>
          {pedido.fechaEntrega&&<div style={{fontSize:12,color:TX,marginTop:4}}>📅 Entrega esperada: <b>{pedido.fechaEntrega}</b></div>}
        </div>

        {pedido.descripcion&&(
          <div style={{borderLeft:`3px solid ${BD}`,paddingLeft:12,marginBottom:16}}>
            <div style={{...css.lbl,color:TM,fontSize:9,marginBottom:4}}>Observaciones</div>
            <div style={{fontSize:13,color:TX}}>{pedido.descripcion}</div>
          </div>
        )}

        {meta.archivos?.length>0&&(
          <div style={{border:`1px solid ${BD}`,marginBottom:16}}>
            <div style={{...css.lbl,color:TM,fontSize:9,padding:"8px 14px",borderBottom:`1px solid ${BD}`}}>Archivos adjuntos ({meta.archivos.length})</div>
            <FileList archivos={meta.archivos}/>
          </div>
        )}

        {/* PUNTO 2: Fecha pactada en obra — visible cuando está en pend_entrega */}
        {(pedido.estado==="pend_entrega"||(meta.fecha_pactada_obra&&pedido.estado!=="nuevo"))&&(
          <div style={{border:`1px solid #2D7A3A`,padding:"14px 16px",marginBottom:16}}>
            <div style={{...css.lbl,color:"#2D7A3A",fontSize:9,marginBottom:8}}>📦 Fecha pactada de entrega en obra</div>
            {canFechaPactada?(
              <>
                <input type="date" style={css.input} value={meta.fecha_pactada_obra||""} onChange={e=>onUpdateMeta({...meta,fecha_pactada_obra:e.target.value})}/>
                <div style={{fontSize:11,color:TM,marginTop:6}}>Opcional. Visible para todo el equipo.</div>
              </>
            ):(
              meta.fecha_pactada_obra
                ?<div style={{fontSize:14,fontWeight:700,color:"#2D7A3A"}}>{meta.fecha_pactada_obra}</div>
                :<div style={{fontSize:12,color:TM}}>Sin fecha pactada cargada aún</div>
            )}
          </div>
        )}

        {(user.role==="compras"||user.role==="director")&&isActive&&(
          <div style={{border:`1px solid #C47820`,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
            <button type="button" onClick={toggleEnProceso}
              style={{position:"relative",width:36,height:20,borderRadius:10,border:"none",background:meta.en_proceso?"#C47820":BD,cursor:"pointer",flexShrink:0}}>
              <span style={{position:"absolute",top:2,width:16,height:16,borderRadius:8,background:"#fff",boxShadow:"0 1px 2px rgba(0,0,0,0.2)",left:meta.en_proceso?18:2,transition:"left 0.15s"}}/>
            </button>
            <div style={{...css.lbl,color:"#C47820",fontSize:9}}>{meta.en_proceso?"EN PROCESO — Compras está trabajando en esta orden":"Marcar como en proceso"}</div>
          </div>
        )}

        {meta.proveedor&&(
          <div style={{border:`1px solid ${BD}`,padding:"16px",marginBottom:16}}>
            <div style={{...css.lbl,color:G,fontSize:9,marginBottom:10}}>Datos de la compra</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 16px"}}>
              {[[meta.proveedor,"Proveedor"],[meta.contacto_nombre,"Contacto"],[meta.contacto_tel,"Teléfono"],[meta.contacto_mail,"Mail"],[meta.monto?fmtMoney(meta.monto):null,"Monto"],[meta.tipo_pago?({contra_entrega:"Contra entrega",anticipado:"Anticipado",pago_parcial:"Pago parcial"}[meta.tipo_pago]):null,"Forma de pago"],[meta.info_pago,"Info pago"],[meta.info_entrega,"Info entrega"],[meta.condiciones_pago,"Cond. pago"],[meta.condiciones_entrega,"Cond. entrega"],[meta.firma_contrato!==undefined?meta.firma_contrato?"Sí":"No":null,"Firma contrato"],[meta.firma_contrato&&meta.anexos?meta.anexos:null,"Anexos"]].filter(([v])=>v).map(([v,l])=>(
                <div key={l}><div style={{...css.lbl,color:TM,fontSize:8}}>{l}</div><div style={{fontSize:12,color:TX,marginTop:1}}>{v}</div></div>
              ))}
            </div>
          </div>
        )}

        {recepParciales.length>0&&(
          <div style={{border:`1px solid #C47820`,marginBottom:16}}>
            <div style={{...css.lbl,color:"#C47820",fontSize:9,padding:"8px 14px",borderBottom:`1px solid #C47820`}}>RECEPCIONES PARCIALES ({recepParciales.length})</div>
            {recepParciales.map((r,i)=>(
              <div key={i} style={{padding:"10px 14px",borderBottom:i<recepParciales.length-1?`1px solid ${BD}`:"none"}}>
                <div style={{...css.lbl,color:TM,fontSize:9}}>{r.fecha}{r.nro_remito?` · Remito: ${r.nro_remito}`:""} · {r.usuario}</div>
                <div style={{fontSize:12,color:"#2D7A3A",marginTop:3}}><b>Recibido:</b> {r.recibido}</div>
                {r.pendiente&&<div style={{fontSize:12,color:"#C47820",marginTop:2}}><b>Pendiente:</b> {r.pendiente}</div>}
                {r.archivos?.length>0&&<FileList archivos={r.archivos} compact/>}
              </div>
            ))}
          </div>
        )}

        {meta.fecha_recepcion&&(
          <div style={{borderLeft:`3px solid #2D7A3A`,paddingLeft:12,marginBottom:16}}>
            <div style={{...css.lbl,color:"#2D7A3A",fontSize:9}}>✓ RECEPCIÓN TOTAL</div>
            <div style={{fontSize:12,color:TX,marginTop:2}}>{meta.fecha_recepcion}{meta.nro_remito?` · Remito: ${meta.nro_remito}`:""}</div>
            {meta.archivos_recepcion?.length>0&&<FileList archivos={meta.archivos_recepcion} compact/>}
          </div>
        )}

        {canManageProvs&&(
          <div style={{border:`1px solid ${BD}`,marginBottom:16}}>
            <div style={{...css.lbl,color:TM,fontSize:9,padding:"8px 14px",borderBottom:`1px solid ${BD}`}}>Proveedores consultados</div>
            {proveedores.length===0&&<div style={{fontSize:12,color:TM,padding:"10px 14px"}}>Sin proveedores cargados</div>}
            {proveedores.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderBottom:`1px solid ${BD}`,flexWrap:"wrap"}}>
                <span style={{fontSize:13,color:TX,flex:1,minWidth:0}}>{p.nombre}</span>
                <div style={{display:"flex",gap:4}}>
                  {Object.entries(PROV_EST).map(([k,v])=>(
                    <button key={k} onClick={()=>updateProvEstado(p.id,k)}
                      style={{fontSize:10,padding:"3px 8px",cursor:"pointer",letterSpacing:"0.06em",fontFamily:"inherit",border:`1px solid ${p.estado===k?v.color:BD}`,background:p.estado===k?v.color:"transparent",color:p.estado===k?"#fff":TM,fontWeight:p.estado===k?700:400}}>
                      {v.label}
                    </button>
                  ))}
                </div>
                <button onClick={()=>removeProveedor(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:TM,fontSize:12}}>✕</button>
              </div>
            ))}
            {isActive&&(
              <div style={{display:"flex",borderTop:proveedores.length>0?`1px solid ${BD}`:"none"}}>
                <input style={{...css.input,border:"none",flex:1}} placeholder="Nombre del proveedor..." value={provNombre} onChange={e=>setProvNombre(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addProveedor()}/>
                <button onClick={addProveedor} style={{...btnS("outline"),borderLeft:`1px solid ${BD}`,whiteSpace:"nowrap",padding:"10px 14px"}}>+ Agregar</button>
              </div>
            )}
          </div>
        )}

        {actions.length>0&&(
          <div style={{borderTop:`1px solid ${BD}`,paddingTop:20,marginTop:8}}>
            <div style={{...css.lbl,color:TX,fontSize:10,marginBottom:14}}>Tu acción requerida</div>
            {hasDelivery&&(
              <div style={{border:`1px solid ${BD}`,padding:"16px",marginBottom:14}}>
                <div style={{...css.lbl,color:TM,fontSize:9,marginBottom:12}}>Datos de recepción</div>
                <div style={{display:"flex",gap:0,marginBottom:12}}>
                  {[["total","✓ Recepción Total"],["parcial","⚠ Recepción Parcial"]].map(([v,l],i)=>(
                    <button key={v} type="button" onClick={()=>setRecepTipo(v)}
                      style={{flex:1,padding:"9px 8px",fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${BD}`,borderLeft:i>0?"none":undefined,background:recepTipo===v?(v==="total"?"#2D7A3A":"#C47820"):"transparent",color:recepTipo===v?"#fff":TM}}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  <Fld label="Fecha *"><input type="date" style={css.input} value={fechaRecepcion} onChange={e=>setFechaRecepcion(e.target.value)}/></Fld>
                  <Fld label="N° Remito"><input style={css.input} placeholder="0001-000123" value={nroRemito} onChange={e=>setNroRemito(e.target.value)}/></Fld>
                </div>
                <div style={{marginBottom:recepTipo==="parcial"?12:0}}>
                  <Fld label="Fotos o archivos (opcional si cargás descripción)">
                    <div style={{border:`1px solid ${BD}`}}>
                      {recepArchivos.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${BD}`}}>
                          <span style={{fontSize:13}}>{f.type.startsWith("image/")?"🖼":"📄"}</span>
                          <span style={{fontSize:12,flex:1,color:TX,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                          <button type="button" onClick={()=>setRecepArchivos(prev=>prev.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:TM,fontSize:12}}>✕</button>
                        </div>
                      ))}
                      <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}}>
                        <input type="file" accept="image/*,application/pdf" multiple style={{display:"none"}} onChange={e=>{setRecepArchivos(prev=>[...prev,...Array.from(e.target.files)]);e.target.value="";}}/>
                        <span style={{...btnS("outline"),padding:"6px 12px",fontSize:10,pointerEvents:"none"}}>+ Foto o archivo</span>
                      </label>
                    </div>
                  </Fld>
                </div>
                {recepTipo==="parcial"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <Fld label={`¿Qué se recibió?${recepArchivos.length>0?" (opcional)":"*"}`}>
                      <textarea style={{...css.ta,height:56}} placeholder="Detallá items o cantidades recibidas..." value={recibidoDesc} onChange={e=>setRecibidoDesc(e.target.value)}/>
                    </Fld>
                    <Fld label="¿Qué queda pendiente?">
                      <textarea style={{...css.ta,height:56}} placeholder="Detallá lo que falta..." value={pendienteDesc} onChange={e=>setPendienteDesc(e.target.value)}/>
                    </Fld>
                  </div>
                )}
              </div>
            )}
            {!actions.some(a=>a.formType)&&!hasDelivery&&(
              <textarea style={{...css.ta,height:60,marginBottom:12}} placeholder="Comentario opcional..." value={comment} onChange={e=>setComment(e.target.value)}/>
            )}
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {actions.map(a=>(
                <button key={a.label} disabled={savingRecep} onClick={()=>{
                  if(a.formType){onFormAction(a);return;}
                  if(isDelivery(a)){handleDelivery(a);return;}
                  onSimpleAction(pedido,a,comment).then(()=>setComment(""));
                }} style={{...btnS(ACT_BTN[a.color]||"primary"),opacity:savingRecep?0.5:1}}>
                  {savingRecep&&isDelivery(a)?"Subiendo..."
                    :isDelivery(a)&&hasDelivery?(recepTipo==="parcial"?"Registrar Parcial":a.label)
                    :a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{borderTop:`1px solid ${BD}`,paddingTop:20,marginTop:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{...css.lbl,color:TM,fontSize:9}}>Historial</div>
            {/* PUNTO 3: Botón deshacer — solo directores, solo si hay más de 1 entrada y el pedido no está archivado/rechazado */}
            {user.role==="director"&&pedido.historial.length>1&&isActive&&!undoMode&&(
              <button onClick={()=>setUndoMode(true)} style={{...btnS("danger"),padding:"5px 12px",fontSize:10}}>↩ Deshacer último paso</button>
            )}
          </div>
          {undoMode&&(
            <div style={{border:`1px solid #CC3333`,padding:"14px 16px",marginBottom:16}}>
              <div style={{...css.lbl,color:"#CC3333",fontSize:9,marginBottom:8}}>↩ DESHACER ÚLTIMO PASO</div>
              <div style={{fontSize:12,color:TM,marginBottom:10}}>
                Esto revertirá: <b style={{color:TX}}>{pedido.historial[pedido.historial.length-1]?.accion}</b> realizado por {pedido.historial[pedido.historial.length-1]?.usuario}.
              </div>
              <textarea style={{...css.ta,height:72,marginBottom:10}} placeholder="Motivo del deshacer (obligatorio)..." value={undoMotivo} onChange={e=>setUndoMotivo(e.target.value)}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={submitUndo} disabled={savingUndo||!undoMotivo.trim()} style={{...btnS("danger"),opacity:savingUndo||!undoMotivo.trim()?0.4:1}}>{savingUndo?"Deshaciendo...":"Confirmar Deshacer"}</button>
                <button onClick={()=>{setUndoMode(false);setUndoMotivo("");}} style={btnS("ghost")}>Cancelar</button>
              </div>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {[...pedido.historial].reverse().map((h,i)=>(
              <div key={i} style={{display:"flex",gap:14,paddingTop:i>0?10:0,marginTop:i>0?10:0,borderTop:i>0?`1px solid ${BD}`:"none"}}>
                <div style={{width:6,height:6,background:h.accion.startsWith("↩")?"#CC3333":G,marginTop:5,flexShrink:0}}/>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:h.accion.startsWith("↩")?"#CC3333":TX}}>{h.accion}</span>
                  <span style={{fontSize:11,color:TM}}> · {h.usuario} ({h.rol}) · {fmtDate(h.ts)}</span>
                  {h.comentario&&<div style={{fontSize:12,color:TM,marginTop:3,fontStyle:"italic"}}>"{h.comentario}"</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* PUNTO 1: Modal de edición */}
      {editMode&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:24,overflowY:"auto"}}>
          <div style={{background:CB,border:`1px solid ${BD}`,padding:28,width:"100%",maxWidth:520,margin:"auto"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,borderBottom:`1px solid ${BD}`,paddingBottom:14}}>
              <div>
                <div style={{...css.lbl,color:TX,fontSize:11}}>Editar pedido</div>
                <div style={{fontFamily:"monospace",fontSize:11,color:TM,marginTop:3}}>{pedido.referencia}</div>
              </div>
              <button onClick={()=>setEditMode(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:TM,lineHeight:1}}>×</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Fld label="Título *">
                <input style={css.input} value={editForm.titulo} onChange={e=>setEditForm(p=>({...p,titulo:e.target.value}))}/>
              </Fld>
              {pedido.tipo==="compra_chica"&&(
                <Fld label="Fecha de entrega *">
                  <input type="date" style={css.input} min={minDel()} value={editForm.fechaEntrega} onChange={e=>setEditForm(p=>({...p,fechaEntrega:e.target.value}))}/>
                </Fld>
              )}
              {["compra_grande","licitacion","acopio"].includes(pedido.tipo)&&(
                <Fld label="Urgencia">
                  <div style={{display:"flex",gap:0}}>
                    {["bajo","medio","alto"].map((u,i)=>(
                      <button key={u} type="button" onClick={()=>setEditForm(p=>({...p,urgencia:u}))}
                        style={{flex:1,padding:"10px 8px",fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${BD}`,borderLeft:i>0?"none":undefined,background:editForm.urgencia===u?URG[u].color:"transparent",color:editForm.urgencia===u?"#fff":TM}}>
                        {u==="bajo"?"↓ Bajo":u==="medio"?"→ Medio":"↑ Alto"}
                      </button>
                    ))}
                  </div>
                </Fld>
              )}
              <Fld label="Observaciones">
                <textarea style={{...css.ta,height:80}} value={editForm.descripcion} onChange={e=>setEditForm(p=>({...p,descripcion:e.target.value}))}/>
              </Fld>
              {editErr&&<div style={{color:"#CC3333",fontSize:12,letterSpacing:"0.04em"}}>{editErr}</div>}
              <div style={{display:"flex",gap:8,paddingTop:4}}>
                <button onClick={submitEdit} disabled={savingEdit} style={{...btnS("primary"),opacity:savingEdit?0.4:1}}>{savingEdit?"Guardando...":"Guardar cambios"}</button>
                <button onClick={()=>setEditMode(false)} style={btnS("ghost")}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionModal({modal,onSubmit,onClose}){
  const{action,pedido}=modal;
  const ft=action.formType;
  const meta=pedido.metadata||{};
  const[f,setF]=useState({proveedor:"",contacto_nombre:"",contacto_tel:"",contacto_mail:"",monto:"",info_pago:"",info_entrega:"",tipo_pago:"",condiciones_pago:"",condiciones_entrega:"",firma_contrato:false,anexos:"",comment:""});
  const[err,setErr]=useState("");
  const set=k=>e=>setF(p=>({...p,[k]:e.target?e.target.value:e}));
  const routeInfo=meta.route?{contra_entrega:"Contra entrega",anticipado:"Anticipado",pago_parcial:"Pago parcial"}[meta.route]:null;

  function submit(){
    setErr("");
    if(ft==="approve_cc"&&(!f.proveedor||!f.contacto_nombre||!f.monto||!f.tipo_pago||!f.info_pago||!f.info_entrega)){setErr("Completá todos los campos obligatorios");return;}
    if(ft==="approve_dir_grande"&&(!f.proveedor||!f.contacto_nombre||!f.tipo_pago)){setErr("Completá todos los campos obligatorios");return;}
    if((ft==="approve_dir_licitacion"||ft==="approve_dir_acopio")&&(!f.proveedor||!f.contacto_nombre)){setErr("Proveedor y contacto son obligatorios");return;}
    if((ft==="approve_dir_licitacion"||ft==="approve_dir_acopio")&&f.firma_contrato&&!f.anexos){setErr("Especificá los anexos a firmar");return;}
    onSubmit(f);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:24,overflowY:"auto"}}>
      <div style={{background:CB,border:`1px solid ${BD}`,padding:28,width:"100%",maxWidth:520,margin:"auto"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,borderBottom:`1px solid ${BD}`,paddingBottom:14}}>
          <div>
            <div style={{...css.lbl,color:TX,fontSize:11}}>{action.label}</div>
            <div style={{fontFamily:"monospace",fontSize:11,color:TM,marginTop:3}}>{pedido.referencia} · {TL[pedido.tipo]}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:TM,lineHeight:1}}>×</button>
        </div>
        <div style={{maxHeight:"60vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:14,paddingRight:4}}>
          {ft==="approve_cc_dir"&&(
            <div style={{border:`1px solid ${G}`,padding:"14px 16px"}}>
              <div style={{...css.lbl,color:G,fontSize:9,marginBottom:10}}>Datos cargados por Compras</div>
              {[[meta.proveedor,"Proveedor"],[meta.contacto_nombre,"Contacto"],[meta.monto?fmtMoney(meta.monto):null,"Monto"],[routeInfo,"Forma de pago"]].filter(([v])=>v).map(([v,l])=>(
                <div key={l} style={{display:"flex",gap:10,marginBottom:4}}>
                  <span style={{...css.lbl,color:TM,fontSize:8,width:80,flexShrink:0}}>{l}</span>
                  <span style={{fontSize:12,color:TX,fontWeight:600}}>{v}</span>
                </div>
              ))}
              <div style={{...css.lbl,color:"#C47820",fontSize:9,marginTop:10}}>⚠ Monto supera $4.000.000 — Requiere aprobación de Dirección</div>
            </div>
          )}
          {ft==="approve_cc"&&<>
            <Fld label="Proveedor elegido *"><input style={css.input} value={f.proveedor} onChange={set("proveedor")}/></Fld>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Fld label="Nombre contacto *"><input style={css.input} value={f.contacto_nombre} onChange={set("contacto_nombre")}/></Fld>
              <Fld label="Teléfono *"><input style={css.input} value={f.contacto_tel} onChange={set("contacto_tel")}/></Fld>
            </div>
            <Fld label="Monto (ARS) *">
              <input type="number" style={css.input} placeholder="Ej: 250000" value={f.monto} onChange={set("monto")}/>
              {parseFloat(f.monto)>4_000_000&&<div style={{...css.lbl,color:"#C47820",fontSize:9,marginTop:4}}>⚠ Supera $4.000.000 → irá a Dirección para aprobación</div>}
            </Fld>
            <Fld label="Info. para el pago *"><textarea style={{...css.ta,height:60}} placeholder="CBU, alias, etc." value={f.info_pago} onChange={set("info_pago")}/></Fld>
            <Fld label="Info. para la entrega *"><textarea style={{...css.ta,height:60}} placeholder="Dirección, horario, contacto en obra..." value={f.info_entrega} onChange={set("info_entrega")}/></Fld>
            <Fld label="Forma de pago *">
              <div style={{display:"flex",gap:0}}>
                {[["contra_entrega","Contra Entrega"],["anticipado","Anticipado"]].map(([v,l],i)=>(
                  <button key={v} type="button" onClick={()=>setF(p=>({...p,tipo_pago:v}))}
                    style={{flex:1,padding:"10px 8px",fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${BD}`,borderLeft:i>0?"none":undefined,background:f.tipo_pago===v?TX:"transparent",color:f.tipo_pago===v?"#fff":TM}}>
                    {l}
                  </button>
                ))}
              </div>
            </Fld>
          </>}
          {ft==="approve_dir_grande"&&<>
            <Fld label="Proveedor *"><input style={css.input} value={f.proveedor} onChange={set("proveedor")}/></Fld>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Fld label="Nombre contacto *"><input style={css.input} value={f.contacto_nombre} onChange={set("contacto_nombre")}/></Fld>
              <Fld label="Teléfono *"><input style={css.input} value={f.contacto_tel} onChange={set("contacto_tel")}/></Fld>
            </div>
            <Fld label="Condiciones de pago *"><textarea style={{...css.ta,height:60}} value={f.condiciones_pago} onChange={set("condiciones_pago")}/></Fld>
            <Fld label="Condiciones de entrega *"><textarea style={{...css.ta,height:60}} value={f.condiciones_entrega} onChange={set("condiciones_entrega")}/></Fld>
            <Fld label="Forma de pago *">
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {[["contra_entrega","Pago contra entrega"],["pago_parcial","Pago parcial anticipado"],["anticipado","Pago anticipado"]].map(([v,l])=>(
                  <button key={v} type="button" onClick={()=>setF(p=>({...p,tipo_pago:v}))}
                    style={{padding:"10px 14px",fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${BD}`,textAlign:"left",background:f.tipo_pago===v?TX:"transparent",color:f.tipo_pago===v?"#fff":TM}}>
                    {l}
                  </button>
                ))}
              </div>
            </Fld>
          </>}
          {(ft==="approve_dir_licitacion"||ft==="approve_dir_acopio")&&<>
            <Fld label="Proveedor *"><input style={css.input} value={f.proveedor} onChange={set("proveedor")}/></Fld>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Fld label="Nombre contacto *"><input style={css.input} value={f.contacto_nombre} onChange={set("contacto_nombre")}/></Fld>
              <Fld label="Teléfono *"><input style={css.input} value={f.contacto_tel} onChange={set("contacto_tel")}/></Fld>
            </div>
            <Fld label="Mail de contacto"><input type="email" style={css.input} value={f.contacto_mail} onChange={set("contacto_mail")}/></Fld>
            <Fld label="Condiciones de entrega"><textarea style={{...css.ta,height:56}} value={f.condiciones_entrega} onChange={set("condiciones_entrega")}/></Fld>
            <Fld label="Condiciones de pago"><textarea style={{...css.ta,height:56}} value={f.condiciones_pago} onChange={set("condiciones_pago")}/></Fld>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:`1px solid ${BD}`}}>
              <button type="button" onClick={()=>setF(p=>({...p,firma_contrato:!p.firma_contrato,anexos:""}))}
                style={{position:"relative",width:36,height:20,borderRadius:10,border:"none",background:f.firma_contrato?G:BD,cursor:"pointer",flexShrink:0}}>
                <span style={{position:"absolute",top:2,width:16,height:16,borderRadius:8,background:"#fff",boxShadow:"0 1px 2px rgba(0,0,0,0.15)",left:f.firma_contrato?18:2,transition:"left 0.15s"}}/>
              </button>
              <span style={{...css.lbl,color:f.firma_contrato?G:TM,fontSize:10}}>¿Requiere firma de contrato?</span>
            </div>
            {f.firma_contrato&&<Fld label="Anexos a firmar *"><textarea style={{...css.ta,height:72}} placeholder="Ej: Anexo A — Especificaciones técnicas..." value={f.anexos} onChange={set("anexos")}/></Fld>}
          </>}
          <Fld label="Comentario (opcional)">
            <textarea style={{...css.ta,height:56}} value={f.comment} onChange={set("comment")}/>
          </Fld>
          {err&&<div style={{color:"#CC3333",fontSize:12,letterSpacing:"0.04em"}}>{err}</div>}
        </div>
        <div style={{display:"flex",gap:8,paddingTop:16,borderTop:`1px solid ${BD}`,marginTop:16}}>
          <button onClick={submit} style={btnS(ACT_BTN[action.color]||"primary")}>Confirmar</button>
          <button onClick={onClose} style={btnS("ghost")}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function Fld({label,children}){
  return(
    <div>
      <label style={{...css.lbl,color:TM,fontSize:9,display:"block",marginBottom:6}}>{label}</label>
      {children}
    </div>
  );
}
function Empty({icon,title,sub}){
  return(
    <div style={{textAlign:"center",padding:"60px 0",color:TM}}>
      <div style={{fontSize:28,fontWeight:900,color:BD,marginBottom:8}}>{icon}</div>
      <div style={{...css.lbl,color:TM,fontSize:10,marginBottom:4}}>{title}</div>
      <div style={{fontSize:12,color:TM}}>{sub}</div>
    </div>
  );
}
function SectionLabel({text}){
  return <div style={{...css.lbl,color:TX,fontSize:10,marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${BD}`}}>{text}</div>;
}
function PCard({p,onClick}){
  const tip=TIPOS[p.tipo]||{label:p.tipo,color:TM};
  const est=ESTADOS[p.estado]||{label:p.estado,color:TM};
  const isArch=["archivado","rechazado"].includes(p.estado);
  return(
    <div onClick={onClick} style={{...css.card,padding:"14px 18px",display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer",borderLeft:`3px solid ${isArch?BD:tip.color}`,opacity:isArch?0.6:1,transition:"box-shadow 0.1s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.06)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",marginBottom:6}}>
          <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:TM}}>{p.referencia}</span>
          <span style={{...css.lbl,color:tip.color,fontSize:8}}>{tip.label.toUpperCase()}</span>
          <span style={{...css.lbl,color:est.color,border:`1px solid ${est.color}`,padding:"2px 6px",fontSize:8}}>{est.label}</span>
          {p.urgencia&&<span style={{...css.lbl,color:URG[p.urgencia].color,fontSize:8}}>{URG[p.urgencia].label}</span>}
          {p.metadata?.en_proceso&&<span style={{...css.lbl,color:"#C47820",fontSize:8}}>🔄 EN PROCESO</span>}
          {p.metadata?.archivos?.length>0&&<span style={{...css.lbl,color:TM,fontSize:8}}>📎 {p.metadata.archivos.length}</span>}
        </div>
        <div style={{fontWeight:700,fontSize:14,color:TX,marginBottom:2}}>{p.titulo}</div>
        <div style={{fontSize:11,color:TM}}>🏢 {p.obraNombre}</div>
        {p.fechaEntrega&&<div style={{fontSize:11,color:TM,marginTop:1}}>📅 {p.fechaEntrega}</div>}
        {p.estado==="pend_entrega"&&<div style={{fontSize:11,color:p.metadata?.fecha_pactada_obra?"#2D7A3A":"#C47820",marginTop:1,fontWeight:p.metadata?.fecha_pactada_obra?700:400}}>{p.metadata?.fecha_pactada_obra?`📦 Entrega obra: ${p.metadata.fecha_pactada_obra}`:"📦 Sin fecha pactada"}</div>}
        <div style={{fontSize:11,color:TM,marginTop:3}}>{p.creado_nombre} · {fmtDate(p.creado_at)}</div>
      </div>
      <div style={{color:BD,fontSize:14,marginTop:2}}>›</div>
    </div>
  );
}
function FiltersBar({f,setF,obras,showArchivo,showEstado}){
  const selectStyle={...css.input,width:"auto",padding:"7px 10px",fontSize:11};
  return(
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16,alignItems:"center"}}>
      <select style={selectStyle} value={f.tipo} onChange={e=>setF(p=>({...p,tipo:e.target.value}))}>
        <option value="">Todos los tipos</option>
        {Object.entries(TL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select>
      {showEstado&&<select style={selectStyle} value={f.estado||""} onChange={e=>setF(p=>({...p,estado:e.target.value}))}>
        <option value="">Todos los estados</option>
        {Object.entries(ESTADOS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
      </select>}
      {obras.length>0&&<select style={selectStyle} value={f.obraId} onChange={e=>setF(p=>({...p,obraId:e.target.value}))}>
        <option value="">Todas las obras</option>
        {obras.map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}
      </select>}
      {showArchivo&&<select style={selectStyle} value={f.archivo||"activos"} onChange={e=>setF(p=>({...p,archivo:e.target.value}))}>
        <option value="activos">Solo activos</option>
        <option value="todos">Activos + Archivados</option>
        <option value="archivados">Solo archivados</option>
      </select>}
      {(f.tipo||f.estado||f.obraId)&&<button onClick={()=>setF(p=>({...p,tipo:"",estado:"",obraId:""}))} style={{...btnS("ghost"),fontSize:10,padding:"7px 10px"}}>✕ Limpiar</button>}
    </div>
  );
}
