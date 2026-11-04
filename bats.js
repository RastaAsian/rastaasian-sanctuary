/* ============================================================
   RASTAAASIAN SANCTUARY — MUSIC + VISUALIZER (mobile-friendly)
   - Floating music orb (play / pause) on every page
   - Starts on the first tap/click (phones block silent autoplay)
   - Remembers play state + position between pages
   - Visualizer is optional (only runs if the page has the canvas)
   ============================================================ */

(function () {
    "use strict";

    const audio = document.getElementById("audio-player");
    if (!audio) return;

    const STATE_KEY = "sanctuaryMusic";
    const canvas = document.getElementById("visualizer-canvas");
    const ctx = canvas ? canvas.getContext("2d") : null;

    const titleEl = document.getElementById("track-title");
    if (titleEl) titleEl.textContent = "$UICIDEBOY$ & Night Lovell – Carried Away";
    const spotifyEl = document.getElementById("spotify-link");
    if (spotifyEl) spotifyEl.href =
        "https://open.spotify.com/track/1IWDzlzjmhKZQp3dqXfv6W?si=921149ec79a14fd8";

    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");

    /* ---------- Saved state (resume across pages) ---------- */
    function readState() {
        try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; }
        catch (e) { return {}; }
    }
    function saveState(extra) {
        try {
            const s = Object.assign(readState(), {
                time: audio.currentTime || 0
            }, extra || {});
            localStorage.setItem(STATE_KEY, JSON.stringify(s));
        } catch (e) { /* storage blocked: ignore */ }
    }

    const saved = readState();
    audio.addEventListener("loadedmetadata", () => {
        if (saved.time && saved.time < (audio.duration || Infinity)) {
            try { audio.currentTime = saved.time; } catch (e) {}
        }
    });

    /* ---------- Visualizer (created only after a tap) ---------- */
    let audioContext = null, analyser = null, dataArray = null, drawing = false;

    function setupAnalyser() {
        if (audioContext || !ctx) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            audioContext = new AC();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        } catch (e) {
            audioContext = null; analyser = null;
        }
    }

    function sizeCanvas() {
        if (!canvas) return;
        canvas.width = canvas.clientWidth || 600;
        canvas.height = canvas.clientHeight || 260;
    }
    window.addEventListener("resize", sizeCanvas);
    sizeCanvas();

    function draw() {
        if (!analyser || audio.paused) { drawing = false; return; }
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const n = dataArray.length;
        const barWidth = (canvas.width / n) * 1.5;
        let x = 0;
        for (let i = 0; i < n; i++) {
            const barHeight = dataArray[i] * 1.4;
            const g = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            g.addColorStop(0, "#2b1b40");
            g.addColorStop(0.5, "#a070ff");
            g.addColorStop(1, "#ffe6ff");
            ctx.fillStyle = g;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 2;
        }
    }

    function startDrawing() {
        if (ctx && analyser && !drawing) { drawing = true; draw(); }
    }

    /* ---------- Music orb (play / pause button) ---------- */
    const style = document.createElement("style");
    style.textContent = `
        #music-orb {
            position: fixed; right: 16px; bottom: 16px; z-index: 10000;
            width: 52px; height: 52px; border-radius: 50%;
            border: 1px solid rgba(200,160,255,0.6);
            background: rgba(15,10,30,0.88); color: #e8ddff;
            font-size: 22px; line-height: 1; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 18px rgba(160,120,255,0.55);
            -webkit-tap-highlight-color: transparent;
        }
        #music-orb.playing { animation: orbPulse 2.2s ease-in-out infinite; }
        @keyframes orbPulse {
            0%,100% { box-shadow: 0 0 14px rgba(160,120,255,0.45); }
            50%     { box-shadow: 0 0 26px rgba(190,150,255,0.9); }
        }
        #music-orb-hint {
            position: fixed; right: 76px; bottom: 28px; z-index: 10000;
            background: rgba(15,10,30,0.9); color: #e8ddff;
            border: 1px solid rgba(200,160,255,0.4); border-radius: 10px;
            padding: 6px 10px; font-size: 13px;
        }`;
    document.head.appendChild(style);

    const orb = document.createElement("button");
    orb.id = "music-orb";
    orb.type = "button";
    orb.setAttribute("aria-label", "Play or pause Sanctuary music");
    document.body.appendChild(orb);

    const hint = document.createElement("div");
    hint.id = "music-orb-hint";
    hint.textContent = "Tap for music 🎵";

    function updateOrb() {
        const playing = !audio.paused;
        orb.textContent = playing ? "⏸" : "▶";
        orb.classList.toggle("playing", playing);
    }

    function removeHint() { if (hint.parentNode) hint.remove(); }

    function start() {
        setupAnalyser();
        if (audioContext && audioContext.state === "suspended") {
            audioContext.resume().catch(() => {});
        }
        return audio.play().then(() => {
            saveState({ playing: true });
            removeHint();
            startDrawing();
        }).catch(() => { /* still blocked: wait for next tap */ });
    }

    function stop() {
        audio.pause();
        saveState({ playing: false });
    }

    orb.addEventListener("click", (e) => {
        e.stopPropagation();
        if (audio.paused) start(); else stop();
    });

    audio.addEventListener("play", () => { updateOrb(); startDrawing(); });
    audio.addEventListener("pause", updateOrb);
    window.addEventListener("pagehide", () => saveState());
    setInterval(() => { if (!audio.paused) saveState(); }, 2000);
    updateOrb();

    /* ---------- Starting rules ----------
       Browsers (especially phones) block sound until the visitor taps.
       1) Try to start right away (works on some desktops).
       2) If blocked, start on the very first tap / click / key press,
          unless the visitor paused the music on an earlier page. */
    const userPaused = saved.playing === false;

    audio.play().then(() => {
        setupAnalyser();
        startDrawing();
    }).catch(() => {
        if (userPaused) return;
        document.body.appendChild(hint);
        const unlock = () => {
            document.removeEventListener("pointerdown", unlock, true);
            document.removeEventListener("touchend", unlock, true);
            document.removeEventListener("keydown", unlock, true);
            if (audio.paused && !userPaused) start();
        };
        document.addEventListener("pointerdown", unlock, true);
        document.addEventListener("touchend", unlock, true);
        document.addEventListener("keydown", unlock, true);
    });
})();
