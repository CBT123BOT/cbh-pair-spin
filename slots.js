/* MICKEL NICKEL SLOTS page (slots.html). Built Oct 18 2026; own page since ~10:10 AM CT.
   Results are decided ONLY by the slot watcher from ledger data (tx hash + validating ledger hash + ledger close time).
   This file never decides a real spin: after you sign, the reels spin until slots_results.json has YOUR tx, then land on its reels.
   The pending spin is remembered (localStorage + Xaman return URL ?sltx={txid}&slid={id}) so leaving for Xaman and coming back
   never loses it, and the button stays locked until that spin's result is in (no double payments). No Math.random anywhere. */
(()=>{
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
const DEMO_ODDS=6;   // demo only; real odds are set server-side and not published
// ---------- free spins (bonus Halloween snapshot Oct 31, then 12:00 AM CT on the 1st of every month) ----------
function snapTimes(){const p=ctParts(Date.now()),first=CFG.snapshot_first_ct||'2026-10-31',md=CFG.snapshot_monthly_day||1,out=[];
 for(const b of CFG.snapshot_bonus_ct||[]){const[y,m,d]=b.split('-').map(Number);out.push([b,ctMs(y,m,d,0,0)])}
 let y=p.y,m=p.m;for(let k=0;k<3;k++){const ds=`${y}-${String(m).padStart(2,'0')}-${String(md).padStart(2,'0')}`;out.push([ds,ctMs(y,m,md,0,0)]);m++;if(m>12){m=1;y++}}
 return out.filter(x=>x[0]>=first).sort((a,b)=>a[1]-b[1])}
function nextSnap(){const now=Date.now();const t=snapTimes().find(x=>x[1]>now);return t?t[1]:now}
function firstSnapDone(){const f=CFG.snapshot_first_ct||'2026-10-31',[y,m,d]=f.split('-').map(Number);return Date.now()>=ctMs(y,m,d,0,0)}
let testOK=false,lastW='';
async function testCheck(){const a=wal();if(!a||!(CFG.test_wallet_sha256||[]).length){testOK=false;return}
 const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(a))),x=>x.toString(16).padStart(2,'0')).join('');testOK=CFG.test_wallet_sha256.includes(h)}
const wal=()=>{const a=g('w').value.trim();return valid(a)?a:''};
const isConn=()=>!!XM&&typeof connected!=='undefined'&&connected;
function freeLeft(){const a=wal(),f=a&&(RS.free_spins||{})[a];return f?Math.max(0,f.granted-f.used):0}
const snapDate=ms=>new Date(ms).toLocaleDateString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric'});
function drawFree(){if(!CFG)return;g('slmn').textContent=wal()?freeLeft():'–';const ns=nextSnap();
 g('slms').textContent=firstSnapDone()?`Next snapshot ${snapDate(ns)}, 12:00 AM CT`:'Bonus Halloween snapshot Oct 31, then 12:00 AM CT on the 1st of every month.';
 const per=CFG.free_spins_per_pairs||3;if(g('slpairs'))g('slpairs').textContent=myPairsN==null?'connect to see':`${myPairsN} (1 free spin per ${per} at each snapshot)`;
 if(g('slleft'))g('slleft').textContent=RS.prizes_left!=null?RS.prizes_left:PRZ.prizes.length}
async function countPairs(){const a=wal();if(!a){myPairsN=null;drawFree();return}for(let k=0;k<40&&!VP;k++)await sleep(250);
 try{const have=new Set();for(const n of await nfts(a))if(n.Issuer===SELLER)have.add(hex2s(n.URI||''));let c=0;const P=VP||{pairs:{},d1:{}};
  for(const p of Object.values(P.pairs||{}))if((have.has(p.polaroid.uri_coin)||have.has(p.polaroid.uri_nocoin))&&(have.has(p.twin.uri_coin)||have.has(p.twin.uri_nocoin)))c++;
  for(const p of Object.values(P.d1||{}))if(have.has(p.polaroid_uri)&&have.has(p.twin_uri))c++;myPairsN=c}catch(e){myPairsN=null}drawFree()}
