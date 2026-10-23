/* Presentation layer over engine.js: intro window, one slide at a time, progress, achievements, finish
   (certificate, prompt for any AI, wall of suggestions). Talks to engine only via window.APP and app:* events. */
(function () {
  "use strict";
  var A = window.APP; if (!A) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = A.reduce;
  var PAGE = "https://tarasinformation.github.io/vid-chatu-do-agenta/";

  /* Wall of suggestions: Google Form (anonymous, no sign-in) + a separate public sheet with approved rows only.
     Fill these after setup, see docs/wall-setup.md. Empty values = the wall shows "coming soon". */
  var WALL = { form: "https://docs.google.com/forms/d/e/1FAIpQLSdUEg-SLd39tqYp0PKYFPY3C8qNrlDH2hN_qOxq3uXEB17d2A/formResponse", entry: "entry.1425467523", sheet: "1S9etO14Bz9nE7KIMgDSj7IlR-C1Pcg0Bis-3p_8A3ls" };

  var DKEY = "vid-chatu-do-agenta-deck";
  var D = {};
  try { D = JSON.parse(localStorage.getItem(DKEY) || "{}") || {}; } catch (e) { D = {}; }
  function dsave() { try { localStorage.setItem(DKEY, JSON.stringify(D)); } catch (e) {} }
  var reset = $("#reset");
  if (reset) reset.addEventListener("click", function () { try { localStorage.removeItem(DKEY); } catch (e) {} }, true);

  /* ---------- achievements ---------- */
  var ACH = [
    ["win", "🏆", "Перша перемога", "Агент зробив те, на що в чаті пішли б десятки копіювань."],
    ["loop", "🔁", "Цикл зрозумілий", "Думає, діє, перевіряє. Жодної магії."],
    ["claude", "📜", "Свій CLAUDE.md", "Агент знає твої правила. І читає їх, на відміну від нас."],
    ["skill", "⚡", "Навичка працює", "Одна команда замість сторінки інструкцій, яку ніхто не дочитував."],
    ["judge", "⚖️", "Тверезе судження", "Тепер ясно, що довірити агенту, а що перевірити власноруч."],
    ["plan", "🚀", "Старт на справжньому агенті", "Три кроки зроблено. Далі легше, кажуть."]
  ];
  var PRAISE = ["Непогано", "Цілком пристойно", "Рух помітний навіть без лупи", "Колеги, мабуть, уже щось підозрюють", "Темп гідний стриманої похвали", "Без зайвого галасу, як і належить"];
  function has(k) {
    var st = A.store();
    if (k === "claude" || k === "skill") { var t = st.t || {}; return Object.keys(t).some(function (x) { return t[x] && t[x][k]; }); }
    return !!(st.done && st.done["sys_" + k]);
  }
  function stageDone(id) { var st = A.store(); return !!(st.done && st.done[id]); }
  if (!D.ach) { D.ach = ACH.filter(function (a) { return has(a[0]); }).map(function (a) { return a[0]; }); D.st = A.STAGES.filter(function (s) { return stageDone(s[0]); }).map(function (s) { return s[0]; }); dsave(); }

  function toast(icon, title, text) {
    var box = $("#toasts"); if (!box) return;
    var t = document.createElement("div"); t.className = "toast";
    var ic = document.createElement("div"); ic.className = "ic"; ic.textContent = icon;
    var tx = document.createElement("div"); var b = document.createElement("b"); b.textContent = title; var s = document.createElement("span"); s.textContent = text;
    tx.appendChild(b); tx.appendChild(s); t.appendChild(ic); t.appendChild(tx); box.appendChild(t);
    setTimeout(function () { t.classList.add("bye"); setTimeout(function () { t.remove(); }, 450); }, 4200);
  }
  function confetti(x, y, n) {
    if (reduce || !document.body.animate) return;
    var cs = getComputedStyle(document.documentElement);
    var cols = ["--accent", "--manual", "--ink", "--good", "--muted"].map(function (v) { return cs.getPropertyValue(v).trim(); });
    for (var i = 0; i < (n || 36); i++) {
      var c = document.createElement("i"); c.className = "confetti"; c.style.background = cols[i % cols.length];
      document.body.appendChild(c);
      var a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
      var dx = Math.cos(a) * v, dy = Math.sin(a) * v - 140;
      var anim = c.animate([
        { transform: "translate(" + x + "px," + y + "px) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + (x + dx) + "px," + (y + dy) + "px) rotate(" + (Math.random() * 540) + "deg)", opacity: 1, offset: .55 },
        { transform: "translate(" + (x + dx * 1.2) + "px," + (y + dy + 380) + "px) rotate(" + (Math.random() * 900) + "deg)", opacity: 0 }
      ], { duration: 1400 + Math.random() * 900, easing: "cubic-bezier(0,0,.3,1)" });
      anim.onfinish = (function (el) { return function () { el.remove(); }; })(c);
    }
  }
  document.addEventListener("app:mark", function () {
    ACH.forEach(function (a) {
      if (D.ach.indexOf(a[0]) < 0 && has(a[0])) { D.ach.push(a[0]); toast(a[1], "Досягнення: " + a[2], a[3]); confetti(window.innerWidth - 190, 90, 30); }
    });
    A.STAGES.forEach(function (s, i) {
      if (D.st.indexOf(s[0]) < 0 && stageDone(s[0])) { D.st.push(s[0]); toast("✓", "Етап " + (i + 1) + " пройдено", PRAISE[D.st.length % PRAISE.length] + ". " + D.st.length + " з " + A.STAGES.length + "."); }
    });
    dsave(); paint();
  });

  /* ---------- slides ---------- */
  var slides = [], cur = 0;
  function groups(sec) { var ids = []; $$("[data-s]", sec).forEach(function (n) { var v = n.getAttribute("data-s"); if (ids.indexOf(v) < 0) ids.push(v); }); return ids; }
  function build() {
    var S = [], hero = $("header.hero"), foot = $("footer");
    S.push({ el: hero, s: "h0a", title: "Знайомство" }, { el: hero, s: "h0b", title: "Обери свій трек", sub: 1 });
    A.STAGES.forEach(function (st, si) {
      var sec = $("#" + st[0]); if (!sec) return;
      var ids = groups(sec); if (!ids.length) ids = [null];
      ids.forEach(function (v, k) { S.push({ el: sec, s: v, stage: st[0], sub: k, title: "Етап " + (si + 1) + " · " + st[1] + (ids.length > 1 ? " · " + (k + 1) + "/" + ids.length : "") }); });
    });
    var fin = $("#finish"), ft = ["Фініш", "Продовж з будь-яким ШІ", "Стіна пропозицій"];
    groups(fin).forEach(function (v, k) { S.push({ el: fin, s: v, sub: k, title: ft[k] || "Фініш", fin: true }); });
    S.push({ el: $("#backstage-cta"), extra: [foot], title: "За лаштунками" });
    var bonus = $("#bonus"); if (bonus && !bonus.hidden) S.push({ el: bonus, extra: [foot], title: "Бонус: кухня інструмента" });
    return S;
  }
  function visible(n) { return !!(n.offsetWidth || n.offsetHeight || n.getClientRects().length); }
  function lockFor(sl) {
    var old = $(".deck-lock", sl.el); if (old) old.remove();
    if (!sl.s) return;
    var any = $$('[data-s="' + sl.s + '"]', sl.el).some(visible);
    if (any) return;
    var w = $(".wrap", sl.el), d = document.createElement("div"); d.className = "card stack deck-lock";
    d.innerHTML = "<h3>Тут поки зачинено 🔒</h3><p>Спершу пройди симуляцію на попередньому слайді: обидва шляхи, чат і агента. Тоді тут з'явиться розбір. Підглядати не вийде, ми пробували.</p>";
    var b = document.createElement("button"); b.className = "btn primary"; b.textContent = "← До симулятора"; b.style.justifySelf = "start";
    b.onclick = function () { go(cur - (sl.sub || 0)); }; d.appendChild(b); w.appendChild(d);
  }
  function show(i, dir) {
    slides = build();
    cur = Math.max(0, Math.min(i, slides.length - 1));
    var sl = slides[cur];
    $$(".slide-on").forEach(function (n) { n.classList.remove("slide-on", "sub-n", "slide-in", "back"); });
    $$(".s-on").forEach(function (n) { n.classList.remove("s-on"); });
    sl.el.classList.add("slide-on"); if (sl.sub) sl.el.classList.add("sub-n");
    (sl.extra || []).forEach(function (n) { n.classList.add("slide-on"); });
    if (sl.s) $$('[data-s="' + sl.s + '"]', sl.el).forEach(function (n) { n.classList.add("s-on"); });
    lockFor(sl);
    if (!reduce) { void sl.el.offsetWidth; sl.el.classList.add("slide-in"); if (dir < 0) sl.el.classList.add("back"); }
    window.scrollTo(0, 0);
    if (sl.fin) renderFinish();
    if (sl.stage === "tools") { /* engine marks tools when the table is seen */ }
    D.i = cur; dsave(); paint();
  }
  function go(i) { if (i === cur) return; var d = i > cur ? 1 : -1; show(i, d); }
  function paint() {
    if (!slides.length) return;
    var sl = slides[cur], n = slides.length;
    $("#db-title").textContent = sl.title;
    $("#db-count").textContent = (cur + 1) + " / " + n;
    $("#db-prev").disabled = cur === 0;
    $("#db-next").disabled = false;
    $("#db-next-t").textContent = cur === 0 ? "Почнімо" : cur === n - 1 ? "Почати спочатку ↺" : "Далі";
    $("#db-next").classList.toggle("nudge", cur === 0); $("#db-next-a").hidden = cur === n - 1;
    var p = $("#deck-prog"); if (p) p.style.width = (cur / (n - 1) * 100) + "%";
    $$("#rail a").forEach(function (a) { var h = (a.getAttribute("href") || "").slice(1); a.classList.toggle("cur", h === sl.stage); });
  }
  function findSlide(stage, s) { for (var i = 0; i < slides.length; i++) { var x = slides[i]; if ((stage ? x.stage === stage : true) && (!s || x.s === s)) return i; } return -1; }
  function slideOf(target) {
    var ds = target.closest("[data-s]"), v = ds ? ds.getAttribute("data-s") : null;
    for (var i = 0; i < slides.length; i++) { var x = slides[i]; if (x.el.contains(target) && (!v || x.s === v || !x.el.contains(ds))) return i; }
    return -1;
  }

  /* navigation */
  $("#db-prev").onclick = function () { go(cur - 1); };
  $("#db-next").onclick = function () { if (cur >= slides.length - 1) go(0); else go(cur + 1); };
  document.addEventListener("keydown", function (e) {
    if (!document.body.classList.contains("deck") || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
    if (!$("#intro").classList.contains("gone")) { if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { e.preventDefault(); closeIntro(); } return; }
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(cur + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(cur - 1); }
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || !document.body.classList.contains("deck")) return;
    var id = a.getAttribute("href").slice(1); if (!id) return;
    var i = id === "top-tracks" ? 1 : findSlide(id);
    if (i < 0) { var t = document.getElementById(id); if (t) i = slideOf(t); }
    if (i >= 0) { e.preventDefault(); go(i); var t2 = document.getElementById(id); if (t2 && t2.closest(".slide-on") && t2.scrollIntoView && i !== findSlide(id)) t2.scrollIntoView({ block: "start" }); }
  });
  document.addEventListener("app:track", function () { if (cur <= 1) setTimeout(function () { go(2); }, reduce ? 0 : 380); else show(cur, 0); });
  document.addEventListener("app:goto", function (e) { var i = findSlide(e.detail.stage, e.detail.s); if (i >= 0) go(i); });
  document.addEventListener("app:bonus", function (e) { slides = build(); if (e.detail.go) go(slides.length - 1); else paint(); });
  var simAfter = $("#sim-after");
  if (simAfter && window.MutationObserver) new MutationObserver(function () { if (slides[cur] && slides[cur].stage === "sim") lockFor(slides[cur]); }).observe(simAfter, { attributes: true, attributeFilter: ["hidden"] });

  /* ---------- finish ---------- */
  function renderFinish() {
    var T = A.T(), st = A.store(), done = A.STAGES.filter(function (s) { return stageDone(s[0]); });
    var all = done.length === A.STAGES.length, got = ACH.filter(function (a) { return has(a[0]); });
    $("#fin-title").textContent = all ? "Вітаю, усе пройдено" : "Майже фініш";
    var sub = $("#fin-sub"); sub.innerHTML = "";
    if (all) sub.textContent = "Сім етапів із семи. Тепер ти знаєш мій секрет: ШІ не чарівний. Йому просто дали папку, правила й спосіб перевірити себе. Спробуй цього тижня на справжній задачі.";
    else {
      sub.appendChild(document.createTextNode("Пройдено " + done.length + " з " + A.STAGES.length + " етапів. Повернутися до пропущених: "));
      A.STAGES.forEach(function (s, i) { if (stageDone(s[0])) return; var b = document.createElement("button"); b.className = "btn small"; b.style.margin = "2px 4px 2px 0"; b.textContent = (i + 1) + ". " + s[1]; b.onclick = function () { go(findSlide(s[0])); }; sub.appendChild(b); });
    }
    var nm = $("#cert-name"); nm.value = D.name || ""; nm.oninput = function () { D.name = nm.value; dsave(); };
    $("#cert-track").textContent = "на треку «" + T.who + "»";
    var bd = $("#badges"); bd.innerHTML = "";
    var cap = $("#ach-cap"); if (!cap) { cap = document.createElement("p"); cap.id = "ach-cap"; cap.className = "ach-cap"; bd.parentNode.insertBefore(cap, bd.nextSibling); }
    cap.textContent = "Натисни на значок, щоб дізнатися, за що він.";
    ACH.forEach(function (a) { var on = has(a[0]); var d = document.createElement("button"); d.type = "button"; d.className = "ach" + (on ? " on" : ""); d.innerHTML = "<span class='bi'>" + a[1] + "</span>"; d.appendChild(document.createTextNode(a[2])); var show = function () { cap.textContent = a[2] + ": " + a[3] + (on ? "" : " (ще попереду)"); }; d.onclick = show; d.onmouseenter = show; bd.appendChild(d); });
    var dt = new Date(); $("#cert-date").textContent = ("0" + dt.getDate()).slice(-2) + "." + ("0" + (dt.getMonth() + 1)).slice(-2) + "." + dt.getFullYear();
    $("#cert-score").textContent = "етапів " + done.length + "/" + A.STAGES.length + " · досягнень " + got.length + "/" + ACH.length;
    $("#ai-prompt").textContent = aiPrompt(T, done, got);
    if (all && !D.party && slides[cur] && slides[cur].s === "f1") { D.party = true; dsave(); setTimeout(function () { confetti(window.innerWidth / 2, window.innerHeight / 3, 90); }, 300); }
    wallLoad();
  }

  function aiPrompt(T, done, got) {
    var left = A.STAGES.filter(function (s) { return done.indexOf(s) < 0; });
    return [
      "Ти мій наставник з агентного ШІ. " + (left.length ? "Я проходжу практикум «Від чату до агента» (" + PAGE + "), частину вже позаду." : "Мені вдалося пройти практикум «Від чату до агента» (" + PAGE + ").") + " Допоможи розібратися глибше.",
      "",
      "ПРО МЕНЕ",
      "- Роль і трек: " + T.who + ". Навчальна задача курсу: " + T.what + ".",
      "- Пройдені етапи: " + (done.length ? done.map(function (s) { return s[1]; }).join(", ") : "поки жодного") + ".",
      "- Ще не пройдені: " + (left.length ? left.map(function (s) { return s[1]; }).join(", ") : "немає") + ".",
      "- Досягнення: " + (got.length ? got.map(function (a) { return a[2]; }).join(", ") : "поки немає") + ".",
      "- Я не програмую. Пиши простою мовою і пояснюй кожен технічний термін, коли він з'являється вперше.",
      "",
      "ЩО БУЛО В КУРСІ (щоб у нас була спільна рамка)",
      "1. Сходи взаємодії: чат, потім проєкти, потім агент для документів (наприклад, Cowork), потім агент повної дії (Claude Code, Codex, GitHub Copilot та інші). Агентний рівень потрібен не лише програмістам.",
      "2. Чат і агент працюють на тій самій моделі. Різниця в тому, хто носить дані: у чаті я копіюю файли туди й назад, а агент сам відкриває файли в папці, робить кроки й перевіряє результат. Я ставлю задачу й погоджую.",
      "3. Будова агента: модель, інструменти, цикл «думає, діє, перевіряє, повторює» та інструкції. Субагенти: окремі помічники, яким агент доручає частину роботи.",
      "4. CLAUDE.md (або AGENTS.md): постійні правила проєкту, які агент читає на початку кожної сесії. SKILL.md: збережений рецепт задачі, що запускається командою /назва.",
      "5. Судження: що можна довірити агенту, а що людина перевіряє сама. Агент може помилятися впевнено.",
      "6. Агенти є в різних компаній, а спільні стандарти AGENTS.md, SKILL.md і MCP дозволяють переносити правила й навички.",
      "7. Старт: велику задачу спершу запускати в режимі планування (Plan) і виправляти план. Задача агенту містить мінімум три речі: що зробити, чого не чіпати, як перевірити. Перші спроби на навчальній папці з копіями файлів.",
      "",
      "ЯК ЗІ МНОЮ ПРАЦЮВАТИ",
      "1. Почни з трьох коротких запитань: яка в мене робоча задача, яким інструментом я користуюся чи планую, що з курсу лишилося незрозумілим. Далі відштовхуйся від відповідей.",
      "2. Пояснюй на прикладах з моєї ролі (" + T.who.toLowerCase() + "), а не з програмування.",
      "3. Одна думка за раз. Після пояснення спитай одне коротке запитання, щоб перевірити, чи все зрозуміло. Не влаштовуй іспит.",
      "4. Якщо я попрошу, допоможи скласти CLAUDE.md або AGENTS.md і першу навичку SKILL.md для моєї задачі, крок за кроком, і поясни, куди покласти файли.",
      "5. Перед великою задачею нагадуй: спершу план, потім виконання.",
      "6. Про кнопки, ціни, тарифи й версії продуктів кажи чесно, якщо не маєш певності, і давай посилання на офіційну документацію. Нічого не вигадуй.",
      "7. Не проси в мене паролів, ключів доступу, персональних даних чи реальних документів з чутливою інформацією. Якщо я таке вставлю, зупини мене й поясни, чому так не варто.",
      "8. Легкий сухий гумор доречний, але не замість суті.",
      "",
      "ТЕМИ, ЯКІ Я МОЖУ ПОПРОСИТИ РОЗКРИТИ",
      "- чим агент відрізняється від чату з файлами чи від проєктів",
      "- як агент «думає» і чому іноді помиляється",
      "- що таке контекст і чому «одна справа, одна сесія»",
      "- як писати правила, щоб агент їх дотримувався",
      "- навички: коли їх варто робити і як перевірити",
      "- субагенти: коли вони допомагають, а коли заважають",
      "- MCP: як агент підключається до пошти, календаря, документів",
      "- безпека: що можна і чого не можна давати агенту",
      "- як вибрати інструмент для моєї команди чи організації",
      "",
      "Почни з привітання одним реченням і трьох запитань."
    ].join("\n");
  }

  /* ---------- wall of suggestions ---------- */
  var wallLoaded = false;
  function csv(text) {
    var rows = [], row = [], f = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c !== "\r") f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function wallMsg(t) { var l = $("#wall-list"); l.innerHTML = ""; var p = document.createElement("p"); p.className = "wall-empty"; p.textContent = t; l.appendChild(p); }
  function wallLoad() {
    if (wallLoaded) return; wallLoaded = true;
    if (!WALL.sheet) { wallMsg(WALL.form ? "Стіна відкриється найближчим часом. Ідеї вже можна надсилати." : "Стіна відкриється найближчим часом."); if (!WALL.form) { $("#wall-send").disabled = true; $("#wall-status").textContent = "Збір пропозицій ще налаштовується."; } return; }
    wallMsg("Завантажуємо пропозиції…");
    fetch("https://docs.google.com/spreadsheets/d/" + encodeURIComponent(WALL.sheet) + "/gviz/tq?tqx=out:csv").then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (t) {
      var rows = csv(t).slice(1).filter(function (r) { return r[0] && r[0].trim(); }).reverse().slice(0, 40);
      if (!rows.length) { wallMsg("Поки що тут порожньо. Хтось має бути першим."); return; }
      var l = $("#wall-list"); l.innerHTML = "";
      rows.forEach(function (r) { var d = document.createElement("div"); d.className = "wall-item"; d.textContent = r[0].slice(0, 600); if (r[1]) { var s = document.createElement("span"); s.className = "w-d"; s.textContent = r[1].slice(0, 10); d.appendChild(s); } l.appendChild(d); });
    }).catch(function () { wallMsg("Стіна зараз відпочиває. Пропозиції все одно можна надсилати 🙂"); });
  }
  var PII = /[\w.+-]+@[\w-]+\.[\w.]+|(\+?\d[\d\s()-]{8,}\d)/;
  $("#wall-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var ta = $("#wall-text"), txt = ta.value.trim(), st = $("#wall-status");
    if (!WALL.form) { st.textContent = "Збір пропозицій ще налаштовується."; return; }
    if (txt.length < 5) { st.textContent = "Напиши трохи більше, хоча б одне речення."; return; }
    if (PII.test(txt)) { st.textContent = "Схоже, тут є пошта чи номер телефону. Прибери їх, будь ласка: стіна анонімна."; return; }
    var now = Date.now(); D.sent = (D.sent || []).filter(function (t) { return now - t < 3600e3; });
    if (D.sent.length >= 3) { st.textContent = "Запал оцінено. Ліміт: три пропозиції на годину."; return; }
    var body = new URLSearchParams(); body.append(WALL.entry, txt);
    $("#wall-send").disabled = true; st.textContent = "Надсилаємо…";
    fetch(WALL.form, { method: "POST", mode: "no-cors", body: body }).then(function () {
      D.sent.push(now); dsave(); ta.value = ""; st.textContent = "Дякуємо. Пропозиція з'явиться на стіні після перевірки.";
      toast("💌", "Пропозицію надіслано", "Дякуємо, що допомагаєш зробити курс кращим.");
    }).catch(function () { st.textContent = "Не вдалося надіслати. Перевір інтернет і спробуй ще раз."; }).then(function () { $("#wall-send").disabled = false; });
  });


  /* ---------- interactive diagrams: hover / tap a part to see what it does ---------- */
  function explainer(svg, INFO, hint) {
    if (!svg) return;
    svg.classList.add("isvg");
    var fig = svg.parentNode, box = document.createElement("div");
    box.className = "arch-info"; box.setAttribute("aria-live", "polite");
    fig.insertBefore(box, svg.nextSibling);
    var pinned = null;
    function idle() { box.className = "arch-info idle"; box.innerHTML = ""; var k = document.createElement("span"); k.className = "ai-k"; k.textContent = "Схема інтерактивна"; var t = document.createElement("span"); t.textContent = hint; box.appendChild(k); box.appendChild(t); }
    function set(k) {
      svg.classList.toggle("has-hl", !!k);
      $$("[data-g]", svg).forEach(function (g) { g.classList.toggle("hl", g.getAttribute("data-g") === k); });
      if (svg.id === "arch") $$(".formula .part").forEach(function (p) { p.classList.toggle("on", p.getAttribute("data-part") === k); });
      if (!k) { idle(); return; }
      var t = INFO[k]; box.className = "arch-info"; box.innerHTML = "";
      var b = document.createElement("b"); b.textContent = t[0]; var s = document.createElement("span"); s.textContent = t[1];
      box.appendChild(b); box.appendChild(s);
    }
    $$("[data-g]", svg).forEach(function (g) {
      var k = g.getAttribute("data-g"); if (!INFO[k]) return;
      g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", INFO[k][0] + ": що це");
      g.addEventListener("mouseenter", function () { if (!pinned) set(k); });
      g.addEventListener("mouseleave", function () { if (!pinned) set(null); });
      g.addEventListener("focus", function () { set(k); });
      g.addEventListener("click", function (e) { e.stopPropagation(); pinned = pinned === k ? null : k; set(pinned || k); $$("[data-g]", svg).forEach(function (x) { x.classList.toggle("pin", x.getAttribute("data-g") === pinned); }); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); g.dispatchEvent(new MouseEvent("click")); } });
    });
    svg.addEventListener("click", function () { pinned = null; $$("[data-g]", svg).forEach(function (x) { x.classList.remove("pin"); }); set(null); });
    idle();
  }
  explainer($("#arch"), {
    human: ["Ти", "Ставиш задачу, відповідаєш на питання агента й погоджуєш зміни. Біганину між файлами агент бере на себе."],
    instr: ["Інструкції", "CLAUDE.md з правилами проєкту і SKILL.md з рецептами задач. Звичайні текстові файли, які агент перечитує на початку кожної сесії. На відміну від більшості регламентів, їх справді читають."],
    loop: ["Цикл", "Подумати, зробити крок, подивитися на результат і, якщо треба, ще коло. Саме цикл відрізняє агента від чату, який відповідає один раз і замовкає."],
    model: ["Модель", "Той самий ШІ, що й у чаті. Думає й вирішує, що робити далі, але сама файлів не бачить. Для цього їй потрібні інструменти."],
    tools: ["Інструменти", "Прочитати, записати, запустити, пошукати. Модель дає команду, інструмент виконує й повертає результат. Руки агента, якщо хочеш."],
    folder: ["Твоя папка", "Агент бачить лише її. Читає сам, а записує тільки з твого дозволу, тож переписати бюджет «випадково» не вийде."]
  }, "Наведи курсор або натисни на будь-яку частину: Ти, Інструкції, Модель, Інструменти, папку.");
  (function () {
    var svg = $("#loop-svg"); if (!svg) return;
    ["ln-0", "ln-1", "ln-2", "ln-3"].forEach(function (id) { var g = document.getElementById(id); if (g) g.setAttribute("data-g", id); });
    explainer(svg, {
      "ln-0": ["Думає", "Вирішує, який крок наступний: що прочитати, що перевірити, що написати."],
      "ln-1": ["Діє", "Викликає інструмент: відкриває файл, записує чернетку, запускає перевірку."],
      "ln-2": ["Дивиться", "Читає результат. Не те, що мало вийти, а те, що вийшло насправді."],
      "ln-3": ["Готово?", "Якщо все зійшлося, віддає результат тобі. Якщо ні, ще одне коло. Наполегливість без самолюбства."]
    }, "Натисни на крок циклу, щоб побачити, що відбувається.");
  })();
  (function () {
    var svg = $("#net"); if (!svg) return;
    var keys = ["courses", "method", "tools", "human", "qa", "facts", "context", "tracks"];
    $$(":scope > g:not(.net-edges)", svg).forEach(function (g, i) { if (keys[i]) g.setAttribute("data-g", keys[i]); });
    explainer(svg, {
      courses: ["Дослідження курсів", "Субагент розібрав 13 курсів про агентів і виписав, що в них працює. Головний висновок: мало практики на своїх задачах."],
      method: ["Методика", "Інший дослідник підібрав методику: одна наскрізна задача, спершу спроба, потім пояснення, підказки поступово зникають."],
      tools: ["Карта інструментів", "Ще один зібрав 13 інструментів різних компаній і перевірив, що вони вміють. Щоб курс не став рекламою одного продукту."],
      human: ["Людина", "Ставила задачі, відхиляла невдалі варіанти й ухвалювала рішення. Жодного рядка коду руками, зате чимало «ні, не так»."],
      qa: ["Перевірка якості", "Автотест проходить усі вправи трьох треків на двох ширинах екрана. Окремі субагенти читали тексти очима новачка й шукали чутливі дані."],
      facts: ["Факт-чек", "Звірив ціни, назви кнопок і можливості продуктів з офіційними сторінками станом на 23.10.2026. Неперевірене на сторінку не потрапило."],
      context: ["Контекст і право", "Узагальнив типові документи й пастки роботи ГО та перевірив юридичну техніку. Реальних даних у курсі немає."],
      tracks: ["Автори треків", "Три субагенти написали сценарії для менеджерів, аналітиків і юристів, а редактори й «новачки» їх вичитали."]
    }, "Натисни на будь-який блок, щоб дізнатися, що саме зробив цей агент.");
  })();
  /* context bar: each segment explains itself */
  (function () {
    var bar = $(".ctx-bar"); if (!bar) return;
    var CAP = {
      c1: "Правила з CLAUDE.md. Займають мало, а працюють щоразу.",
      c2: "Кожен відкритий файл лежить тут до кінця сесії. Тому зайвих файлів краще не давати.",
      c3: "Результати перевірок і пошуків. Корисні, але швидко накопичуються.",
      c4: "Твої повідомлення й відповіді агента. Найдешевша частина.",
      c5: "Вільне місце. Коли закінчується, агент гірше пам'ятає початок."
    };
    var cap = document.createElement("p"); cap.className = "ctx-cap"; cap.textContent = "Наведи або натисни на частину смужки.";
    bar.parentNode.insertBefore(cap, bar.nextSibling);
    $$("span", bar).forEach(function (sp) {
      var k = sp.className; if (!CAP[k]) return;
      sp.setAttribute("tabindex", "0"); sp.setAttribute("role", "button");
      var on = function () { $$("span", bar).forEach(function (x) { x.classList.toggle("on", x === sp); }); bar.classList.add("has-on"); cap.textContent = sp.textContent + ": " + CAP[k]; };
      sp.addEventListener("mouseenter", on); sp.addEventListener("focus", on); sp.addEventListener("click", on);
    });
  })();


  /* ---------- share with a colleague, restart ---------- */
  (function () {
    var MSG = ($("#share-text") || {}).textContent || PAGE;
    var st = $("#share-st");
    function copy(t, ok) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { st.textContent = ok; }).catch(function () { st.textContent = "Не вдалося скопіювати. Ось посилання: " + PAGE; }); }
    var go1 = $("#share-go");
    if (go1) go1.onclick = function () {
      if (navigator.share) navigator.share({ title: "Від чату до агента", text: MSG }).catch(function () {});
      else copy(MSG, "Текст скопійовано. Встав колезі в Teams чи пошту 👍");
    };
    var c1 = $("#share-copy"); if (c1) c1.onclick = function () { copy(PAGE, "Посилання скопійовано 👍"); };
    var r = $("#restart"); if (r) r.onclick = function () { go(0); };
  })();

  /* ---------- intro ---------- */
  var intro = $("#intro");
  function closeIntro(resume) {
    if (intro.classList.contains("gone")) return;
    intro.classList.add("out");
    setTimeout(function () { intro.classList.add("gone"); intro.hidden = true; }, reduce ? 0 : 700);
    show(resume ? (D.i || 0) : 0, 1);
    var b = $("#db-next"); if (b) b.focus({ preventScroll: true });
  }
  var returning = D.i > 0 || (D.st && D.st.length > 0) || (D.ach && D.ach.length > 0);
  $("#intro-go").onclick = function () { closeIntro(returning); };
  if (returning) {
    $("#intro-go-t").textContent = "Продовжити";
    var rs = $("#intro-restart"); rs.hidden = false; rs.onclick = function () { D.i = 0; dsave(); closeIntro(false); };
  }
  intro.addEventListener("click", function (e) { if (e.target === intro) closeIntro(true); });

  document.body.classList.add("deck");
  slides = build();
  if (returning && slides[D.i || 0]) { var w = $("#intro-where"); w.hidden = false; w.textContent = "Минулого разу: слайд " + ((D.i || 0) + 1) + " з " + slides.length + " · " + slides[D.i || 0].title; }
  show(D.i || 0, 0);
  setTimeout(function () { intro.classList.add("ready"); }, reduce ? 0 : 5000);
  setTimeout(function () { var g = $("#intro-go"); if (g && !intro.hidden) g.focus({ preventScroll: true }); }, reduce ? 0 : 3200);
})();
