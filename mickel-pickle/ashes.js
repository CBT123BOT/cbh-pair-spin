/* Brawny Lumberjack (07) pants variant (Oct 22 8:05 PM): 'ripped jeans' | 'clean jeans' (no shorts), rolled by the watcher.
   Mickel Pickle shops + FROM THE ASHES machine -- MAINNET staging (Oct 22 2026). Never decides anything: the watcher validates, burns, rolls and mints.
   Reads ashes_public.json (issuers, prices) + ashes_results.json (stock, per-wallet counts, builds) published by ashes_watcher.py. */
const NET='MAINNET',WSS=['wss://xrplcluster.com','wss://s1.ripple.com','wss://s2.ripple.com'],isMobile=/iPhone|iPad|Android/i.test(navigator.userAgent);
const IMG={'01':'01_thriller_jacket','02':'02_cuban_cbt_chain','03':'03_leprechaun_pants_boots','04':'04_gold_grill','06':'06_diamond_hands','07':'07_lumberjack_outfit','08':'08_laser_eyes','09':'09_blunt','10':'10_joint'};
const g=id=>document.getElementById(id),s2hex=s=>Array.from(new TextEncoder().encode(s)).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase(),
 hex2s=h=>{try{return new TextDecoder().decode(new Uint8Array(h.match(/../g).map(x=>parseInt(x,16))))}catch(e){return''}},valid=a=>/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a||'');
let C=null,R=null,XM=null,ws=null,wi=0,rid=1,mine={bases:[],atts:[],poses:[],vouchers:[]},pick={base:null,att:[],pose:null},useV=false,CR=null,myCoins=[],cmSel=new Set(),busy=false,mute=localStorage.getItem('mp_mute')==='1',AC=null;
async function fj(u){const r=await fetch(u+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(u);return r.json()}
function conn(){return new Promise((res,rej)=>{if(ws&&ws.readyState===1)return res(ws);const s=new WebSocket(WSS[wi++%WSS.length]);s.P={};s.onopen=()=>{ws=s;res(s)};s.onerror=()=>rej(new Error('ws'));
 s.onmessage=e=>{const m=JSON.parse(e.data);if(s.P[m.id]){s.P[m.id](m);delete s.P[m.id]}}})}
async function rq(o){for(let k=0;k<4;k++){try{const s=await conn();return await new Promise(r=>{const id=rid++;s.P[id]=r;s.send(JSON.stringify({...o,id}));setTimeout(()=>{if(s.P[id]){delete s.P[id];r({error:'timeout'})}},9000)})}catch(e){ws=null}}throw new Error('ledger')}
async function wh(a){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(a));return 'h:'+Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,16)}
// sound (same idea as slots: unlock on every tap, on/off toggle remembered)
function AX(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state!=='running')AC.resume()}catch(e){}return AC}
document.addEventListener('pointerdown',()=>{if(!mute){try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}AX()}},{passive:true});
// SOUND ENGINE v2: layered Web Audio synth -> master gain -> compressor (loud, no clipping). No audio files needed.
let MB=null;function bus(){const a=AX();if(!a)return null;if(!MB){const c=a.createDynamicsCompressor();c.threshold.value=-14;c.knee.value=8;c.ratio.value=6;c.attack.value=.003;c.release.value=.2;const m=a.createGain();m.gain.value=1.6;m.connect(c);c.connect(a.destination);MB=m}return MB}
function ok(){if(mute)return null;const a=AX();if(!a||a.state!=='running')return null;return a}
function osc(f,d,t=0,type='sine',v=.3,o={}){const a=ok();if(!a)return;const s=a.currentTime+t,x=a.createOscillator(),n=a.createGain();x.type=type;x.frequency.setValueAtTime(f,s);if(o.to)x.frequency.exponentialRampToValueAtTime(o.to,s+(o.gl||d));if(o.det)x.detune.value=o.det;const at=o.at||.005;n.gain.setValueAtTime(1e-4,s);n.gain.linearRampToValueAtTime(v,s+at);n.gain.exponentialRampToValueAtTime(1e-4,s+d);let out=n;if(o.lp){const fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=o.lp;n.connect(fl);out=fl}x.connect(n);out.connect(bus());x.start(s);x.stop(s+d+.05)}
let NB=null;function noise(d,t=0,v=.3,type='bandpass',f=1000,q=1,o={}){const a=ok();if(!a)return;if(!NB){NB=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const c=NB.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=Math.random()*2-1}const s=a.currentTime+t,src=a.createBufferSource(),fl=a.createBiquadFilter(),n=a.createGain();src.buffer=NB;src.loop=true;fl.type=type;fl.frequency.setValueAtTime(f,s);if(o.to)fl.frequency.exponentialRampToValueAtTime(o.to,s+d);fl.Q.value=q;const at=o.at||.003;n.gain.setValueAtTime(1e-4,s);n.gain.linearRampToValueAtTime(v,s+at);n.gain.exponentialRampToValueAtTime(1e-4,s+d);src.connect(fl);fl.connect(n);n.connect(bus());src.start(s,Math.random());src.stop(s+d+.05)}
// legacy helper now routed through the loud bus
function tone(f,d,t=0,type='sine',v=.06){osc(f,d,t,type,Math.min(.5,v*4))}
const SFX={
 click(){osc(1800,.04,0,'square',.12,{to:900,lp:4000});osc(240,.07,0,'sine',.45,{to:120});noise(.03,0,.25,'highpass',3000)},
 clink(){const f=2400+Math.random()*900;[1,2.76,5.4].forEach((m,i)=>osc(f*m/2,.35-i*.08,0,'sine',.22/(i+1)));noise(.02,0,.3,'highpass',5000);osc(f*.7,.25,.06,'sine',.1)},
 rumble(){noise(1.6,0,.32,'lowpass',260,1,{at:.3});osc(55,1.6,0,'sawtooth',.18,{lp:180,at:.3});osc(82,1.4,.1,'triangle',.15,{at:.3})},
 whir(){noise(.9,0,.22,'bandpass',900,3,{to:1600,at:.05});osc(120,.9,0,'square',.08,{to:180,lp:600})},
 kaching(){osc(150,.12,0,'square',.3,{to:60,lp:900});noise(.08,0,.45,'bandpass',2500,2);[2093,2637,3136,4186].forEach((f,i)=>{osc(f,.9,.12,'sine',.28);osc(f*2.01,.5,.12,'sine',.08)});noise(.6,.12,.15,'highpass',7000)},
 whoosh(){noise(1.4,0,.55,'bandpass',200,.8,{to:1400,at:.35});osc(60,1.5,0,'sawtooth',.25,{to:90,lp:220,at:.3})},
 pop(){osc(600,.12,0,'sine',.7,{to:90,gl:.1});noise(.06,0,.7,'bandpass',1800,1.5);osc(1200,.18,.05,'triangle',.25,{to:2400})},
 fanfare(){const N=[[523,0,.18],[659,.14,.18],[784,.28,.18],[1047,.44,.9]];N.forEach(([f,t,d])=>{osc(f,d,t,'sawtooth',.16,{lp:2600,det:-8});osc(f,d,t,'sawtooth',.16,{lp:2600,det:8});osc(f/2,d,t,'triangle',.22)});[523,659,784].forEach(f=>osc(f,1.1,.44,'triangle',.12));noise(.5,.44,.3,'highpass',6000);osc(80,.4,.44,'sine',.6,{to:45})},
 shimmer(){for(let i=0;i<14;i++)osc(1568*Math.pow(2,(i%7)/7),.6,.6+i*.06,'sine',.16);noise(1.4,.6,.2,'highpass',8000,1,{at:.2})}
};
const rumble=()=>SFX.rumble(),chime=()=>SFX.kaching();
const paintMute=()=>{g('mute').textContent=mute?'🔇 Off':'🔊 On'};g('mute').onclick=()=>{mute=!mute;localStorage.setItem('mp_mute',mute?'1':'0');paintMute();if(!mute)setTimeout(()=>SFX.click(),30)};paintMute();
// tabs
document.querySelectorAll('.tabs a').forEach(a=>a.onclick=e=>{e.preventDefault();show(a.dataset.t)});
function show(t){if(!['ashes','coin'].includes(t))t='ashes';document.querySelectorAll('.tabs a').forEach(x=>x.classList.toggle('on',x.dataset.t===t));['shop','att','vogue','ashes','coin'].forEach(x=>g('t-'+x).hidden=x!==t);history.replaceState(null,'','#'+t)}
// Xaman
async function sign(txjson,instruction){if(!XM)throw new Error('Connect Xaman first');
 const sub=await XM.payload.createAndSubscribe({txjson,options:{force_network:NET,return_url:{app:location.href,web:location.href}},custom_meta:{instruction}},e=>{if('signed' in e.data)return e.data});
 if(isMobile)location.href=sub.created.next.always;else{g('qri').src=sub.created.refs.qr_png;g('qr').hidden=false}
 const r=await sub.resolved;g('qr').hidden=true;if(!r||!r.signed)throw new Error('Cancelled in Xaman, nothing sent.');return r}