// ---------- reels ----------
const src=s=>`img/slots/${s}.webp`;
function buildReels(show){g('slreels').innerHTML=show.map((s,i)=>`<div class="sl-win" id="slw${i}"><div class="sl-strip" id="sls${i}"><div class="sl-sym"><img src="${src(s)}" alt="${s}" draggable="false"></div></div></div>`).join('')}
function rh(){return g('slw0').getBoundingClientRect().height}
function beep(f,d,t=0,type='square',v=.05){if(mute)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.value=f;gn.gain.value=v;o.connect(gn);gn.connect(AC.destination);const s=AC.currentTime+t;o.start(s);gn.gain.exponentialRampToValueAtTime(.0001,s+d);o.stop(s+d+.02)}catch(e){}}
let loopT=null;
function startLoop(){let k=0;for(let i=0;i<3;i++){g('slw'+i).classList.remove('hit');g('sls'+i).style.transition='none';g('sls'+i).style.transform='translate3d(0,0,0)';g('sls'+i).style.filter='blur(2px)'}
 clearInterval(loopT);loopT=setInterval(()=>{k++;for(let i=0;i<3;i++){const im=g('sls'+i).querySelector('img');im.src=src(SYM[(k+i*3)%SYM.length])}if(k%3===0)beep(220+(k%9)*20,.03,0,'square',.015)},90)}
function land(final){clearInterval(loopT);const h=rh(),D=[1.0,1.9,3.4],N=[12,22,40];   // left, middle, then a slow right reel (suspense)
 return Promise.all(final.map((s,i)=>new Promise(res=>{const st=g('sls'+i),n=N[i];
 st.style.filter='';st.innerHTML=Array.from({length:n},(_,k)=>SYM[(k*4+i*2)%SYM.length]).concat([s]).map(x=>`<div class="sl-sym"><img src="${src(x)}" alt="${x}" draggable="false"></div>`).join('');
 st.style.transition='none';st.style.transform='translate3d(0,0,0)';st.offsetHeight;st.style.transition=`transform ${D[i]}s ${i===2?'cubic-bezier(.1,.6,.12,1)':'cubic-bezier(.15,.75,.25,1.04)'}`;st.style.transform=`translate3d(0,${-n*h}px,0)`;
 setTimeout(()=>{st.style.transition='none';st.innerHTML=`<div class="sl-sym"><img src="${src(s)}" alt="${s}" draggable="false"></div>`;st.style.transform='translate3d(0,0,0)';beep(i===2?110:140,i===2?.14:.08,0,'triangle',.08);res()},D[i]*1000+40)})))}
function confetti(){const c=document.createElement('div');c.className='sl-conf';const col=['#ffc72c','#3dde78','#fff4e0','#ff3d9a'];
 for(let i=0;i<36;i++){const e=document.createElement('i');e.style.left=(i*37%100)+'%';e.style.background=col[i%4];e.style.setProperty('--dx',((i*53%120)-60)+'px');e.style.setProperty('--rot',(i*97%720)+'deg');e.style.animationDelay=(i%9)*.05+'s';c.appendChild(e)}
 g('slcab').appendChild(c);setTimeout(()=>c.remove(),2400)}
function banner(cls,html){const b=g('slban');b.className='sl-banner '+cls;b.innerHTML=html}
function showResult(o,demo){const P=o.prize||{};
 if(o.win){for(let i=0;i<3;i++)g('slw'+i).classList.add('hit');confetti();[523,659,784,1047].forEach((f,i)=>beep(f,.18,i*.12,'triangle',.07));
  banner(o.jackpot?'jack':'win',(o.grand?'👑 GRAND PRIZE! WIN! ':o.semi_grand?'🎩 SEMI-GRAND! WIN! ':o.jackpot?'🏆 JACKPOT! WIN! ':'🎉 WIN! ')+(demo?'Demo: would win ':'You won ')+(P.name||'a prize')+(demo?'':' · claim it below'))}
 else banner('lose',demo?'Demo: no win this time.':'No win this time. Spin again!')}
