/* MICKEL NICKEL SLOTS page (slots.html). Built Oct 18 2026; own page since ~10:10 AM CT.
   Results are decided ONLY by the slot watcher from ledger data (tx hash + validating ledger hash + ledger close time).
   This file never decides a real spin: after you sign, the reels spin until slots_results.json has YOUR tx, then land on its reels.
   The pending spin is remembered (localStorage + Xaman return URL ?sltx={txid}&slid={id}) so leaving for Xaman and coming back
   never loses it, and the button stays locked until that spin's result is in (no double payments). No Math.random anywhere. */
(()=>{
const JSV='20261022-0600';
const g=id=>document.getElementById(id), qs=new URLSearchParams(location.search);
const SYM=["goldx","copper","silver","gold","hat","polaroid","glasses","bro","ho"], COMBO={Copper:["copper","copper","copper"],Silver:["silver","silver","silver"],Gold:["gold","gold","gold"],pair:["polaroid","polaroid","glasses"],pair_nospins:["hat","hat","hat"]};
// landing combos (same as slots_core.py): Copper x3 / Silver x3 = Mickel Nickel; Gold x3 = GRAND Gold Mickel only;
// pair with Vault spins left = GRAND (polaroid, polaroid, glasses); pair with no spins left = SEMI-GRAND (hat x3)
const comboFor=p=>(p.type==='pair'?((+p.spins_left||0)>0?COMBO.pair:COMBO.pair_nospins):(COMBO[p.metal]||["goldx","goldx","goldx"])).slice(), PAIRK=COMBO.pair.slice().sort().join();
const winLook=r=>(r[0]===r[1]&&r[1]===r[2])||r.slice().sort().join()===PAIRK;
let CFG=null,PRZ={prizes:[]},RS={free_spins:{},events:[]},DEMO=false,busy=false,demoN=0,mute=localStorage.getItem('sl_mute')==='1',myPairsN=null,AC=null;
// ---------- America/Chicago time ----------
const ctFmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function ctParts(ms){const o={};for(const p of ctFmt.formatToParts(new Date(ms)))o[p.type]=+p.value||p.value;return{y:+o.year,m:+o.month,d:+o.day,h:+o.hour%24,mi:+o.minute,s:+o.second}}
function ctMs(y,m,d,h,mi){const want=Date.UTC(y,m-1,d,h,mi);let t=want;for(let k=0;k<3;k++){const p=ctParts(t);t+=want-Date.UTC(p.y,p.m-1,p.d,p.h,p.mi,p.s)}return t}
const ds=p=>`${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;
function addDays(p,n){const t=new Date(Date.UTC(p.y,p.m-1,p.d+n));return{y:t.getUTCFullYear(),m:t.getUTCMonth()+1,d:t.getUTCDate()}}
const hm12=s=>{let[h,m]=s.split(':').map(Number);const ap=h<12?'AM':'PM';h=h%12||12;return`${h}:${String(m).padStart(2,'0')} ${ap}`};
function dur(ms){ms=Math.max(0,ms);const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60;return d?`${d}d ${h}h ${m}m`:h?`${h}h ${m}m ${x}s`:`${m}m ${x}s`}
// ---------- the public rule (same as slots_core.py) ----------
const hexb=h=>Uint8Array.from(h.match(/../g).map(x=>parseInt(x,16)));
async function H(tx,lh,tag){const a=hexb(tx),b=hexb(lh),c=new TextEncoder().encode(tag),u=new Uint8Array(a.length+b.length+c.length);u.set(a);u.set(b,a.length);u.set(c,a.length+b.length);return new Uint8Array(await crypto.subtle.digest('SHA-256',u))}
const big=b=>BigInt('0x'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join(''));
async function reelsFor(tx,lh,combo){if(combo)return combo.slice();const b=await H(tx,lh,'CBH-SLOT:REELS'),n=SYM.length;const r=[0,1,2].map(i=>SYM[b[i]%n]);
 if(r[0]===r[1]&&r[1]===r[2])r[2]=SYM[(SYM.indexOf(r[2])+1+b[3]%(n-1))%n];
 if(r.slice().sort().join()===PAIRK){const o=SYM.filter(x=>x!=='polaroid'&&x!=='glasses');r[2]=o[b[4]%o.length]}
 if(winLook(r))throw new Error('miss looks like a win');return r}
async function outcome(tx,lh,pool,odds,jp){tx=tx.toUpperCase();lh=lh.toUpperCase();const W=big(await H(tx,lh,'CBH-SLOT:WIN'));
 if(W%BigInt(odds)!==0n||!pool.length)return{win:false,reels:await reelsFor(tx,lh),roll:Number(W%BigInt(odds))};
 const tier=p=>p.tier||(p.type==='pair'?'jackpot':'common');const J=big(await H(tx,lh,'CBH-SLOT:JACKPOT'))%BigInt(jp)===0n,cat=J?'jackpot':'common';let sub=pool.filter(p=>tier(p)===cat);if(!sub.length)sub=pool.filter(p=>tier(p)!==cat);
 const tot=sub.reduce((a,p)=>a+(p.tickets||1),0),t=Number(big(await H(tx,lh,'CBH-SLOT:PRIZE'))%BigInt(tot));let acc=0,p=sub[sub.length-1];for(const x of sub){acc+=x.tickets||1;if(t<acc){p=x;break}}
 return{win:true,jackpot:tier(p)==='jackpot',grand:!!p.grand,semi_grand:!!p.semi_grand,prize:p,ticket:t,total_tickets:tot,reels:await reelsFor(tx,lh,comboFor(p))}}
// multi-spin (1-3 spins per paid payment): spin 0 = the tx hash itself; spin i = SHA-256(tx || "CBH-SLOT:SPIN" || i). A prize won earlier in the same payment leaves the pool.
async function spinHash(tx,i){tx=tx.toUpperCase();if(!i)return tx;const a=hexb(tx),c=new TextEncoder().encode('CBH-SLOT:SPIN'),u=new Uint8Array(a.length+c.length+1);u.set(a);u.set(c,a.length);u[u.length-1]=i;
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',u)),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()}
async function multiOutcome(tx,lh,pool,n,oddsFor,jp){let left=pool.slice();const out=[];for(let i=0;i<n;i++){const h=await spinHash(tx,i),o=await outcome(h,lh,left,oddsFor(h),jp);o.i=i;o.hash=h;if(o.win){const id=o.prize.id;left=left.filter(p=>p.id!==id)}out.push(o)}return out}
const DEMO_ODDS=6;   // demo only; real odds are set server-side and not published
// ---------- free spins (bonus Halloween snapshot Oct 31, then 12:00 AM CT on the 1st of every month) ----------
function snapTimes(){const p=ctParts(Date.now()),first=CFG.snapshot_first_ct||'2026-10-31',md=CFG.snapshot_monthly_day||1,out=[];
 for(const b of CFG.snapshot_bonus_ct||[]){const[y,m,d]=b.split('-').map(Number);out.push([b,ctMs(y,m,d,0,0)])}
 let y=p.y,m=p.m;for(let k=0;k<3;k++){const ds=`${y}-${String(m).padStart(2,'0')}-${String(md).padStart(2,'0')}`;out.push([ds,ctMs(y,m,md,0,0)]);m++;if(m>12){m=1;y++}}
 return out.filter(x=>x[0]>=first).sort((a,b)=>a[1]-b[1])}
function nextSnap(){const now=Date.now();const t=snapTimes().find(x=>x[1]>now);return t?t[1]:now}
function firstSnapDone(){const f=CFG.snapshot_first_ct||'2026-10-31',[y,m,d]=f.split('-').map(Number);return Date.now()>=ctMs(y,m,d,0,0)}
let lastW='';
const wal=()=>{const a=g('w').value.trim();return valid(a)?a:''};
const isConn=()=>!!XM&&typeof connected!=='undefined'&&connected;
// public results never carry full wallets: free_spins keyed by 'h:'+first 16 hex of SHA-256(wallet), events carry wh (same hash)
const MYWH={};function whOf(a){if(!a||a in MYWH)return;MYWH[a]=null;crypto.subtle.digest('SHA-256',new TextEncoder().encode(a)).then(b=>{MYWH[a]='h:'+Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('').slice(0,16);try{gate();drawFree()}catch(e){}}).catch(()=>{delete MYWH[a]})}
// double-tap guard (Oct 22): a FREE payment you just signed counts as used right away, until the watcher's published "used" catches up (max 15 min)
function freeLock(a){try{const L=JSON.parse(localStorage.getItem('sl_free_lock')||'null');if(!L||L.a!==a||Date.now()-L.t>900000)return null;return L}catch(e){return null}}
function freeLeft(){const a=wal();whOf(a);const F=RS.free_spins||{},f=a&&((MYWH[a]&&F[MYWH[a]])||F[a]);if(!f)return 0;let left=Math.max(0,f.granted-f.used);const L=freeLock(a);
 if(L){if(f.used>L.used)try{localStorage.removeItem('sl_free_lock')}catch(e){}else left=Math.max(0,left-1)}return left}
function setFreeLock(a){const F=RS.free_spins||{},f=(MYWH[a]&&F[MYWH[a]])||F[a]||{used:0};try{localStorage.setItem('sl_free_lock',JSON.stringify({a,t:Date.now(),used:+f.used||0}))}catch(e){}}
const clearFreeLock=()=>{try{localStorage.removeItem('sl_free_lock')}catch(e){}};
const snapDate=ms=>new Date(ms).toLocaleDateString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric'});
function drawFree(){if(!CFG)return;g('slmn').textContent=wal()?freeLeft():'–';const ns=nextSnap();
 g('slms').textContent=firstSnapDone()?`Next snapshot ${snapDate(ns)}, 12:00 AM CT`:'Bonus Halloween snapshot Oct 31, then 12:00 AM CT on the 1st of every month.';
 const per=CFG.free_spins_per_pairs||3;if(g('slpairs'))g('slpairs').textContent=myPairsN==null?'connect to see':`${myPairsN} (1 free spin per ${per} at each snapshot)`;
 if(g('slleft'))g('slleft').textContent=RS.prizes_left!=null?RS.prizes_left:PRZ.prizes.length}
async function countPairs(){const a=wal();if(!a){myPairsN=null;drawFree();return}for(let k=0;k<40&&!VP;k++)await sleep(250);
 try{const have=new Set();for(const n of await nfts(a))if(n.Issuer===SELLER)have.add(hex2s(n.URI||''));let c=0;const P=VP||{pairs:{},d1:{}};
  for(const p of Object.values(P.pairs||{}))if((have.has(p.polaroid.uri_coin)||have.has(p.polaroid.uri_nocoin))&&(have.has(p.twin.uri_coin)||have.has(p.twin.uri_nocoin)))c++;
  for(const p of Object.values(P.d1||{}))if(have.has(p.polaroid_uri)&&have.has(p.twin_uri))c++;myPairsN=c}catch(e){myPairsN=null}drawFree()}
// ---------- reels (feel matched to Rusty's App Builder version: all 3 roll at once, stop left -> right at 1.5 / 1.75 / 2.05 s) ----------
const src=s=>`img/slots/${s}.webp`, NS=SYM.length, STRIP=6, D=[1500,1750,2050], EASE='cubic-bezier(0.09,0.72,0.12,1)';
const RM=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
let pos=[0,0,0],spinning=false,landing=false,spinT0=0,shown=['goldx','gold','polaroid'];
function buildReels(show){let strip='';for(let c=0;c<STRIP;c++)for(const x of SYM)strip+=`<div class="sl-sym"><img src="${src(x)}" alt="${x}" draggable="false"></div>`;
 g('slreels').innerHTML=[0,1,2].map(i=>`<div class="sl-win" id="slw${i}"><div class="sl-strip" id="sls${i}">${strip}</div></div>`).join('');show.forEach((x,i)=>{setPos(i,2*NS+SYM.indexOf(x));g('slw'+i).dataset.sym=x});shown=show.slice()}
function rh(){const w=g('slw0');return w?w.getBoundingClientRect().height:0}
function setPos(i,p){pos[i]=p;const st=g('sls'+i);if(st)st.style.transform=`translate3d(0,${-p*rh()}px,0)`}
function curPos(i){const st=g('sls'+i),h=rh();if(!st||!h)return pos[i];try{const m=new DOMMatrixReadOnly(getComputedStyle(st).transform);return -m.m42/h}catch(e){return pos[i]}}
function cancelAnims(i){const st=g('sls'+i);if(st&&st.getAnimations)st.getAnimations().forEach(a=>{try{a.cancel()}catch(e){}})}
window.addEventListener('resize',()=>{if(!spinning)for(let i=0;i<3;i++)setPos(i,pos[i])});
// sounds (Web Audio, all tiny and scheduled ahead, so they can never block the page)
function AX(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){AC=null}return AC}
function tone(f,d,t,type,v){if(mute)return;const a=AX();if(!a)return;try{const o=a.createOscillator(),gn=a.createGain(),s=a.currentTime+t;o.type=type;o.frequency.setValueAtTime(f,s);gn.gain.setValueAtTime(v,s);gn.gain.exponentialRampToValueAtTime(1e-4,s+d);o.connect(gn);gn.connect(a.destination);o.start(s);o.stop(s+d+.02)}catch(e){}}
const sStart=()=>{for(let k=0;k<16;k++)tone(180+(k%3)*40,.05,k*.09,'square',.035)}, sStop=()=>tone(240,.08,0,'triangle',.06),
 sWin=()=>[523,659,784,1046].forEach((f,k)=>tone(f,.18,k*.09,'square',.05)), sLose=()=>{tone(196,.14,0,'sine',.05);tone(146,.18,.12,'sine',.045)};
const beep=()=>{};   // (old continuous beeping removed: the reels roll silently while we wait for the ledger)
// roll: starts on the TAP, keeps rolling (no sound) through Xaman and the ledger wait
function startLoop(){if(spinning&&!landing)return;spinning=true;landing=false;spinT0=Date.now();for(let i=0;i<3;i++)g('slw'+i).classList.remove('hit');g('slcab')&&g('slcab').setAttribute('aria-busy','true');
 if(RM())return;const h=rh();for(let i=0;i<3;i++){const st=g('sls'+i);cancelAnims(i);const p0=(pos[i]%NS)+NS;setPos(i,p0);if(!st.animate)continue;
  const ramp=st.animate([{transform:`translate3d(0,${-p0*h}px,0)`},{transform:`translate3d(0,${-(p0+NS)*h}px,0)`}],{duration:700,easing:'cubic-bezier(.5,0,1,1)',fill:'forwards'});
  ramp.onfinish=()=>{if(!spinning||landing)return;st.animate([{transform:`translate3d(0,${-p0*h}px,0)`},{transform:`translate3d(0,${-(p0+NS)*h}px,0)`}],{duration:330,iterations:Infinity})}}}
// land: every reel keeps its current spot and decelerates onto its symbol; never waits on anything but a timer
function land(final){landing=true;const h=rh(),rm=RM()||!h;
 return Promise.all(final.map((x,i)=>new Promise(res=>{const st=g('sls'+i),t=SYM.indexOf(x),l=(3+i)*NS+t;let ok=false;
  const fin=()=>{if(ok)return;ok=true;cancelAnims(i);setPos(i,2*NS+t);g('slw'+i).dataset.sym=x;if(!rm)sStop();res()};
  const c=((curPos(i)%NS)+NS)%NS;cancelAnims(i);setPos(i,c);
  if(rm||!st.animate){setTimeout(fin,rm?150*i:D[i]);return}
  const a=st.animate([{transform:`translate3d(0,${-c*h}px,0)`},{transform:`translate3d(0,${-l*h}px,0)`}],{duration:D[i],easing:EASE,fill:'forwards'});
  a.onfinish=fin;setTimeout(fin,D[i]+400)})))   // timer backup: a hidden tab or a paused animation can't hold the result
 .then(()=>{landing=false;spinning=false;shown=final.slice();g('slcab')&&g('slcab').setAttribute('aria-busy','false')})}
// hard stop: used by the watchdog and the error handlers; the reels ALWAYS stop
function hardStop(){for(let i=0;i<3;i++){cancelAnims(i);setPos(i,2*NS+SYM.indexOf(shown[i]))}spinning=false;landing=false;g('slcab')&&g('slcab').setAttribute('aria-busy','false')}
function confetti(){const c=document.createElement('div');c.className='sl-conf';const col=['#ffc72c','#3dde78','#fff4e0','#ff3d9a'];
 for(let i=0;i<36;i++){const e=document.createElement('i');e.style.left=(i*37%100)+'%';e.style.background=col[i%4];e.style.setProperty('--dx',((i*53%120)-60)+'px');e.style.setProperty('--rot',(i*97%720)+'deg');e.style.animationDelay=(i%9)*.05+'s';c.appendChild(e)}
 g('slcab').appendChild(c);setTimeout(()=>c.remove(),2400)}
function banner(cls,html){const b=g('slban');b.className='sl-banner '+cls;b.innerHTML=html}
function showResult(o,demo){const P=o.prize||{};
 if(o.win){for(let i=0;i<3;i++)g('slw'+i).classList.add('hit');confetti();sWin();
  banner(o.jackpot?'jack':'win',(o.grand?'👑 GRAND PRIZE! WIN! ':o.semi_grand?'🎩 SEMI-GRAND! WIN! ':o.jackpot?'🏆 JACKPOT! WIN! ':'🎉 WIN! ')+(demo?'Demo: would win ':'You won ')+(P.name||'a prize')+(demo?'':' · claim it below'))}
 else{sLose();banner('lose',demo?'Demo: no win this time.':'No win this time. Spin again!')}}
// ---------- pending spin (survives the trip to Xaman and back) ----------
const PK='sl_pending',MAXAGE=20*60e3;
function getP(){try{const p=JSON.parse(localStorage.getItem(PK)||'null');if(p&&Date.now()-p.t0<MAXAGE)return p}catch(e){}localStorage.removeItem(PK);return null}
function setP(p){if(p)localStorage.setItem(PK,JSON.stringify(p));else localStorage.removeItem(PK);try{pendUI()}catch(e){}}
// Cancel button: shown whenever a spin is pending, so the reels can never roll forever (Oct 21). ?reset=1 clears a stuck pending spin.
function pendUI(){const sp=g('slspin');if(!sp)return;let b=g('slcancel');if(!b){b=document.createElement('button');b.type='button';b.id='slcancel';b.textContent='✖ Cancel';
 b.style.cssText='display:none;margin:8px auto 0;padding:6px 14px;border-radius:999px;border:1px solid #888;background:transparent;color:#ccc;font-size:.85em;cursor:pointer';
 b.onclick=()=>{const P=getP();setP(null);gen++;resuming=false;busy=false;hardStop();banner('lose',P&&P.txid?'Stopped watching. If your payment went through, the result still shows in the public log.':'Payment cancelled, nothing charged.');gate()};
 sp.parentNode.insertAdjacentElement('afterend',b)}
 b.style.display=localStorage.getItem(PK)?'block':'none'}
try{if(new URLSearchParams(location.search).get('reset')==='1')localStorage.removeItem(PK)}catch(e){}
const WHY={NO_FREE_SPIN_LEFT:'no free spin left on this wallet (the 0.1 XRP fee is kept)',PAID_SPINS_OFF:'paid spins are off right now (refunded)',FREE_SPINS_OFF:'free spins are off right now (refunded)',
 WRONG_AMOUNT:'wrong amount (refunded)',BAD_MEMO:'missing spin memo (refunded)',WALLET_HOURLY_LIMIT:'too many spins this hour (refunded)',NO_PRIZES_LEFT:'no prizes left (refunded)'};
let resuming=false,gen=0,apiLeft=0;
const to=(p,ms,v)=>Promise.race([Promise.resolve(p).catch(()=>v),new Promise(r=>setTimeout(()=>r(v),ms))]);   // nothing may hang the spin
const memoT=t=>(t.Memos||[]).map(m=>{try{return hex2s(m.Memo.MemoType||'')}catch(e){return''}});
// find the signed spin payment on the ledger: the wallet's recent txs (works even if the Xaman return link had no tx hash)
async function findTx(P){if(!P.wallet)return null;const r=await to(rq({command:'account_tx',account:P.wallet,limit:25,forward:false}),12000,null);
 for(const it of ((r&&r.result&&r.result.transactions)||[])){const t=it.tx_json||it.tx||{};const h=(it.hash||t.hash||'').toUpperCase();
  if(t.TransactionType==='Payment'&&t.Destination===SELLER&&memoT(t).includes('CBH-SLOT')&&((t.date||0)+946684800)*1000>=P.t0-120000&&(it.meta||{}).TransactionResult==='tesSUCCESS')return h}return null}
function findEv(P,R){const tx=(P.txid||'').toUpperCase();return((R||RS).events||[]).slice().reverse().find(e=>tx?String(e.tx||'').toUpperCase()===tx:((e.wallet===P.wallet||(e.wh&&e.wh===MYWH[P.wallet]))&&(!P.mode||e.mode===P.mode)&&e.t>P.t0/1000-30))}
// FAST result: the watcher's results file straight from the GitHub API (seconds after the watcher writes it),
// instead of waiting ~60-70 s for GitHub Pages to redeploy. Pages stays the backup. Capped per spin (GitHub allows 60 calls/hour per visitor).
const API='https://api.github.com/repos/CBT123BOT/cbh-pair-spin/contents/slots_results.json';
async function fastResults(){if(apiLeft<=0)return null;apiLeft--;return to(fetch(API+'?t='+Date.now(),{cache:'no-store',headers:{Accept:'application/vnd.github.raw+json'}}).then(r=>r.ok?r.json():null),7000,null)}
function stopWith(cls,html){hardStop();banner(cls,html)}
function checkMsg(P){banner('wait',P&&P.seen?`✔ Your spin is confirmed on the ledger (tx ${P.txid.slice(0,8)}…). The result is still being posted. Tap CHECK RESULT, or <a href="#" id="slvlink">verify it</a>.`:'Still looking for your payment. Tap CHECK RESULT in a moment.');
 const vl=g('slvlink');if(vl&&P)vl.onclick=e=>{e.preventDefault();const d=g('sltx').closest('details');if(d)d.open=true;g('sltx').value=P.txid;verify();g('sltx').scrollIntoView({behavior:'smooth',block:'center'})}}
async function resume(){if(resuming)return;if(!getP())return;resuming=true;busy=true;const my=++gen;apiLeft=14;try{whOf(getP().wallet)}catch(e){}
 try{gate();startLoop();banner('wait','🎰 Reels rolling… waiting for the ledger. Please don’t pay again.');const t1=Date.now();let k=0;
  while(Date.now()-t1<90e3&&my===gen){const P=getP();if(!P)return;k++;
   if(!P.txid&&P.uuid&&XM&&XM.payload){const pl=await to(XM.payload.get(P.uuid),6000,null);const m=pl&&pl.meta||{};
    if(pl&&pl.response&&pl.response.txid){P.txid=String(pl.response.txid).toUpperCase();setP(P)}
    else if(m.cancelled||m.expired||(m.resolved&&!m.signed)){if(P.mode==='FREE')clearFreeLock();setP(null);stopWith('lose','Payment cancelled, nothing charged.');return}
    else if(m.resolved&&m.signed&&pl&&pl.response&&!pl.response.txid){if(P.mode==='FREE')clearFreeLock();setP(null);stopWith('lose','Payment failed in Xaman, nothing charged.');return}}
   if(my!==gen)return;
   if(!P.txid){const h=await findTx(P);if(h){P.txid=h;setP(P)}}
   if(P.txid&&!P.seen){const t=await to(rq({command:'tx',transaction:P.txid}),8000,null);if(t&&t.result&&t.result.validated&&t.result.meta&&t.result.meta.TransactionResult!=='tesSUCCESS'){if(P.mode==='FREE')clearFreeLock();setP(null);stopWith('lose','Payment failed on the ledger ('+t.result.meta.TransactionResult+'). No spin, no XRP was sent.');return}
    if(!(t&&t.result&&t.result.validated)&&Date.now()-P.t0>3*60e3){setP(null);stopWith('lose','Payment never reached the ledger. Nothing charged; you can spin again.');return}
    if(t&&t.result&&t.result.validated){P.seen=1;setP(P);banner('wait','✔ Payment confirmed on the ledger. Reels rolling… your result is on its way.')}}
   if(my!==gen)return;
   let ev=null;
   if(P.seen){const F=await fastResults();if(F&&F.events)ev=findEv(P,F)}
   if(!ev&&(k%2===1||!P.seen)){const R=await to(fj('slots_results.json'),8000,null);if(R){RS=R;ev=findEv(P,R)}}
   if(my!==gen)return;
   if(ev){setP(null);
    if(ev.action==='win'||ev.action==='lose'){await playSpins(ev);if(ev.action==='win'&&window.showClaims)setTimeout(window.showClaims,1500)}
    else stopWith('lose','Not spun: '+(WHY[ev.reason]||ev.reason||ev.action)+(ev.owner_refund_tx?' · refunded':''));return}
   if(!P.seen&&Date.now()-P.t0>6*60e3){setP(null);stopWith('lose','No confirmed payment found. Nothing was charged; you can spin again.');return}
   if(!P.txid&&Date.now()-P.t0>4*60e3){setP(null);stopWith('lose','No signed payment was found. Nothing was charged; you can spin again.');return}
   await sleep(P.seen?2500:3000)}
  if(my===gen){hardStop();checkMsg(getP())}}
 catch(e){hardStop();const P=getP();if(P)checkMsg(P);else banner('lose','Something went wrong. Tap SPIN to try again.')}
 finally{if(my===gen){resuming=false;busy=false;if(spinning&&!landing)hardStop();gate();drawFree()}}}
// one payment can carry 1-3 spins: each lands left -> right, then the next one rolls
async function playSpins(ev){const S=(ev.spins&&ev.spins.length)?ev.spins:[{win:ev.action==='win',reels:ev.reels,jackpot:ev.jackpot,grand:ev.grand,semi_grand:ev.semi_grand,prize:ev.prize}],n=S.length,won=[];
 for(let k=0;k<n;k++){const sp=S[k];if(k){startLoop();sStart();banner('wait',`🎰 Spin ${k+1} of ${n}…`);await sleep(700)}
  await land(sp.reels);if(sp.win)won.push(sp);
  if(n>1&&k<n-1){if(sp.win){for(let i=0;i<3;i++)g('slw'+i).classList.add('hit');sWin()}else sLose();banner(sp.win?'win':'lose',`Spin ${k+1} of ${n}: `+(sp.win?'🎉 WIN! '+((sp.prize||{}).name||'a prize'):'no win'));await sleep(1600)}}
 const done=()=>{busy=false;resuming=false;gate()};
 if(n===1){done();const sp=S[0];showResult({win:!!sp.win,jackpot:sp.jackpot,grand:!!sp.grand,semi_grand:!!sp.semi_grand,prize:sp.prize},false);return}
 if(!won.length){done();sLose();banner('lose',`No win in ${n} spins this time. Spin again!`);return}
 const top=won.find(x=>x.grand)||won.find(x=>x.semi_grand)||won.find(x=>x.jackpot)||won[0];if(top!==S[n-1]){await sleep(500);buildReels(top.reels)}   // finish on the winning combo, never a miss under a WIN banner
 done();showResult({win:true,jackpot:top.jackpot,grand:!!top.grand,semi_grand:!!top.semi_grand,prize:{name:won.map(x=>`${(x.prize||{}).name||'a prize'} (spin ${S.indexOf(x)+1} of ${n})`).join(' + ')}},false)}
// ---------- spin ----------
async function demoSpin(){busy=true;gate();if(!demoN&&+qs.get('demo_from')>1)demoN=Math.floor(+qs.get('demo_from'))-1;   // demo-only: start the demo sequence at #N (preview/testing)
 demoN++;AX();startLoop();sStart();banner('','Reels are rolling…');
 try{const tx=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('CBH-SLOT demo tx '+demoN))),x=>x.toString(16).padStart(2,'0')).join('');
 const lh=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('CBH-SLOT demo ledger '+demoN))),x=>x.toString(16).padStart(2,'0')).join('');
 let pool=PRZ.prizes.slice();if(!pool.some(p=>p.type==='pair'))pool.push({id:'demo-pair',type:'pair',tier:'jackpot',name:'Matched pair #0248 (demo example)',tickets:1});
 const o=await outcome(tx,lh,pool,DEMO_ODDS,+CFG.jackpot_one_in_wins||7);await land(o.reels);showResult(o,true);
 if(g('slvr'))g('slvr').textContent=`demo #${demoN} · tx ${tx.slice(0,12)}… · ledger ${lh.slice(0,12)}… → ${o.win?(o.jackpot?'JACKPOT ':'WIN ')+o.prize.name:'no win'} (demo)`}
 catch(e){hardStop();banner('lose','Demo error, tap again.')}busy=false;gate()}
let multiN=1;
async function liveSpin(mode){if(getP())return resume();if(!isConn()||busy)return;busy=true;AX();startLoop();sStart();gate();   // reels roll the moment you tap
 const n=mode==='PAID'?multiN:1,amt=mode==='FREE'?+CFG.free_spin_drops:n*+CFG.paid_spin_drops,me=wal();
 banner('wait',`Opening Xaman… check it says <b>MAINNET</b> and <b>${Number(amt)/1e6} XRP</b>, then sign.${/iPhone|iPad|Android/i.test(navigator.userAgent)?' After signing, tap <b>◀ Safari</b> (top-left) to come back here.':''}`);let r=null;
 try{r=await xamanSign({TransactionType:'Payment',Destination:SELLER,Amount:String(amt),Memos:[{Memo:{MemoType:s2hex(CFG.memo_type||'CBH-SLOT'),MemoData:s2hex(mode)}}]},
   mode==='FREE'?'MICKEL NICKEL SLOTS: free spin (0.1 XRP fee)':`MICKEL NICKEL SLOTS: ${n} spin${n>1?'s':''} (0.5 XRP each)`,uuid=>{setP({mode,n,wallet:me,t0:Date.now(),uuid});if(mode==='FREE')setFreeLock(me)},true)}
 catch(e){if(mode==='FREE')clearFreeLock();setP(null);stopWith('lose','Xaman: '+e.message);busy=false;gate();return}
 // phone: the sign request is open in Xaman now; resume() polls Xaman + the ledger and keeps the reels rolling (also after the app switch)
 const P=getP();if(r&&r.signed===false){if(mode==='FREE')clearFreeLock();setP(null);stopWith('lose','Cancelled in Xaman. No payment was made.');busy=false;gate();return}
 if(P&&r&&r.txid){P.txid=String(r.txid).toUpperCase();setP(P)}busy=false;resume()}
function gate(){if(!CFG)return;const s=g('slspin'),c=isConn(),n=freeLeft(),P=getP();let mode='',big='SPIN',sm='';
 if(DEMO){mode='demo';big='DEMO SPIN';sm='free · no real prizes';s.disabled=busy}
 else if(busy||resuming){big='⏳ SPINNING';sm='waiting for the ledger';s.disabled=true}
 else if(P){mode='check';big='CHECK RESULT';sm='your spin is confirmed';s.disabled=false}
 else if(!c){mode='connect';big='CONNECT XAMAN';sm='sign in to play';s.disabled=!XM}
 else if(CFG.free_spins_enabled&&n>0){mode='FREE';big='FREE SPIN';sm=`${n} left · 0.1 XRP fee`;s.disabled=false}
 else if(CFG.paid_spins_enabled){mode='PAID';big=multiN>1?`SPIN x${multiN}`:'SPIN';sm=`${(multiN*+CFG.paid_spin_drops/1e6).toFixed(1)} XRP`;s.disabled=false}
 else{big='NO FREE SPIN';sm=`next snapshot ${snapDate(nextSnap())}`;s.disabled=true}
 s.dataset.mode=mode;s.innerHTML=`<span>${big}</span><small>${sm}</small>`;s.classList.toggle('sl-free',mode==='FREE');
 const mx=g('slmulti');if(mx){mx.hidden=mode!=='PAID';mx.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.n===multiN))}}