const W=()=>g('w').value.trim();
async function counts(){const h=valid(W())?await wh(W()):'';const b=(R&&R.shop&&R.shop.bought[h])||{base:0,attachment:0,pose:0};b.pose=b.pose||0;return {b,builds:(R&&R.wallet_builds[h])||0}}
// SHOWCASES (Rusty 7:58 PM CT Oct 22): parts are minted + sold on xrp.cafe, no on-site checkout or mint caps
const CAFE='https://xrp.cafe/collection/mickel-pickle-armory-attachments', CAFE_POSE='https://xrp.cafe/collection/mickel-pickle-vogue-out-poses';
function paintShops(){if(!C)return;
 g('attGrid').innerHTML=Object.entries(C.attachments).map(([id,n])=>`<div class="it"><img src="img/${IMG[id]}.jpg" alt=""><div>${n}${id==='07'?'<br><small>ripped or clean jeans (random)</small>':''}</div><span class="left">1.11 XRP</span><a class="cafe" href="${CAFE}" target="_blank" rel="noopener">xrp.cafe ↗</a></div>`).join('');
 g('poseGrid').innerHTML=Object.entries(C.poses||{}).map(([id,n])=>`<div class="it"><img src="img/pose_${id}.jpg" alt=""><div>${n}</div><span class="left">111 · 1.11 XRP</span><a class="cafe" href="${CAFE_POSE}" target="_blank" rel="noopener">xrp.cafe ↗</a></div>`).join('')}
