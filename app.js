let KEY='moneytrace_transactions_v1';
function newTransactionId(){return 'mt_'+(window.mtUser?.id||'local')+'_'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'_'+Math.random().toString(36).slice(2))}
const colors=['#55d6a5','#8ba7ff','#f1b86b','#c19bff','#f17e86','#59c6d6','#a6c66b','#df9dca'];
const demo=[
 {id:1,description:'שופרסל',category:'אוכל',date:isoDaysAgo(1),type:'expense',amount:286.4},
 {id:2,description:'Netflix',category:'מנויים',date:isoDaysAgo(3),type:'expense',amount:49.9},
 {id:3,description:'דלק',category:'תחבורה',date:isoDaysAgo(4),type:'expense',amount:260},
 {id:4,description:'מסעדת השוק',category:'בילויים',date:isoDaysAgo(5),type:'expense',amount:178},
 {id:5,description:'Spotify',category:'מנויים',date:isoDaysAgo(7),type:'expense',amount:21.9},
 {id:6,description:'משכורת',category:'משכורת',date:isoDaysAgo(8),type:'income',amount:11200},
 {id:7,description:'סופר פארם',category:'בריאות',date:isoDaysAgo(9),type:'expense',amount:94.5},
 {id:8,description:'ארנונה',category:'חשבונות',date:isoDaysAgo(10),type:'expense',amount:420},
 {id:9,description:'Netflix',category:'מנויים',date:isoDaysAgo(33),type:'expense',amount:49.9},
 {id:10,description:'Spotify',category:'מנויים',date:isoDaysAgo(37),type:'expense',amount:21.9},
 {id:11,description:'Netflix',category:'מנויים',date:isoDaysAgo(64),type:'expense',amount:49.9},
 {id:12,description:'Spotify',category:'מנויים',date:isoDaysAgo(67),type:'expense',amount:21.9}
];
function isoDaysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)}
let transactions=load();let isDemo=!localStorage.getItem(KEY);
function load(){try{const x=localStorage.getItem(KEY);return x?JSON.parse(x):demo.map(t=>({...t}))}catch{return demo.map(t=>({...t}))}}
function save(){localStorage.setItem(KEY,JSON.stringify(transactions));window.mtLocalTransactionsChangedAt=Date.now();isDemo=false;$('#dataMode').textContent='הנתונים שלך';if(window.mtUser&&window.mtCloudSyncEnabled)syncAll().catch(()=>showToast('נשמר במכשיר; סנכרון הענן נכשל'))}
const $=s=>document.querySelector(s);const money=n=>(window.moneyTraceFormatCurrency?window.moneyTraceFormatCurrency(n):'₪'+Number(n||0).toLocaleString('he-IL',{minimumFractionDigits:2,maximumFractionDigits:2}));
const cats=['אוכל','תחבורה','בילויים','מנויים','קניות','חשבונות','בריאות','דיור','משכורת','אחר'];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function currentMonth(t){return String(t.date||'').slice(0,7)===new Date().toISOString().slice(0,7)}
function totals(){const month=transactions.filter(currentMonth);const income=month.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);const expenses=month.filter(t=>t.type!=='income').reduce((s,t)=>s+t.amount,0);return{income,expenses,balance:income-expenses,count:month.length}}
function recurring(){const groups={};transactions.filter(t=>t.type==='expense').forEach(t=>{const key=String(t.description||'').toLowerCase().trim();(groups[key]??=[]).push(t)});const subscriptionWords=/netflix|spotify|disney|youtube|apple|icloud|google one|prime|amazon prime|chatgpt|openai|מנוי|סלקום tv|יס פלוס|פרטנר tv|הוט/iu;return Object.entries(groups).map(([name,items])=>{const sorted=items.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));const amounts=items.map(x=>Number(x.amount)||0);const avg=amounts.reduce((a,b)=>a+b,0)/Math.max(amounts.length,1);const spread=(Math.max(...amounts)-Math.min(...amounts))/Math.max(avg,1);const dates=sorted.map(x=>new Date(x.date+'T12:00:00').getTime()).filter(Number.isFinite).sort((a,b)=>a-b);let cadence=false;if(dates.length>=2){const gaps=[];for(let i=1;i<dates.length;i++)gaps.push((dates[i]-dates[i-1])/86400000);cadence=gaps.some(g=>g>=25&&g<=35)||gaps.some(g=>g>=6&&g<=8)}const monthly=cadence&&spread<.18&&items.length>=2;const marked=items.some(x=>/מנויים|מנוי|subscriptions?/i.test(String(x.category||'')));const known=subscriptionWords.test(name);return{name,items,avg,monthly,possible:monthly||marked||known}}).filter(g=>g.possible).sort((a,b)=>b.avg-a.avg)}
function render(){const t=totals(),subs=recurring();$('#balance').textContent=money(t.balance);$('#income').textContent=money(t.income);$('#expenses').textContent=money(t.expenses);$('#expenseCount').textContent=t.count+' תנועות החודש';const subTotal=subs.reduce((s,x)=>s+x.avg,0);$('#subscriptionTotal').textContent=money(subTotal);$('#subscriptionCount').textContent=subs.length+' חיובים חוזרים אפשריים';$('#donutTotal').textContent=money(t.expenses);$('#subMonthly').textContent=money(subTotal);$('#subYearly').textContent=money(subTotal*12);
 const by={};transactions.filter(x=>currentMonth(x)&&x.type==='expense').forEach(x=>by[x.category]=(by[x.category]||0)+x.amount);const entries=Object.entries(by).sort((a,b)=>b[1]-a[1]);let cursor=0;const total=entries.reduce((s,x)=>s+x[1],0);const stops=entries.map(([k,v],i)=>{const start=cursor;cursor+=total?v/total*100:0;return `${colors[cats.indexOf(k)%colors.length]} ${start}% ${cursor}%`}).join(', ');$('#donut').style.background=entries.length?`conic-gradient(${stops})`:'conic-gradient(#26354a 0 100%)';$('#categoryLegend').innerHTML=entries.length?entries.map(([k,v])=>`<div class="legend-item"><span class="legend-name"><i class="legend-dot" style="background:${colors[cats.indexOf(k)%colors.length]}"></i>${esc(k)}</span><b>${money(v)}</b></div>`).join(''):'<span class="muted">אין עדיין הוצאות החודש</span>';
 const insight=entries[0];$('#topInsight').innerHTML=insight?`<b>${esc(insight[0])} היא הקטגוריה המובילה שלך</b><p>הוצאת ${money(insight[1])} בקטגוריה הזו החודש. בדוק אם יש הוצאה אחת שאפשר לצמצם.</p>`:'<b>מתחילים בקטן</b><p>הוסף או ייבא תנועות כדי לקבל תובנות אישיות.</p>';
 $('#recentRows').innerHTML=transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(rowHtml).join('')||'<tr><td colspan="4">אין תנועות עדיין</td></tr>';
 $('#transactionRows').innerHTML=filtered().map(x=>rowHtml(x,true)).join('');$('#emptyTransactions').classList.toggle('hidden',filtered().length>0);
 const catsUsed=[...new Set(transactions.map(x=>x.category))];$('#categoryFilter').innerHTML='<option value="all">כל הקטגוריות</option>'+catsUsed.map(c=>`<option>${esc(c)}</option>`).join('');
 $('#subscriptionList').innerHTML=subs.map(s=>`<div class="subscription-item"><div class="subscription-left"><div class="subscription-logo">↻</div><div><b>${esc(s.name)}</b><small>${s.monthly?s.items.length+' חיובים · זוהה לפי דפוס חוזר':s.items.length+' חיוב'+(s.items.length===1?'':'ים')+' · מנוי אפשרי, ממתין לאימות'}</small></div></div><div class="subscription-price">${money(s.avg)}<small>לחודש בקירוב</small></div></div>`).join('');$('#emptySubs').classList.toggle('hidden',subs.length>0);
 const insights=[];if(entries.length){insights.push({icon:'◉',title:'הקטגוריה היקרה ביותר',body:`${entries[0][0]} מובילה את ההוצאות החודשיות שלך.`,value:money(entries[0][1])})}if(subs.length){insights.push({icon:'⟳',title:'תשלומים חוזרים',body:`זוהו ${subs.length} חיובים חוזרים. בדוק אם כל השירותים עדיין נחוצים.`,value:money(subTotal)+' / חודש'})}const count=transactions.filter(currentMonth).length;insights.push({icon:'▤',title:'מעקב טוב יותר',body:count<10?'כדאי לייבא עוד תנועות כדי לזהות דפוסים אמינים.':'יש מספיק תנועות ראשוניות לניתוח בסיסי.',value:count+' תנועות החודש'});$('#insightGrid').innerHTML=insights.map(i=>`<div class="insight-card"><span class="i-icon">${i.icon}</span><h3>${i.title}</h3><p>${i.body}</p><strong>${i.value}</strong></div>`).join('');$('#dataMode').textContent=isDemo?'נתוני הדגמה':'הנתונים שלך';}