// ---------- verify ----------
async function verify(){const h=g('sltx').value.trim().toUpperCase(),out=g('slvr');if(!/^[0-9A-F]{64}$/.test(h)){out.textContent='Paste a 64-character tx hash.';return}out.textContent='Looking it up on the ledger…';
 try{const t=(await rq({command:'tx',transaction:h})).result;if(!t||!t.validated)throw new Error('not a validated tx');const L=(await rq({command:'ledger',ledger_index:t.ledger_index})).result.ledger;
  const ev=(RS.events||[]).find(e=>String(e.tx||'').toUpperCase()===h),jp=+CFG.jackpot_one_in_wins||7;let log='<br>(not in the public log yet)';
  if(ev){const S=(ev.spins&&ev.spins.length)?ev.spins:[{i:0,hash:h,win:ev.action==='win',reels:ev.reels,prize:ev.prize,pool:ev.pool}];const rows=[];
   for(const sp of S){const hh=await spinHash(h,sp.i||0);let r=`${S.length>1?`spin ${(sp.i||0)+1}: `:''}${sp.win?'WIN · '+((sp.prize||{}).name||''):'no win'}${sp.reels?' · '+sp.reels.join('/'):''}`;
    if(sp.hash&&sp.hash.toUpperCase()!==hh)r+=' · spin hash does NOT match ✖';else if(S.length>1)r+=` · spin hash ${hh.slice(0,10)}… ✔`;
    if(sp.win&&sp.pool){const o=await outcome(hh,L.ledger_hash,sp.pool.map(([id,tier,tickets])=>({id,tier,tickets})),1,jp);r+=o.prize&&sp.prize&&sp.prize.id&&sp.prize.id.endsWith(o.prize.id)?' · prize pick re-checked ✔':' · prize pick does NOT match ✖'}rows.push(r)}
   log=`<br>public log: ${ev.action}${ev.reason?' · '+ev.reason:''}<br>`+rows.join('<br>')}
  out.innerHTML=`ledger ${t.ledger_index} · hash ${L.ledger_hash}${log}`}
 catch(e){out.textContent='Could not verify: '+e.message}}
