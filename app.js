/* Our Little Universe — Supabase-powered shared memory book */
const $ = id => document.getElementById(id);
const configured = window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
 !window.SUPABASE_URL.includes("PASTE_") && !window.SUPABASE_ANON_KEY.includes("PASTE_");
let db = null, session = null, memories = [], activeMemory = null, selectedPhoto = null, coverObjectUrl = null, activeFeed = "all", installPromptEvent = null;
const BUCKET = "couple-memories";
const partners = [
 {name:"Junry Amadeo", birth:"12-28", photoKey:"junryBirthdayPhoto"},
 {name:"Russel Christian Santos", birth:"01-02", photoKey:"russelBirthdayPhoto"}
];
function say(id,msg){$(id).textContent=msg||""}
function openModal(id){$(id).hidden=false;document.body.style.overflow="hidden"}
function closeModal(id){$(id).hidden=true;if(!document.querySelector(".modal:not([hidden])"))document.body.style.overflow=""}
document.addEventListener("click",e=>{const el=e.target.closest("[data-close]");if(el)closeModal(el.dataset.close)});
function localDate(s){if(!s)return null;const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function prettyDate(s){const d=localDate(s);return d?d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):"A day to remember"}
function daysTogether(){const start=new Date(2022,5,5);return Math.floor((new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate())-start)/86400000)}
function updateTogether(){const n=daysTogether();$("togetherCount").textContent=`${n.toLocaleString()} days of choosing each other — and counting. ♡`}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function uploadImage(file,folder="memories"){
 if(!file)return null;
 if(file.size>8*1024*1024)throw new Error("Please choose an image smaller than 8 MB.");
 if(!file.type.startsWith("image/"))throw new Error("Please choose an image file.");
 const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase();
 const path=`${folder}/${session.user.id}/${crypto.randomUUID()}.${ext}`;
 const {error}=await db.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type});
 if(error)throw error;
 return path;
}
function publicImage(path){if(!path)return "";return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
async function loadMemories(){
 $("memoryGrid").innerHTML='<div class="empty-state"><p>Gathering your memories… ♡</p></div>';
 const {data,error}=await db.from("memories").select("*").order("memory_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
 if(error){$("memoryGrid").innerHTML="";say("authMessage",error.message);return}
 memories=data||[];renderMemories();
}
function renderMemories(){
 const q=$("searchInput").value.trim().toLowerCase(), sort=$("sortSelect").value;
 let list=memories.filter(m=>[m.title,m.caption,m.details,m.memory_date].join(" ").toLowerCase().includes(q));
 list.sort((a,b)=>{const da=a.memory_date||a.created_at,dbb=b.memory_date||b.created_at;return sort==="oldest"?new Date(da)-new Date(dbb):new Date(dbb)-new Date(da)});
 $("memoryGrid").innerHTML=list.map(m=>`<article class="memory-card" data-memory="${m.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(m.title)}">
 ${m.image_path?`<img class="memory-image" src="${publicImage(m.image_path)}" alt="${escapeHtml(m.title)}">`:`<div class="memory-placeholder">♡</div>`}
 <div class="memory-info"><div class="memory-date">${escapeHtml(prettyDate(m.memory_date))}</div><h3>${escapeHtml(m.title)}</h3><p>${escapeHtml(m.caption||m.details||"A little moment from our story…")}</p><div class="memory-foot"><span>READ OUR STORY</span><span>♡ OPEN</span></div></div></article>`).join("");
 $("emptyState").hidden=list.length>0 || q.length>0;
 if(q && list.length===0){$("emptyState").hidden=false;$("emptyState").querySelector("h3").textContent="No memories found";$("emptyState").querySelector("p").textContent="Try another word or search again.";$("emptyAddBtn").hidden=true}
 else {$("emptyState").querySelector("h3").textContent="Your story starts here";$("emptyAddBtn").hidden=false}
}
$("memoryGrid").addEventListener("click",e=>{const c=e.target.closest("[data-memory]");if(c)showDetail(c.dataset.memory)});
$("memoryGrid").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){const c=e.target.closest("[data-memory]");if(c){e.preventDefault();showDetail(c.dataset.memory)}}});
$("searchInput").addEventListener("input",renderMemories);$("sortSelect").addEventListener("change",renderMemories);
document.querySelectorAll("[data-feed]").forEach(btn=>btn.addEventListener("click",()=>{
  activeFeed=btn.dataset.feed;
  document.querySelectorAll("[data-feed]").forEach(b=>b.classList.toggle("active",b===btn));
  $("feedDescription").textContent=activeFeed==="all"?"Shared memories from both of you.":activeFeed==="junry"?"Memories posted under Junry's profile.":"Memories posted under Russel's profile.";
  renderMemories();
}));
function showDetail(id){
 const m=memories.find(x=>x.id===id);if(!m)return;activeMemory=m;
 $("detailImage").src=m.image_path?publicImage(m.image_path):"";$("detailImage").style.display=m.image_path?"block":"none";
 $("detailDate").textContent=prettyDate(m.memory_date);$("detailTitle").textContent=m.title;$("detailCaption").textContent=m.caption||"";$("detailDetails").textContent=m.details||"Keep this little moment close to your heart.";
 openModal("detailModal");
}
function openMemoryEditor(m=null){
 closeModal("detailModal");activeMemory=m;selectedPhoto=null;
 $("memoryForm").reset();$("memoryId").value=m?.id||"";$("memoryModalTitle").textContent=m?"Edit this memory":"Add a memory";
 $("memoryTitle").value=m?.title||"";$("memoryDate").value=m?.memory_date||new Date().toISOString().slice(0,10);$("memoryCaption").value=m?.caption||"";$("memoryDetails").value=m?.details||"";
 $("photoPreview").innerHTML=m?.image_path?`<img src="${publicImage(m.image_path)}" alt="Current memory photo">`:'♡<small>Choose a photo to remember</small>';
 say("memoryMessage","");openModal("memoryModal");
}
$("addMemoryBtn").onclick=()=>openMemoryEditor();$("emptyAddBtn").onclick=()=>openMemoryEditor();$("editMemoryBtn").onclick=()=>openMemoryEditor(activeMemory);
$("memoryPhoto").addEventListener("change",()=>{selectedPhoto=$("memoryPhoto").files[0]||null;if(selectedPhoto){const r=new FileReader();r.onload=()=>{$("photoPreview").innerHTML=`<img src="${r.result}" alt="Photo preview">`};r.readAsDataURL(selectedPhoto)}});
$("memoryForm").addEventListener("submit",async e=>{
 e.preventDefault();const btn=$("saveMemoryBtn");btn.disabled=true;btn.textContent="Saving…";
 try{
  let image_path=activeMemory?.image_path||null;if(selectedPhoto)image_path=await uploadImage(selectedPhoto);
  const row={title:$("memoryTitle").value.trim(),memory_date:$("memoryDate").value||null,caption:$("memoryCaption").value.trim(),details:$("memoryDetails").value.trim(),image_path,updated_at:new Date().toISOString()};
  if(!row.title)throw new Error("Please add a title for this memory.");
  let result;if($("memoryId").value)result=await db.from("memories").update(row).eq("id",$("memoryId").value).select().single();
  else result=await db.from("memories").insert({...row,created_by:session.user.id}).select().single();
  if(result.error)throw result.error;
  closeModal("memoryModal");await loadMemories();
 }catch(err){say("memoryMessage",err.message||"Couldn't save this memory. Check your connection and Supabase setup.")}finally{btn.disabled=false;btn.textContent="Save memory ♥"}
});
$("deleteMemoryBtn").onclick=async()=>{if(!activeMemory||!confirm("Delete this memory? This cannot be undone."))return;const {error}=await db.from("memories").delete().eq("id",activeMemory.id);if(error){alert(error.message);return}closeModal("detailModal");await loadMemories()};
function applyCoverPhoto(url){
 if(!url)return;
 const safeUrl=String(url).replace(/"/g,"%22");
 $("heroImage").style.backgroundImage=`linear-gradient(90deg,rgba(32,22,33,.18),rgba(32,22,33,.08)),url("${safeUrl}")`;
 const authPhoto=document.querySelector(".auth-photo");if(authPhoto)authPhoto.style.backgroundImage=`url("${safeUrl}")`;
}
async function loadCoverPhoto(){
 try{
  const {data,error}=await db.from("couple_settings").select("value").eq("key","cover_photo_path").maybeSingle();
  if(error)throw error;
  if(data?.value)applyCoverPhoto(publicImage(data.value));
 }catch(err){console.warn("Could not load saved cover photo. Run cover_photo_migration.sql in Supabase SQL Editor.",err.message||err)}
}
$("coverBtn").onclick=()=>$("coverInput").click();
$("coverInput").onchange=async()=>{
 const f=$("coverInput").files[0];if(!f)return;
 const btn=$("coverBtn");btn.disabled=true;btn.textContent="Saving our cover… ♡";
 try{
  if(!session?.user?.id)throw new Error("Please log in before changing the cover photo.");
  if(!f.type.startsWith("image/"))throw new Error("Please choose an image file.");
  if(f.size>8*1024*1024)throw new Error("Please choose an image smaller than 8 MB.");
  const path=await uploadImage(f,"covers");
  const {error}=await db.from("couple_settings").upsert({key:"cover_photo_path",value:path,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:"key"});
  if(error)throw error;
  applyCoverPhoto(publicImage(path));
  say("authMessage","Our cover photo has been saved! It will stay after refresh and show on both phones. ♥");
 }catch(err){alert("Cover photo wasn't saved. " +(err.message||"Please run cover_photo_migration.sql in Supabase, then try again."));}
 finally{btn.disabled=false;btn.textContent="＋ Change our cover photo";$("coverInput").value=""}
};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPromptEvent=e;const b=$("installAppBtn");if(b)b.hidden=false});
if($("installAppBtn"))$("installAppBtn").addEventListener("click",async()=>{if(!installPromptEvent){alert("On iPhone: open this website in Safari, tap Share, then Add to Home Screen. On Android: open the browser menu and choose Install app or Add to Home screen.");return;}installPromptEvent.prompt();await installPromptEvent.userChoice;installPromptEvent=null;$("installAppBtn").hidden=true});

