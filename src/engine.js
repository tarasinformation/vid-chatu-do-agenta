(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === "class") e.className = attrs[k]; else if (k === "text") e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wait = function (ms) { return reduce ? 30 : ms; };
  var emit = function (n, d) { try { document.dispatchEvent(new CustomEvent(n, { detail: d || {} })); } catch (e) {} };

  /* ---------- storage ---------- */
  var KEY = "vid-chatu-do-agenta-v2";
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { store = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  store.done = store.done || {};
  var track = TRACKS[store.track] ? store.track : "pm";
  var T = TRACKS[track];
  function ts() { store.t = store.t || {}; store.t[track] = store.t[track] || {}; return store.t[track]; }

  /* ---------- rail & system ---------- */
  var STAGES = [["ladder", "Сходи"], ["sim", "Два шляхи"], ["inside", "Як влаштований"], ["rules", "Правила й навичка"], ["judge", "Судження"], ["tools", "Інструменти"], ["start", "З чого почати"]];
  function renderRail() {
    var r = $("#rail"); r.innerHTML = "";
    STAGES.forEach(function (s) {
      var a = el("a", { href: "#" + s[0], class: store.done[s[0]] ? "done" : "" });
      a.appendChild(el("span", { class: "dot" })); a.appendChild(document.createTextNode(s[1])); r.appendChild(a);
    });
    var t = el("a", { href: "#top-tracks", class: "trk", text: "Трек: " + T.who }); r.appendChild(t);
    var SYS = [["win", "перша перемога"], ["loop", "цикл зрозумілий"], ["claude", "CLAUDE.md"], ["skill", "/" + T.skill], ["judge", "що довірити агенту"], ["plan", "план старту"]];
    var sy = $("#system"); sy.innerHTML = "";
    SYS.forEach(function (s) { var on = s[0] === "claude" || s[0] === "skill" ? ts()[s[0]] : store.done["sys_" + s[0]]; sy.appendChild(el("span", { class: on ? "on" : "", text: (on ? "✓ " : "") + s[1] })); });
  }
  function mark(stage, sys, perTrack) { if (stage) store.done[stage] = true; if (sys) { if (perTrack) ts()[sys] = true; else store.done["sys_" + sys] = true; } save(); renderRail(); }

  /* ---------- tracks ---------- */
  var tb = $("#tracks"); tb.id = "tracks"; tb.parentElement.id = "top-tracks";
  Object.keys(TRACKS).forEach(function (k) {
    var X = TRACKS[k];
    var b = el("button", { class: "track", "data-k": k, "aria-pressed": k === track ? "true" : "false" }, "<span class='who'>" + X.who + "</span><span class='what'>" + X.what + "</span><span class='doc'>/" + X.skill + "</span>");
    b.onclick = function () { setTrack(k, true); };
    tb.appendChild(b);
  });
  function setTrack(k, scroll) {
    track = k; T = TRACKS[k]; store.track = k; save();
    Array.prototype.forEach.call(tb.children, function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-k") === k ? "true" : "false"); });
    renderAll();
    if (scroll) emit("app:track", { track: k });
  }

  /* ---------- hero diagram animation control ---------- */
  var heroSvg = $("#hero-svg");
  if (heroSvg && reduce && heroSvg.pauseAnimations) heroSvg.pauseAnimations();

  /* ---------- 1. ladder ---------- */
  var VENDORS = {
    "Anthropic": ["Claude", "Claude Projects", "Claude з режимом Cowork", "Claude Code"],
    "OpenAI": ["ChatGPT", "ChatGPT Projects", "ChatGPT Work", "Codex"],
    "Google": ["Gemini", "Gems, Gemini Notebook", "Antigravity (застосунок)", "Antigravity CLI"],
    "Microsoft": ["Copilot Chat", "Copilot Notebooks", "Copilot Cowork (лише OneDrive/SharePoint)", "GitHub Copilot CLI"],
    "Відкриті": ["—", "—", "Goose (застосунок)", "OpenCode, Cline, Aider"]
  };
  var LEVELS = [
    { nm: "Чат", add: "розмова", split: 90, can: ["Пише й переписує текст", "Пояснює, відповідає на питання"], cant: ["Не бачить твоїх файлів", "Не перевіряє себе", "Не пам'ятає правил між розмовами"] },
    { nm: "Проєкти", add: "+ пам'ять", split: 72, can: ["Пам'ятає документи й інструкції проєкту", "Не треба повторювати правила"], cant: ["Не працює з папкою на твоєму комп'ютері", "Не перевіряє цифри й факти сам"] },
    { nm: "Агент документів", add: "+ дія з файлами", split: 38, can: ["Сам відкриває й створює файли", "Працює кроками, показує план", "Підключається до пошти, календаря, Office"], cant: ["Уміє лише те, що закладено в застосунок", "Не пише собі програм для перевірки"] },
    { nm: "Агент повної дії", add: "+ власні програми й рецепти", split: 15, can: ["Обробляє десятки файлів за раз", "Пише собі невеликі програми (скрипти) для перевірки", "Запускає задачі за розкладом", "Ділить роботу між кількома агентами-помічниками (субагентами)"], cant: ["Інтерфейс трохи технічніший", "Треба уважно читати, на що агент просить дозволу"] }
  ];
  var vendor = "Anthropic", level = store.level != null ? store.level : 3;
  /* company marks (site favicons), used only to label each ecosystem */
  var VLOGO = {"Anthropic": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAZlBMVEX6+fUUFBMAAAD////9/Pj29fH///3///ttbWvY19QRERDe3dkNDQy9vLnv7urp6OQ6OjmJiIZOTUxEREO0tLEyMTCtrKmlpKEqKinR0Mx2dnSPjoyBgX5UVFJjYmHDw7+Yl5QdHRzi9ahqAAABsklEQVRYhe2V25aCMAxFtYFWsSBeEe/+/09Om6RQRoQ4j7M4LzYU0pPdps5mkyZN+t9KSD2B8Pv1ElVgUON4/U0GKBVqoV2gKSjhCwMrNUep1Ec5Rmolt2A2IUFlfKgyP95ouQP8wsmeoMmXKbEDk7MBt2ydNBWpvREmgK1tEpy9b9j5B3YrxJiscUFKotDSniwId9Jc/Ou2jDASFHWR1cDQqyvmOXjfmjGKEoRtL5b0u4ww5pIa4OZfVjeAk20xljiWYGSEbjFTqb9gNM9QblLE209jAUZt6dy6N+FO24EYr0KMyaPtnM6YMT7GaiCEtOpM04ZeEePBEtsRA1z3Ea3SkaIuMkcRRkI4VxpQPRifwxQgtAAL29ruEOMZi5sP1sDYnG0W9yRirAUYaePeRJcRY7wPWGCEb2KMfDKLzxYYoVWRMjrYHl06ihFeePMcFpFOWXMZjWIMmHLQjaBqtz/M159q0Iue855GXcQN/hEjv7vpJND3NusIxjDd/QcKHYWX0TBGMkjHLn5M/Y1dREXaV28NbinU8Vd611EobnBU/2lMSe9zPIGrRONJkyZN6uoHDOIUEM1IBJkAAAAASUVORK5CYII=", "OpenAI": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAY1BMVEX///8AAACYmJj5+fnz8/P29vaOjo4YGBjQ0NDDw8Pl5eXX19dQUFDLy8t1dXWfn5+tra0uLi47Ozu2trZfX19oaGhLS0s0NDQmJiaHh4dubm4gICBGRkbt7e0KCgoSEhJ+fn57FpRlAAACjUlEQVRYhe1WW4OyIBB1Ak0EL3kpM63+/6/8mAGR6kPdfdqHzsPGKnPmdhiMoi+++OPgaZ7L35tXJyB0v+MQN3Ao2M/tS213SoTMK4Wrqhjrc1tNu+0rgEdj19nZi4Xvs8+009gFc0fTizI55bsIdNizvXhoK5XSOh/1ugmbOUiAyoZCFVi86tQg2yY4ANAve2LQlf+qAai3zKfkCK3dDPC0ucxi0Jxi3f6KZom1bzPn+GbsOBj2EHgNM8HB+ZIjPVTE1gGs6Ir1AGfZzwT0LC4oFfxzZSSxFT0NWitRdPQJKiugSb+DexPlAGnQPqcEmUeQYkqXbMlE6QjCp0uLlvsEbDAKdrUkUUJQz5NONfIJEGVJ2dst9DBYA2HS8wlQBrGvJ95qaYbaUJnoFoLOhp7p3kFta5cADHsJlleUzWBib4N9aEx6/yegqXDA9RQUY260xx5wzD8ISoaCOuM/Q0iMzGaHZ1hN5SuBdp6dTI4iOFdae9qpc/UHAQbFTQ6BsaIniaIFp86FCPjbkPBQuBZJLJqyopXqnSA42PTO0TafpiGOYV7MDbAE+cpsjedT60phpPxCUCwz9wOT2T3r1pQCBuYTZGtDCQeyWnQr8X4c5WsRx7UDnaJM6V7spojTaaZ6OQKGvS6C9hheE9mTOHj1mAmO4mLlGEBs6Xn3OklcBLBuT2I0FdbDrLfNkrXNJHEHKgyxTB/rnWTQ04Tv4HbYvOLHN5mVnletii1zKqO3TfTLIMGBs+NmxSSgbqgQKUriMjd961ZzkFTru7rgT+/y4f3qneSDXZePmnr2L+6b97KHuHm2Z3UVNd1FjRTJ6f1L4eex3PZ9Hr0jsxSnX7h3HPqDN3j+v/jir+AfWRkZ4tp3YAUAAAAASUVORK5CYII=", "Google": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAApVBMVEVHcEz4+Pj8/Pz9/f38/Pz59/by8/Pz8/T7+/v9/f309PX29/fy8vP29/f///84qlfsUENHiPT8wBLrTD88rFpJivNEhvUqp006g/T7/PvT4P3rRjjqPSzg8Ojva1uWz6T7ugWWt/j4xcH+78jA4slxv4T85eTtW0v61tRctGaDrPdSj/YtffRmmvb1p6L+3I790mKuuUHykIg+nZ3G2Pv0lCs8o3o82clfAAAADnRSTlMAoetQ0/wdM7c/jGYSeQFEN8MAAAMjSURBVFiF5VdZm6IwEBQURBFQRGOGwxOvUWd0dvf//7QNEpLOAeLDPm09+QFV6erudGKn888wsgeeYTiOYXgD+2227TqmD2A67jsi3Z6vgdNtSXdNHf0ZRxuJgXb1Cr3BK77RRC9gNNLtxuVpEA3ZHLymF6i10W3H9/2aXKp8a38k2FvtFPrSR/tbNp7GSRLH4+y2l172Vf4IC19sDkk8HRNMCeI4OWyE13ikCAj532Qlu1IgSLIj/KIn8z349sHphE8l4uQBv/EkAzB1WTwGmDIkGbQpmnBA8g5Tkc4kEiEPTk0FLJk/1fPFSoAAMmA/TsZZdiCV1PFhCDZ/emP+ieWNRUzj/SYjEgrf9/mmGPIEMH6cgeY5Zhq+P2QCbILgRyWQ3IRv8VFmE5iqg+2KplDi16Dy4LInX2H4bIL40UDjcJUahAS/SeEPuIHG4cgp2K4KhdVBlzEdTHkffj0FwhVs2Q8FKXuH5Tb8LgXCb7DKZSHhcuYvy2bkkzCk2AKBxYxjUmB+fSmwahb45AbL8dptKzApBWZcoPuehUlNBG0tTCoBXxIAVaACX0DgMmegCkoS+TijfRDegcB5XeFcKixAGelYqw4OXHZieEepLwD7he31orSwZs8t2spsouOnQBQEua/BtYzg8sGeVLOdzxOShHtEgHYq/xcNYMZPumq08yxuV/egEIiCVObjTzUFbKyywuJTyScuZIVrGcBkwR1gNtL4tWSHIqqAlpCe0vWFncAvK+BYyGkIJA+nHXWL0xz9zJUUwoOBn6wWEyBBRPmSID8hFAR/ZnMpA/B8BXcLZuKZCVQgKEEUFmAfiLeMHlQIGD8gP4OIChAbk1QfgHi9ogqBjAj9gATIVy1wOvpphBR2EUEES+t0JHBzpPNzVQGhJZz1WOZ3+sJRQAqHRHoudBbW3LKESw6RWJ4Qw2kpNaan8uGeqjR2yyd2ysYY6vj6izbWHXK1F+5hqyMR16xfwG2hgN16PqlF7b+VCqYm/2/YaAq/gu3USmCn3V8327A0Gtgy2v/zG7mOqIEtx1Uv6M3oe0bPtAjMnuG9ytz/jb8i8rQexpJ/GAAAAABJRU5ErkJggg==", "Microsoft": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAG1BMVEVHcEz/uQB/ugAApO/yUCLyUCIApO9/ugD/uQAiNQNqAAAABXRSTlMAf4CAgMY5tpAAAABASURBVFiF7cy5DQAhAMRAH3//FcM1sBESiaeAoUcNyowwMDAwMDAwuBy0jDNEvFcz+DJG9AcrMjAwMDAwMLgcbA4XXcky94g6AAAAAElFTkSuQmCC", "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0456": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTgxODFiIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOCA3bC01IDUgNSA1TTE2IDdsNSA1LTUgNU0xMy41IDVsLTMgMTQiLz48L3N2Zz4="};
  var vd = $("#vendors");
  Object.keys(VENDORS).forEach(function (v) {
    var b = el("button", { class: "chip vchip", "data-v": v, "aria-pressed": v === vendor ? "true" : "false" });
    if (VLOGO[v]) b.appendChild(el("img", { src: VLOGO[v], alt: "", width: "18", height: "18" }));
    b.appendChild(el("span", { text: v }));
    b.onclick = function () { vendor = v; Array.prototype.forEach.call(vd.children, function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-v") === v ? "true" : "false"); }); renderLadder(); };
    vd.appendChild(b);
  });
  function renderLadder() {
    var box = $("#ladder-steps"); box.innerHTML = "";
    LEVELS.forEach(function (L, i) {
      var b = el("button", { class: "step", "aria-pressed": i === level ? "true" : "false" });
      b.innerHTML = '<span class="lvl">рівень ' + (i + 1) + '</span><span class="nm">' + L.nm + '</span><span class="add">' + L.add + '</span><span class="mini"><span class="mb"><i style="width:' + L.split + '%"></i><b></b></span><span>руками: ти ' + L.split + '%</span></span><span class="prod">' + VENDORS[vendor][i] + '</span>';
      b.onclick = function () { level = i; store.level = i; save(); renderLadder(); mark("ladder"); };
      box.appendChild(b);
    });
    var L = LEVELS[level];
    $("#lvl-detail").innerHTML = '<div class="stack" style="gap:10px"><span class="eyebrow">Рівень ' + (level + 1) + ' · ' + VENDORS[vendor][level] + '</span><h3>' + L.nm + ': ' + T.doc + '</h3><p>' + T.how[level] + '</p>' +
      '<div class="split" aria-label="Хто робить роботу"><div class="split-bar"><span class="h" style="width:' + L.split + '%"></span><span class="a" style="width:' + (100 - L.split) + '%"></span></div><div class="split-lbl"><span>Ти: ' + L.split + '%</span><span>Агент: ' + (100 - L.split) + '%</span></div><p class="meta">Відсотки умовні. Вони лише показують, хто робить більше.</p></div></div>' +
      '<div><ul class="can">' + L.can.map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul><ul class="cant">' + L.cant.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
  }

  /* ---------- 2. simulator ---------- */
  var cnt, chatStep, chatDone, agentDone, agStep, agRunning, answer, simGen = 0;
  var chatLog = $("#chat-log"), chatAct = $("#chat-actions"), agLog = $("#agent-log"), agAct = $("#agent-actions");
  function bump(id, v) { var n = $(id); if (n.textContent !== String(v)) { n.textContent = v; n.classList.remove("bump"); void n.offsetWidth; n.classList.add("bump"); } }
  function setCnt() { bump("#c-man", cnt.cm); bump("#c-copy", cnt.cc); bump("#c-unv", cnt.cu); bump("#a-man", cnt.am); bump("#a-copy", cnt.ac); bump("#a-unv", cnt.au); }
  function push(log, cls, html) { var m = el("div", { class: cls }, html); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
  function typing(log, cb) {
    var g = simGen, t = push(log, "msg a typing", "<span></span><span></span><span></span>");
    setTimeout(function () { if (g !== simGen) return; t.remove(); cb(); }, wait(650));
  }
  function resetSim() {
    simGen++;
    cnt = { cm: 0, cc: 0, cu: 0, am: 0, ac: 0, au: 0 }; chatStep = 0; chatDone = false; agentDone = false; agStep = 0; agRunning = false; answer = null;
    chatLog.innerHTML = ""; agLog.innerHTML = "";
    chatLog.appendChild(el("p", { class: "meta", text: "Нова розмова. Файлів чат не бачить." }));
    agLog.appendChild(el("p", { class: "meta", text: "Агент має доступ до папки. Файли підсвічуються, коли він їх читає." }));
    $("#ag-folder").textContent = T.folder;
    var ch = $("#ag-chips"); ch.innerHTML = ""; (T.chips || []).forEach(function (c) { ch.appendChild(el("span", { class: "fchip", "data-n": c, text: c })); });
    $("#sim-intro").textContent = T.simIntro;
    $("#sim-after").hidden = true;
    setCnt(); renderChatAct(); renderAgentStart();
  }
  function renderChatAct() {
    chatAct.innerHTML = "";
    if (chatStep >= T.chat.length) { chatAct.appendChild(el("p", { class: "meta", text: "Шлях у чаті пройдено. Тепер дай той самий запит агентові в правій колонці." })); return; }
    var s = T.chat[chatStep];
    var b = el("button", { class: "btn" + (s[1] ? " manual" : " primary"), text: (s[1] ? "✋ " : "") + s[0] });
    b.onclick = function () {
      b.disabled = true;
      var kind = s[1];
      if (kind === 0) { push(chatLog, "msg u", T.request); cnt.cm++; }
      else if (kind === 1) { push(chatLog, "msg u paste", s[2]); cnt.cm++; cnt.cc++; }
      else if (kind === 2) { push(chatLog, "msg u", s[2]); cnt.cm++; }
      else { cnt.cm++; cnt.cc++; }
      setCnt();
      var fin = function () { if (s[4]) cnt.cu = s[4]; chatStep++; setCnt(); if (chatStep >= T.chat.length) { chatDone = true; afterSim(); } renderChatAct(); };
      if (s[3]) typing(chatLog, function () { push(chatLog, "msg a", s[3]); fin(); }); else fin();
    };
    chatAct.appendChild(b);
  }
  function lightFiles(html) {
    Array.prototype.forEach.call(document.querySelectorAll("#ag-chips .fchip"), function (c) {
      if (html.indexOf(c.getAttribute("data-n")) >= 0) { c.classList.add("seen"); c.classList.remove("now"); void c.offsetWidth; c.classList.add("now"); }
    });
  }
  function agentLine(s) {
    var row = el("div", { class: "astep" });
    row.appendChild(el("span", { class: "tag " + (s[0] === "permit" ? "ask" : s[0]), text: s[1] }));
    row.appendChild(el("div", null, s[2]));
    agLog.appendChild(row); agLog.scrollTop = agLog.scrollHeight;
    lightFiles(s[2]);
  }
  function runAgent() {
    var g = simGen;
    agAct.innerHTML = "";
    if (agStep > T.agent.length) return;
    if (agStep === T.agent.length) {
      agentLine(["done", "Готово", T.done(answer)]);
      agStep++; agentDone = true; setCnt(); afterSim(); return;
    }
    var s = T.agent[agStep];
    agentLine(s);
    if (s[0] === "ask") {
      agAct.appendChild(el("p", { class: "meta", text: "Агент зупинився, бо це рішення людини. Обери варіант нижче." }));
      s[3].forEach(function (lab, i) {
        var b = el("button", { class: "btn", text: lab });
        b.onclick = function () { answer = i; cnt.am++; setCnt(); push(agLog, "msg u", lab); agStep++; runAgent(); };
        agAct.appendChild(b);
      });
      return;
    }
    if (s[0] === "permit") {
      agAct.appendChild(el("p", { class: "meta", text: "Режим Manual (ручне погодження): агент питає дозволу перед кожним записом файлу. Натисни «Дозволити»." }));
      var p1 = el("button", { class: "btn primary", text: "Дозволити" });
      p1.onclick = function () { cnt.am++; setCnt(); agStep++; runAgent(); };
      agAct.appendChild(p1); return;
    }
    agStep++;
    agAct.appendChild(el("p", { class: "meta working", text: "Агент працює…" }));
    setTimeout(function () { if (g === simGen) runAgent(); }, wait(900));
  }
  function renderAgentStart() {
    agAct.innerHTML = "";
    if (!chatDone) agAct.appendChild(el("p", { class: "meta", text: "Спершу пройди ліву колонку (чат), щоб відчути різницю." }));
    var b = el("button", { class: "btn primary", text: "Дати агенту той самий запит" });
    b.onclick = function () { if (agRunning) return; agRunning = true; push(agLog, "msg u", T.request); cnt.am++; setCnt(); runAgent(); };
    agAct.appendChild(b);
  }
  function afterSim() {
    if (!chatDone || !agentDone) { if (chatDone && !agRunning) renderAgentStart(); return; }
    var a = $("#sim-after"); a.hidden = false;
    var rv = $("#reveal"); rv.innerHTML = "";
    if (T.reveal && T.reveal.length) {
      rv.innerHTML = "<h3>Розбір червоних позначок</h3><div class='tbl-wrap'><table><thead><tr><th>Що написав чат</th><th>Як насправді</th><th>Хто й де помітив</th></tr></thead><tbody>" + T.reveal.map(function (r) { return "<tr><td><mark class='unv'>" + r[0] + "</mark></td><td>" + r[1] + "</td><td class='meta'>" + r[2] + "</td></tr>"; }).join("") + "</tbody></table></div>";
      if (T.chain && T.chain.length) rv.innerHTML += "<div class='chain' aria-label='Ланцюжок перевірки агента'>" + T.chain.map(function (c, i) { return "<span class='ch" + (i === T.chain.length - 1 ? " last" : "") + "' style='animation-delay:" + (i * 0.25) + "s'>" + c + "</span>"; }).join("<span class='arr'>→</span>") + "</div>";
    }
    var w = $("#why"); w.innerHTML = "";
    [["Не бачить файлів", "У агента є інструменти: він сам відкриває файли."], ["Не перевіряє себе", "Агент працює циклом: зробив крок, подивився на результат, виправив."], ["Забуває правила", "На початку кожної роботи агент читає файл із твоїми правилами."]].forEach(function (x, i) {
      w.appendChild(el("div", { class: "card" }, "<h3>" + x[0] + "</h3><p>" + T.why[i] + " <b>" + x[1] + "</b></p>"));
    });
    $("#nq-title").textContent = T.nextTitle;
    $("#nq-chat-t").textContent = T.nextChat;
    var nqLines = function () {
      return ["<span class='c'>Знайшов навичку: .claude/skills/" + T.skill + "/SKILL.md</span>", "<span class='c'>Читаю правила проєкту: CLAUDE.md</span>"]
        .concat(T.steps.map(function (s, i) { return "Крок " + (i + 1) + " з " + T.steps.length + ": " + s; }))
        .concat(["Прошу дозволу записати результат… <span class='ok'>дозволено</span>", "<span class='ok'>Готово. Нижче список того, що треба перевірити тобі.</span>"]);
    };
    var nqBox = $("#nq-cmd"); nqBox.innerHTML = "<span class='p'>&gt;</span> " + T.nextCmd + "\n<span class='c'>Натисни кнопку нижче, щоб побачити, що робить агент після цієї команди.</span>";
    var nqGen = simGen;
    $("#nq-play").onclick = function () {
      var L = nqLines(), i = 0; nqBox.innerHTML = "<span class='p'>&gt;</span> " + T.nextCmd + "\n";
      (function nx() { if (nqGen !== simGen || i >= L.length) return; nqBox.innerHTML += L[i++] + "\n"; setTimeout(nx, wait(420)); })();
    };
    var bars = $("#cmp-bars"); bars.innerHTML = "";
    var max = Math.max(cnt.cm, 1);
    [["Твоїх ручних дій", cnt.cm, cnt.am], ["Копіювань", cnt.cc, cnt.ac], ["Неперевірених тверджень", cnt.cu, cnt.au]].forEach(function (r) {
      var row = el("div", { class: "cbar" });
      row.innerHTML = "<span class='cl'>" + r[0] + "</span><div class='cb'><span class='c1' style='width:0'></span><b>" + r[1] + "</b></div><div class='cb'><span class='c2' style='width:0'></span><b>" + r[2] + "</b></div>";
      bars.appendChild(row);
      setTimeout(function () { row.querySelector(".c1").style.width = (r[1] / max * 100) + "%"; row.querySelector(".c2").style.width = Math.max(r[2] / max * 100, r[2] ? 4 : 0) + "%"; }, 60);
    });
    $("#nq-chat").textContent = "Знову все спочатку. Ручних дій: " + cnt.cm + ", копіювань: " + cnt.cc + ".";
    mark("sim", "win");
  }
  $("#sim-reset").onclick = resetSim;

  /* ---------- 3. inside ---------- */
  var pi = 0;
  function lightNode(n) { for (var i = 0; i < 4; i++) { var g = document.getElementById("ln-" + i); if (g) g.classList.toggle("on", i === n); } }
  function renderPredict() {
    var box = $("#predict"); box.innerHTML = "";
    if (pi >= T.predict.length) {
      lightNode(-1);
      box.innerHTML = "<span class='eyebrow'>Готово</span><h3>Ось і вся «магія»</h3><p>Думає, діє, дивиться, вирішує, чи готово. Кожен крок простий. Агент повторює коло, доки результат не перевірено. Там, де потрібне твоє рішення, він зупиняється й питає.</p>";
      var again = el("button", { class: "btn small", text: "Пройти ще раз" }); again.onclick = function () { pi = 0; renderPredict(); }; box.appendChild(el("div", { class: "row" })).appendChild(again);
      mark(null, "loop"); return;
    }
    var P = T.predict[pi]; lightNode(P.node);
    box.appendChild(el("span", { class: "eyebrow", text: "Передбач наступний крок · " + (pi + 1) + "/" + T.predict.length }));
    box.appendChild(el("p", { text: P.q }));
    var opts = el("div", { class: "quiz-opts" }), fb = el("div", { "aria-live": "polite" });
    P.o.forEach(function (o, i) {
      var b = el("button", { class: "btn", text: o });
      b.onclick = function () {
        Array.prototype.forEach.call(opts.children, function (c) { c.disabled = true; });
        b.classList.add(i === P.a ? "right" : "wrong"); opts.children[P.a].classList.add("right");
        fb.className = "fb " + (i === P.a ? "good" : "bad"); fb.textContent = (i === P.a ? "Так. " : "Не зовсім. ") + P.why;
        var n = el("button", { class: "btn primary small", text: pi + 1 < T.predict.length ? "Далі" : "Завершити" }); n.style.marginTop = "8px";
        n.onclick = function () { pi++; renderPredict(); }; fb.appendChild(el("br")); fb.appendChild(n);
      };
      opts.appendChild(b);
    });
    box.appendChild(opts); box.appendChild(fb);
  }
  var loopSvg = $("#loop-svg"); if (loopSvg && reduce && loopSvg.pauseAnimations) loopSvg.pauseAnimations();

  /* architecture: parts highlight */
  Array.prototype.forEach.call(document.querySelectorAll(".part[data-part]"), function (p) {
    var on = function () { var k = p.getAttribute("data-part"); $("#arch").classList.add("has-hl"); document.querySelectorAll("#arch [data-g]").forEach(function (g) { g.classList.toggle("hl", g.getAttribute("data-g") === k); }); document.querySelectorAll(".part[data-part]").forEach(function (q) { q.classList.toggle("on", q === p); }); };
    p.addEventListener("mouseenter", on); p.addEventListener("focus", on); p.addEventListener("click", on);
  });

  var MATCH = [["Мозок: той самий, що в чаті", "Модель"], ["Руки: прочитати, записати, запустити", "Інструменти"], ["Повторювати, доки не перевірено", "Цикл"], ["Файл із правилами (CLAUDE.md)", "Інструкції"]];
  var mb = $("#match");
  MATCH.forEach(function (m, i) {
    var l = el("label"); l.appendChild(el("span", { text: m[0] }));
    var s = el("select", { id: "match-" + i, "aria-label": m[0] });
    s.innerHTML = "<option value=''>Обери…</option>" + ["Інструкції", "Цикл", "Модель", "Інструменти"].map(function (x) { return "<option>" + x + "</option>"; }).join("");
    l.appendChild(s); mb.appendChild(l);
  });
  $("#match-check").onclick = function () {
    var ok = 0; MATCH.forEach(function (m, i) { var s = $("#match-" + i), g = s.value === m[1]; s.classList.toggle("ok", g); s.classList.toggle("no", !g); if (g) ok++; });
    $("#match-fb").textContent = ok === 4 ? "Усі 4 правильно. Тепер ти знаєш, з чого складається будь-який агент. Інструкція до праски довша." : "Правильно " + ok + " з 4. Підказка: інструкції лежать у файлах, а цикл означає повторення кроків.";
    if (ok === 4) mark("inside");
  };

  var current;
  function treeExtra() {
    var esc = function (x) { return String(x).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); };
    return {
      __data: [T.dataFolder, "твої матеріали",
        "<span class='h'># Твої матеріали</span>\nТе, з чим агент працює: редакції, дані, листи, шаблони.\nВін їх <b>читає, але не змінює</b>. Це правило записано в CLAUDE.md,\nтож оригінали лишаються цілими, навіть якщо щось піде не так.\n\n<span class='h'>## Що всередині</span>\n" + (T.chips || []).map(function (c) { return "· " + esc(c); }).join("\n")],
      __out: [T.outFolder, "результат роботи",
        "<span class='h'># Готове</span>\nСюди агент кладе те, що зробив: чернетки, таблиці, звіт про перевірку.\nОкрема папка означає, що нове ніколи не перезаписує старе.\n\n<span class='h'>## Як із цим жити</span>\n· Відкриваєш, читаєш, правиш як звичайний документ\n· Де агент сумнівається, він ставить позначку [ПОТРІБНІ ДАНІ]\n· Надсилати документ далі вирішуєш ти. Агент сам нічого не надсилає"]
    };
  }
  function renderTree() {
    var tree = $("#tree"), X = treeExtra(); tree.innerHTML = "";
    if (!T.files[current] && !X[current]) current = Object.keys(T.files)[0];
    tree.appendChild(el("div", { class: "dim", text: T.folder }));
    var add = function (key, icon, name, note) {
      var b = el("button", { "aria-pressed": key === current ? "true" : "false" }, icon + " " + name + "<span class='note-s'>" + note + "</span>");
      b.onclick = function () { current = key; renderTree(); };
      tree.appendChild(b);
    };
    Object.keys(T.files).forEach(function (f) { add(f, "📄", f, T.files[f][0]); });
    ["__data", "__out"].forEach(function (k) { var parts = X[k][0].replace(/^📁\s*/, "").split(/\s{2,}/); add(k, "📁", parts[0], (parts[1] ? parts[1] + " · " : "") + X[k][1]); });
    $("#file-view").innerHTML = (T.files[current] || X[current])[current in X ? 2 : 1];
  }

  /* ---------- 4. rules (faded) ---------- */
  var LV = ["Повний приклад", "Без одного розділу", "Лише заголовки", "Твій файл"];
  function lv() { return ts().lv || 0; }
  function renderLevels() { var b = $("#levels"); b.innerHTML = ""; LV.forEach(function (n, i) { var past = i < lv(), x = el(past ? "button" : "span", { class: i === lv() ? "on" : (past ? "done" : ""), text: (past ? "✓ " : (i + 1) + ". ") + n }); if (past) { x.title = "Повернутися до цього рівня"; x.onclick = function () { ts().lv = i; save(); renderRules(); }; } b.appendChild(x); }); }
  function nextLevel() { ts().lv = lv() + 1; save(); renderRules(); }
  function claudeBody() { return T.files["CLAUDE.md"][1]; }
  function renderRules() {
    renderLevels();
    var box = $("#rules-box"); box.innerHTML = ""; var L = lv();
    if (L === 0) {
      box.appendChild(el("h3", { text: "Крок 1. Розглянь готовий файл правил" }));
      box.appendChild(el("p", { class: "meta", text: "Це той самий CLAUDE.md, що й на схемі агента. Натисни на розділ, і поруч з'явиться пояснення. Кожен розділ відповідає на питання, яке агент інакше поставив би тобі." }));
      var wrap = el("div", { class: "annot" });
      var pre = el("pre", { class: "file" }); var side = el("div", { class: "annot-side", "aria-live": "polite" });
      var parts = claudeBody().split(/(?=<span class='h'>## )/);
      parts.forEach(function (chunk, i) {
        var d = el("div", { class: i ? "sec" : "sec head" }, chunk.replace(/\n+$/, "") + "\n");
        if (i) {
          var A = T.ann[i - 1];
          var show = function () { Array.prototype.forEach.call(pre.children, function (c) { c.classList.remove("on"); }); d.classList.add("on"); side.innerHTML = "<span class='mono'>" + A[0] + "</span><p>" + A[1] + "</p>"; };
          d.tabIndex = 0; d.addEventListener("mouseenter", show); d.addEventListener("focus", show); d.addEventListener("click", show);
        }
        pre.appendChild(d);
      });
      side.innerHTML = "<p class='meta'>← Обери розділ</p>";
      wrap.appendChild(pre); wrap.appendChild(side); box.appendChild(wrap);
      var b = el("button", { class: "btn primary", text: "Зрозуміло, далі" }); b.onclick = nextLevel; box.appendChild(el("div", { class: "row" })).appendChild(b);
    } else if (L === 1) {
      box.appendChild(el("h3", { text: "Крок 2. Допиши розділ «Чого не робити»" }));
      box.appendChild(el("p", { class: "meta", text: "Нижче той самий файл без останнього розділу. Познач 2 пункти з 4, які треба туди дописати, і натисни «Перевірити». Два інші пункти звучать розумно, але шкодять." }));
      box.appendChild(el("pre", { class: "file" }, claudeBody().split("<span class='h'>## Чого не робити</span>")[0] + "<span class='h'>## Чого не робити</span>\n<span class='c'>- ?\n- ?</span>"));
      var g = el("div", { class: "opts" });
      T.noDo.forEach(function (o, i) {
        var l = el("label", { class: "opt", for: "nd-" + i });
        var c = el("input", { type: "checkbox", id: "nd-" + i });
        c.onchange = function () { var n = T.noDo.filter(function (x, j) { return $("#nd-" + j).checked; }).length; cnt1.textContent = "Обрано: " + n + " з 2"; };
        l.appendChild(c); var tx = el("span", { class: "opt-t" }); tx.appendChild(el("span", { text: o[0] })); tx.appendChild(el("span", { class: "opt-why", id: "ndw-" + i })); l.appendChild(tx); g.appendChild(l);
      });
      box.appendChild(g);
      var cnt1 = el("span", { class: "meta", text: "Обрано: 0 з 2" });
      var fb = el("p", { class: "fb", "aria-live": "polite" }); fb.hidden = true;
      var b2 = el("button", { class: "btn primary", text: "Перевірити" });
      b2.onclick = function () {
        var picked = T.noDo.map(function (o, i) { return $("#nd-" + i).checked; });
        var n = picked.filter(Boolean).length;
        fb.hidden = false;
        if (n !== 2) { fb.className = "fb bad"; fb.textContent = "Обери рівно два пункти."; return; }
        var ok = T.noDo.every(function (o, i) { return picked[i] === o[1]; });
        T.noDo.forEach(function (o, i) {
          var lab = g.children[i], w = $("#ndw-" + i);
          lab.classList.remove("ok", "no"); lab.classList.add(o[1] ? "ok" : "no");
          w.textContent = (o[1] ? "✓ Потрібен. " : "✕ Не підходить. ") + (o[2] || "");
        });
        fb.className = "fb " + (ok ? "good" : "bad");
        fb.textContent = ok ? T.noDoFb : "Не зовсім. Під кожним пунктом тепер є пояснення. Виправ вибір і перевір ще раз.";
        if (ok) { b2.textContent = "Далі"; b2.onclick = nextLevel; }
      };
      box.appendChild(fb); var rw = el("div", { class: "row" }); rw.appendChild(b2); rw.appendChild(cnt1); box.appendChild(rw);
    } else if (L === 2) {
      box.appendChild(el("h3", { text: "Крок 3. Нова задача: обери рядок під кожен заголовок" }));
      box.appendChild(el("p", { class: "meta", text: T.l3title }));
      var sels = [];
      T.l3.forEach(function (q, i) {
        var w = el("label", { class: "stack", style: "gap:4px" }); w.appendChild(el("span", { class: "mono", text: q[0] }));
        var s = el("select", { id: "l3-" + i }); s.innerHTML = "<option value=''>Обери рядок…</option>" + q[1].map(function (x, j) { return "<option value='" + j + "'>" + x + "</option>"; }).join("");
        w.appendChild(s); box.appendChild(w); sels.push(s);
      });
      var fb3 = el("p", { class: "fb", "aria-live": "polite" }); fb3.hidden = true;
      var b3 = el("button", { class: "btn primary", text: "Перевірити" });
      b3.onclick = function () {
        var ok = T.l3.filter(function (q, i) { return sels[i].value !== "" && +sels[i].value === q[2]; }).length;
        fb3.hidden = false; fb3.className = "fb " + (ok === 3 ? "good" : "bad");
        fb3.textContent = ok === 3 ? "Усі 3 правильно. Добре правило конкретне: одиниці, назва файлу, сторінка. «Пиши гарно» агентові нічого не каже. Людям, чесно кажучи, теж." : "Правильно " + ok + " з 3. Шукай рядок, який агент може виконати без уточнювальних питань.";
        if (ok === 3) { b3.textContent = "Далі"; b3.onclick = nextLevel; }
      };
      box.appendChild(fb3); box.appendChild(el("div", { class: "row" })).appendChild(b3);
    } else {
      box.appendChild(el("h3", { text: "Крок 4. Напиши правила для своєї задачі" }));
      box.appendChild(el("p", { class: "meta", text: "Напиши кілька рядків правил для будь-якої своєї задачі. Праворуч список того, що має бути в добрих правилах. Нижче видно, як відповів би агент без правил і з твоїми. Порівняння оновлюється, поки ти пишеш." }));
      var wrap4 = el("div", { class: "cmp" });
      var ta = el("textarea", { id: "my-rules", placeholder: T.l4placeholder, "aria-label": "Твої правила" });
      ta.value = ts().myRules || "";
      var cl = el("ul", { class: "checklist" });
      T.chk.forEach(function (c) { cl.appendChild(el("li", { text: c[0] })); });
      var out = el("div", { class: "cmp" });
      var tmr;
      function upd() {
        ts().myRules = ta.value; save();
        var f = T.chk.map(function (c) { return c[1].test(ta.value); });
        f.forEach(function (h, i) { cl.children[i].classList.toggle("hit", h); });
        var o = T.out(f);
        out.innerHTML = "<div class='card'><span class='eyebrow'>Без правил</span><p style='margin-top:6px'>" + o[0] + "</p></div><div class='card live' style='border-color:var(--accent)'><span class='eyebrow' style='color:var(--accent)'>З твоїми правилами · " + f.filter(Boolean).length + " з " + f.length + "</span><p style='margin-top:6px'>" + o[1] + "</p></div>";
        if (f.filter(Boolean).length >= 3) mark(null, "claude", true);
      }
      ta.oninput = function () { clearTimeout(tmr); tmr = setTimeout(upd, 180); };
      wrap4.appendChild(ta); wrap4.appendChild(cl); box.appendChild(wrap4); box.appendChild(out); upd();
      box.appendChild(el("p", { class: "meta", text: "Агент застосовує правила без нагадувань, бо читає файл на початку кожної роботи. Там, де правил немає, він діє на власний розсуд. Як і всі ми." }));
      box.appendChild(el("div", { class: "note" }, "<b>Правило для правил.</b> Якщо агент двічі помилився в одному й тому самому місці, у CLAUDE.md бракує рядка. Писати файл з нуля не обов'язково. Набери команду <code>/init</code>, і агент сам перегляне папку й складе чернетку правил. Або попроси: «склади CLAUDE.md з того, що ти бачиш у папці». Потім допиши своє."));
      var r = el("button", { class: "skip", text: "Пройти вправу з початку" }); r.onclick = function () { ts().lv = 0; save(); renderRules(); }; box.appendChild(r);
    }
  }
  $("#skip-rules").onclick = function () { ts().lv = 3; save(); renderRules(); emit("app:goto", { stage: "rules", s: "r3" }); };

  /* ---------- 4b. skill ---------- */
  function renderSkill() {
    var S = ts(); if (!S.order) S.order = [3, 0, 5, 2, 1, 4]; var phase = S.skillPhase || 0;
    var box = $("#skill-box"); box.innerHTML = "";
    box.appendChild(el("h3", { text: "Навичка /" + T.skill + ": рецепт, який запускається однією командою" }));
    if (phase === 0) {
      /* tap-to-build: tap the steps in the order the agent should do them */
      var N = T.steps.length, placed = S.placed || 0, miss = S.miss || 0;
      var PH = function (i) { return i < 2 ? ["Підготовка", "агент читає правила й матеріали"] : i === N - 1 ? ["Звіт тобі", "що вирішити людині"] : ["Робота", "перевіряє дані й пише"]; };
      box.appendChild(el("p", { text: "Агентові, як і новому колезі, треба пояснити порядок дій. Кроки нижче перемішано. Натискай їх по черзі, починаючи з першого." }));
      var wrap = el("div", { class: "rcp" });
      var slots = el("ol", { class: "rcp-slots" }), lastPh = "";
      for (var i = 0; i < N; i++) {
        var ph = PH(i);
        if (ph[0] !== lastPh) { slots.appendChild(el("li", { class: "rcp-ph" }, "<b>" + ph[0] + "</b> <span>" + ph[1] + "</span>")); lastPh = ph[0]; }
        var sl = el("li", { class: "rcp-slot" + (i < placed ? " full" : i === placed ? " next" : "") });
        sl.appendChild(el("span", { class: "n", text: i + 1 }));
        sl.appendChild(el("span", { text: i < placed ? T.steps[i] : i === placed ? "Натисни крок, який іде " + (i === 0 ? "першим" : "далі") : "" }));
        slots.appendChild(sl);
      }
      var pool = el("div", { class: "rcp-pool", role: "group", "aria-label": "Кроки рецепта" });
      var fb = el("p", { class: "fb", "aria-live": "polite" }); fb.hidden = true;
      S.order.forEach(function (idx) {
        if (idx < placed) return;
        var c = el("button", { class: "rcp-card", text: T.steps[idx] });
        c.onclick = function () {
          if (idx === placed) { S.placed = placed + 1; save(); renderSkill(); return; }
          S.miss = ++miss; save();
          c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake");
          fb.hidden = false; fb.className = "fb bad";
          fb.textContent = "Не зараз. Спершу йде «" + PH(placed)[0] + "»: " + PH(placed)[1] + "." + (miss >= 2 ? " Підказка: " + T.stepsHint + "." : "");
        };
        pool.appendChild(c);
      });
      wrap.appendChild(slots); if (placed < N) wrap.appendChild(pool);
      box.appendChild(wrap); box.appendChild(fb);
      var row = el("div", { class: "row" }); box.appendChild(row);
      if (placed >= N) {
        fb.hidden = false; fb.className = "fb good";
        fb.textContent = "Рецепт готовий" + (miss ? "" : " з першої спроби. Підозріло добре") + ". Спершу підготовка, потім перевірені дані й текст, наприкінці список для людини.";
        var b = el("button", { class: "btn primary", text: "Зберегти навичку й запустити" });
        b.onclick = function () { S.skillPhase = 1; save(); renderSkill(); };
        row.appendChild(b);
      }
      if (placed > 0) { var rs = el("button", { class: "skip", text: "Почати спочатку" }); rs.onclick = function () { S.placed = 0; S.miss = 0; save(); renderSkill(); }; row.appendChild(rs); }
      return;
    }
    box.appendChild(el("p", { class: "meta", text: "Навичку збережено як текстовий файл .claude/skills/" + T.skill + "/SKILL.md у твоїй папці. Щоб запустити її, набери в полі нижче скісну риску й назву навички, а через пробіл " + ({ pm: "звітний період", an: "тему записки", law: "назву акта" })[track] + ". Потім натисни «Надіслати»." }));
    var term = el("div", { class: "term", id: "skill-term", "aria-live": "polite" }); term.innerHTML = S.termHtml || "<span class='c'>Агент готовий. Папка: " + T.folder.replace("📁 ", "") + "</span>\n";
    box.appendChild(term);
    var row = el("form", { class: "row" }); row.style.flexWrap = "nowrap";
    var inp = el("input", { type: "text", id: "skill-input", placeholder: "/" + T.skill + " " + T.arg, "aria-label": "Команда для агента", autocomplete: "off" });
    var go = el("button", { class: "btn primary", type: "submit", text: "Надіслати" });
    row.appendChild(inp); row.appendChild(go); box.appendChild(row);
    var help = el("div", { class: "stack", id: "skill-help" }); box.appendChild(help);
    var re = new RegExp("^/?" + T.skill + "\\b", "i");
    function typeLines(lines, done) {
      var i = 0, t = $("#skill-term");
      (function nx() { if (i >= lines.length) { S.termHtml = t.innerHTML; save(); if (done) done(); return; } t.innerHTML += lines[i++] + "\n"; t.scrollTop = t.scrollHeight; setTimeout(nx, wait(330)); })();
    }
    row.onsubmit = function (e) {
      e.preventDefault(); var v = inp.value.trim(); if (!v) return; inp.value = "";
      var t = $("#skill-term"); t.innerHTML += "\n<span class='p'>&gt;</span> " + v.replace(/</g, "&lt;") + "\n";
      if (S.skillPhase === 1 && re.test(v)) {
        typeLines(["Читаю правила CLAUDE.md… ✓", "Виконую крок 1… ✓", "Виконую крок 2… ✓", "Запускаю " + T.badScript + "…", "<span class='e'>Помилка: файл " + T.badScript + " не знайдено.</span>", "Зупиняюся. У навичці вказано файл, якого немає в папці."], function () {
          S.skillPhase = 2; save(); help.innerHTML = "";
          help.appendChild(el("div", { class: "note warn" }, "<b>Так і задумано.</b> Навичка запускає скрипт, тобто невелику програму, яка перевіряє цифри. Ми навмисно вказали в навичці неправильну назву цього файлу. Буває й ненавмисно. Агент сам каже, що не так. Розбиратися в коді не треба. Натисни кнопку нижче, і агент виправить помилку."));
          var fix = el("button", { class: "btn", text: "Сказати агенту: «Виправ шлях до скрипта в навичці»" });
          fix.onclick = function () { inp.value = "Виправ шлях до скрипта в навичці"; if (row.requestSubmit) row.requestSubmit(); else row.onsubmit(new Event("submit")); };
          help.appendChild(fix);
        });
      } else if (S.skillPhase === 2 && /випр|шлях|fix|скрипт|файл/i.test(v)) {
        help.innerHTML = "";
        typeLines(["Шукаю скрипти в папці scripts/… знайдено " + T.goodScript, "Прошу дозволу: змінити .claude/skills/" + T.skill + "/SKILL.md (1 рядок): <span class='ok'>дозволено</span>", "Виправлено. Запускаю /" + T.skill + " " + T.arg + " ще раз…"].concat(T.runOk.split("\n")), function () {
          S.skillPhase = 3; save();
          help.appendChild(el("p", { class: "fb good", text: "Навичка працює. Наступного разу достатньо однієї команди: " + T.nextCmd + "." }));
          mark("rules", "skill", true);
        });
      } else if (S.skillPhase >= 3 && re.test(v)) {
        typeLines(["Виконую навичку…", "<span class='ok'>Готово: " + T.runFile((v.split(/\s+/)[1] || T.arg).replace(/</g, "")) + "</span>"]);
      } else {
        typeLines(["Не зрозумів, що зробити. " + (S.skillPhase === 2 ? "Спробуй: «Виправ шлях до скрипта в навичці»." : "Щоб запустити навичку, набери /" + T.skill + " " + T.arg + ".")]);
      }
    };
    if (S.skillPhase === 3) help.appendChild(el("p", { class: "fb good", text: "Навичка працює. Наступного разу достатньо однієї команди: " + T.nextCmd + "." }));
    var rs = el("button", { class: "skip", text: "Пройти вправу з початку" }); rs.onclick = function () { S.skillPhase = 0; S.termHtml = ""; S.order = [3, 0, 5, 2, 1, 4]; save(); renderSkill(); }; box.appendChild(rs);
  }

  /* ---------- 5. judge ---------- */
  var BINS = ["Довірити агенту", "Агент готує, вирішує людина", "Лише людина"];
  var judgeProg;
  function renderJudge() {
    judgeProg = {};
    var sb = $("#sort"); sb.innerHTML = ""; $("#sort-fb").textContent = "";
    T.judge.forEach(function (t, i) {
      var d = el("div", { class: "item" }); d.appendChild(el("span", { text: t[0] }));
      var g = el("div", { class: "bins", role: "group", "aria-label": t[0] });
      BINS.forEach(function (bn, j) { var b = el("button", { class: "chip", "aria-pressed": "false", "data-j": j, text: bn }); b.onclick = function () { Array.prototype.forEach.call(g.children, function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); }); d.setAttribute("data-v", j); }; g.appendChild(b); });
      d.appendChild(g); sb.appendChild(d);
    });
    $("#draft-src").textContent = T.draftSrc.replace(/з фактами праворуч|фактами праворуч|праворуч/, "з фактами в блоці «Що кажуть джерела»").replace("з з ", "з ");
    var found = 0, dr = $("#draft"); dr.innerHTML = ""; $("#draft-fb").textContent = "";
    var wrapD = el("div", { class: "draft-wrap" });
    var ol = el("ol", { class: "draft-list" });
    var facts = el("div", { class: "facts" }, "<span class='eyebrow'>Що кажуть джерела</span>" + (T.draftFacts ? "<ul>" + T.draftFacts.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>" : ""));
    var cntD = el("p", { class: "meta", text: "Знайдено: 0 з 2" });
    T.draft.forEach(function (d) {
      var li = el("li"); var b = el("button", { class: "dstate" }); b.appendChild(el("span", { class: "d-t", text: d[0] })); var ex = el("span", { class: "d-ex" }); b.appendChild(ex); li.appendChild(b);
      b.onclick = function () {
        if (li.classList.contains("found") || li.classList.contains("conf")) return;
        if (d[1]) { li.classList.add("found"); found++; ex.textContent = "✕ " + (d[2] || ""); cntD.textContent = "Знайдено: " + found + " з 2"; if (found === 2) { $("#draft-fb").textContent = "Обидві помилки знайдено. " + T.draftDone; judgeProg.draft = true; judgeDone(); } }
        else { li.classList.add("conf"); ex.textContent = "✓ " + (d[2] || "Підтверджено джерелами."); }
      };
      ol.appendChild(li);
    });
    var left = el("div", { class: "stack", style: "gap:8px" }); left.appendChild(ol); left.appendChild(cntD);
    wrapD.appendChild(left); wrapD.appendChild(facts); dr.appendChild(wrapD);
  }
  $("#sort-check").onclick = function () {
    var ok = 0, sb = $("#sort");
    T.judge.forEach(function (t, i) {
      var d = sb.children[i], v = d.getAttribute("data-v"), good = v !== null && +v === t[1];
      d.classList.toggle("ok", good); d.classList.toggle("no", !good);
      var ex = d.querySelector(".ex"); if (!ex) { ex = el("span", { class: "ex" }); d.appendChild(ex); }
      ex.textContent = (good ? "✓ " : "→ " + BINS[t[1]] + ". ") + t[2]; if (good) ok++;
    });
    $("#sort-fb").textContent = "Збіглося " + ok + " з " + T.judge.length + ". " + (ok >= 6 ? "Ти добре бачиш, що можна довірити агенту." : "Глянь на пояснення під картками.");
    judgeProg.sort = true; judgeDone();
  };
  function judgeDone() { if (judgeProg.sort && judgeProg.draft) mark("judge", "judge"); }

  /* ---------- 6. tools ---------- */
  var TOOLS = [
    ["Claude (Cowork)", "Anthropic", "Застосунок, вебверсія", "Так, у застосунку", 5, "—", "●", "●", "Pro, $20", "local", "https://claude.com/download"],
    ["Claude Code", "Anthropic", "Вкладка Code у застосунку, термінал", "Так", 3, "◐", "●", "●", "Pro, $20", "local", "https://claude.com/download"],
    ["ChatGPT Work", "OpenAI", "Застосунок + хмара", "Так, у застосунку", 5, "—", "◐", "◐", "Є безкоштовний", "local", "https://chatgpt.com/download"],
    ["Codex", "OpenAI", "Застосунок, термінал, хмара", "Так", 3, "●", "●", "●", "Є безкоштовний; Plus $20", "local", "https://developers.openai.com/codex"],
    ["Antigravity", "Google", "Застосунок, термінал, редактор коду", "Так", 3, "●", "●", "—", "Безкоштовний для приватних осіб", "local", "https://antigravity.google"],
    ["Gemini Notebook (раніше NotebookLM)", "Google", "Вебверсія", "Лише завантажені файли, без дій", 5, "—", "—", "—", "Див. сайт", "", "https://notebook.google"],
    ["Copilot Cowork", "Microsoft", "Microsoft 365, хмара", "Ні, лише OneDrive/SharePoint", 5, "—", "—", "—", "Ліцензія Copilot ($21–30) + оплата за використання", "", "https://www.microsoft.com/en-us/microsoft-365/copilot"],
    ["GitHub Copilot", "Microsoft", "Застосунок, термінал, редактор коду", "Так", 2, "●", "●", "●", "Є безкоштовний", "local", "https://github.com/features/copilot/cli"],
    ["Cursor", "Anysphere", "Редактор коду (IDE)", "Так", 2, "●", "●", "●", "Є безкоштовний; Plus $8", "local", "https://cursor.com/download"],
    ["Devin Desktop (раніше Windsurf)", "Cognition", "Редактор коду (IDE) + хмара", "Так", 2, "●", "—", "●", "Є безкоштовний; Pro $20", "local", "https://devin.ai"],
    ["Manus Desktop", "Manus", "Застосунок + хмара", "Так, дозволені папки", 4, "—", "—", "—", "Є безкоштовний; Pro $20", "local", "https://manus.im/desktop"],
    ["Goose", "Відкритий код", "Застосунок + термінал", "Так", 4, "●", "—", "●", "Безкоштовний + оплата моделі", "local open", "https://goose-docs.ai"],
    ["Cline, OpenCode, Aider", "Відкритий код", "Редактор коду / термінал", "Так", 1, "●", "◐", "◐", "Безкоштовні + оплата моделі", "local open", "https://cline.bot"]
  ];
  var filt = "all";
  function renderTools() {
    var tt = $("#tools-tbl");
    var rows = TOOLS.filter(function (r) { return filt === "all" || (filt === "easy" && r[4] >= 4) || (filt === "local" && r[9].indexOf("local") >= 0) || (filt === "open" && r[9].indexOf("open") >= 0); });
    tt.innerHTML = "<thead><tr><th>Інструмент</th><th>Де працює</th><th>Бачить файли на твоєму комп'ютері</th><th><span class='tip' title='●●●●● працює як звичайний застосунок, ●○○○○ потрібні термінал і досвід розробника'>Для нетехнічних</span></th><th class='c'><span class='tip' title='Читає файл правил AGENTS.md, спільний для різних агентів'>AGENTS.md</span></th><th class='c'><span class='tip' title='Розуміє навички у форматі SKILL.md'>SKILL.md</span></th><th class='c'><span class='tip' title='Підключається до інших програм через стандарт MCP: пошта, календар, документи'>MCP</span></th><th>Вхідна ціна</th></tr></thead><tbody>" +
      rows.map(function (r) { return "<tr><td><b>" + (r[10] ? "<a href='" + r[10] + "' target='_blank' rel='noopener'>" + r[0] + " ↗</a>" : r[0]) + "</b><br><span class='meta'>" + r[1] + "</span></td><td>" + r[2] + "</td><td>" + r[3] + "</td><td class='score' aria-label='" + r[4] + " з 5'>" + "●".repeat(r[4]) + "<i>" + "●".repeat(5 - r[4]) + "</i></td><td class='c std-m'>" + r[5] + "</td><td class='c std-m'>" + r[6] + "</td><td class='c std-m'>" + r[7] + "</td><td>" + r[8] + "</td></tr>"; }).join("") + "</tbody>";
  }
  var tf = $("#tools-filter");
  [["all", "Усі"], ["easy", "Для нетехнічних"], ["local", "Працюють з файлами на комп'ютері"], ["open", "Відкритий код"]].forEach(function (f) {
    var b = el("button", { class: "chip", "aria-pressed": f[0] === filt ? "true" : "false", text: f[1] });
    b.onclick = function () { filt = f[0]; Array.prototype.forEach.call(tf.children, function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); }); renderTools(); };
    tf.appendChild(b);
  });
  renderTools();
  try { new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { mark("tools"); o.disconnect(); } }); }, { threshold: 0.3 }).observe($("#tools-tbl")); } catch (e) {}

  /* ---------- 7. start ---------- */
  function renderSteps() {
    var S = ts(); S.steps = S.steps || {};
    var all = [
      ["Встанови застосунок Claude і відкрий вкладку Code", "<p>Завантаж застосунок з <a href='https://claude.com/download' target='_blank' rel='noopener'>claude.com/download</a> і ввійди. Потрібна платна підписка Pro, Max, Team або Enterprise: на безкоштовному плані Claude Code недоступний. У бічній панелі обери вкладку <b>Code</b>. Термінал і програмування не потрібні.</p>", null, "<b>Інші інструменти</b> (кроки ті самі, лише файл правил називай AGENTS.md):<span class='dl'><a href='https://chatgpt.com/download' target='_blank' rel='noopener'>ChatGPT з Codex ↗</a><a href='https://github.com/features/copilot/cli' target='_blank' rel='noopener'>GitHub Copilot CLI ↗</a><a href='https://antigravity.google' target='_blank' rel='noopener'>Google Antigravity ↗</a><a href='https://goose-docs.ai' target='_blank' rel='noopener'>Goose, відкритий код ↗</a></span>ChatGPT і Copilot мають безкоштовний план, Antigravity безкоштовний для приватних осіб, Goose безкоштовний, але потребує оплати моделі. Повний перелік з цінами на етапі 6."],
      ["Створи порожню папку й відкрий її", "<p>Створи на комп'ютері папку <span class='mono'>Навчальний_проєкт</span>. У застосунку натисни <b>+ New</b> (нова сесія). Під полем вводу залиш <b>Local</b>, тобто роботу з файлами на твоєму комп'ютері. Натисни кнопку вибору папки, обери <b>Open folder…</b> і вкажи цю папку. Агент бачитиме лише її.</p><p>Далі в кожному кроці натисни «Скопіювати», встав текст у поле вводу й надішли. Коли агент питає дозволу, прочитай запит і погодь або відхили його.</p>", null]
    ].concat(T.bPrompts.map(function (p) { return [p[0], "<p>" + p[1] + "</p>", p[2]]; }));
    var stl = $("#steps"); stl.innerHTML = "";
    all.forEach(function (s, i) {
      var li = el("li", { class: S.steps[i] ? "done" : "" });
      var c = el("input", { type: "checkbox", id: "st-" + i, "aria-label": "Виконано: " + s[0] }); c.checked = !!S.steps[i];
      c.onchange = function () { S.steps[i] = c.checked; li.classList.toggle("done", c.checked); save(); prog(); if (Object.keys(S.steps).filter(function (k) { return S.steps[k]; }).length >= 3) mark(null, "plan"); };
      li.appendChild(c);
      var body = el("div", { class: "body" }); var hh = el("h3"); hh.appendChild(el("label", { for: "st-" + i, text: (i + 1) + ". " + s[0] })); body.appendChild(hh); body.appendChild(el("div", null, s[1]));
      if (s[2]) { var p = el("div", { class: "prompt" }); p.appendChild(el("pre", { id: "pr-" + i, text: s[2] })); p.appendChild(el("button", { class: "btn small copy", "data-copy": "pr-" + i, text: "Скопіювати" })); body.appendChild(p); }
      if (s[3]) body.appendChild(el("p", { class: "alt" }, s[3]));
      li.appendChild(body); stl.appendChild(li);
    });
    function prog() { var n = Object.keys(S.steps).filter(function (k) { return S.steps[k]; }).length; $("#steps-prog").style.width = (n / all.length * 100) + "%"; $("#steps-n").textContent = n + " з " + all.length; }
    prog();
    $("#c-warn").innerHTML = T.warn;
  }
  function renderGen() {
    var S = ts(); S.gen = S.gen || {};
    var gen = $("#gen"); gen.innerHTML = "";
    T.gen.forEach(function (g, i) {
      var l = el("label", { class: i === T.gen.length - 1 && T.gen.length % 2 ? "full" : "" }); l.appendChild(el("span", { text: g[1] }));
      var inp = el("input", { type: "text", id: "g-" + track + "-" + g[0] }); inp.value = S.gen[g[0]] != null ? S.gen[g[0]] : g[2];
      inp.oninput = function () { S.gen[g[0]] = inp.value; save(); out(); };
      l.appendChild(inp); gen.appendChild(l);
    });
    function out() {
      var v = {}; T.gen.forEach(function (g) { var x = ($("#g-" + track + "-" + g[0]).value || "").trim(); v[g[0]] = x || "[заповни]"; });
      $("#out-claude").textContent = T.genClaude(v); $("#out-skill").textContent = T.genSkill(v);
    }
    $("#out-skill-path").textContent = ".claude/skills/" + T.skill + "/SKILL.md";
    $("#gen-alt").innerHTML = "Якщо працюєш у Claude Code, цей абзац можна пропустити. Для Codex, Antigravity чи GitHub Copilot назви файл правил <code>AGENTS.md</code>. Claude Code теж його прочитає, якщо поруч немає CLAUDE.md. Навичку для Codex та Antigravity поклади в <code>.agents/skills/" + T.skill + "/SKILL.md</code>.";
    out();
    var p = $("#plan30"); p.innerHTML = "";
    for (var i = 0; i < 4; i++) p.appendChild(el("div", { class: "card" }, "<span class='w'>Тиждень " + (i + 1) + "</span><h3>" + T.plan[i * 2] + "</h3><p style='font-size:14.5px'>" + T.plan[i * 2 + 1] + "</p>"));
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    var src = document.getElementById(b.getAttribute("data-copy")); if (!src) return;
    var txt = src.textContent, old = b.textContent;
    function selectIt() { var r = document.createRange(); r.selectNodeContents(src); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Виділено, натисни Ctrl+C"; setTimeout(function () { b.textContent = old; }, 2500); }
    try { navigator.clipboard.writeText(txt).then(function () { b.textContent = "Скопійовано ✓"; setTimeout(function () { b.textContent = old; }, 1800); }, selectIt); } catch (err) { selectIt(); }
  });

  var TEST = [["Для задачі потрібно більше ніж два-три файли?", 2], ["Задача повторюється: щомісяця, щокварталу?", 2], ["Треба звіряти цифри, норми чи джерела між документами?", 2], ["Результатом має бути файл (.docx, .xlsx), а не відповідь у вікні чату?", 1], ["Одну й ту саму дію треба зробити з багатьма файлами?", 2], ["Це радше швидке питання або пошук ідей?", -4]];
  store.test = store.test || {};
  var tbx = $("#test");
  TEST.forEach(function (q, i) {
    var r = el("div", { class: "row qrow" }); r.appendChild(el("span", { text: q[0] }));
    var g = el("div", { class: "row", role: "group", "aria-label": q[0] });
    ["Так", "Ні"].forEach(function (lab, j) {
      var b = el("button", { class: "chip", "aria-pressed": store.test[i] === j ? "true" : "false", text: lab });
      b.onclick = function () { store.test[i] = j; save(); Array.prototype.forEach.call(g.children, function (c, k) { c.setAttribute("aria-pressed", k === j ? "true" : "false"); }); renderTest(); };
      g.appendChild(b);
    });
    r.appendChild(g); tbx.appendChild(r);
  });
  function renderTest() {
    var answered = Object.keys(store.test).length, out = $("#test-out");
    if (answered < TEST.length) { out.innerHTML = "<p class='meta'>Відповідей: " + answered + " з " + TEST.length + ".</p>"; return; }
    var score = 0; TEST.forEach(function (q, i) { if (store.test[i] === 0) score += q[1]; });
    var lv = score <= 0 ? 0 : score <= 3 ? 1 : score <= 6 ? 2 : 3;
    var rec = [["Чат", "Твоя задача не потребує файлів і повторення. Звичайна розмова з ШІ буде найшвидшою. Бригаду, щоб замінити лампочку, не викликають."], ["Проєкти", "У Claude чи ChatGPT створи проєкт (розділ Projects) і поклади туди постійні документи та інструкції. Тоді не доведеться пояснювати все щоразу."], ["Агент документів", "Дай агентові папку з файлами. Він збере результат сам, а ти перевіриш. Підійдуть Claude з режимом Cowork або ChatGPT Work."], ["Агент повної дії", "Задача повторюється, має багато файлів і потребує перевірок. Зроби файл правил і навичку в Claude Code, Codex або Copilot."]][lv];
    out.innerHTML = "<div class='result'><span class='eyebrow'>Рекомендація</span><h3 style='margin:4px 0 6px;font-size:22px'>Рівень " + (lv + 1) + ": " + rec[0] + "</h3><p>" + rec[1] + "</p><div class='mini-ladder'>" + [0, 1, 2, 3].map(function (i) { return "<span class='" + (i === lv ? "on" : "") + "' style='height:" + (22 + i * 14) + "px'></span>"; }).join("") + "</div></div>";
    mark("start");
  }
  renderTest();
  $("#explain").value = store.explain || "";
  $("#explain").oninput = function () { store.explain = this.value; save(); };
  $("#explain-show").onclick = function () { $("#explain-ex").hidden = false; };
  $("#reset").onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };

  /* ---------- reveal on scroll (content stays visible at rest) ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12 });
    document.querySelectorAll(".stage-head").forEach(function (n) { n.classList.add("rv"); io.observe(n); });
  }

  function openBonus(scroll) { var bs = $("#bonus"); bs.hidden = false; store.bonus = true; save(); emit("app:bonus", { go: !!scroll }); var n = $("#net"); if (n && reduce && n.pauseAnimations) n.pauseAnimations(); }
  $("#egg").onclick = function () { openBonus(true); };
  $("#egg-big").onclick = function () { openBonus(true); };
  var SRC = [
    ["CLAUDE.md", "правила проєкту", "Правила проєкту для агента: структура, як збирати й перевіряти, правила змісту й текстів, чого не робити. Курс сам працює за тим, чого вчить. Агент читає цей файл на початку кожної сесії.", "основна сесія", ["Будь-хто може продовжити роботу без цієї розмови", "Посилання на сторінку й документ з аналізом"]],
    [".claude/skills/", "навички проєкту", "Три рецепти: /qa перевіряє всі модулі, /publish публікує за тим самим посиланням, /refresh-tools щокварталу оновлює карту інструментів.", "основна сесія", ["Кожна навичка є звичайним текстовим файлом SKILL.md", "Той самий принцип, що й /zvit у курсі"]],
    ["docs/", "журнал рішень і дослідження", "Журнал рішень з датами, правила текстів, схема файлу треку і стислі висновки досліджень: курси, методика, інструменти, юридична техніка, інтерфейс, робочий контекст.", "основна сесія за звітами субагентів", ["Знання з досліджень більше не живе лише в розмові", "Без реальних даних: лише узагальнені патерни"]],
    ["vid-chatu-do-agenta.html", "готова сторінка", "Те, що ти зараз читаєш. Її збирає програма автоматично, руками її ніхто не правив.", "build.py", ["Один файл: стилі, розмітка, дані й логіка разом", "Саме його опубліковано за посиланням"]],
    ["src/head.html", "стилі", "Кольори для світлої й темної теми, шрифти, анімації схем, адаптація під телефон.", "основна сесія + правки дизайн-рецензента", ["Кольори задані змінними, тож обидві теми беруть їх з одного місця", "Окремі правила вимикають анімації для тих, кому вони заважають"]],
    ["src/body.html", "розмітка", "Каркас семи етапів, усі схеми SVG, бонус. Тексти тут спільні для всіх треків.", "основна сесія + редактор спільних текстів", ["Схеми намальовані кодом, а не картинками, тому працюють у темній темі", "Вміст, що залежить від треку, двигун підставляє сам"]],
    ["src/engine.js", "двигун", "Уся інтерактивність: симулятор чату й агента, лічильники, вправи з перевіркою, навичка з помилкою, прогрес, перемикання треків.", "основна сесія", ["Читає дані активного треку й будує з них екрани", "Прогрес зберігає лише у твоєму браузері"]],
    ["src/deck.js", "презентація", "Показує курс слайдами: вітальне вікно, прогрес, досягнення з конфеті, сертифікат, промпт для будь-якого ШІ і стіну анонімних пропозицій.", "основна сесія", ["Працює поверх двигуна й не знає, як влаштовані вправи", "Оформлення з відкритих наборів: кольори й розміри з shadcn/ui, шрифт Geist, плавність анімацій з Open Props"]],
    ["src/track_pm.js", "трек менеджерів", "Сценарій проміжного звіту: файли папки, пастки, кроки агента, вправи, запити для старту.", "автор-субагент → редактор → аудитор «новачок»", ["Понад 40 полів за спільною схемою", "Цифри узгоджені в усіх вправах"]],
    ["src/track_an.js", "трек аналітиків", "Сценарій аналітичної записки: вигрузка опитування з повторами, джерела, якість даних.", "автор-субагент → редактор → аудитор «новачок»", ["Та сама схема полів, інший зміст", "Ланцюжок розрахунку показано крок за кроком"]],
    ["src/track_law.js", "трек юристів", "Сценарій змін до Порядку: дві редакції, перенумерація, порівняльна таблиця, зауваження ЦОВВ.", "автор-субагент → редактор → аудитор «новачок» + перевірка юртехніки", ["Формули юридичної техніки звірено з посібником ВРУ", "Усі акти вигадані"]],
    ["src/build.py", "збірка", "Склеює стилі, розмітку, дані й двигун в одну сторінку і підставляє кількість рядків у цей розбір.", "основна сесія", ["Запускається однією командою", "Після нього сторінку публікують знову за тим самим посиланням"]],
    ["src/qa.sh, qa_test.js", "автотест", "Проходить усі модулі трьох треків у браузері без вікна на ширині десктопа й телефона і звітує про помилки.", "основна сесія", ["Запускається після кожної правки", "Ловить і зламану логіку, і горизонтальне прокручування"]]
  ];
  var srcCur = 0;
  function renderSrc() {
    var t = $("#src-tree"); if (!t) return; t.innerHTML = "";
    t.appendChild(el("div", { class: "dim", text: "📁 vid-chatu-do-agenta/" }));
    SRC.forEach(function (f, i) {
      var b = el("button", { "aria-pressed": i === srcCur ? "true" : "false" }, (f[0].indexOf("src/") === 0 ? "&nbsp;&nbsp;" : "") + "📄 " + f[0].replace("src/", "src/") + "<span class='note-s'>" + f[1] + "</span>");
      b.onclick = function () { srcCur = i; renderSrc(); }; t.appendChild(b);
    });
    var f = SRC[srcCur], n = (window.SRC_LINES || {})[f[0].replace("src/", "")];
    $("#src-view").innerHTML = "<span class='eyebrow'>" + f[1] + "</span><h3 class='mono' style='font-size:16px'>" + f[0] + "</h3><p>" + f[2] + "</p><ul>" + f[4].map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul><div class='src-meta'>" + (n ? "<span>" + n + " рядків</span>" : "") + "<span>писав: " + f[3] + "</span></div>";
  }
  renderSrc();
  if (store.bonus) openBonus(false);
  var _mark = mark;
  mark = function (a, b, c) { _mark(a, b, c); if (!store.bonus && STAGES.every(function (s) { return store.done[s[0]]; }) && !$("#egg-toast")) { var t = el("div", { class: "egg-toast", id: "egg-toast" }, "<span>Усі етапи пройдено. Для тебе відкрито бонус: як зроблено цей інструмент.</span>"); var bb = el("button", { class: "btn primary small", text: "Подивитися" }); bb.onclick = function () { openBonus(true); t.remove(); }; t.appendChild(bb); $("#start .stack").appendChild(t); } emit("app:mark", { stage: a, sys: b }); };

  /* ---------- first session: mockup + task anatomy ---------- */
  var TASKS = {
    pm: { out: "04_Чернетка/Outputs_P2.docx", bad: "Напиши звіт за другий період.", parts: [
      "Підготуй чернетку розділу Outputs проміжного звіту за період 2 (01.03–31.07.2026), щоб до п'ятниці погодити її з керівником.",
      "Матеріали в папці: чинна лограмка в 01_Договір, трекер і витрати в 03_Дані, місячні звіти в 02_Джерела.",
      "Результат: файл 04_Чернетка/Outputs_P2.docx за шаблоном донора, з англійськими заголовками Output 1.1 і далі.",
      "Кожен Output пиши за схемою Problem → Solution → Next steps. Біля кожної цифри вкажи файл і дату.",
      "Перед тим як писати, звір трекер з чинною лограмкою, а дати продуктів з кінцем періоду.",
      "Якщо джерела розходяться або даних немає, не вирішуй сам: зупинись і спитай мене. Нічого не надсилай донору."] },
    an: { out: "zapysky/Записка_реєстр.docx", bad: "Зроби аналітику по майстернях.", parts: [
      "Підготуй аналітичну записку до трьох сторінок для Міністерства стратегічних ресурсів: чи запускати реєстр сертифікації майстерень. Висновки на першій сторінці.",
      "Матеріали в папці матеріали/: вигрузка опитування, звіт Асоціації «Ковальня», реєстр джерел і лист міністерства.",
      "Результат: файл zapysky/Записка_реєстр.docx за шаблоном, з окремим розділом «Якість даних».",
      "Цифри рахуй лише з первинної вигрузки, біля кожного відсотка вказуй n і дату вивантаження. Персональних даних у тексті бути не має.",
      "Перед розрахунком перевір повтори й тестові рядки, а також чи всі джерела з реєстру є в папці.",
      "Якщо треба виключати рядки або джерела суперечать одне одному, спитай мене. Вихідні файли не змінюй."] },
    law: { out: "Проєкт_змін_v4.docx", bad: "Напиши зміни до Порядку про строки.", parts: [
      "Підготуй пакет змін до Порядку видачі допуску до робіт «Щит-Сервіс»: скоротити строк розгляду заяви до п'яти робочих днів і дозволити подання через представника.",
      "Матеріали: обидві редакції Порядку, проєкт змін v3, порівняльна таблиця v2, інструкція з нормопроєктування і зауваження ЦОВВ.",
      "Результат: проєкт постанови, порівняльна таблиця й пояснювальна записка окремими файлами.",
      "Формули бери з інструкції з нормопроєктування. Нові пункти вставляй з індексом, без перенумерації.",
      "Спершу визнач останню редакцію за датою, перевір усі відсилки й звір таблицю з проєктом.",
      "Щодо кожного неопрацьованого зауваження ЦОВВ дай мені варіанти й зупинись. Файли чинних редакцій не змінюй."] }
  };
  var PT_LBL = ["Мета: що й навіщо", "Матеріали: де лежать", "Результат: формат і куди", "Правила: як писати", "Перевірка: що звірити", "Стоп: де спитати тебе"];
  var mockI = 0, ptMode = "good";
  function sideHtml(hotCode) { return "<div class='app-side'><div class='tab'>Чат</div><div class='tab'>Cowork</div><div class='tab " + (hotCode ? "cur hot" : "cur") + "'>Code" + (hotCode ? "<span class='badge'>1</span>" : "") + "</div><div class='new'>+ New</div><div class='sess'>Сьогодні</div><div class='sess'>Навчальний_проєкт</div></div>"; }
  function barHtml(hotCh) { return "<div class='app-bar'><span class='dots'><i></i><i></i><i></i></span><span class='ttl'>Claude</span>" + (hotCh ? "<span class='tb hot'>Changes +12 −1<span class='badge'>7</span></span>" : "<span class='tb'>Changes</span>") + "</div>"; }
  function rowHtml(open) {
    var folder = "<span class='ctl" + (open === "folder" ? " hot" : "") + "'>📁 " + (mockI >= 2 ? "Навчальний_проєкт" : "Обери папку") + " ▾" + (open === "folder" ? "<span class='badge'>2</span><div class='menu'><div class='cur'>Open folder…<small>обрати папку на комп'ютері</small></div><div>Навчальний_проєкт<small>нещодавні</small></div></div>" : "") + "</span>";
    var modeLbl = (mockI >= 2 && mockI <= 4) ? "Plan" : "Manual"; var perm = "<span class='ctl" + (open === "perm" ? " hot" : "") + "'>" + modeLbl + " ▾" + (open === "perm" ? "<span class='badge'>3</span><div class='menu'><div>Manual<small>питає перед кожною зміною файлу чи командою</small></div><div>Accept edits<small>сам змінює файли в папці</small></div><div class='cur'>Plan<small>спершу вивчає матеріали й пропонує план, нічого не змінює</small></div><div>Auto<small>діє сам, ризиковані дії блокуються</small></div></div>" : "") + "</span>";
    return "<div class='prow'><span class='ctl'>💻 Local ▾</span>" + folder + perm + "<span class='sp'></span><span class='ctl'>Модель ▾</span></div>";
  }
  function goodPrompt() { return TASKS[track].parts.join(" "); }
  var MOCK = [
    ["Відкрий вкладку Code", "У бічній панелі застосунку Claude обери <b>Code</b>. Якщо вкладки показано іконками, наведи на них курсор, щоб побачити назви. Кожна окрема розмова з агентом тут називається сесією. Нову відкриває кнопка <b>+ New</b> (нова сесія).", function () { return barHtml() + "<div class='app-body'>" + sideHtml(true) + "<div class='app-main'><p class='hello'>Над чим працюємо?</p><div class='pbox'><div class='ph'>Опиши задачу…</div>" + rowHtml() + "</div></div></div>"; }],
    ["Обери папку проєкту", "Під полем вводу залиш <b>Local</b>: агент працюватиме з файлами на твоєму комп'ютері. Натисни кнопку вибору папки, у меню обери <b>Open folder…</b> і вкажи папку. Агент бачитиме лише її. Для початку обери папку з копіями файлів, а не домашню папку чи всі документи.", function () { return barHtml() + "<div class='app-body'>" + sideHtml() + "<div class='app-main'><p class='hello'>Над чим працюємо?</p><div class='pbox'><div class='ph'>Опиши задачу…</div>" + rowHtml("folder") + "</div></div></div>"; }],
    ["Для великої задачі обери Plan", "Задача на кілька документів? Спершу обери режим <b>Plan</b>. У ньому агент лише вивчає матеріали й пропонує план, нічого не змінюючи. Для маленької правки підійде <b>Manual</b>: агент питатиме перед кожною зміною.", function () { return barHtml() + "<div class='app-body'>" + sideHtml() + "<div class='app-main'><p class='hello'>Над чим працюємо?</p><div class='pbox'><div class='ph'>Опиши задачу…</div>" + rowHtml("perm") + "</div></div></div>"; }],
    ["Опиши задачу", "Напиши задачу звичайними словами, як колезі, який уперше чує про проєкт. Що має бути в доброму описі, показано нижче, у блоці «Як описати задачу агенту».", function () { return barHtml() + "<div class='app-body'>" + sideHtml() + "<div class='app-main'><div class='pbox hot' style='position:relative'><span class='badge'>4</span><div class='ph typed'>" + goodPrompt() + "</div>" + rowHtml() + "</div></div></div>"; }],
    ["Перевір і виправ план", "<b>Від цього кроку залежить результат.</b> План показує, як агент зрозумів задачу, ще до того, як він щось змінив. Перевір, чи взято всі файли, чи враховано пастки й порядок дій. Виправ словами, наприклад «спершу визнач останню редакцію». Виправити план займає хвилину, переробити п'ятнадцять файлів займає годину. Коли план правильний, погодь його.", function () { var st = T.steps.slice(0, 5).map(function (x) { return "<li>" + x + "</li>"; }).join(""); return barHtml() + "<div class='app-body'>" + sideHtml() + "<div class='app-main'><div class='amsg u'>" + goodPrompt().slice(0, 90) + "…</div><div class='amsg plan hot' style='position:relative'><span class='badge'>5</span><b>План (поки нічого не змінено):</b><ol>" + st + "</ol><div class='pb'><span class='y'>✓ Погодити план</span><span>✎ Виправити</span></div></div><div class='pbox'><div class='ph typed'>Добре, але спершу перевір, чи немає новішої редакції, і лише потім пиши текст.</div>" + rowHtml() + "</div></div></div>"; }],
    ["Погоджуй зміни", "Після погодження плану агент береться до роботи й питає дозволу перед кожним записом файлу. Прочитай зміну й погодь або відхили її. Якщо відхиляєш, одразу напиши, як треба, і агент це врахує. Точні підписи кнопок у твоїй версії можуть відрізнятися.", function () { return barHtml() + "<div class='app-body'>" + sideHtml() + "<div class='app-main'><div class='amsg'>План погоджено. Виконую крок 1 з 5.</div><div class='perm hot'><span class='badge'>6</span><b>Агент хоче створити файл " + TASKS[track].out + "</b><div class='diff'><span class='add'>+ 48 нових рядків</span></div><div class='pb'><span class='y'>✓ Погодити</span><span>✕ Відхилити</span></div></div></div></div>"; }],
    ["Переглянь зміни", "Кнопка <b>Changes</b> угорі показує всі зміни у файлах. Натисни потрібний рядок у файлі, лиши коментар, і агент переробить саме це місце.", function () { return barHtml(true) + "<div class='app-body'>" + sideHtml() + "<div class='app-main'><div class='amsg'>Готово: " + TASKS[track].out + ". Три місця потребують твого рішення, список нижче.</div><div class='pbox'><div class='ph'>Відповісти агенту…</div>" + rowHtml() + "</div></div></div>"; }]
  ];
  function renderMock() {
    var M = MOCK[mockI];
    $("#mock").innerHTML = M[2]();
    $("#mock-cap").innerHTML = "<b>Крок " + (mockI + 1) + ".</b> " + M[1];
    $("#mock-step-lbl").textContent = (mockI + 1) + "/" + MOCK.length + " · " + M[0];
    $("#mock-prev").disabled = mockI === 0;
    $("#mock-next").textContent = mockI === MOCK.length - 1 ? "Спочатку ↺" : "Далі →";
    var d = $("#mock-dots"); d.innerHTML = ""; MOCK.forEach(function (x, i) { var dot = el("button", { class: i === mockI ? "on" : "", "aria-label": "Крок " + (i + 1) }); dot.onclick = function () { mockI = i; renderMock(); }; d.appendChild(dot); });
    if ($("#mock .hot")) $("#mock-cap").innerHTML += " <span class='mock-tap'>Натисни підсвічене місце.</span>";
  }
  $("#mock").addEventListener("click", function (e) { if (e.target.closest(".hot")) $("#mock-next").click(); });
  $("#mock-prev").onclick = function () { if (mockI > 0) { mockI--; renderMock(); } };
  $("#mock-next").onclick = function () { mockI = mockI === MOCK.length - 1 ? 0 : mockI + 1; renderMock(); };
  var ptg = $("#pt-toggle");
  [["bad", "Як пишуть зазвичай"], ["good", "Як писати, щоб агент зрозумів"]].forEach(function (o) {
    var b = el("button", { class: "chip", "aria-pressed": o[0] === ptMode ? "true" : "false", text: o[1] });
    b.onclick = function () { ptMode = o[0]; Array.prototype.forEach.call(ptg.children, function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); }); renderPT(); };
    ptg.appendChild(b);
  });
  var ptPin = -1;
  function renderPT() {
    var P = TASKS[track], lg = $("#pt-legend"), tx = $("#pt-text");
    lg.innerHTML = ""; PT_LBL.forEach(function (l, i) { var s = el("span", { class: "c" + i, text: l, tabindex: "0" }); var on = function () { var m = tx.querySelector(".miss"); if (m) { m.classList.add("hl"); return; } tx.classList.add("dim"); tx.querySelectorAll(".seg").forEach(function (g) { g.classList.toggle("on", g.getAttribute("data-i") === String(i)); }); }; var off = function () { if (ptPin === i) return; var m = tx.querySelector(".miss"); if (m) m.classList.remove("hl"); tx.classList.remove("dim"); }; s.setAttribute("role", "button"); if (ptPin === i) { s.classList.add("pin"); setTimeout(on, 0); } s.onclick = function () { ptPin = ptPin === i ? -1 : i; renderPT(); }; s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); s.click(); } }); s.addEventListener("mouseenter", on); s.addEventListener("focus", on); s.addEventListener("mouseleave", off); s.addEventListener("blur", off); lg.appendChild(s); });
    if (ptMode === "bad") tx.innerHTML = "«" + P.bad + "»<span class='miss'>Тут немає жодної з шести частин. Агент вгадуватиме, які файли брати, у якому форматі писати й що перевіряти. І нічого не спитає, бо не знає, де зупинитися.</span>";
    else tx.innerHTML = P.parts.map(function (p, i) { return "<span class='seg c" + i + "' data-i='" + i + "'>" + p + "</span>"; }).join(" ");
    var g = $("#pt-gen"); g.innerHTML = "";
    PT_LBL.forEach(function (l, i) { var lab = el("label", { class: "full" }); lab.appendChild(el("span", { text: l })); var ta = el("textarea", { id: "pt-" + i }); ta.value = P.parts[i]; ta.oninput = ptOut; lab.appendChild(ta); g.appendChild(lab); });
    ptOut();
  }
  function ptOut() { var a = []; for (var i = 0; i < 6; i++) { var v = ($("#pt-" + i) || {}).value; if (v && v.trim()) a.push(v.trim()); } $("#pt-out").textContent = a.join("\n"); }

  /* ---------- birth of an agent ---------- */
  var birthI = 0;
  function birthData() {
    var cl = T.files["CLAUDE.md"][1].replace(/<[^>]+>/g, "").split("\n").filter(function (l) { return l.trim(); }).slice(0, 5).join("\n");
    var sk = T.files[Object.keys(T.files)[1]][1].replace(/<[^>]+>/g, "").split("\n").filter(function (l) { return /^\d\./.test(l); }).slice(0, 3).join("\n");
    return [
      { t: "0. Відкрили папку", say: "Нічого не пишеш. Просто відкриваєш Claude Code і обираєш папку з документами.", files: [], can: ["Читає й пише файли в цій папці", "Виконує кроки й перевіряє себе", "<i>Нічого не знає про твій проєкт, донора чи правила. Як новенький у перший день</i>"] },
      { t: "1. Пояснили правила", say: "«Запиши в CLAUDE.md правила цього проєкту: хто донор, як оформлюємо цифри, звідки беремо джерела, чого не робити.»", files: [["CLAUDE.md", "правила проєкту", cl + "\n…"]], can: ["Усе з кроку 0", "<b>Щоразу сам читає твої правила</b>", "Не треба пояснювати проєкт заново в кожній розмові"] },
      { t: "2. Зберегли рецепт", say: "«Перетвори те, що ми щойно зробили, на навичку /" + T.skill + ".»", files: [["CLAUDE.md", "правила проєкту", ""], [".claude/skills/" + T.skill + "/SKILL.md", "рецепт задачі", sk + "\n…"]], can: ["Усе з кроків 0 і 1", "<b>Нова команда: /" + T.skill + "</b>", "Робить твою задачу за записаним рецептом однією командою"] }
    ];
  }
  function renderBirth() {
    var D = birthData(), S = D[birthI], tabs = $("#birth-tabs"); if (!tabs) return;
    tabs.innerHTML = ""; D.forEach(function (d, i) { var b = el("button", { class: "chip", role: "tab", "aria-selected": i === birthI ? "true" : "false", "aria-pressed": i === birthI ? "true" : "false", text: d.t }); b.onclick = function () { birthI = i; renderBirth(); }; tabs.appendChild(b); });
    $("#birth-say").innerHTML = "<p>" + S.say + "</p>";
    var tr = "<div class='dim'>📁 твоя папка/</div><div class='dim'>&nbsp;&nbsp;📄 твої документи…</div>";
    S.files.forEach(function (f, i) { var isNew = (birthI === 1 && i === 0) || (birthI === 2 && i === 1); tr += "<div class='bf" + (isNew ? " new" : "") + "'>&nbsp;&nbsp;📄 <b class='mono'>" + f[0] + "</b> <span class='meta'>" + f[1] + (isNew ? ", новий" : "") + "</span>" + (f[2] && isNew ? "<pre class='file'>" + f[2] + "</pre>" : "") + "</div>"; });
    if (!S.files.length) tr += "<p class='meta'>Жодного файлу агента ще немає.</p>";
    $("#birth-tree").innerHTML = tr;
    $("#birth-can").innerHTML = "<ul>" + S.can.map(function (c) { return "<li>" + c + "</li>"; }).join("") + "</ul>";
    $("#birth-prev").disabled = birthI === 0;
    $("#birth-next").textContent = birthI === D.length - 1 ? "Спочатку ↺" : "Далі →";
    $("#birth-sum").hidden = birthI !== D.length - 1;
  }
  $("#birth-prev").onclick = function () { if (birthI > 0) { birthI--; renderBirth(); } };
  $("#birth-next").onclick = function () { birthI = birthI === 2 ? 0 : birthI + 1; renderBirth(); };

  /* ---------- dependency map (bonus) ---------- */
  var DEP_COLS = ["Правила", "Дослідження", "Навички", "Джерела сторінки", "Збірка й тести", "Результат"];
  var DEP_N = [
    ["claude", 0, "CLAUDE.md", "Головні правила проєкту для агента: структура, порядок роботи, правила змісту, чого не робити. Агент читає його на початку кожної сесії."],
    ["readme", 0, "README.md", "Короткий опис для людей: що це за практикум і як його змінити."],
    ["dec", 0, "decisions.md", "Журнал рішень з датами й причинами. Сюди потрапляє кожна суттєва зміна."],
    ["style", 0, "style-guide.md", "Правила текстів: без тире й канцеляриту, як пояснювати терміни."],
    ["wall", 0, "wall-setup.md", "Як підключити стіну пропозицій: форма, модерація, публічна таблиця."],
    ["schema", 0, "track-schema.md", "Опис усіх полів файлу треку і де вони видні на сторінці."],
    ["rcour", 1, "courses.md", "Висновки з аналізу 13 наявних курсів: що взяли й чого уникали."],
    ["rmeth", 1, "methodology.md", "Методика навчання через дію з джерелами."],
    ["rtool", 1, "tools-2026-10.md", "Карта агентних інструментів, звірена 23.10.2026."],
    ["rlaw", 1, "legal-technique.md", "Перевірені формули юридичної техніки для треку юристів."],
    ["rui", 1, "ui-claude-desktop.md", "Що підтверджено документацією про інтерфейс Claude, а що ні."],
    ["rwork", 1, "work-context.md", "Типові документи й пастки робочих процесів ГО, без реальних даних."],
    ["sqa", 2, "/qa", "Навичка перевірки: збирає сторінку, проганяє автотест, шукає реальні дані."],
    ["spub", 2, "/publish", "Навичка публікації за тим самим посиланням із записом у журнал."],
    ["sref", 2, "/refresh-tools", "Навичка щоквартального оновлення карти інструментів."],
    ["head", 3, "head.html", "Оформлення: кольори для двох тем, шрифти, анімації, адаптація під телефон."],
    ["body", 3, "body.html", "Розмітка семи етапів, схеми й бонус. Спільні тексти."],
    ["engine", 3, "engine.js", "Двигун: симулятор, вправи, макети застосунку, прогрес, перемикання треків."],
    ["deck", 3, "deck.js", "Презентація: вітальне вікно, слайди, досягнення, сертифікат, промпт для ШІ, стіна пропозицій."],
    ["tpm", 3, "track_pm.js", "Трек менеджерів: проміжний звіт донору."],
    ["tan", 3, "track_an.js", "Трек аналітиків: аналітична записка."],
    ["tlaw", 3, "track_law.js", "Трек юристів: зміни до Порядку."],
    ["build", 4, "build.py", "Склеює оформлення, розмітку, дані й двигун в одну сторінку."],
    ["qash", 4, "qa.sh", "Запускає збірку й автотест на ширині комп'ютера й телефону."],
    ["qatest", 4, "qa_test.js", "Сам автотест: проходить усі модулі трьох треків, як учасник."],
    ["apply", 4, "apply_repl.py", "Вносить списки точних замін від рецензентів у вихідні файли."],
    ["launch", 4, "launch.json", "Локальний сервер для перегляду й тестів."],
    ["html", 5, "vid-chatu-do-agenta.html", "Зібрана сторінка. Руками її ніхто не править."],
    ["page", 5, "Сторінка за посиланням", "Опублікована версія практикуму, яку відкривають учасники."],
    ["doc", 5, "Документ з аналізом", "Аналіз, методика й рішення для колег."]
  ];
  var DEP_T = { rule: ["правила", "#8a5cc2"], data: ["зміст і дані", "#2f6fb3"], build: ["збірка", "var(--accent)"], test: ["перевірка", "var(--manual)"], pub: ["публікація", "#b3407a"] };
  var DEP_E = [
    ["readme","claude","rule"],["claude","style","rule"],["claude","schema","rule"],["claude","dec","rule"],["claude","sqa","rule"],["claude","spub","rule"],["claude","sref","rule"],["claude","build","rule"],
    ["style","body","rule"],["style","engine","rule"],["style","tpm","rule"],["style","tan","rule"],["style","tlaw","rule"],
    ["schema","engine","rule"],["schema","tpm","rule"],["schema","tan","rule"],["schema","tlaw","rule"],
    ["rwork","tpm","data"],["rwork","tan","data"],["rwork","tlaw","data"],["rlaw","tlaw","data"],["rtool","engine","data"],["rui","engine","data"],["rcour","body","data"],["rmeth","body","data"],
    ["rcour","doc","data"],["rmeth","doc","data"],["rtool","doc","data"],
    ["head","build","build"],["body","build","build"],["engine","build","build"],["deck","build","build"],["engine","deck","build"],["wall","deck","rule"],["style","deck","rule"],["tpm","build","build"],["tan","build","build"],["tlaw","build","build"],["build","html","build"],
    ["sqa","qash","test"],["launch","qash","test"],["qash","build","test"],["qash","qatest","test"],["qatest","html","test"],["apply","body","data"],["apply","engine","data"],
    ["sref","rtool","data"],["sref","engine","data"],["html","page","pub"],["spub","page","pub"],["spub","dec","pub"],["spub","doc","pub"],["dec","doc","pub"]
  ];
  var depSel = "claude";
  function renderDep() {
    var svg = $("#dep-svg"); if (!svg) return;
    var cw = 168, nw = 152, nh = 34, top = 44, gap = 46, W = 20 + DEP_COLS.length * cw, rows = {}, pos = {};
    DEP_N.forEach(function (n) { rows[n[1]] = (rows[n[1]] || 0); pos[n[0]] = { x: 14 + n[1] * cw, y: top + rows[n[1]] * gap }; rows[n[1]]++; });
    var H = top + Math.max.apply(null, Object.keys(rows).map(function (k) { return rows[k]; })) * gap + 6;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.style.minWidth = "820px";
    var rel = {}; DEP_E.forEach(function (e) { if (e[0] === depSel || e[1] === depSel) { rel[e[0]] = 1; rel[e[1]] = 1; } });
    var s = "<defs>" + Object.keys(DEP_T).map(function (k) { return "<marker id='dm-" + k + "' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'><path d='M0 0L10 5L0 10z' style='fill:" + DEP_T[k][1] + "'/></marker>"; }).join("") + "</defs>";
    DEP_COLS.forEach(function (c, i) { s += "<text x='" + (14 + i * cw) + "' y='24' class='t-k' style='font-size:11.5px;fill:var(--muted)'>" + c.toUpperCase() + "</text>"; });
    DEP_E.forEach(function (e) {
      var a = pos[e[0]], b2 = pos[e[1]], on = e[0] === depSel || e[1] === depSel, col = DEP_T[e[2]][1];
      var x1, y1 = a.y + nh / 2, x2, y2 = b2.y + nh / 2, d;
      if (a.x === b2.x) { x1 = a.x + nw; x2 = b2.x + nw; d = "M" + x1 + " " + y1 + " C " + (x1 + 22) + " " + y1 + ", " + (x2 + 22) + " " + y2 + ", " + (x2 + 2) + " " + y2; }
      else if (a.x < b2.x) { x1 = a.x + nw; x2 = b2.x; d = "M" + x1 + " " + y1 + " C " + (x1 + 30) + " " + y1 + ", " + (x2 - 30) + " " + y2 + ", " + (x2 - 2) + " " + y2; }
      else { x1 = a.x; x2 = b2.x + nw; d = "M" + x1 + " " + y1 + " C " + (x1 - 30) + " " + y1 + ", " + (x2 + 30) + " " + y2 + ", " + (x2 + 2) + " " + y2; }
      s += "<path data-t='" + e[2] + "' d='" + d + "' fill='none' style='stroke:" + col + ";opacity:" + (on ? 0.95 : 0.13) + "' stroke-width='" + (on ? 2 : 1.2) + "'" + (on ? " marker-end='url(#dm-" + e[2] + ")' class='dep-on'" : "") + "/>";
    });
    DEP_N.forEach(function (n) {
      var p = pos[n[0]], cur = n[0] === depSel, r = rel[n[0]];
      s += "<g class='dep-node" + (cur ? " cur" : r ? " rel" : "") + "' data-id='" + n[0] + "' tabindex='0' role='button' aria-label='" + n[2] + "'><rect x='" + p.x + "' y='" + p.y + "' width='" + nw + "' height='" + nh + "' rx='8'/><text x='" + (p.x + 10) + "' y='" + (p.y + 21) + "' class='t-mono' style='font-size:" + (n[2].length > 19 ? 9.5 : 11.5) + "px'>" + n[2] + "</text></g>";
    });
    svg.innerHTML = s;
    Array.prototype.forEach.call(svg.querySelectorAll(".dep-node"), function (g) { var go = function () { depSel = g.getAttribute("data-id"); renderDep(); }; g.addEventListener("click", go); g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(); } }); });
    var N = DEP_N.filter(function (n) { return n[0] === depSel; })[0], lbl = function (id) { return DEP_N.filter(function (n) { return n[0] === id; })[0][2]; };
    var outs = DEP_E.filter(function (e) { return e[0] === depSel; }), ins = DEP_E.filter(function (e) { return e[1] === depSel; });
    var li = function (arr, k) { return arr.length ? "<ul>" + arr.map(function (e) { return "<li><span class='dep-dot' style='background:" + DEP_T[e[2]][1] + "'></span>" + lbl(e[k]) + " <span class='meta'>(" + DEP_T[e[2]][0] + ")</span></li>"; }).join("") + "</ul>" : "<p class='meta'>немає</p>"; };
    $("#dep-info").innerHTML = "<div class='dh'><span class='eyebrow'>" + DEP_COLS[N[1]] + "</span><h3 class='mono' style='font-size:15px;margin:4px 0'>" + N[2] + "</h3><p>" + N[3] + "</p></div><div><b>Від чого залежить</b>" + li(ins, 0) + "</div><div><b>На що впливає</b>" + li(outs, 1) + "</div>";
  }
  var dl = $("#dep-legend"); if (dl) Object.keys(DEP_T).forEach(function (k) { var b = el("button", { class: "chip", "aria-pressed": "true", style: "border-color:" + DEP_T[k][1], title: "Показати або сховати цей тип зв'язків" }, "<span class='dep-dot' style='background:" + DEP_T[k][1] + "'></span>" + DEP_T[k][0]); b.onclick = function () { var off = $("#dep-svg").classList.toggle("off-" + k); b.setAttribute("aria-pressed", off ? "false" : "true"); }; dl.appendChild(b); });
  renderDep();
  function renderAll() { renderRail(); renderLadder(); resetSim(); pi = 0; renderPredict(); current = null; renderTree(); renderRules(); renderSkill(); renderJudge(); renderSteps(); renderGen(); renderMock(); renderPT(); birthI = 0; renderBirth(); }
  renderAll();
  window.APP = { store: function () { return store; }, T: function () { return T; }, track: function () { return track; }, STAGES: STAGES, save: save, reduce: reduce };
  emit("app:ready");
})();
