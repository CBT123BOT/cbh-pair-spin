/* MICKEL NICKEL SLOTS tab for THE VAULT (built Oct 18 2026).
   Results are decided ONLY by the slot watcher from ledger data (tx hash + validating ledger hash + ledger close time).
   This file never decides a real spin: live spins just animate until slots_results.json has that tx, then land on its reels.
   Demo mode (default while slots.json has paid_spins_enabled:false and free_spins_enabled:false) runs the SAME public rule
   on deterministic demo hashes, so it shows exactly how real spins are judged. No Math.random anywhere. */
(()=>{
const g=id=>document.getElementById(id), qs=new URLSearchParams(location.search);
const SYM=["goldx","copper","silver","gold","hat","polaroid","glasses","bro","ho"], COMBO={Copper:["copper","copper","copper"],Silver:["silver","silver","silver"],Gold:["gold","gold","gold"],pair:["polaroid","polaroid","glasses"],pair_nospins:["hat","hat","hat"]};
// landing combos (same as slots_core.py): Copper x3 / Silver x3 = Mickel Nickel; Gold x3 = GRAND Gold Mickel only;
// pair with Vault spins left = GRAND (polaroid, polaroid, glasses); pair with no spins left = SEMI-GRAND (hat x3)
const comboFor=p=>(p.type==='pair'?((+p.spins_left||0)>0?COMBO.pair:COMBO.pair_nospins):(COMBO[p.metal]||["goldx","goldx","goldx"])).slice(), PAIRK=COMBO.pair.slice().sort().join();
const winLook=r=>(r[0]===r[1]&&r[1]===r[2])||r.slice().sort().join()===PAIRK;
let CFG=null,PRZ={prizes:[]},RS={free_spins:{},events:[]},DEMO=true,busy=false,spins=0,demoN=0,mute=localStorage.getItem('sl_mute')==='1',myPairsN=null,AC=null;
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
// ---------- monthly free spins ----------
// snapshots: bonus Halloween Oct 31 2026, then 12:00 AM CT on the 1st of every month (same schedule as the watcher)
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
function freeLeft(){const a=wal(),f=a&&(RS.free_spins||{})[a];return f?Math.max(0,f.granted-f.used):0}
function drawMonth(){if(!CFG)return;const n=freeLeft(),ns=nextSnap(),per=CFG.free_spins_per_pairs||3;g('slmn').textContent=n;
 const held=myPairsN==null?'':` · you hold ${myPairsN} pair${myPairsN===1?'':'s'} (${myPairsN%per}/${per} to the next one)`;
 g('slms').textContent=`1 per ${per} matched pairs${held} · ${firstSnapDone()?'':'Bonus Halloween snapshot Oct 31, then 12:00 AM CT on the 1st of every month · '}next snapshot in ${dur(ns-Date.now())} (${new Date(ns).toLocaleDateString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric'})}, 12:00 AM CT)`}
async function countPairs(){const a=wal();if(!a){myPairsN=null;drawMonth();return}for(let k=0;k<40&&!VP;k++)await sleep(250);
 try{const have=new Set();for(const n of await nfts(a))if(n.Issuer===SELLER)have.add(hex2s(n.URI||''));let c=0;const P=VP||{pairs:{},d1:{}};
  for(const p of Object.values(P.pairs||{}))if((have.has(p.polaroid.uri_coin)||have.has(p.polaroid.uri_nocoin))&&(have.has(p.twin.uri_coin)||have.has(p.twin.uri_nocoin)))c++;
  for(const p of Object.values(P.d1||{}))if(have.has(p.polaroid_uri)&&have.has(p.twin_uri))c++;myPairsN=c}catch(e){myPairsN=null}drawMonth()}
// ---------- reels ----------
const src=s=>`img/slots/${s}.webp`;
function buildReels(show){g('slreels').innerHTML=show.map((s,i)=>`<div class="sl-win" id="slw${i}"><div class="sl-strip" id="sls${i}"><div class="sl-sym"><img src="${src(s)}" alt="${s}" draggable="false"></div></div></div>`).join('')}
function rh(){return g('slw0').getBoundingClientRect().height}
function beep(f,d,t=0,type='square',v=.05){if(mute)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.value=f;gn.gain.value=v;o.connect(gn);gn.connect(AC.destination);const s=AC.currentTime+t;o.start(s);gn.gain.exponentialRampToValueAtTime(.0001,s+d);o.stop(s+d+.02)}catch(e){}}
let loopT=null;
function startLoop(){let k=0;for(let i=0;i<3;i++){g('slw'+i).classList.remove('hit');g('sls'+i).style.transition='none';g('sls'+i).style.transform='translate3d(0,0,0)';g('sls'+i).style.filter='blur(2px)'}
 clearInterval(loopT);loopT=setInterval(()=>{k++;for(let i=0;i<3;i++){const im=g('sls'+i).querySelector('img');im.src=src(SYM[(k+i*3)%SYM.length])}if(k%3===0)beep(220+(k%9)*20,.03,0,'square',.015)},90)}
function land(final){clearInterval(loopT);const h=rh();return Promise.all(final.map((s,i)=>new Promise(res=>{const st=g('sls'+i),n=14+i*5;
 st.style.filter='';st.innerHTML=Array.from({length:n},(_,k)=>SYM[(k*4+i*2)%SYM.length]).concat([s]).map(x=>`<div class="sl-sym"><img src="${src(x)}" alt="${x}" draggable="false"></div>`).join('');
 st.style.transition='none';st.style.transform='translate3d(0,0,0)';st.offsetHeight;st.style.transition=`transform ${1.1+i*.45}s cubic-bezier(.15,.75,.25,1.04)`;st.style.transform=`translate3d(0,${-n*h}px,0)`;
 setTimeout(()=>{st.style.transition='none';st.innerHTML=`<div class="sl-sym"><img src="${src(s)}" alt="${s}" draggable="false"></div>`;st.style.transform='translate3d(0,0,0)';beep(140,.08,0,'triangle',.08);res()},(1.1+i*.45)*1000+40)})))}
function confetti(){const c=document.createElement('div');c.className='sl-conf';const col=['#ffc72c','#3dde78','#fff4e0','#ff3d9a'];
 for(let i=0;i<36;i++){const e=document.createElement('i');e.style.left=(i*37%100)+'%';e.style.background=col[i%4];e.style.setProperty('--dx',((i*53%120)-60)+'px');e.style.setProperty('--rot',(i*97%720)+'deg');e.style.animationDelay=(i%9)*.05+'s';c.appendChild(e)}
 g('slcab').appendChild(c);setTimeout(()=>c.remove(),2400)}
function banner(cls,html){const b=g('slban');b.className='sl-banner '+cls;b.innerHTML=html}
function showResult(o,demo){const P=o.prize||{};spins++;g('slspins').textContent=spins;
 if(o.win){for(let i=0;i<3;i++)g('slw'+i).classList.add('hit');confetti();[523,659,784,1047].forEach((f,i)=>beep(f,.18,i*.12,'triangle',.07));
  banner(o.jackpot?'jack':'win',(o.grand?'👑 GRAND PRIZE! ':o.semi_grand?'🎩 SEMI-GRAND! ':o.jackpot?'🏆 JACKPOT! ':'🎉 WINNER! ')+(demo?'Demo: would win ':'You won ')+(P.name||'a prize')+(demo?'':' · claim it below'))}
 else banner('lose','So close! Spin again.')}
// ---------- spin ----------
async function demoSpin(){busy=true;gate();if(!demoN&&+qs.get('demo_from')>1)demoN=Math.floor(+qs.get('demo_from'))-1;   // demo-only: start the demo sequence at #N (preview/testing)
 demoN++;startLoop();banner('','Spinning…');
 const tx=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('CBH-SLOT demo tx '+demoN))),x=>x.toString(16).padStart(2,'0')).join('');
 const lh=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('CBH-SLOT demo ledger '+demoN))),x=>x.toString(16).padStart(2,'0')).join('');
 let pool=PRZ.prizes.slice();if(!pool.some(p=>p.type==='pair'))pool.push({id:'demo-pair',type:'pair',tier:'jackpot',name:'Matched pair #0248 (demo example)',tickets:1});
 const o=await outcome(tx,lh,pool,DEMO_ODDS,+CFG.jackpot_one_in_wins||7);await sleep(500);await land(o.reels);showResult(o,true);
 g('slvr').textContent=`demo #${demoN} · tx ${tx.slice(0,12)}… · ledger ${lh.slice(0,12)}… → ${o.win?(o.jackpot?'JACKPOT ':'WIN ')+o.prize.name:'no win'} (demo)`;busy=false;gate()}
