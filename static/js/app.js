(function () {
  "use strict";

  /* ── Config ──────────────────────────────────────────────── */
  const FPS = 8;
  const STABLE = 3;           // consecutive same-letter frames to register
  const MIN_CONF = 40;        // % minimum confidence
  const SENTENCE_MS = 5000;   // hand gone → sentence end
  const RESULT_MS = 3000;     // result display time
  const QUALITY = 0.7;        // JPEG quality

  /* ── Fada helpers ────────────────────────────────────────── */
  const FM = {"á":"a","é":"e","í":"i","ó":"o","ú":"u",
              "Á":"A","É":"E","Í":"I","Ó":"O","Ú":"U"};
  const stripF = s => s.replace(/[áéíóúÁÉÍÓÚ]/g, c => FM[c]);

  /* ── State ───────────────────────────────────────────────── */
  let mode = "game";
  let socket, capInterval;

  // detection
  let buf = [], readyNext = true, lastLtr = null, handWas = false;

  // game
  let words = [], gWords = [], gIdx = 0, spell = "", gScore = 0, gTotal = 0;
  let gPhase = "ready"; // ready | spelling | result | complete

  // communicate
  let cWord = "", cSentence = [];
  let sentenceTimer = null, countdownIv = null;

  // fps
  let fSent = 0, fLast = Date.now();

  /* ── DOM refs ────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  let D;
  function cacheDom() {
    D = {
      vid: $("webcam"), cap: $("cap"), ovl: $("overlay"),
      ltr: $("det-letter"), conf: $("det-conf"), hstat: $("hand-status"),
      hTxt: document.querySelector(".htxt"),
      // game
      gPanel: $("game-panel"), emoji: $("ch-emoji"), en: $("ch-en"),
      ir: $("ch-ir"), gTiles: $("game-tiles"), gRes: $("game-result"),
      score: $("score"), total: $("total"),
      skip: $("btn-skip"), restart: $("btn-restart"),
      // communicate
      cPanel: $("comm-panel"), cTiles: $("comm-tiles"),
      cChips: $("comm-chips"), transBlk: $("trans-block"),
      irishOut: $("irish-out"), speak: $("btn-speak"),
      cd: $("countdown"), clear: $("btn-clear"),
      // status
      conn: $("conn"), fps: $("fps"), warn: $("model-warn"),
    };
  }

  /* ── Socket ──────────────────────────────────────────────── */
  function setupSocket() {
    socket = io();
    socket.on("connect", () => {
      D.conn.textContent = "● Connected";
      D.conn.className = "status-ok";
    });
    socket.on("disconnect", () => {
      D.conn.textContent = "● Disconnected";
      D.conn.className = "status-off";
    });
    socket.on("status", d => {
      D.warn.classList.toggle("hidden", d.model_loaded);
    });
    socket.on("prediction", handlePred);
    socket.on("translation", d => showTranslation(d.irish));
  }

  /* ── Webcam ──────────────────────────────────────────────── */
  async function startCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia(
        { video: { width: 640, height: 480, facingMode: "user" } });
      D.vid.srcObject = s;
      D.vid.addEventListener("loadeddata", startCapture);
    } catch (e) {
      alert("Cannot access webcam – please allow camera access and refresh.");
    }
  }

  function startCapture() {
    const ctx = D.cap.getContext("2d");
    capInterval = setInterval(() => {
      if (D.vid.readyState < D.vid.HAVE_ENOUGH_DATA) return;
      if (!socket || !socket.connected) return;
      D.cap.width = D.vid.videoWidth;
      D.cap.height = D.vid.videoHeight;
      ctx.drawImage(D.vid, 0, 0);
      socket.emit("frame", { image: D.cap.toDataURL("image/jpeg", QUALITY) });

      fSent++;
      const now = Date.now();
      if (now - fLast > 1000) { D.fps.textContent = fSent + " fps"; fSent = 0; fLast = now; }
    }, 1000 / FPS);
  }

  /* ── Prediction handling ─────────────────────────────────── */
  function handlePred(d) {
    if (d.hand_present) {
      D.ltr.textContent = d.letter || "?";
      D.conf.textContent = (d.confidence || 0) + "%";
      D.hstat.className = "hand-ind on";
      D.hTxt.textContent = "Hand detected";
      drawBox(d.bbox);
    } else {
      D.ltr.textContent = "-";
      D.conf.textContent = "";
      D.hstat.className = "hand-ind off";
      D.hTxt.textContent = "No hand";
      clearOvl();
    }
    processLetter(d);
  }

  function drawBox(bb) {
    if (!bb) return;
    const c = D.ovl, v = D.vid;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#4361ee"; ctx.lineWidth = 3;
    ctx.strokeRect(bb[0]*c.width, bb[1]*c.height,
                   (bb[2]-bb[0])*c.width, (bb[3]-bb[1])*c.height);
  }
  function clearOvl() {
    if (D.ovl.width) D.ovl.getContext("2d").clearRect(0,0,D.ovl.width,D.ovl.height);
  }

  /* ── Letter registration state machine ───────────────────── */
  function processLetter(d) {
    if (d.hand_present && d.letter && d.confidence >= MIN_CONF) {
      handWas = true;
      clearSentenceTimers();

      buf.push(d.letter);
      if (buf.length > STABLE + 2) buf.shift();

      if (buf.length >= STABLE) {
        const tail = buf.slice(-STABLE);
        if (tail.every(l => l === tail[0])) {
          const L = tail[0];
          if (readyNext || L !== lastLtr) {
            registerLetter(L);
            lastLtr = L;
            readyNext = false;
          }
        } else {
          readyNext = true;          // transition
        }
      }
    } else if (d.hand_present) {
      readyNext = true; buf = [];   // low-confidence → transition
    } else {
      buf = []; readyNext = true; lastLtr = null;
      if (handWas) { handWas = false; onHandLeft(); }
    }
  }

  function registerLetter(L) {
    // visual pop
    D.ltr.classList.remove("pop"); void D.ltr.offsetWidth; D.ltr.classList.add("pop");

    if (mode === "game") {
      if (gPhase === "ready" || gPhase === "spelling") {
        gPhase = "spelling"; spell += L; renderGameTiles();
      }
    } else {
      cWord += L; renderCommTiles();
    }
  }

  /* ── Hand-left logic ─────────────────────────────────────── */
  function onHandLeft() {
    if (mode === "game") {
      if (gPhase === "spelling" && spell.length) checkAnswer();
    } else {
      if (cWord.length) {
        cSentence.push(cWord); cWord = ""; renderCommTiles(); renderChips();
        startSentenceCountdown();
      }
    }
  }

  /* ── Game mode ───────────────────────────────────────────── */
  function loadWords() {
    fetch("/api/words").then(r=>r.json()).then(d => { words = d; shuffle(); })
      .catch(e => console.error("words", e));
  }

  function shuffle() {
    gWords = [...words];
    for (let i = gWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gWords[i], gWords[j]] = [gWords[j], gWords[i]];
    }
    gIdx = 0; gScore = 0; gTotal = 0; showChallenge();
  }

  function showChallenge() {
    if (gIdx >= gWords.length) { showComplete(); return; }
    const w = gWords[gIdx];
    D.emoji.textContent = w.emoji;
    D.en.textContent = w.english;
    D.ir.textContent = w.irish;
    spell = ""; gPhase = "ready";
    renderGameTiles(); D.gRes.classList.add("hidden"); updateScore();
  }

  function renderGameTiles() {
    let h = "";
    for (const c of spell) h += `<span class="tile">${c}</span>`;
    if (gPhase === "ready" || gPhase === "spelling")
      h += '<span class="tile cursor">_</span>';
    D.gTiles.innerHTML = h;
  }

  function checkAnswer() {
    gPhase = "result";
    const w = gWords[gIdx];
    const ok = stripF(w.irish).toUpperCase() === spell.toUpperCase();
    gTotal++; if (ok) gScore++;

    // colour tiles
    D.gTiles.querySelectorAll(".tile").forEach(t => {
      t.classList.remove("cursor");
      t.classList.add(ok ? "correct" : "incorrect");
    });

    const r = D.gRes; r.classList.remove("hidden","correct","incorrect");
    if (ok) {
      r.className = "result-banner correct";
      r.innerHTML = "&#10003; Correct! <strong>" + w.irish + "</strong>";
      // show with fadas
      let h = "";
      for (const c of w.irish) h += `<span class="tile correct">${c.toUpperCase()}</span>`;
      D.gTiles.innerHTML = h;
    } else {
      r.className = "result-banner incorrect";
      r.innerHTML = "&#10007; Answer: <strong>" + w.irish + "</strong>";
    }
    updateScore();
    speakIrish(w.irish);
    setTimeout(() => { gIdx++; showChallenge(); }, RESULT_MS);
  }

  function updateScore() { D.score.textContent = gScore; D.total.textContent = gTotal; }

  function showComplete() {
    D.emoji.textContent = "\uD83C\uDF89"; // 🎉
    D.en.textContent = "Game Complete!";
    D.ir.textContent = gScore + "/" + gTotal + " correct";
    D.gTiles.innerHTML = ""; gPhase = "complete";
  }

  /* ── Communicate mode ────────────────────────────────────── */
  function renderCommTiles() {
    let h = "";
    for (const c of cWord) h += `<span class="tile">${c}</span>`;
    h += '<span class="tile cursor">_</span>';
    D.cTiles.innerHTML = h;
  }

  function renderChips() {
    D.cChips.innerHTML = cSentence.map(w => `<span class="chip">${w}</span>`).join("");
  }

  function startSentenceCountdown() {
    let rem = 5;
    D.cd.classList.remove("hidden");
    D.cd.textContent = "Sentence ends in " + rem + "s\u2026";
    countdownIv = setInterval(() => {
      rem--;
      if (rem > 0) D.cd.textContent = "Sentence ends in " + rem + "s\u2026";
      else { clearInterval(countdownIv); countdownIv = null; }
    }, 1000);
    sentenceTimer = setTimeout(() => {
      clearInterval(countdownIv); countdownIv = null;
      D.cd.classList.add("hidden");
      completeSentence();
    }, SENTENCE_MS);
  }

  function clearSentenceTimers() {
    clearTimeout(sentenceTimer); sentenceTimer = null;
    clearInterval(countdownIv); countdownIv = null;
    D.cd.classList.add("hidden");
  }

  function completeSentence() {
    if (!cSentence.length) return;
    const txt = cSentence.join(" ");
    socket.emit("translate", { text: txt });
    D.transBlk.classList.remove("hidden");
    D.irishOut.textContent = "Translating\u2026";
  }

  function showTranslation(irish) {
    D.irishOut.textContent = irish;
    speakIrish(irish);
  }

  function clearComm() {
    cWord = ""; cSentence = [];
    clearSentenceTimers();
    renderCommTiles(); renderChips();
    D.transBlk.classList.add("hidden");
    D.cChips.innerHTML = "";
  }

  /* ── TTS ─────────────────────────────────────────────────── */
  function speakIrish(text) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ga-IE"; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find(v => v.lang.startsWith("ga"));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  if (window.speechSynthesis) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }

  /* ── Mode switch ─────────────────────────────────────────── */
  function switchMode(m) {
    mode = m;
    document.querySelectorAll(".mode-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.mode === m));
    D.gPanel.classList.toggle("hidden", m !== "game");
    D.cPanel.classList.toggle("hidden", m !== "communicate");
    buf = []; readyNext = true; lastLtr = null; handWas = false;
    if (m === "game") { spell = ""; gPhase = "ready"; renderGameTiles(); }
    else clearComm();
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    cacheDom();
    setupSocket();
    startCam();
    loadWords();

    document.querySelectorAll(".mode-btn").forEach(b =>
      b.addEventListener("click", () => switchMode(b.dataset.mode)));
    D.skip.addEventListener("click", () => { gTotal++; updateScore(); gIdx++; showChallenge(); });
    D.restart.addEventListener("click", shuffle);
    D.clear.addEventListener("click", clearComm);
    D.speak.addEventListener("click", () => {
      const t = D.irishOut.textContent;
      if (t && t !== "Translating\u2026") speakIrish(t);
    });

    // Debug compare
    const dbgOvl = $("debug-overlay");
    $("btn-debug").addEventListener("click", () => {
      const ctx = D.cap.getContext("2d");
      if (D.vid.readyState >= D.vid.HAVE_ENOUGH_DATA) {
        D.cap.width = D.vid.videoWidth; D.cap.height = D.vid.videoHeight;
        ctx.drawImage(D.vid, 0, 0);
        socket.emit("debug_frame", { image: D.cap.toDataURL("image/jpeg", 0.9) });
      }
      dbgOvl.classList.remove("hidden");
      $("dbg-cam").src = ""; $("dbg-ds").src = "";
    });
    $("debug-close").addEventListener("click", () => dbgOvl.classList.add("hidden"));
    dbgOvl.addEventListener("click", e => { if (e.target === dbgOvl) dbgOvl.classList.add("hidden"); });

    socket.on("debug_result", d => {
      if (d.ok) {
        $("dbg-cam").src = d.cam;
        if (d.dataset) $("dbg-ds").src = d.dataset;
        else $("dbg-ds").alt = "No dataset found";
      } else {
        $("dbg-cam").alt = "No hand detected — show your hand and try again";
      }
    });

    renderCommTiles();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
