/* ============================================================
   RASTAASIAN SANCTUARY — MUSIC VISUALIZER
   ============================================================ */

/* ============================
   🎵 SANCTUARY MUSIC VISUALIZER
   ============================ */

const audio = document.getElementById("audio-player");
const canvas = document.getElementById("visualizer-canvas");
const ctx = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

document.getElementById("track-title").textContent =
    "$UICIDEBOY$ & Night Lovell – Carried Away";

document.getElementById("spotify-link").href =
    "https://open.spotify.com/track/1IWDzlzjmhKZQp3dqXfv6W?si=921149ec79a14fd8";

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

const source = audioContext.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(audioContext.destination);

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);


/* ============================
   ▶️ AUTOPLAY ON PAGE LOAD
   ============================ */

window.addEventListener("DOMContentLoaded", () => {
    audio.play().catch(err => {
        console.log("Autoplay blocked, retrying…", err);

        setTimeout(() => {
            audio.play().catch(err2 => console.log("Still blocked:", err2));
        }, 500);
    });
});


/* ============================
   🎵 DRAW VISUALIZER
   ============================ */

function draw() {
    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 1.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] * 1.4;

        const gradient = ctx.createLinearGradient(
            0, canvas.height,
            0, canvas.height - barHeight
        );
        gradient.addColorStop(0, "#2b1b40");
        gradient.addColorStop(0.5, "#a070ff");
        gradient.addColorStop(1, "#ffe6ff");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
    }
}

audio.addEventListener("play", () => {
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
    draw();
});
function loadPage(page) {
    fetch(page)
        .then(res => res.text())
        .then(html => {
            document.querySelector("main").innerHTML = html;
        });
}