// claims: 0-XRP sell offers from our issuer to THIS wallet (parts + finished pickles)
let CLAIMING=false;async function paintClaims(){if(!valid(W())||!C||CLAIMING)return;const seen=new Map();for(const iss of [...new Set([C.pickle_issuer,CR&&CR.coin_issuer].filter(Boolean))]){try{let mk;do{const q={command:'account_objects',account:iss,type:'nft_offer',limit:400};if(mk)q.marker=mk;const r=await rq(q);(r.result.account_objects||[]).forEach(o=>{if(o.Destination===W()&&o.Amount==='0'&&!seen.has(o.index))seen.set(o.index,o)});mk=r.result.marker}while(mk)}catch(e){}}
 const DONE=JSON.parse(sessionStorage.getItem('cbhClaimed')||'[]');const L=[...seen.values()].filter(o=>!DONE.includes(o.index));
 const VT=(CR&&CR.voucher_taxon)||5,CT=(CR&&CR.coin_taxon)||3;const COIN=L.filter(o=>{const t=ntTaxon(o.NFTokenID);return t===VT||t===CT}),VEND=L.filter(o=>!COIN.includes(o));
 VOFF=COIN.filter(o=>ntTaxon(o.NFTokenID)===VT).length;paintVCount();
 const mark=ids=>{const d=JSON.parse(sessionStorage.getItem('cbhClaimed')||'[]').concat(ids);sessionStorage.setItem('cbhClaimed',JSON.stringify([...new Set(d)]));ids.forEach(i=>document.querySelectorAll(`[data-o="${i}"]`).forEach(a=>a.remove()));document.querySelectorAll('.claimall').forEach(a=>a.remove())};
 const lbl=(o,coin)=>coin?(ntTaxon(o.NFTokenID)===VT?'💵 Claim your voucher (0 XRP)':'🪙 Claim your coin back (0 XRP)'):'🎁 CLAIM your pickle (0 XRP)';
 const html=(list,coin)=>(list.length>1?`<a href="#" class="claimall" data-ids="${list.map(o=>o.index).join(',')}">🎁🎁 CLAIM ALL ${list.length} (0 XRP, ${Math.ceil(list.length/8)} signature${list.length>8?'s':''})</a>`:'')+list.map(o=>`<a href="#" data-o="${o.index}">${lbl(o,coin)}</a>`).join('');
 if(g('cmClaims'))g('cmClaims').innerHTML=html(COIN,true);const vh=html(VEND,false);if(g('vmClaims'))g('vmClaims').innerHTML=vh;if(g('claims'))g('claims').innerHTML='';
 const after=()=>{CLAIMING=false;setTimeout(refresh,4000)};
 document.querySelectorAll('#cmClaims a[data-o],#vmClaims a[data-o]').forEach(x=>x.onclick=async e=>{e.preventDefault();if(CLAIMING)return;CLAIMING=true;try{await sign({TransactionType:'NFTokenAcceptOffer',NFTokenSellOffer:x.dataset.o},'Claim (0 XRP)');mark([x.dataset.o])}catch(er){}after()});
 document.querySelectorAll('.claimall').forEach(x=>x.onclick=async e=>{e.preventDefault();if(CLAIMING)return;CLAIMING=true;const ids=[...new Set(x.dataset.ids.split(','))],G=[];for(let i=0;i<ids.length;i+=8)G.push(ids.slice(i,i+8));
  try{for(let i=0;i<G.length;i++){const ai=await rq({command:'account_info',account:W(),ledger_index:'current'});const sq=ai.result.account_data.Sequence;
   const raw=G[i].map((o,k)=>({RawTransaction:{TransactionType:'NFTokenAcceptOffer',Account:W(),NFTokenSellOffer:o,Flags:1073741824,Sequence:sq+1+k,Fee:'0',SigningPubKey:''}}));
   x.textContent=`Signature ${i+1} of ${G.length}: claiming ${G[i].length} in Xaman…`;
   await sign({TransactionType:'Batch',Flags:524288,Sequence:sq,Fee:String((raw.length+2)*20),RawTransactions:raw},`CLAIM ALL (0 XRP): signature ${i+1}/${G.length}, claim ${G[i].length} in one signature`);mark(G[i]);
   if(i<G.length-1)await new Promise(r=>setTimeout(r,5000))}}catch(er){}after()})}
// MACHINE
async function loadMine(){mine={bases:[],atts:[],poses:[],vouchers:[]};myCoins=[];if(!valid(W())||!C)return;const ISS=new Set([C.pickle_issuer,CR&&CR.coin_issuer].filter(Boolean)),CT=(CR&&CR.coin_taxon!=null)?CR.coin_taxon:3;let all=[],marker,lg;for(let pg=0;pg<100;pg++){const q={command:'account_nfts',account:W(),limit:400};if(marker){q.marker=marker;q.ledger_index=lg}else q.ledger_index='validated';const x=await rq(q);if(x&&x.error==='actNotFound')break;if(!x||x.error||!x.result)throw new Error('account_nfts');const r=x.result;lg=r.ledger_index||lg;for(const n of r.account_nfts||[])if(ISS.has(n.Issuer))all.push(n);marker=r.marker;if(!marker)break}
 for(const n of all){if(CR&&n.Issuer===CR.coin_issuer&&n.NFTokenTaxon===CT){let m={};const u=hex2s(n.URI||''),mm=u.match(/\/(\d+)\.json$/);if(mm&&MNM)m.metal={C:'Copper',S:'Silver',G:'Gold'}[MNM[+mm[1]-1]];if(CR.values[m.metal])myCoins.push({id:n.NFTokenID,metal:m.metal,v:CR.values[m.metal]});continue}if(n.Issuer!==C.pickle_issuer||!Object.values(C.taxon).includes(n.NFTokenTaxon))continue;if(n.NFTokenTaxon===C.taxon.voucher){mine.vouchers.push({id:n.NFTokenID});continue}let m={};try{m=JSON.parse(hex2s(n.URI||'').replace(/^data:application\/json,/,''))}catch(e){}{const f=hex2s(n.URI||'').match(/\/(b|a|o)_([a-z0-9]+)_\d+\.json$/);if(f)m[f[1]]=f[2]}
  if(n.NFTokenTaxon===C.taxon.base)mine.bases.push({id:n.NFTokenID});else if(n.NFTokenTaxon===C.taxon.attachment&&IMG[m.a])mine.atts.push({id:n.NFTokenID,a:m.a});else if(n.NFTokenTaxon===C.taxon.pose&&m.o)mine.poses.push({id:n.NFTokenID,o:m.o})}}