// ---------- boot ----------
async function boot(){if(g('slbuild'))g('slbuild').textContent='build '+(window.SL_BUILD||'?')+' · js '+JSV;try{CFG=await fj('slots.json')}catch(e){CFG={paid_spins_enabled:false,free_spins_enabled:false,jackpot_one_in_wins:7,paid_spin_drops:'500000',free_spin_drops:'100000',free_spins_per_pairs:3}}
 DEMO=qs.get('demo')==='1'||(!CFG.paid_spins_enabled&&!CFG.free_spins_enabled);
 try{PRZ=await fj('slots_prizes.json')}catch(e){}try{RS=await fj('slots_results.json')}catch(e){}
 if(g('slmode'))g('slmode').textContent=DEMO?'Demo mode · no payments · no real prizes':'Live on XRPL mainnet';
 // back from Xaman: ?sltx={txid}&slid={uuid} -> remember it, then clean the URL (keeps ?wallet)
 const tx=(qs.get('sltx')||'').toUpperCase(),id=qs.get('slid')||'';
 if(/^[0-9A-F]{64}$/.test(tx)||/^[0-9a-f-]{36}$/i.test(id)){const P=getP()||{mode:qs.get('slmode')||'',wallet:qs.get('wallet')||'',t0:Date.now()};if(/^[0-9A-F]{64}$/.test(tx))P.txid=tx;if(id)P.uuid=P.uuid||id;setP(P);
  const u=new URLSearchParams(location.search);['sltx','slid','slmode'].forEach(k=>u.delete(k));history.replaceState(null,'',location.pathname+(u.toString()?'?'+u:''))}
 buildReels(['goldx','gold','polaroid']);gate();drawFree();countPairs();if(getP())resume();
 setInterval(async()=>{const a=wal(),k=a+'|'+isConn();if(k!==lastW){lastW=k;countPairs();gate()}},1000);
 setInterval(drawFree,5000);setInterval(async()=>{if(resuming)return;try{RS=await fj('slots_results.json');gate();drawFree()}catch(e){}},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&getP()){resuming=false;resume()}});   // back from Xaman: poll again right away
 window.addEventListener('pageshow',e=>{if(e.persisted&&getP()){resuming=false;resume()}});                       // iOS back/forward cache restore
 // hard watchdog, independent of everything else: the reels can never roll more than ~95 s
 setInterval(()=>{pendUI();const Q=getP();if(Q&&!Q.seen&&Date.now()-Q.t0>6*60e3){setP(null);gen++;resuming=false;busy=false;hardStop();banner('lose','No confirmed payment found. Nothing was charged; you can spin again.');gate();return}
  if(spinning&&!landing&&Date.now()-spinT0>95e3){gen++;resuming=false;busy=false;hardStop();const P=getP();if(P)checkMsg(P);else banner('lose','Spin stopped. Tap SPIN to try again.');gate()}},1000)}