window.renderMoneytrace=render;
function rowHtml(x,withDelete=false){const isIncome=x.type==='income';return `<tr><td><div class="merchant"><span class="merchant-icon">${isIncome?'↙':'↗'}</span>${esc(x.description)}</div></td><td><span class="category-tag">${esc(x.category)}</span></td><td>${esc(x.date)}</td>${withDelete?`<td>${isIncome?'הכנסה':'הוצאה'}</td>`:''}<td class="${isIncome?'amount-income':'amount-expense'}">${isIncome?'+':'−'}${money(x.amount)}</td>${withDelete?`<td><button class="text-button delete-row" data-id="${esc(x.id)}">מחיקה</button></td>`:''}</tr>`}
function filtered(){const q=($('#searchTransactions')?.value||'').toLowerCase(),type=$('#typeFilter')?.value||'all',cat=$('#categoryFilter')?.value||'all';return transactions.filter(x=>(!q||x.description.toLowerCase().includes(q))&&(type==='all'||x.type===type)&&(cat==='all'||x.category===cat)).sort((a,b)=>b.date.localeCompare(a.date))}
function showToast(s){const el=$('#toast');el.textContent=s;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)}
function go(view){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+view));document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));const names={overview:'סקירה כללית',transactions:'תנועות',subscriptions:'מנויים ותשלומים',insights:'תובנות',savings:'חיסכון',budgets:'תקציבים',connect:'חיבור חשבון',business:'ניהול העסק'};$('#pageTitle').textContent=names[view]||'MONEYTRACE';render();if(view==='business'&&window.renderBusinessMode)window.renderBusinessMode()}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
function openModal(){const f=$('#transactionForm');f.date.value=new Date().toISOString().slice(0,10);$('#modal').classList.remove('hidden')}function closeModal(){$('#modal').classList.add('hidden')}
$('#quickAdd').onclick=openModal;$('#addTransaction').onclick=openModal;$('#closeModal').onclick=closeModal;$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});$('#transactionForm').addEventListener('submit',e=>{e.preventDefault();const f=e.target,description=f.description.value.trim(),amount=Number(f.amount.value),type=f.type.value,category=f.category.value,date=f.date.value;const validDate=/^\\d{4}-\\d{2}-\\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00'));if(!description||description.length>120||!Number.isFinite(amount)||amount<=0||amount>100000000||!['income','expense'].includes(type)||!cats.includes(category)||!validDate){showToast('בדוק את פרטי התנועה: תיאור עד 120 תווים וסכום תקין.');return}const duplicate=transactions.find(t=>String(t.description||'').trim().toLocaleLowerCase('he-IL')===description.toLocaleLowerCase('he-IL')&&Number(t.amount)===amount&&t.type===type&&t.date===date);if(duplicate&&!confirm('נמצאה תנועה דומה באותו תאריך ובאותו סכום. להוסיף בכל זאת?'))return;transactions.push({id:newTransactionId(),description,amount,type,category,date});save();render();closeModal();f.reset();showToast('התנועה נשמרה בהצלחה')});
document.addEventListener('click',async e=>{const b=e.target.closest('.delete-row');if(b){const id=b.dataset.id;transactions=transactions.filter(x=>String(x.id)!==id);save();if(window.mtUser&&window.mtCloudSyncEnabled){const {error}=await window.mtSupabase.from('transactions').delete().eq('user_id',window.mtUser.id).eq('id',id);if(error)showToast('נמחק מהמכשיר, אך המחיקה בענן נכשלה: '+error.message)}render();showToast('התנועה נמחקה')}});
['searchTransactions','typeFilter','categoryFilter'].forEach(id=>$('#'+id).addEventListener('input',()=>{$('#transactionRows').innerHTML=filtered().map(x=>rowHtml(x,true)).join('');$('#emptyTransactions').classList.toggle('hidden',filtered().length>0)}));
$('#savingAmount').addEventListener('input',calcSaving);$('#savingPercent').addEventListener('input',calcSaving);function calcSaving(){const a=Number($('#savingAmount').value)||0,p=Number($('#savingPercent').value)||0;$('#savingPercentLabel').textContent=p+'%';$('#savingResult').textContent=money(a*p/100*12)}
$('#csvInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const text=await file.text();const rows=parseCSV(text);if(!rows.length)throw Error('לא נמצאו שורות תקינות');transactions.push(...rows);save();render();showToast(`יובאו ${rows.length} תנועות בהצלחה`)}catch(err){showToast(err.message||'שגיאה בקריאת הקובץ')}e.target.value=''});$('#connectCsv').onclick=()=>$('#csvInput').click();

function parseCSV(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)throw Error('הקובץ ריק או חסרות בו שורות');const delim=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';const parseLine=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'&&q){cur+='"';i++}else if(c==='"')q=!q;else if(c===delim&&!q){out.push(cur.trim());cur=''}else cur+=c}out.push(cur.trim());return out};const heads=parseLine(lines[0]).map(x=>x.toLowerCase());const find=names=>heads.findIndex(h=>names.some(n=>h.includes(n)));const iDesc=find(['תיאור','שם בית עסק','בית עסק','description','merchant','details','name']);const iDate=find(['תאריך','date','תאריך עסקה']);const iAmount=find(['סכום','amount','חיוב','זכות']);const iType=find(['סוג','type','debit/credit']);const iCat=find(['קטגוריה','category']);if(iDesc<0||iDate<0||iAmount<0)throw Error('נדרשות עמודות תיאור, תאריך וסכום (אפשר גם באנגלית)');return lines.slice(1).map((line,i)=>{const c=parseLine(line);let raw=(c[iAmount]||'').replace(/[₪,\s]/g,'');let amount=Number(raw);if(!Number.isFinite(amount)||!c[iDesc]||!c[iDate])return null;const date=parseDate(c[iDate]);if(!date)return null;let type=(c[iType]||'').toLowerCase();const isIncome=/הכנסה|זכות|credit|income/.test(type)||amount<0;amount=Math.abs(amount);const desc=c[iDesc];return{id:newTransactionId(),description:desc,category:iCat>=0&&c[iCat]?c[iCat]:guessCategory(desc),date,type:isIncome?'income':'expense',amount}}).filter(Boolean)}
function parseDate(s){if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;const d=new Date(s);return isNaN(d)?null:d.toISOString().slice(0,10)}
function guessCategory(s){const x=s.toLowerCase();if(/netflix|spotify|disney|apple|youtube|מנוי/.test(x))return'מנויים';if(/דלק|פז|סונול|yellow|רב קו/.test(x))return'תחבורה';if(/שופרסל|רמי לוי|ויקטורי|סופר|מכולת/.test(x))return'אוכל';if(/מסעד|קפה|wolt|תן ביס/.test(x))return'בילויים';return'אחר'}