// ---------- pending spin (survives the trip to Xaman and back) ----------
const PK='sl_pending',MAXAGE=20*60e3;
function getP(){try{const p=JSON.parse(localStorage.getItem(PK)||'null');if(p&&Date.now()-p.t0<MAXAGE)return p}catch(e){}localStorage.removeItem(PK);return null}
function setP(p){if(p)localStorage.setItem(PK,JSON.stringify(p));else localStorage.removeItem(PK)}
const WHY={NO_FREE_SPIN_LEFT:'no free spin left on this wallet (the 0.1 XRP fee is kept)',PAID_SPINS_OFF:'paid spins are off right now (refunded)',FREE_SPINS_OFF:'free spins are off right now (refunded)',
 WRONG_AMOUNT:'wrong amount (refunded)',BAD_MEMO:'missing spin memo (refunded)',WALLET_HOURLY_LIMIT:'too many spins this hour (refunded)',NO_PRIZES_LEFT:'no prizes left (refunded)'};
let resuming=false;
const to=(p,ms,v)=>Promise.race([Promise.resolve(p).catch(()=>v),new Promise(r=>setTimeout(()=>r(v),ms))]);   // nothing may hang the spin
const memoT=t=>(t.Memos||[]).map(m=>{try{return hex2s(m.Memo.MemoType||'')}catch(e){return''}});
// find the signed spin payment on the ledger: the wallet's recent txs (works even if the Xaman return link had no tx hash)
async function findTx(P){if(!P.wallet)return null;const r=await to(rq({command:'account_tx',account:P.wallet,limit:25,forward:false}),12000,null);
 for(const it of ((r&&r.result&&r.result.transactions)||[])){const t=it.tx_json||it.tx||{};const h=(it.hash||t.hash||'').toUpperCase();
  if(t.TransactionType==='Payment'&&t.Destination===SELLER&&memoT(t).includes('CBH-SLOT')&&((t.date||0)+946684800)*1000>=P.t0-120000&&(it.meta||{}).TransactionResult==='tesSUCCESS')return h}return null}
function findEv(P){const tx=(P.txid||'').toUpperCase();return(RS.events||[]).slice().reverse().find(e=>tx?String(e.tx||'').toUpperCase()===tx:(e.wallet===P.wallet&&(!P.mode||e.mode===P.mode)&&e.t>P.t0/1000-30))}
async function resume(){if(resuming)return;if(!getP())return;resuming=true;busy=true;gate();startLoop();
 banner('wait','⏳ Waiting for the ledger… your spin is being decided. Please don’t pay again.');const t1=Date.now();let done=false;
 while(Date.now()-t1<90e3){const P=getP();if(!P){done=true;break}
  if(!P.txid&&P.uuid&&XM&&XM.payload){const pl=await to(XM.payload.get(P.uuid),6000,null);const m=pl&&pl.meta||{};
   if(pl&&pl.response&&pl.response.txid){P.txid=String(pl.response.txid).toUpperCase();setP(P)}
   else if((m.resolved||m.expired||m.cancelled)&&!m.signed&&!m.opened_by_deeplink){setP(null);clearInterval(loopT);banner('lose','The sign request was cancelled or expired. No payment was made.');done=true;break}}
  if(!P.txid){const h=await findTx(P);if(h){P.txid=h;setP(P)}}
  if(P.txid&&!P.seen){const t=await to(rq({command:'tx',transaction:P.txid}),10000,null);if(t&&t.result&&t.result.validated){P.seen=1;setP(P);banner('wait','✔ Payment confirmed on the ledger. The slot machine is deciding your spin…')}}
  const R=await to(fj('slots_results.json'),10000,null);if(R)RS=R;
  const ev=findEv(P);
  if(ev){setP(null);done=true;resuming=false;
   if(ev.action==='win'||ev.action==='lose'){await land(ev.reels);busy=false;gate();showResult({win:ev.action==='win',jackpot:ev.jackpot,grand:!!ev.grand,semi_grand:!!ev.semi_grand,prize:ev.prize},false);if(ev.action==='win'&&window.showClaims)setTimeout(window.showClaims,1500)}
   else{clearInterval(loopT);banner('lose','Not spun: '+(WHY[ev.reason]||ev.reason||ev.action)+(ev.owner_refund_tx?' · refunded':''))}break}
  if(!P.txid&&Date.now()-P.t0>4*60e3){setP(null);clearInterval(loopT);banner('lose','No signed payment was found. Nothing was charged; you can spin again.');done=true;break}
  await sleep(3000)}
 resuming=false;
 if(!done){const P=getP();clearInterval(loopT);for(let i=0;i<3;i++)g('sls'+i).style.filter='';
  banner('wait',P&&P.seen?`✔ Your spin is confirmed on the ledger (tx ${P.txid.slice(0,8)}…). The result is still being posted. Tap CHECK RESULT, or <a href="#" id="slvlink">verify it</a>.`:'Still looking for your payment. Tap CHECK RESULT in a moment.');
  const vl=g('slvlink');if(vl&&P)vl.onclick=e=>{e.preventDefault();const d=g('sltx').closest('details');if(d)d.open=true;g('sltx').value=P.txid;verify();g('sltx').scrollIntoView({behavior:'smooth',block:'center'})}}
 busy=false;gate();drawFree()}