function paintMachine(){const bb=g('myBases'),aa=g('myAtts');pick.base=mine.bases.some(x=>x.id===pick.base)?pick.base:null;pick.att=pick.att.filter(i=>mine.atts.some(x=>x.id===i));
 bb.innerHTML=mine.bases.length?mine.bases.map(x=>`<div class="it ${pick.base===x.id?'sel':''}" data-id="${x.id}"><img src="img/base_standing_logo.jpg" alt=""><div>Base …${x.id.slice(-4)}</div></div>`).join(''):'<p class="note">No base pickles yet. Grab one on xrp.cafe.</p>';
 // one tile per attachment type (spares = quantity); a pick holds the NFT id of the first copy of that type
 const groups={};mine.atts.forEach(x=>(groups[x.a]=groups[x.a]||[]).push(x.id));const picked=a=>pick.att.find(i=>groups[a].includes(i));
 aa.innerHTML=Object.keys(groups).length?Object.keys(C.attachments).filter(a=>groups[a]).map(a=>{const s=!!picked(a),off=!s&&pick.att.length>=3;return `<div class="it ${s?'sel':''} ${off?'off':''}" data-a="${a}">${groups[a].length>1?`<span class="qty">x${groups[a].length}</span>`:''}<img src="img/${IMG[a]}.jpg" alt=""><div>${C.attachments[a]}</div></div>`}).join(''):'<p class="note">No attachments yet. Grab some on xrp.cafe.</p>';
 bb.querySelectorAll('.it').forEach(e=>e.onclick=()=>{pick.base=pick.base===e.dataset.id?null:e.dataset.id;SFX.click();paintMachine()});
 aa.querySelectorAll('.it').forEach(e=>e.onclick=()=>{const a=e.dataset.a,cur=picked(a);if(cur)pick.att=pick.att.filter(i=>i!==cur);else if(pick.att.length<3)pick.att.push(groups[a][0]);SFX.click();paintMachine()});
 const pp=g('myPoses');pick.pose=mine.poses.some(x=>x.id===pick.pose)?pick.pose:null;
 pp.innerHTML=mine.poses.length?mine.poses.map(x=>`<div class="it ${pick.pose===x.id?'sel':''}" data-id="${x.id}"><img src="img/pose_${x.o}.jpg" alt=""><div>${(C.poses||{})[x.o]||x.o}</div></div>`).join(''):'<p class="note">No poses yet. Grab one on xrp.cafe.</p>';
 pp.querySelectorAll('.it').forEach(e=>e.onclick=()=>{pick.pose=pick.pose===e.dataset.id?null:e.dataset.id;SFX.click();paintMachine()});
 useV=mine.vouchers.length>0;g('vmPay').innerHTML=mine.vouchers.length?`VOUCHER SLOT<br>💵 ${mine.vouchers.length} voucher${mine.vouchers.length>1?'s':''} ready`:'VOUCHER SLOT<br>no voucher yet';
 g('nAtt').textContent=pick.att.length+'/3';gate()}
async function gate(){const {builds}=await counts(),lim=R?R.max_builds_per_wallet:3;g('myBuilds').textContent=`your builds: ${builds}/${lim}`;const b=g('build');
 if(builds>=lim){b.disabled=true;b.textContent='LIMIT: 3 BUILDS PER WALLET';return}b.textContent='BURN & BUILD';b.disabled=busy||!mine.vouchers.length||!pick.base||pick.att.length!==3||!pick.pose}
g('build').onclick=async()=>{const {builds}=await counts();if(builds>=R.max_builds_per_wallet)return;busy=true;gate();const bid='MP'+Date.now().toString(36).toUpperCase();
 g('status').textContent='Opening Xaman… check it says MAINNET and uses your voucher, then sign.';
 const V=mine.vouchers[0]?mine.vouchers[0].id:null;if(!V){g('status').textContent='Insert a voucher first. Get your voucher at the Coin Machine.';busy=false;gate();return}
 try{const ai=await rq({command:'account_info',account:W(),ledger_index:'current'});const sq=ai.result.account_data.Sequence;g('status').textContent='Opening Xaman: ONE signature hands over your voucher + sends your 5 picks…';const r=await sign({TransactionType:'Batch',Flags:65536,Sequence:sq,Fee:'80',RawTransactions:[{RawTransaction:{TransactionType:'NFTokenCreateOffer',Account:W(),NFTokenID:V,Amount:'0',Flags:1073741825,Destination:C.machine,Sequence:sq+1,Fee:'0',SigningPubKey:''}},{RawTransaction:{TransactionType:'Payment',Account:W(),Destination:C.machine,Amount:String(C.machine_fee_drops||100000),Flags:1073741824,Sequence:sq+2,Fee:'0',SigningPubKey:'',Memos:[{Memo:{MemoType:s2hex('CBH-ASHES'),MemoData:s2hex(JSON.stringify({b:bid,m:'one',base:pick.base,att:pick.att,pose:pick.pose,voucher:V}))}}]}}]},'VENDING MACHINE: one signature. Your voucher is collected (not burned) + your 5 parts are burned to build your Mickel Pickle.');
  localStorage.setItem('mp_pending',JSON.stringify({bid,tx:r.txid,t:Date.now()}));rise(bid)}catch(e){g('status').textContent=e.message;busy=false;gate()}};
let rising=false;async function rise(bid){if(rising)return;rising=true;g('vmTray').classList.remove('reveal');g('vmBanner').hidden=true;g('can').hidden=false;g('result').hidden=true;g('can').classList.add('shake');rumble();const rt=setInterval(rumble,1900);
 g('status').innerHTML='🔥 Rising from the ashes… your pickle is being built';
 for(let k=0;k<720;k++){await new Promise(r=>setTimeout(r,5000));try{R=await fj('ashes_results.json')}catch(e){continue}const b=R.builds.find(x=>x.id===bid||x.id.startsWith(bid+'-'));
  if(b&&b.status==='refunded'){g('status').textContent='Build refunded ('+(b.reason||'')+'). Your voucher and parts were handed back.';break}
  if(b&&b.status==='done'){await finale(b);g('status').innerHTML=`Reborn! Pose: ${b.pose.replace(/pose\d_/,'').replace(/_/g,' ')}${b.pants_variant?' · Jeans: '+b.pants_variant:''}${b.glow?' · <b>⚡ SUPER SAIYAN GOLD GLOW</b>':''}<br>Tap CLAIM below to take it.`;break}}
 clearInterval(rt);g('can').classList.remove('shake');localStorage.removeItem('mp_pending');rising=false;busy=false;refresh()}