/* PDF statement import: text is extracted locally in the browser, not uploaded. */
$('#pdfInput')?.addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(!window.pdfjsLib){if(!window.mtLoadPdf)throw new Error('רכיב קריאת PDF אינו זמין.');await window.mtLoadPdf();}
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let lines=[];
  for(let p=1;p<=pdf.numPages;p++){
   const page=await pdf.getPage(p),content=await page.getTextContent();
   const items=content.items.filter(x=>x.str&&x.str.trim()).map(x=>({s:x.str.trim(),y:Math.round(x.transform[5])}));
   const groups=new Map();items.forEach(x=>{const k=x.y;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x.s)});
   [...groups.entries()].sort((a,b)=>b[0]-a[0]).forEach(([,parts])=>lines.push(parts.join(' ')));
  }
  const parsed=parseBankPdfLines(lines);
  if(!parsed.length)throw new Error('לא זוהו תנועות בקובץ. ייתכן שזה PDF סרוק או פורמט שונה. אפשר לנסות CSV.');
  const preview=parsed.slice(0,5).map(t=>t.date+' · '+t.description+' · '+money(t.amount)).join('\n');
  if(!confirm('זוהו '+parsed.length+' תנועות. דוגמאות:\n'+preview+'\n\nלייבא את התנועות?'))return;
  transactions.push(...parsed);save();render();showToast('יובאו '+parsed.length+' תנועות מה-PDF');
 }catch(err){showToast(err.message||'לא ניתן לקרוא את קובץ ה-PDF')}finally{e.target.value=''}
});
function parseBankPdfLines(lines){
 const out=[],seen=new Set();
 for(const line of lines){
  const dm=line.match(/(?:^|\s)(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s|$)/);if(!dm)continue;
  let [,d,m,y]=dm;if(y.length===2)y='20'+y;const date=parseDate(d+'/'+m+'/'+y);if(!date)continue;
  const tail=line.replace(dm[0],' ').trim(),amounts=[...tail.matchAll(/-?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g)];if(!amounts.length)continue;
  const last=amounts[amounts.length-1],amount=Math.abs(Number(last[0].replace(/,/g,'')));if(!Number.isFinite(amount)||amount<=0)continue;
  const description=tail.replace(last[0],' ').replace(/\s+/g,' ').trim();if(description.length<2)continue;
  const key=date+'|'+description+'|'+amount;if(seen.has(key))continue;seen.add(key);
  const isIncome=/זיכוי|הפקדה|משכורת|העברה נכנסת/i.test(description);
  out.push({id:newTransactionId(),description:description.slice(0,100),category:guessCategory(description),date,type:isIncome?'income':'expense',amount});
 }
 return out;
}