async function liveSpin(mode){if(!XM||!connected)return;busy=true;gate();const amt=mode==='FREE'?CFG.free_spin_drops:CFG.paid_spin_drops,t0=Date.now()/1000,me=wal();
 banner('',`Opening Xaman… check it says <b>MAINNET</b> and <b>${Number(amt)/1e6} XRP</b>, then sign.`);let txid=null;
 try{const r=await xamanSign({TransactionType:'Payment',Destination:SELLER,Amount:String(amt),Memos:[{Memo:{MemoType:s2hex(CFG.memo_type||'CBH-SLOT'),MemoData:s2hex(mode)}}]},mode==='FREE'?'MICKEL NICKEL SLOTS: free spin (0.1 XRP fee)':'MICKEL NICKEL SLOTS: 1 spin (0.4 + 0.1 fee)');txid=r&&r.txid}
 catch(e){banner('lose','Xaman: '+e.message);busy=false;gate();return}
 startLoop();banner('','Paid ✔ The ledger is deciding your spin…');
 for(let k=0;k<75;k++){await sleep(4000);try{RS=await fj('slots_results.json')}catch(e){continue}
  const ev=(RS.events||[]).slice().reverse().find(e=>txid?e.tx===txid:(e.wallet===me&&e.t>t0));
  if(ev){if(ev.action==='win'||ev.action==='lose'){await land(ev.reels);showResult({win:ev.action==='win',jackpot:ev.jackpot,grand:!!ev.grand,semi_grand:!!ev.semi_grand,prize:ev.prize},false);if(ev.action==='win'&&window.showClaims)showClaims()}
   else{clearInterval(loopT);banner('lose',`Not spun: ${ev.reason||ev.action}${ev.action==='refund'?' (refunded)':''}`)}busy=false;gate();drawMonth();return}}
 clearInterval(loopT);banner('lose','No result yet. Check the public log slots_results.json.');busy=false;gate()}