// FINAL SEQUENCE (approved Oct 22): the machine drops the final can -> it pops open to the flexing poster -> the finished pickle
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function finale(b){const can=g('can'),im=g('result');can.classList.remove('shake');can.hidden=true;im.hidden=true;
 const show1=(src,cls)=>{im.className='';im.src=src;im.hidden=false;void im.offsetWidth;im.className=cls};
 show1('img/final_can.jpg','drop');tone(180,.25,0,'square',.05);tone(120,.3,.35,'square',.05);await wait(1700);
 show1('img/reveal_poster.jpg','burst');[392,523,659].forEach((f,i)=>tone(f,.25,i*.08,'triangle',.07));await wait(2200);
 show1(b.image+'?t=1','pop');g('vmTray').classList.add('reveal');const bn=g('vmBanner');bn.hidden=false;bn.classList.remove('vpop');void bn.offsetWidth;bn.classList.add('vpop');[523,659,784,1047,1319].forEach((f,i)=>tone(f,.3,i*.1,'triangle',.07));setTimeout(()=>g('vmTray').scrollIntoView({behavior:'smooth',block:'start'}),300)}
const MOCK=false;   // mainnet: screenshot mock disabled   // STAGING screenshot hook only: fake parts in the slots
// COIN MACHINE (MAINNET backend coin_watcher.py): pick coins worth exactly 50,000 -> 1 offer per coin to the machine + 1 trigger payment
const fmt=n=>n.toLocaleString('en-US'),CLS={Copper:'cu',Silver:'ag',Gold:'au'},LBL={Copper:'1K',Silver:'10K',Gold:'100K'};
function paintCoin(){paintVCount();if(MOCK||!CR)return;const el=g('cmCoins');const tot=myCoins.filter(c=>cmSel.has(c.id)).reduce((a,c)=>a+c.v,0);
 if(valid(W())){el.dataset.demo='0';el.innerHTML=myCoins.length?myCoins.map(c=>`<i class="c ${CLS[c.metal]} mine ${cmSel.has(c.id)?'sel':''}" data-id="${c.id}">${LBL[c.metal]}</i>`).join(''):'<p class="note">No Mickel Nickel coins in this wallet.</p>';
  el.querySelectorAll('.mine').forEach(e=>e.onclick=()=>{cmSel.has(e.dataset.id)?cmSel.delete(e.dataset.id):cmSel.add(e.dataset.id);SFX.click();paintCoin()});
  g('cmCount').textContent=fmt(tot);g('cmCount').nextElementSibling.textContent=cmSel.size+' coin'+(cmSel.size===1?'':'s');document.querySelector('.cm-bar i').style.width=Math.min(100,tot/500)+'%';document.querySelector('.cm-bar i').style.animation='none'}
 wh(W()).then(h=>{const n=(CR.wallet_vouchers||{})[h]||0;g('cmMine').textContent=`your vouchers: ${n}/${CR.cap_per_wallet} · ${CR.player_supply-CR.player_minted} of ${CR.player_supply} left`;
  const TX0=TESTERS.includes(W()),left=CR.player_supply-CR.player_minted;cmLock(left<=0?'supply':(!TX0&&n>=CR.cap_per_wallet)?'wallet':null,n);const b=g('cmInsert');const kv=tot%CR.voucher_value===0?tot/CR.voucher_value:0,TX=false,room=TX?99:CR.cap_per_wallet-n;b.disabled=busy||!valid(W())||!kv||kv>room||!!CMLOCK;const sg=Math.ceil(cmSel.size/7);b.textContent=(!TX&&n>=CR.cap_per_wallet)?'LIMIT: 3 VOUCHERS':(tot&&!kv)?'MUST BE 50K, 100K or 150K':kv>room?`ONLY ${room} VOUCHER${room>1?'S':''} LEFT FOR YOU`:'INSERT '+fmt(tot)+(kv?` = ${kv} VOUCHER${kv>1?'S':''}`:'')+(sg?` · ${sg} signature${sg>1?'s':''}`:'');const si=g('cmSigs');if(si)si.textContent=cmSel.size?`${cmSel.size} coin${cmSel.size>1?'s':''} = ${sg} signature${sg>1?'s':''} in Xaman (7 coins per signature)`:'5 Silver = 1 voucher (1 signature) · 1 Gold = 2 vouchers (1 signature) · 50 Copper = 1 voucher (8 signatures)'})}
// FIX Oct 23 PM: on a phone, opening Xaman leaves this page, so a JS loop never reached signature 2. The plan is saved; the page resumes it when you come back.
const PK='cbhCoinPending';const getP=()=>{try{const p=JSON.parse(localStorage.getItem(PK)||'null');return p&&p.w===W()&&Date.now()-p.t<45*60e3?p:null}catch(e){return null}};
async function runCoin(P){busy=true;paintCoin();
 try{for(let i=P.done;i<P.G.length;i++){g('cmStatus').textContent=`Signature ${i+1} of ${P.G.length}: ${P.G[i].length} coin${P.G[i].length>1?'s':''} into the hopper. Sign all ${P.G.length} or nothing is taken.`;
   const q0=(await rq({command:'account_info',account:W(),ledger_index:'current'})).result.account_data.Sequence;const sq=Math.max(q0,P.nsq||0);
   const raw=P.G[i].map((c,k)=>({RawTransaction:{TransactionType:'NFTokenCreateOffer',Account:W(),NFTokenID:c,Amount:'0',Flags:1073741825,Destination:CR.machine,Expiration:P.exp,Sequence:sq+1+k,Fee:'0',SigningPubKey:''}}));
   raw.push({RawTransaction:{TransactionType:'Payment',Account:W(),Destination:CR.machine,Amount:i===0?String(CR.machine_fee_drops||100000):'1',Flags:1073741824,Sequence:sq+1+P.G[i].length,Fee:'0',SigningPubKey:'',Memos:[{Memo:{MemoType:s2hex('CBH-COIN'),MemoData:s2hex(JSON.stringify({v:P.vid,i:i+1,of:P.G.length,n:P.n,k:P.G[i].length}))}}]}});
   P.cur=i;P.t=Date.now();localStorage.setItem(PK,JSON.stringify(P));
   await sign({TransactionType:'Batch',Flags:65536,Sequence:sq,Fee:String((raw.length+2)*20),RawTransactions:raw},`COIN MACHINE: signature ${i+1}/${P.G.length}, ${P.G[i].length} coins into the hopper`);
   P.done=i+1;P.nsq=sq+raw.length+1;localStorage.setItem(PK,JSON.stringify(P))}
  localStorage.removeItem(PK);savePR(P.vid);await pollResult(P.vid);
 }catch(e){g('cmStatus').textContent=e.message+(getP()?' Tap CONTINUE to try again.':'')}cmSel.clear();busy=false;refresh();showResume()}