function birthdayCheck(){
 const today=`${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`;
 const p=partners.find(x=>x.birth===today);if(!p)return;
 $("birthdayStrip").hidden=false;$("birthdayTitle").textContent=`Happy birthday, ${p.name}! 🎂`;$("birthdayText").textContent="Today, the world got someone who makes our little universe brighter.";
 $("bdayModalTitle").textContent=`Happy Birthday, ${p.name}!`;const year=new Date().getFullYear();
 $("bdayPhoto").src=localStorage.getItem(p.photoKey)||"";$("bdayPhoto").style.display=localStorage.getItem(p.photoKey)?"block":"none";
 $("bdayModalText").textContent=p.name.startsWith("Junry")?"Thank you for the love you give. I hope this year brings you gentleness, laughter, and every good thing.":"You make my world softer, brighter, and more beautiful. I hope this new year gives you all the happiness you deserve.";
 $("birthdayOpen").onclick=()=>openModal("birthdayModal");
 // Show the birthday surprise when the birthday is opened; avoid interrupting login immediately.
 setTimeout(()=>{if(! $("appScreen").hidden)openModal("birthdayModal")},900);
}
function showApp(s){session=s;$("authScreen").hidden=true;$("appScreen").hidden=false;$("userEmail").textContent=s.user.email||"Our account";updateTogether();birthdayCheck();loadCoverPhoto();loadMemories()}
function showAuth(){session=null;$("appScreen").hidden=true;$("authScreen").hidden=false}
async function init(){
 if(!configured){say("authMessage","Setup needed: open config.js and add your Supabase Project URL and anon/public key. See README.txt.");return}
 db=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);
 const {data:{session:s}}=await db.auth.getSession();if(s)showApp(s);
 db.auth.onAuthStateChange((_event,s)=>{if(s)showApp(s);else showAuth()});
}
$("authForm").addEventListener("submit",async e=>{e.preventDefault();if(!db){say("authMessage","Please configure Supabase first. Open README.txt.");return}
 $("loginBtn").disabled=true;say("authMessage","");const {data,error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 if(error)say("authMessage",error.message);else if(data.session)showApp(data.session);$("loginBtn").disabled=false});
$("signupBtn").onclick=async()=>{if(!db){say("authMessage","Please configure Supabase first. Open README.txt.");return}
 const email=$("email").value.trim(),password=$("password").value;if(!email||password.length<6){say("authMessage","Enter your email and a password with at least 6 characters first.");return}
 $("signupBtn").disabled=true;const {data,error}=await db.auth.signUp({email,password});
 if(error)say("authMessage",error.message);else say("authMessage",data.session?"Account created! You're in.":"Account created. Check your email to confirm, then log in.");
 $("signupBtn").disabled=false};
$("logoutBtn").onclick=async()=>{if(db)await db.auth.signOut();showAuth()};
init();