$('#downloadCsv').onclick=()=>{const rows=[['תיאור','קטגוריה','תאריך','סוג','סכום'],...transactions.map(t=>[t.description,t.category,t.date,t.type,t.amount])];const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='moneytrace-transactions.csv';a.click();URL.revokeObjectURL(a.href)};
$('#providerInfo').onclick=()=>showToast('שלב הבא: בדיקת ספק Open Banking מורשה והסכם אינטגרציה');
$('#todayLabel').textContent=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();calcSaving();


// Full local backup and restore. No data is uploaded to a server.
$('#backupJson').addEventListener('click',()=>{
 const preferenceKeys=['moneytrace_budgets_v1','moneytrace_goals_v1','moneytrace_savings_pool_v1','moneytrace_savings_ledger_v1','moneytrace_savings_destination_v1','moneytrace_last_processed_week_v1','mt_month_limit','mt_bank_balance','mt_challenge_goal'];
 const payload={app:'MONEYTRACE',version:3,createdAt:new Date().toISOString(),transactions,preferences:Object.fromEntries(preferenceKeys.map(key=>[key,localStorage.getItem(key)]))};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='moneytrace-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('קובץ הגיבוי הורד למכשיר');
});
$('#backupInput').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(file.size>5*1024*1024)throw new Error('קובץ הגיבוי גדול מדי (מקסימום 5MB)');
  const data=JSON.parse(await file.text());
  if(data.app!=='MONEYTRACE'||!Array.isArray(data.transactions)||data.transactions.length>20000)throw new Error('זה אינו קובץ גיבוי תקין או שהוא מכיל יותר מדי תנועות');
  const restored=data.transactions.map((t,i)=>{
   const amount=Number(t.amount);const date=String(t.date||'');
   const description=String(t.description??'').trim(),category=String(t.category||'אחר');
   if(!description||description.length>120||!Number.isFinite(amount)||amount<=0||amount>100000000||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00'))||!['income','expense'].includes(t.type)||!cats.includes(category))throw new Error('קובץ הגיבוי מכיל תנועה לא תקינה');
   return{id:newTransactionId(),description,category,date,type:t.type,amount};
  });
  const preferences=data.preferences||{},safePrefs={};
  if(preferences.budgets){const budgets=JSON.parse(preferences.budgets);if(!budgets||typeof budgets!=='object'||Array.isArray(budgets))throw new Error('מבנה התקציבים בגיבוי אינו תקין');for(const [m,catsMap] of Object.entries(budgets)){if(!/^\d{4}-\d{2}$/.test(m)||!catsMap||typeof catsMap!=='object'||Array.isArray(catsMap))throw new Error('מבנה התקציב בגיבוי אינו תקין');for(const [cat,value] of Object.entries(catsMap)){if(!cats.includes(cat)||!Number.isFinite(Number(value))||Number(value)<=0||Number(value)>100000000)throw new Error('נמצא תקציב לא תקין בגיבוי')}}safePrefs.budgets=JSON.stringify(budgets)}
  if(preferences.goals){const goals=JSON.parse(preferences.goals);if(!Array.isArray(goals)||goals.length>100)throw new Error('מבנה יעדי החיסכון בגיבוי אינו תקין');const clean=goals.map(g=>{const name=String(g?.name??'').trim(),target=Number(g?.target),saved=Number(g?.saved||0);if(!name||name.length>50||!Number.isFinite(target)||target<=0||target>100000000||!Number.isFinite(saved)||saved<0||saved>100000000)throw new Error('נמצא יעד חיסכון לא תקין בגיבוי');return{id:Date.now().toString(36)+'_'+Math.random().toString(36).slice(2),name,target,saved}});safePrefs.goals=JSON.stringify(clean)}
  for(const [field,key] of [['monthlyLimit','mt_month_limit'],['bankBalance','mt_bank_balance'],['challengeGoal','mt_challenge_goal']]){const value=preferences[field]??preferences[key];if(value!==undefined&&value!==null&&value!==''){const n=Number(value);if(!Number.isFinite(n)||n<0||n>1000000000)throw new Error('נמצאה הגדרה מספרית לא תקינה בגיבוי');safePrefs[key]=String(n)}}
  for(const key of ['moneytrace_savings_pool_v1','moneytrace_savings_ledger_v1','moneytrace_savings_destination_v1','moneytrace_last_processed_week_v1']){
   const value=preferences[key];
   if(value!==undefined&&value!==null){
    if(key==='moneytrace_savings_pool_v1'){const n=Number(value);if(!Number.isFinite(n)||n<0||n>1000000000)throw new Error('קופת החיסכון בגיבוי אינה תקינה');safePrefs[key]=String(n)}
    else if(key==='moneytrace_savings_ledger_v1'){const ledger=typeof value==='string'?JSON.parse(value):value;if(!Array.isArray(ledger)||ledger.length>500)throw new Error('יומן החיסכון בגיבוי אינו תקין');safePrefs[key]=JSON.stringify(ledger)}
    else if(key==='moneytrace_savings_destination_v1'){if(typeof value!=='string'||value.length>100)throw new Error('יעד החיסכון בגיבוי אינו תקין');safePrefs[key]=value}
    else if(key==='moneytrace_last_processed_week_v1'){if(typeof value!=='string'||(value!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(value)))throw new Error('תאריך עיבוד החיסכון בגיבוי אינו תקין');safePrefs[key]=value}
   }
  }
  if(!confirm('השחזור יחליף את התנועות, התקציבים ויעדי החיסכון הקיימים במכשיר. להמשיך?'))return;
  transactions=restored;for(const [key,value] of Object.entries(safePrefs))localStorage.setItem(key,value);if(window.mtUser)localStorage.setItem('moneytrace_financial_settings_owner_v1',window.mtUser.id);window.dispatchEvent(new CustomEvent('mt:financial-settings-loaded',{detail:{userId:window.mtUser?.id||null}}));save();render();showToast('הגיבוי המלא שוחזר בהצלחה');
 }catch(err){showToast(err.message||'לא ניתן לשחזר את קובץ הגיבוי')}
 finally{e.target.value=''}
});


