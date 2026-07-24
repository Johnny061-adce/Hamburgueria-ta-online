
const sb=window.supabase.createClient(APP_CONFIG.SUPABASE_URL,APP_CONFIG.SUPABASE_KEY);
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toFixed(2).replace(".",",");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function getSession(){try{return JSON.parse(localStorage.getItem("sessaoSistemaPedido")||"null")}catch{return null}}
function requireRole(...roles){const s=getSession();if(!s||!roles.includes(s.setor)){location.href="/login.html";throw new Error("Sem acesso")}return s}
function logout(){localStorage.removeItem("sessaoSistemaPedido");location.href="/login.html"}
function statusLabel(s){return ({aguardando:"Aguardando",aceito:"Aceito",producao:"Em produção",pronto:"Pronto",retirado:"Retirado",em_rota:"Em rota",Finalizado:"Finalizado",Cancelado:"Cancelado"})[s]||s}
async function must(q){const {data,error}=await q;if(error)throw error;return data}
