(async function(){
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const R={errs:[]}; window.addEventListener('error',e=>R.errs.push(e.message));
try{ localStorage.clear(); }catch(e){}
R.intro=!!document.getElementById('intro')&&!document.getElementById('intro').hidden; document.getElementById('intro-go').click(); await sleep(900); R.introGone=document.getElementById('intro').hidden;
async function sim(k){ document.querySelector(`.track[data-k="${k}"]`).click(); await sleep(300);
  for(let i=0;i<10;i++){ const b=document.querySelector('#chat-actions button'); if(!b) break; b.click(); await sleep(900); }
  document.querySelector('#agent-actions button.primary')?.click();
  for(let i=0;i<40;i++){ await sleep(600); const btns=[...document.querySelectorAll('#agent-actions button')]; if(btns.length) btns[0].click(); if(!document.querySelector('#sim-after').hidden) break; }
  return ['after:'+!document.querySelector('#sim-after').hidden,'chips:'+document.querySelectorAll('#ag-chips .seen').length+'/'+document.querySelectorAll('#ag-chips .fchip').length,'reveal:'+document.querySelectorAll('#reveal tbody tr').length,'chain:'+document.querySelectorAll('#reveal .ch').length,'nq:'+(document.getElementById('nq-play').click(),1),'cnt:'+['c-man','c-copy','c-unv','a-man','a-copy','a-unv'].map(i=>document.getElementById(i).textContent).join(',')]; }
async function rest(k){ const log=[]; const T=TRACKS[k];
  for(let i=0;i<3;i++){ document.querySelector('#predict .quiz-opts button')?.click(); await sleep(30); document.querySelector('#predict .fb button')?.click(); await sleep(30);} log.push('pred:'+/магія/.test(document.querySelector('#predict').textContent));
  document.querySelector('#rules-box button.primary').click(); await sleep(30);
  T.noDo.forEach((o,i)=>{ const c=document.getElementById('nd-'+i); if(c.checked!==o[1]) c.click(); });
  let b=document.querySelector('#rules-box button.primary'); b.click(); await sleep(30); log.push('l2:'+document.querySelector('#rules-box .fb').className); b.click(); await sleep(30);
  T.l3.forEach((q,i)=>{ document.getElementById('l3-'+i).value=String(q[2]); });
  b=document.querySelector('#rules-box button.primary'); b.click(); await sleep(30); log.push('l3:'+document.querySelector('#rules-box .fb').className); b.click(); await sleep(30);
  const ta=document.getElementById('my-rules'); ta.value='донор проєкт тис. грн джерело файл мова стиль термін не змінюй не вигадуй закон редакція формули чинна медіана посилання питання'; ta.dispatchEvent(new Event('input')); await sleep(400); log.push('l4hits:'+document.querySelectorAll('.checklist li.hit').length);
  for(let pass=0;pass<60;pass++){ const lis=[...document.querySelectorAll('#skill-box .order li')]; let moved=false;
    for(let i=0;i<lis.length-1;i++){ const a=T.steps.indexOf(lis[i].children[1].textContent), c=T.steps.indexOf(lis[i+1].children[1].textContent); if(a>c){ lis[i].querySelector('button[aria-label="Нижче"]').click(); moved=true; await sleep(10); break; } } if(!moved) break; }
  document.querySelector('#skill-box button.primary').click(); await sleep(50); log.push('order:'+document.querySelector('#skill-box .fb').className); document.querySelector('#skill-box button.primary').click(); await sleep(100);
  const inp=document.getElementById('skill-input'); inp.value='/'+T.skill+' '+T.arg; inp.form.requestSubmit(); await sleep(3000);
  log.push('err:'+/не знайдено/.test(document.getElementById('skill-term').textContent));
  document.querySelector('#skill-help button')?.click(); await sleep(5000); log.push('skill:'+/Навичка працює/.test(document.getElementById('skill-help').textContent));
  [...document.querySelectorAll('#sort .item')].forEach((d,i)=>d.querySelectorAll('.chip')[T.judge[i][1]].click()); document.getElementById('sort-check').click(); log.push(document.getElementById('sort-fb').textContent.slice(0,14));
  [...document.querySelectorAll('.draft-list li')].forEach((li,i)=>{ if(T.draft[i][1]) li.querySelector('button').click(); }); log.push('draft:'+/Обидві/.test(document.getElementById('draft-fb').textContent)+' facts:'+document.querySelectorAll('.facts li').length);
  for(let i=0;i<6;i++) document.getElementById('mock-next').click(); log.push('mock:'+document.getElementById('mock-step-lbl').textContent.slice(0,3)); log.push('pt:'+document.querySelectorAll('#pt-text .seg').length+' out:'+document.getElementById('pt-out').textContent.length);
  log.push('gen:'+document.getElementById('out-claude').textContent.length+'/'+document.getElementById('out-skill').textContent.length, 'steps:'+document.querySelectorAll('#steps li').length, 'dl:'+document.querySelectorAll('#steps .dl a').length);
  return log; }
for(const k of ['pm','an','law']){ R[k+'_sim']=await sim(k); await sleep(5000); R[k+'_sim'].push('nqLines:'+document.getElementById('nq-cmd').textContent.split('\n').filter(Boolean).length); R[k]=await rest(k); }
document.querySelectorAll('#tools-filter .chip')[1].click(); R.toolsEasy=document.querySelectorAll('#tools-tbl tbody tr').length; R.toolLinks=document.querySelectorAll('#tools-tbl a').length;
document.querySelectorAll('#test .qrow').forEach((r,i)=>r.querySelectorAll('.chip')[i<5?0:1].click()); R.test=document.querySelector('#test-out h3')?.textContent;
document.getElementById('match-0').value='Модель';document.getElementById('match-1').value='Інструменти';document.getElementById('match-2').value='Цикл';document.getElementById('match-3').value='Інструкції';document.getElementById('match-check').click(); R.match=document.getElementById('match-fb').textContent.slice(0,12);
document.getElementById('egg-big').click(); await sleep(100); R.bonus=!document.getElementById('bonus').hidden; R.srcTree=document.querySelectorAll('#src-tree button').length; R.srcLines=document.getElementById('src-view').innerText.match(/\d+ рядків/)?.[0];
R.toasts=document.querySelectorAll('#toasts .toast').length;
{ const nb=document.getElementById('db-next'), pb=document.getElementById('db-prev'); for(let i=0;i<60;i++) pb.click(); let n=0, empty=[], hs=[];
  for(let i=0;i<60;i++){ n++; const on=document.querySelector('.slide-on'); const vis=[...on.querySelectorAll('.s-on')].some(e=>e.getClientRects().length)||!on.querySelector('[data-s]'); if(!vis&&!on.querySelector('.deck-lock')) empty.push(document.getElementById('db-title').textContent); if(document.documentElement.scrollWidth>document.documentElement.clientWidth) hs.push(document.getElementById('db-title').textContent); if(nb.disabled) break; nb.click(); }
  R.slides=n; R.emptySlides=empty; R.hscrollSlides=hs; }
R.prompt=document.getElementById('ai-prompt').textContent.length; R.badgesOn=document.querySelectorAll('#badges .ach.on').length; R.wall=!!document.getElementById('wall-form');
R.hscroll=document.documentElement.scrollWidth+'/'+document.documentElement.clientWidth;
const pre=document.createElement('pre'); pre.id='testout'; pre.textContent=JSON.stringify(R); document.body.appendChild(pre);
})();