// ---------- spin ----------
async function demoSpin(){busy=true;gate();if(!demoN&&+qs.get('demo_from')>1)demoN=Math.floor(+qs.get('demo_from'))-1;   // demo-only: start the demo sequence at #N (preview/testing)
 demoN++;startLoop();banner('','Spinning…');
 const tx=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('CBH-SLOT demo tx '+demoN))),x=>x.toString(16).padStart(2,'0')).join('');
 const lh=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('CBH-SLOT demo ledger '+demoN))),x=>x.toString(16).padStart(2,'0')).join('');
 let pool=PRZ.prizes.slice();if(!pool.some(p=>p.type==='pair'))pool.push({id:'demo-pair',type:'pair',tier:'jackpot',name:'Matched pair #0248 (demo example)',tickets:1});
 const o=await outcome(tx,lh,pool,DEMO_ODDS,+CFG.jackpot_one_in_wins||7);await sleep(500);await land(o.reels);showResult(o,true);
 if(g('slvr'))g('slvr').textContent=`demo #${demoN} · tx ${tx.slice(0,12)}… · ledger ${lh.slice(0,12)}… → ${o.win?(o.jackpot?'JACKPOT ':'WIN ')+o.prize.name:'no win'} (demo)`;busy=false;gate()}
async function liveSpin(mode){if(getP())return resume();if(!isConn()||busy)return;busy=true;gate();const amt=mode==='FREE'?CFG.free_spin_drops:CFG.paid_spin_drops,me=wal();
 banner('',`Opening Xaman… check it says <b>MAINNET</b> and <b>${Number(amt)/1e6} XRP</b>, then sign.`);let r=null;
 try{r=await xamanSign({TransactionType:'Payment',Destination:SELLER,Amount:String(amt),Memos:[{Memo:{MemoType:s2hex(CFG.memo_type||'CBH-SLOT'),MemoData:s2hex(mode)}}]},
   mode==='FREE'?'MICKEL NICKEL SLOTS: free spin (0.1 XRP fee)':'MICKEL NICKEL SLOTS: 1 spin (0.4 + 0.1 fee)',uuid=>setP({mode,wallet:me,t0:Date.now(),uuid}))}
 catch(e){setP(null);banner('lose','Xaman: '+e.message);busy=false;gate();return}
 // desktop (QR) flow resolves here; on a phone the page usually reloads from Xaman's return link and resume() runs on load
 const P=getP();if(r&&r.signed===false){setP(null);clearInterval(loopT);banner('lose','Cancelled in Xaman. No payment was made.');busy=false;gate();return}
 if(P&&r&&r.txid){P.txid=r.txid;setP(P)}busy=false;resume()}
function gate(){if(!CFG)return;const s=g('slspin'),c=isConn(),n=freeLeft(),P=getP();let mode='',big='SPIN',sm='';
 if(DEMO){mode='demo';big='DEMO SPIN';sm='free · no real prizes';s.disabled=busy}
 else if(busy||resuming){big='⏳ SPINNING';sm='waiting for the ledger';s.disabled=true}
 else if(P){mode='check';big='CHECK RESULT';sm='your spin is confirmed';s.disabled=false}
 else if(!c){mode='connect';big='CONNECT XAMAN';sm='sign in to play';s.disabled=!XM}
 else if(CFG.free_spins_enabled&&n>0){mode='FREE';big='FREE SPIN';sm=`${n} left · 0.1 XRP fee`;s.disabled=false}
 else if(CFG.paid_spins_enabled||testOK){mode='PAID';big='SPIN';sm='0.5 XRP'+(CFG.paid_spins_enabled?'':' · owner test');s.disabled=false}
 else{big='NO FREE SPIN';sm=`next snapshot ${snapDate(nextSnap())}`;s.disabled=true}
 s.dataset.mode=mode;s.innerHTML=`<span>${big}</span><small>${sm}</small>`;s.classList.toggle('sl-free',mode==='FREE')}