function gate(){if(!CFG)return;const s=g("slspin"),f=g("slfree"),c=!!XM&&connected;
 if(DEMO){s.disabled=busy;s.innerHTML='<span>DEMO SPIN</span><small>free · no real prizes</small>'}
 else if(!CFG.paid_spins_enabled&&!testOK){s.disabled=true;s.innerHTML='<span>SPIN</span><small>paid spins coming soon</small>'}
 else if(!CFG.paid_spins_enabled){s.disabled=busy||!c;s.innerHTML=`<span>SPIN</span><small>${c?'0.5 XRP · owner test':'connect Xaman'}</small>`}
 else{s.disabled=busy||!c;s.innerHTML=`<span>SPIN</span><small>${c?'0.5 XRP':'connect Xaman'}</small>`}
 if(!CFG.free_spins_enabled){f.disabled=true;f.innerHTML='<span>FREE SPIN</span><small>opens soon</small>'}
 else{const n=freeLeft();f.disabled=busy||!c||n<1;f.innerHTML=`<span>FREE SPIN</span><small>${n?n+' left · 0.1 XRP fee':(c?'none until the next snapshot':'connect Xaman')}</small>`}}
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
 g('slmode').textContent=DEMO?'Demo mode · no payments · no real prizes':'Live on XRPL mainnet';
 g('slleft').textContent=RS.prizes_left!=null?RS.prizes_left:PRZ.prizes.filter(p=>p.type==='coin').length;
 g('slrules').innerHTML=`<b>How it works</b><br>• Every spin can win. Odds vary from spin to spin and are set by the ledger, never by your phone.<br>• Three of a kind pays (or Polaroid + Polaroid + 3D glasses):<br>&nbsp;&nbsp;3 Copper = Copper Mickel Nickel<br>&nbsp;&nbsp;3 Silver = Silver Mickel Nickel<br>&nbsp;&nbsp;3 Hats = 🎩 SEMI-GRAND: Ruby #0108 pair<br>&nbsp;&nbsp;3 Gold = 👑 GRAND: Gold Mickel Nickel #5515<br>&nbsp;&nbsp;Polaroid + Polaroid + 3D glasses = 👑 GRAND: Patsy #0023 pair (2 Vault spins)<br>• Anything else is a miss.<br>• Paid spin: 0.4 XRP + 0.1 XRP fee = one 0.5 XRP payment. ${CFG.paid_spins_enabled?'':'<b>Paid spins are OFF for now.</b>'}<br>• Free spins: 1 for every 3 matched pairs in one wallet at each snapshot. Bonus Halloween snapshot Oct 31, then 12:00 AM CT on the 1st of every month. Until the first snapshot everyone has 0. Each still pays the 0.1 fee.<br>• Fair and checkable: the result comes from your payment's tx hash + the ledger hash that confirmed it. Nobody, not even us, can pick it. Pieces are NFTs.`;
 buildReels(['goldx','gold','polaroid']);gate();drawMonth();countPairs();
 setInterval(async()=>{const a=wal(),k=a+'|'+(typeof connected!=='undefined'&&connected);if(k!==lastW){lastW=k;await testCheck();countPairs();gate()}},1500);
 setInterval(drawMonth,1000);setInterval(async()=>{try{RS=await fj('slots_results.json');gate()}catch(e){}},30000)}
g('slspin').onclick=()=>{if(busy)return;DEMO?demoSpin():liveSpin('PAID')};g('slfree').onclick=()=>{if(!busy&&!DEMO)liveSpin('FREE')};
g('slmute').onclick=()=>{mute=!mute;localStorage.setItem('sl_mute',mute?'1':'0');g('slmute').textContent=mute?'🔇':'🔊';g('slmute').setAttribute('aria-pressed',mute)};g('slmute').textContent=mute?'🔇':'🔊';
g('slver').onclick=verify;g('w').addEventListener('change',countPairs);
// tabs
function tab(t){g('tab-vault').hidden=t!=='vault';g('tab-slots').hidden=t!=='slots';document.querySelectorAll('.tabs a').forEach(a=>a.classList.toggle('on',a.dataset.tab===t))}
document.querySelectorAll('.tabs a').forEach(a=>a.onclick=e=>{e.preventDefault();history.replaceState(null,'',location.search+'#'+a.dataset.tab);tab(a.dataset.tab)});
tab(location.hash==='#slots'?'slots':'vault');
window.CBH_SLOTS={outcome};   // exposed for the parity test
boot();
})();