// Supabase authentication and account-isolated cloud sync (v2).
(function initCloud(){
 const status=$('#cloudStatus'),form=$('#authForm'),email=$('#authEmail'),password=$('#authPassword');
 const gate=$('#loginGate'),gateForm=$('#loginGateForm'),gateEmail=$('#gateEmail'),gatePassword=$('#gatePassword'),gateStatus=$('#gateStatus'),gateSignup=$('#gateSignup'),mainApp=$('#mainApp'),mobileNav=$('#mainMobileNav');
 function showGate(message){gate.style.display='flex';mainApp.style.display='none';mobileNav.style.display='none';if(message)gateStatus.textContent=message}
 function showApp(){gate.style.display='none';mainApp.style.display='';mobileNav.style.display=''}
 showGate('בודק התחברות…');
 if(!window.supabase||!window.MONEYTRACE_SUPABASE_URL||!window.MONEYTRACE_SUPABASE_PUBLISHABLE_KEY){status.textContent='שירות הענן לא נטען. בדוק חיבור לאינטרנט.';showGate('לא ניתן לטעון את שירות ההתחברות. בדוק אינטרנט ורענן את הדף.');return}
 // Do not persist Supabase sessions in browser storage.
 // The session remains in memory for this tab; signing in again is required after reload.
 const client=window.supabase.createClient(window.MONEYTRACE_SUPABASE_URL,window.MONEYTRACE_SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storage:window.localStorage}
 });
 window.mtSupabase=client;window.mtUser=null;window.mtCloudSyncEnabled=false;
 const logout=$('#authLogout'),submit=$('#authSubmit'),signup=$('#authSignup');
 let pollHandle=null, syncing=false, syncPending=false, authInitialized=false;
 function setSignedIn(user){window.mtUser=user;window.mtCloudSyncEnabled=false;window.dispatchEvent(new Event("mt:user-ready"));const logged=!!user;status.textContent=logged?'מחובר לחשבון. טוען נתונים…':'עדיין לא מחובר לחשבון ענן.';email.disabled=logged;password.disabled=logged;submit.classList.toggle('hidden',logged);signup.classList.toggle('hidden',logged);logout.classList.toggle('hidden',!logged);if(!logged)showGate('התחבר או צור חשבון כדי להיכנס ל־MONEYTRACE.');}
 function cacheCurrent(){localStorage.setItem(KEY,JSON.stringify(transactions));isDemo=false;render()}
 const preferenceKeys=['moneytrace_budgets_v1','moneytrace_goals_v1','moneytrace_savings_pool_v1','moneytrace_savings_ledger_v1','moneytrace_savings_destination_v1','moneytrace_last_processed_week_v1','mt_month_limit','mt_bank_balance','mt_challenge_goal'];
 let settingsSyncTimer=null,applyingRemoteSettings=false,settingsSyncing=false;
 function readPreferenceSnapshot(){const settings={};for(const key of preferenceKeys){const value=localStorage.getItem(key);if(value!==null)settings[key]=value}return settings}
 async function syncFinancialSettings(){
  if(!window.mtUser||!window.mtCloudSyncEnabled||applyingRemoteSettings)return;
  if(settingsSyncing){settingsSyncTimer=setTimeout(syncFinancialSettings,1200);return}
  settingsSyncing=true;
  try{const {error}=await client.from('user_financial_settings').upsert({user_id:window.mtUser.id,settings:readPreferenceSnapshot(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;status.textContent='מחובר כ־'+window.mtUser.email+' · הנתונים מסונכרנים';}
  catch(e){status.textContent='הנתונים נשמרו במכשיר; סנכרון ההגדרות נכשל: '+e.message}
  finally{settingsSyncing=false}
 }
 async function loadFinancialSettings(user){
  const ownerKey='moneytrace_financial_settings_owner_v1';
  // Store only a one-way fingerprint locally, never the raw account identifier.
  const ownerDigest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.id));
  const ownerFingerprint=Array.from(new Uint8Array(ownerDigest),b=>b.toString(16).padStart(2,'0')).join('');
  const previousOwner=localStorage.getItem(ownerKey);
  const {data,error}=await client.from('user_financial_settings').select('settings').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  applyingRemoteSettings=true;
  try{
   const settings=data?.settings;
   if(settings&&typeof settings==='object'&&!Array.isArray(settings)){
    for(const key of preferenceKeys){if(Object.prototype.hasOwnProperty.call(settings,key))localStorage.setItem(key,String(settings[key]));else localStorage.removeItem(key)}
   }else{
    // Never copy settings left by a different signed-in account into a new account.
    const initial=previousOwner===null||previousOwner===ownerFingerprint?readPreferenceSnapshot():{};
    if(previousOwner!==null&&previousOwner!==ownerFingerprint){for(const key of preferenceKeys)localStorage.removeItem(key)}
    const {error:saveError}=await client.from('user_financial_settings').upsert({user_id:user.id,settings:initial,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(saveError)throw saveError;
   }
   localStorage.setItem(ownerKey,ownerFingerprint);
   window.dispatchEvent(new CustomEvent('mt:financial-settings-loaded',{detail:{userId:user.id}}));
  }finally{applyingRemoteSettings=false}
 }
 const originalStorageSetItem=Storage.prototype.setItem;
 Storage.prototype.setItem=function(key,value){const result=originalStorageSetItem.call(this,key,value);if(this===localStorage&&preferenceKeys.includes(String(key))&&window.mtCloudSyncEnabled&&!applyingRemoteSettings){clearTimeout(settingsSyncTimer);settingsSyncTimer=setTimeout(()=>syncFinancialSettings(),700)}return result};
 async function syncAll(){
  if(!window.mtUser||!window.mtCloudSyncEnabled)return;
  if(syncing){syncPending=true;return}
  syncing=true;
  try{
   const rows=transactions.map(t=>({id:String(t.id),user_id:window.mtUser.id,description:String(t.description),category:String(t.category||'אחר'),date:t.date,type:t.type,amount:Number(t.amount)}));
   if(rows.length){const {error}=await client.from('transactions').upsert(rows,{onConflict:'id'});if(error)throw error}
   status.textContent='מחובר כ־'+window.mtUser.email+' · הסנכרון פעיל';
  } finally {syncing=false;if(syncPending){syncPending=false;syncAll().catch(err=>{status.textContent='שגיאת סנכרון: '+err.message})}}
 }
 window.syncAll=syncAll;
 async function refreshFromCloud(){
  if(!window.mtUser||!window.mtCloudSyncEnabled||syncing||document.hidden)return;
  // Avoid replacing a just-edited local list with a poll that may have started before its upload.
  if(Date.now()-(window.mtLocalTransactionsChangedAt||0)<12000)return;
  const requestedUserId=window.mtUser.id;
  const {data,error}=await client.from('transactions').select('id,description,category,date,type,amount').eq('user_id',requestedUserId);
  if(window.mtUser?.id!==requestedUserId||!window.mtCloudSyncEnabled||syncing||Date.now()-(window.mtLocalTransactionsChangedAt||0)<12000)return;
  if(error){status.textContent='שגיאה ברענון מהענן: '+error.message;return}
  const remote=(data||[]).map(r=>({id:r.id,description:r.description,category:r.category,date:r.date,type:r.type,amount:Number(r.amount)}));
  const before=JSON.stringify(transactions.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))));
  const after=JSON.stringify(remote.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))));
  if(before!==after){transactions=remote;cacheCurrent();status.textContent='מחובר כ־'+window.mtUser.email+' · הנתונים עודכנו מהענן'}
 }
 async function loadCloud(user){
  if(window.mtLoadingUser===user.id)return;
  window.mtLoadingUser=user.id;window.mtCloudSyncEnabled=false;setSignedIn(user);
  // Every account has its own local cache. The cloud is authoritative; never upload
  // the previous browser user's local rows into a newly selected account.
  KEY='moneytrace_transactions_v1_user_'+user.id;
  try{
   const {data:remote,error}=await client.from('transactions').select('id,description,category,date,type,amount').eq('user_id',user.id);
   if(error)throw error;
   transactions=(remote||[]).map(r=>({id:r.id,description:r.description,category:r.category,date:r.date,type:r.type,amount:Number(r.amount)}));
   await loadFinancialSettings(user);
   cacheCurrent();window.mtCloudSyncEnabled=true;
   status.textContent='מחובר כ־'+user.email+' · '+transactions.length+' תנועות נטענו מהענן';
   gateStatus.textContent='';showApp();
   if(pollHandle)clearInterval(pollHandle);
   pollHandle=setInterval(()=>refreshFromCloud().catch(err=>{status.textContent='שגיאת סנכרון: '+err.message}),15000);
  }catch(e){window.mtCloudSyncEnabled=false;status.textContent='התחברת, אך טעינת הענן נכשלה: '+e.message;showGate('ההתחברות הצליחה, אך טעינת הנתונים נכשלה: '+e.message);}
  finally{window.mtLoadingUser=null;}
 }
 function validGateEmail(){
  gateEmail.value=gateEmail.value.trim();
  if(!gateEmail.value||!gateEmail.checkValidity()){gateEmail.reportValidity();gateStatus.textContent='הזן כתובת אימייל תקינה, למשל name@example.com.';return false}
  return true;
 }
 function authMessage(error,action){
  const message=String(error?.message||'');
  if(/rate.?limit|too many requests|email rate limit/i.test(message))return 'נשלחו יותר מדי בקשות בזמן קצר. המתן כמה דקות לפני ניסיון נוסף, או השתמש בהתחברות עם Google.';
  if(/invalid email|email address is invalid/i.test(message))return 'כתובת האימייל לא התקבלה. בדוק שאין רווחים ושיש כתובת מלאה כמו name@example.com.';
  if(/already registered|user already registered/i.test(message))return 'כבר קיים חשבון עם האימייל הזה. נסה להתחבר במקום להירשם.';
  if(/provider is not enabled|unsupported provider/i.test(message))return 'Google sign-in עדיין לא הופעל בפרויקט Supabase. נדרשת הפעלת Google Provider והגדרת OAuth credentials.';
  return (action==='signup'?'ההרשמה נכשלה: ':'ההתחברות נכשלה: ')+message;
 }
 gateForm.addEventListener('submit',async e=>{e.preventDefault();if(!validGateEmail())return;const btn=$('#gateLogin');btn.disabled=true;gateStatus.textContent='מתחבר…';try{const {data,error}=await client.auth.signInWithPassword({email:gateEmail.value,password:gatePassword.value});if(error)throw error;if(data.user)await loadCloud(data.user)}catch(err){gateStatus.textContent=authMessage(err,'login')}finally{btn.disabled=false}});
 gateSignup.addEventListener('click',async()=>{if(!validGateEmail())return;if(gatePassword.value.length<8){gatePassword.setCustomValidity('הסיסמה חייבת לכלול לפחות 8 תווים.');gatePassword.reportValidity();gatePassword.setCustomValidity('');gateStatus.textContent='הזן סיסמה של לפחות 8 תווים.';return}const btn=$('#gateSignup');btn.disabled=true;gateStatus.textContent='יוצר חשבון…';try{const {data,error}=await client.auth.signUp({email:gateEmail.value,password:gatePassword.value,options:{emailRedirectTo:'https://solotzvi-commits.github.io/Moneytrace-/'}});if(error)throw error;if(data.session&&data.user)await loadCloud(data.user);else gateStatus.textContent='נשלח אימייל אימות אם ניתן ליצור חשבון. בדוק את תיבת הדואר לפני ניסיון נוסף.'}catch(err){gateStatus.textContent=authMessage(err,'signup')}finally{btn.disabled=false}});
 const googleButton=$('#gateGoogle');
 googleButton?.addEventListener('click',async()=>{
  googleButton.disabled=true;gateStatus.textContent='מעביר להתחברות עם Google…';
  try{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:'https://solotzvi-commits.github.io/Moneytrace-/'}});if(error)throw error}
  catch(err){gateStatus.textContent=authMessage(err,'login');googleButton.disabled=false}
 });
 form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;try{const {data,error}=await client.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error)throw error;if(data.user)await loadCloud(data.user)}catch(err){status.textContent='שגיאת התחברות: '+err.message}finally{submit.disabled=false}});
 signup.addEventListener('click',async()=>{if(!email.value.trim()||password.value.length<8){status.textContent='הזן אימייל וסיסמה של לפחות 8 תווים.';return}signup.disabled=true;try{const {data,error}=await client.auth.signUp({email:email.value.trim(),password:password.value,options:{emailRedirectTo:'https://solotzvi-commits.github.io/Moneytrace-/'}});if(error)throw error;if(data.session&&data.user)await loadCloud(data.user);else status.textContent='נשלח אליך אימייל לאימות. פתח אותו ואז חזור לאתר והתחבר.'}catch(err){status.textContent='שגיאת הרשמה: '+err.message}finally{signup.disabled=false}});
 logout.addEventListener('click',async()=>{window.mtCloudSyncEnabled=false;if(pollHandle)clearInterval(pollHandle);const {error}=await client.auth.signOut();if(error){status.textContent='שגיאה בהתנתקות: '+error.message;return}setSignedIn(null);showToast('התנתקת מהחשבון')});
 client.auth.onAuthStateChange((event,session)=>{
  // Defer follow-up Supabase requests until the auth callback has released its internal lock.
  if(event==='SIGNED_IN'&&session?.user&&window.mtUser?.id!==session.user.id){
   setTimeout(()=>loadCloud(session.user),0);
  }
  if(event==='SIGNED_OUT'&&authInitialized){
   // Confirm the session is still absent before switching the UI to signed-out.
   setTimeout(async()=>{
    const {data}=await client.auth.getSession().catch(()=>({data:{session:null}}));
    if(data?.session?.user)return;
    window.mtCloudSyncEnabled=false;
    if(pollHandle){clearInterval(pollHandle);pollHandle=null;}
    window.mtUser=null;setSignedIn(null);
   },0);
  }
 });
 client.auth.getSession().then(async({data,error})=>{
  authInitialized=true;
  if(error){
   status.textContent='לא ניתן לבדוק התחברות: '+error.message;
   gateStatus.textContent='לא ניתן לאמת את ההתחברות כרגע. בדוק חיבור ונסה לרענן.';
   return;
  }
  if(data.session?.user){
   if(new URLSearchParams(location.search).has('reset-password')){
    await loadCloud(data.session.user);
    window.dispatchEvent(new Event('mt:password-recovery'));
    return;
   }
   // Restore the existing Supabase session on this device. Tokens are persisted and
   // refreshed by supabase-js; only an explicit sign-out ends the session.
   await loadCloud(data.session.user);
  }else{
   setSignedIn(null);
  }
 });
})();