// ---------- verify ----------
async function verify(){const h=g('sltx').value.trim().toUpperCase(),out=g('slvr');if(!/^[0-9A-F]{64}$/.test(h)){out.textContent='Paste a 64-character tx hash.';return}out.textContent='Looking it up on the ledger…';
 try{const t=(await rq({command:'tx',transaction:h})).result;if(!t||!t.validated)throw new Error('not a validated tx');const L=(await rq({command:'ledger',ledger_index:t.ledger_index})).result.ledger;
  const ev=(RS.events||[]).find(e=>e.tx===h);let chk='';
  if(ev&&ev.action==='win'&&ev.pool){const pool=ev.pool.map(([id,tier,tickets])=>({id,tier,tickets})),o=await outcome(h,L.ledger_hash,pool,1,+CFG.jackpot_one_in_wins||7);chk=o.prize&&ev.prize.id&&ev.prize.id.endsWith(o.prize.id)?' · prize pick re-checked ✔':' · prize pick does NOT match ✖'}
  out.innerHTML=`ledger ${t.ledger_index} · hash ${L.ledger_hash}${ev?`<br>public log: ${ev.action}${ev.prize&&ev.prize.name?' · '+ev.prize.name:''}${chk}`:'<br>(not in the public log yet)'}`}
 catch(e){out.textContent='Could not verify: '+e.message}}
// ---------- boot ----------
async function boot(){try{CFG=await fj('slots.json')}catch(e){CFG={paid_spins_enabled:false,free_spins_enabled:false,jackpot_one_in_wins:7,paid_spin_drops:'500000',free_spin_drops:'100000',free_spins_per_pairs:3}}
 DEMO=qs.get('demo')==='1'||(!CFG.paid_spins_enabled&&!CFG.free_spins_enabled);
 try{PRZ=await fj('slots_prizes.json')}catch(e){}try{RS=await fj('slots_results.json')}catch(e){}
 if(g('slmode'))g('slmode').textContent=DEMO?'Demo mode · no payments · no real prizes':'Live on XRPL mainnet';
 // back from Xaman: ?sltx={txid}&slid={uuid} -> remember it, then clean the URL (keeps ?wallet)
 const tx=(qs.get('sltx')||'').toUpperCase(),id=qs.get('slid')||'';
 if(/^[0-9A-F]{64}$/.test(tx)||/^[0-9a-f-]{36}$/i.test(id)){const P=getP()||{mode:qs.get('slmode')||'',wallet:qs.get('wallet')||'',t0:Date.now()};if(/^[0-9A-F]{64}$/.test(tx))P.txid=tx;if(id)P.uuid=P.uuid||id;setP(P);
  const u=new URLSearchParams(location.search);['sltx','slid','slmode'].forEach(k=>u.delete(k));history.replaceState(null,'',location.pathname+(u.toString()?'?'+u:''))}
 buildReels(['goldx','gold','polaroid']);gate();drawFree();countPairs();if(getP())resume();
 setInterval(async()=>{const a=wal(),k=a+'|'+isConn();if(k!==lastW){lastW=k;await testCheck();countPairs();gate()}},1000);
 setInterval(drawFree,5000);setInterval(async()=>{if(resuming)return;try{RS=await fj('slots_results.json');gate();drawFree()}catch(e){}},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&getP())resume()})}
g('slspin').onclick=()=>{const m=g('slspin').dataset.mode;if(busy&&m!=='connect')return;if(m==='demo')demoSpin();else if(m==='connect'){if(XM)XM.authorize()}else if(m==='check')resume();else if(m==='FREE'||m==='PAID')liveSpin(m)};
g('slmute').onclick=()=>{mute=!mute;localStorage.setItem('sl_mute',mute?'1':'0');g('slmute').textContent=mute?'🔇':'🔊';g('slmute').setAttribute('aria-pressed',mute)};g('slmute').textContent=mute?'🔇':'🔊';
if(g('slver'))g('slver').onclick=verify;
window.CBH_SLOTS={outcome,getP,gate};   // exposed for the parity / flow tests
boot();
})();