function refundMsg(r){r=String(r||'');if(/WALLET_CAP/i.test(r))return "you've hit the 3-voucher limit for this wallet";if(/FEE_UNDERPAID/i.test(r))return 'the 0.1 XRP machine fee was short';if(/SOLD_OUT|SUPPLY|TOTAL_CAP/i.test(r))return 'the machine is sold out';if(/NOT_MULT|EXACT|AMOUNT|VALUE/i.test(r))return 'coins must add up to exactly 50,000 per voucher';return r?r.replace(/_/g,' ').toLowerCase():'the machine could not take them'}
function cmRefund(r){cmWork(false);const s=document.querySelector('.cm-billslot');if(s){s.classList.remove('printing');s.querySelectorAll('.cm-out').forEach(x=>x.remove())}g('cmStatus').innerHTML=`<div class="cm-refund"><div class="big">↩️ Coins refunded</div><div>${refundMsg(r)}.</div><div class="small">No voucher was printed. Your coins and fee were sent back.</div></div>`}
let CMLOCK=null;function cmLock(k,n){CMLOCK=k;const m=document.querySelector('.cm');if(!m)return;m.classList.toggle('cm-locked',!!k);let o=m.querySelector('.cm-soldout');if(!k){if(o)o.remove();return}
 cmSel.clear();if(!o){o=document.createElement('div');o.className='cm-soldout';m.querySelector('.cm-body').appendChild(o)}
 o.innerHTML=k==='supply'?'<b class="neon">SOLD<br>OUT</b><span>All vouchers are gone</span>':`<b class="neon">SOLD<br>OUT</b><span>You've collected ${Math.min(n,3)} of 3 vouchers</span>`;
 const b=g('cmInsert');if(b){b.disabled=true;b.textContent='SOLD OUT'}}
const PRK='cbhCoinPendingResult';function savePR(vid){localStorage.setItem(PRK,JSON.stringify({vid,w:W(),t:Date.now()}))}
function getPR(){try{const p=JSON.parse(localStorage.getItem(PRK)||'null');if(!p||p.w!==W()||Date.now()-p.t>15*60e3)return null;return p}catch(e){return null}}
let polling=null;async function pollResult(vid){if(!vid||polling===vid)return;polling=vid;g('cmStatus').innerHTML='<span class="cm-wait">⏳ The machine is counting your coins… your voucher prints in about a minute.</span>';cmWork(true);
 try{const V0=VOFF;for(let k=0;k<180;k++){await new Promise(r=>setTimeout(r,4000));try{await paintClaims()}catch(e){}if(VOFF>V0){const c=g('cmClaims');cmWork(false);await printBills(VOFF-V0);g('cmStatus').innerHTML='<div class="voucher-success"><div class="big">💵 VOUCHER PRINTED!</div><div class="small">Tap 💵 Claim your voucher below (0 XRP), then head to the Vending Machine.</div></div>';localStorage.removeItem(PRK);if(c)c.scrollIntoView({behavior:'smooth',block:'center'});break}try{CR=await fj('coin_results.json')}catch(e){continue}const q=(CR.requests||[]).find(x=>x.id===vid);
  if(q&&q.status==='refunded'){cmRefund(q.reason);localStorage.removeItem(PRK);break}
  if(q&&q.status==='done'){const n=q.vouchers||q.n_vouchers||1;cmWork(false);await printBills(n);g('cmStatus').innerHTML=`<div class="voucher-success"><div class="big">💵 VOUCHER PRINTED!</div><div>${n>1?n+' vouchers':'Your voucher is'} ready</div><div class="small">Tap 🎁 CLAIM below (0 XRP), then head to the Vending Machine.</div></div>`;localStorage.removeItem(PRK);await refresh();const c=g('cmClaims');if(c)c.scrollIntoView({behavior:'smooth',block:'center'});break}}}finally{polling=null;cmWork(false)}}
window.addEventListener('pageshow',()=>{const p=getPR();if(p)pollResult(p.vid)});setTimeout(()=>{const p=getPR();if(p)pollResult(p.vid)},1500);
function showResume(){const P=getP(),b=g('cmResume');if(!b)return;b.hidden=!P||busy;if(P)b.textContent=`▶ CONTINUE: sign ${P.done+1} of ${P.G.length} (your coins are waiting in the hopper)`}
g('cmInsert').onclick=()=>{if(CMLOCK){paintCoin();return}const ids=[...cmSel];const G=[];for(let i=0;i<ids.length;i+=7)G.push(ids.slice(i,i+7));
 runCoin({w:W(),vid:'CM'+Date.now().toString(36).toUpperCase(),G,n:ids.length,exp:Math.floor(Date.now()/1000)-946684800+3600,done:0,nsq:0,t:Date.now()})};