// ANY error while rolling stops the reels and shows CHECK RESULT (or a retry message)
window.addEventListener('error',()=>{if(spinning&&!landing&&!resuming){hardStop();busy=false;const P=getP();if(P)checkMsg(P);gate()}});
window.addEventListener('unhandledrejection',()=>{if(spinning&&!landing&&!resuming){hardStop();busy=false;const P=getP();if(P)checkMsg(P);gate()}});
g('slspin').onclick=()=>{const m=g('slspin').dataset.mode;if(busy&&m!=='connect')return;if(m==='demo')demoSpin();else if(m==='connect'){if(XM)XM.authorize()}else if(m==='check')resume();else if(m==='FREE'||m==='PAID')liveSpin(m)};
g('slmute').onclick=()=>{mute=!mute;localStorage.setItem('sl_mute',mute?'1':'0');g('slmute').textContent=mute?'🔇':'🔊';g('slmute').setAttribute('aria-pressed',mute)};g('slmute').textContent=mute?'🔇':'🔊';
if(g('slver'))g('slver').onclick=verify;
if(g('slmulti'))g('slmulti').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(busy)return;multiN=Math.min(3,Math.max(1,+b.dataset.n||1));gate()});
// desktop QR flow: the Xaman websocket told us the tx hash (or a cancel) -> hand it to the polling loop
function gotTx(r){const P=getP();if(!P)return;if(r.signed===false){if(P.mode==='FREE')clearFreeLock();setP(null);gen++;resuming=false;busy=false;stopWith('lose','Cancelled in Xaman. No payment was made.');gate();return}if(r.txid&&!P.txid){P.txid=String(r.txid).toUpperCase();setP(P)}}
window.CBH_SLOTS={outcome,multiOutcome,spinHash,getP,gate,gotTx,build:()=>window.SL_BUILD};   // exposed for the parity / flow tests
boot();
})();