(()=>{const b=document.createElement('button');b.id='cmResume';b.className=g('cmInsert').className;b.hidden=true;b.style.marginTop='8px';g('cmInsert').after(b);
 b.onclick=async()=>{const P=getP();if(!P)return showResume();
  // did the last signature actually land? then skip it
  try{const r=await rq({command:'account_tx',account:W(),limit:30});if((r.result.transactions||[]).some(x=>{const t=x.tx_json||x.tx||{};return t.TransactionType==='Payment'&&(t.Memos||[]).some(m=>{try{const d=JSON.parse(decodeURIComponent(escape(m.Memo.MemoData.match(/../g).map(h=>String.fromCharCode(parseInt(h,16))).join(''))));return d.v===P.vid&&d.i===P.cur+1}catch(e){return false}})})){P.done=Math.max(P.done,P.cur+1)}}catch(e){}
  if(P.done>=P.G.length){localStorage.removeItem(PK);savePR(P.vid);showResume();pollResult(P.vid);return}runCoin(P)}})();
let TESTERS=[],MNM=null;async function refresh(){if(!MNM)try{MNM=(await (await fetch('mn_metals.txt')).text()).trim()}catch(e){}try{CR=await fj('coin_results.json')}catch(e){}try{R=await fj('ashes_results.json')}catch(e){}paintShops();if(MOCK){mine={vouchers:[{id:'MOCKVOUCHER1'}],bases:[{id:'MOCKBASE0001'},{id:'MOCKBASE0002'}],atts:['02','06','08','01','09'].map((a,i)=>({id:'MOCKATT000'+i,a})),poses:['p1','p2','p3'].map((o,i)=>({id:'MOCKPOSE000'+i,o}))};if(!pick.base){pick.base='MOCKBASE0001';pick.att=['MOCKATT0000','MOCKATT0001','MOCKATT0002'];pick.pose='MOCKPOSE0002'}}else{try{await loadMine()}catch(e){}}paintMachine();paintClaims();paintCoin();showResume()}
g('w').onchange=refresh;
(async()=>{C=await fj('ashes_public.json');const q=new URLSearchParams(location.search).get('wallet');if(valid(q))g('w').value=q;show((location.hash||'#ashes').slice(1)||'ashes');await refresh();
 const DEV=new URLSearchParams(location.search).get('finale');   // STAGING ONLY dev hook: ?finale=<build id> replays the final sequence for a finished build
 if(DEV&&/localhost|127\.0\.0\.1|^file/.test(location.href)){show('ashes');const b=(R.builds||[]).find(x=>x.id===DEV&&x.status==='done');if(b){g('status').innerHTML='🔥 Rising from the ashes… (dev replay)';await finale(b);g('status').textContent='Reborn! (dev replay of '+DEV+')'}return}
 const P=JSON.parse(localStorage.getItem('mp_pending')||'null');if(P&&Date.now()-P.t<36e5){show('ashes');rise(P.bid)}
 if(window.CBH_XAMAN_API_KEY){const sc=document.createElement('script');sc.src='https://xumm.app/assets/cdn/xumm.min.js';sc.onload=()=>{XM=new Xumm(window.CBH_XAMAN_API_KEY);
  g('connect').onclick=e=>{e.preventDefault();XM.authorize()};XM.on('success',async()=>{g('w').value=await XM.user.account;g('connect').textContent='✅ connected';refresh()})};document.head.appendChild(sc)}})();

// VOUCHER REVEAL (Oct 23): hopper shakes while counting, then one bill slides out per voucher printed
function ntTaxon(id){try{const t=parseInt(id.slice(48,56),16)>>>0,s=parseInt(id.slice(56,64),16)>>>0;return (t^((Math.imul(384160001,s)+2459)>>>0))>>>0}catch(e){return -1}}
let VOFF=0;function paintVCount(){const el=g('cmVcount');if(!el)return;const h=mine.vouchers.length,n=h+VOFF;
 el.innerHTML=`<span class="vm-lbl">YOUR VOUCHERS</span><div class="vc-n">${n}</div><div class="vc-bills">${n?'<i>💵</i>'.repeat(Math.min(n,6)):'<em>none yet</em>'}</div><small>${h} in wallet${VOFF?` · ${VOFF} waiting to 🎁 CLAIM`:''}</small>`}
let cmT=null;function cmWork(on){const m=document.querySelector('#t-coin .cm');if(!m)return;clearInterval(cmT);cmT=null;m.classList.toggle('working',on);document.querySelectorAll('.cm-drop').forEach(x=>x.remove());
 if(!on)return;rumble();const f=document.querySelector('.cm-funnel');let k=0;cmT=setInterval(()=>{if(k++%4===0)rumble();const c=document.createElement('i');c.className='c cm-drop '+['cu','ag','au','cu'][k%4];c.style.left=(30+Math.random()*40)+'%';f.appendChild(c);SFX.clink();setTimeout(()=>c.remove(),900)},450)}
async function printBills(n){const s=document.querySelector('.cm-billslot');s.classList.add('printing');s.querySelectorAll('.cm-out').forEach(x=>x.remove());
 for(let i=0;i<n;i++){const b=document.createElement('img');b.src='img/voucher_50000_bill.jpg';b.alt='Mickel Nickel 50,000 voucher';b.className='cm-out';b.style.setProperty('--r',(i%2?3:-3)+'deg');b.style.setProperty('--o',(i*14)+'px');s.appendChild(b);
  SFX.whir();await wait(1300);await wait(700)}
 const t=document.createElement('div');t.className='cm-out-tag';t.textContent=n>1?`💵 x${n} PRINTED!`:'💵 PRINTED!';s.appendChild(t);s.scrollIntoView({behavior:'smooth',block:'center'})}
// Vending Machine resume when coming back from Xaman (pageshow fires on back/forward + bfcache restores)
window.addEventListener('pageshow',()=>{const P=JSON.parse(localStorage.getItem('mp_pending')||'null');if(P&&Date.now()-P.t<36e5&&!rising){show('ashes');rise(P.bid)}});
// demo triggers removed for mainnet
// CELEBRATIONS (preview): voucher ka-ching + sparkle; pickle build stages, lid pop, confetti, GLOW aura
const kaching=()=>SFX.kaching();
function sparks(host,n,ch){for(let i=0;i<n;i++){const s=document.createElement('i');s.className='spark';s.textContent=ch||'✨';s.style.left=(20+Math.random()*60)+'%';s.style.top=(30+Math.random()*40)+'%';s.style.setProperty('--dx',(Math.random()*120-60)+'px');s.style.setProperty('--dy',(-40-Math.random()*80)+'px');host.appendChild(s);setTimeout(()=>s.remove(),1100)}}
function confetti(host,n,gold){const C=gold?['#ffd54a','#ffb300','#fff3a0']:['#4caf50','#ffd54a','#e53935','#29b6f6','#fff'];for(let i=0;i<n;i++){const c=document.createElement('i');c.className='confetti';c.style.background=C[i%C.length];const a=Math.random()*Math.PI*2,r=90+Math.random()*130;c.style.setProperty('--dx',Math.cos(a)*r+'px');c.style.setProperty('--dy',(Math.sin(a)*r-60)+'px');host.appendChild(c);setTimeout(()=>c.remove(),1900)}}
const _printBills=printBills;printBills=async function(n){const s=document.querySelector('.cm-billslot');const p=_printBills(n);for(let i=0;i<n;i++){await wait(1300);kaching();sparks(s,8);await wait(700)}await p;sparks(s,10,'💵')};
// build stages instead of an endless spinner
const STAGES=['🔥 Burning parts','🫧 Brewing your pickle','🥒 Adding the brine','🥫 Canning','✨ Almost there'];let stT=null;
function stages(on){clearInterval(stT);stT=null;const box=document.querySelector('.canbox');if(!on)return;let k=0,t0=Date.now();const paint=()=>{const e=(Date.now()-t0)/1000,i=Math.min(STAGES.length-1,Math.floor(e/25)),pc=Math.min(95,5+e/1.4);g('status').innerHTML=`${STAGES[i]}…<div class="vm-prog"><i style="width:${pc}%"></i></div>`;if(box&&k++%1===0){const b=document.createElement('i');b.className='bub';b.style.left=(25+Math.random()*50)+'%';box.appendChild(b);setTimeout(()=>b.remove(),1700)}};paint();stT=setInterval(paint,1000)}
const _rise=rise;rise=async function(bid){if(rising)return;const p=_rise(bid);stages(true);try{await p}finally{stages(false)}};
// reveal ONLY the image of this wallet's own finished build (matched by build id); cache-busted, retried; neutral can placeholder otherwise
function ownImg(im,b){const PH='img/final_can.jpg';return new Promise(async res=>{for(let k=0;k<8;k++){let src=b&&b.image;if(!src){try{const R2=await fj('ashes_results.json'),x=R2.builds.find(y=>y.id===b.id);src=x&&x.status==='done'&&x.image}catch(e){}}
 if(src){const u=src.startsWith('data:')?src:src+(src.includes('?')?'&':'?')+'t='+Date.now();const okk=await new Promise(r=>{const t=new Image();t.onload=()=>r(1);t.onerror=()=>r(0);t.src=u});if(okk){im.src=u;im.dataset.build=b.id;return res()}}
 im.src=PH;im.dataset.build='';await wait(3000)}res()})}
const _finale=finale;finale=async function(b){stages(false);const can=g('can'),box=document.querySelector('.canbox'),im=g('result');
 can.hidden=false;can.classList.remove('shake');void can.offsetWidth;can.classList.add('shake');rumble();await wait(1200);can.classList.remove('shake');
 const lid=document.createElement('i');lid.className='lid';box.appendChild(lid);setTimeout(()=>lid.remove(),1100);SFX.pop();can.classList.add('lidpop');await wait(500);
 can.hidden=true;can.classList.remove('lidpop');if(b.glow){const a=document.createElement('i');a.className='aura';box.appendChild(a);setTimeout(()=>a.remove(),3000)}
 im.className='';await ownImg(im,b);im.hidden=false;void im.offsetWidth;im.className='rise';confetti(box,b.glow?60:40,b.glow);
 g('vmTray').classList.add('reveal');const bn=g('vmBanner');bn.hidden=false;bn.className='vm-ready';bn.innerHTML=(b.glow?'<span class="rare">⚡ RARE GLOW! ⚡</span>':'')+'YOUR MICKEL PICKLE IS READY!';SFX.fanfare();if(b.glow)SFX.shimmer();
 setTimeout(()=>g('vmTray').scrollIntoView({behavior:'smooth',block:'start'}),300)};
// put the voucher claim button right under the printed bill
const _pc=paintClaims;paintClaims=async function(){await _pc();const s=document.querySelector('.cm-billslot.printing'),c=g('cmClaims');if(s&&c&&s.nextElementSibling!==c)s.after(c);c&&c.querySelectorAll('a').forEach(a=>a.classList.add('cm-claimhere'))};
// furnace while cooking (preview)
let emT=null;
function furnace(on){const vm=document.querySelector('.vm'),gl=document.querySelector('.vm-glass');clearInterval(emT);emT=null;if(!vm)return;vm.classList.toggle('cooking',on);if(!on)return;SFX.whoosh();
 emT=setInterval(()=>{if(!gl)return;for(let i=0;i<2;i++){const e=document.createElement('i');e.className='ember';e.style.left=(10+Math.random()*80)+'%';e.style.setProperty('--dx',(Math.random()*60-30)+'px');gl.appendChild(e);setTimeout(()=>e.remove(),2300)}},300)}
const _stages=stages;stages=function(on){_stages(on);furnace(on);if(on){const paint=()=>{const s=g('status');if(s&&!s.querySelector('.vm-note'))s.insertAdjacentHTML('afterbegin','<span class="vm-note">Your Mickel Pickle is cooking… this can take a couple minutes 🔥</span>')};paint();clearInterval(stT);const old=stT;let k=0;const t0=Date.now();stT=setInterval(()=>{const e=(Date.now()-t0)/1000,i=Math.min(STAGES.length-1,Math.floor(e/25)),pc=Math.min(95,5+e/1.4);g('status').innerHTML=`${STAGES[i]}…<div class="vm-prog"><i style="width:${pc}%"></i></div>`;paint()},1000)}};
