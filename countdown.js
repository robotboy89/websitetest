const css = `
  html,body{height:100%;margin:0;background:#000;color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-family:monospace;font-size:5vmin;}
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

const display = document.createElement('div');
display.textContent = 'Loading...';
document.body.appendChild(display);

let audioCtx;
function tickSound() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 1000;
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

function pad(n) { return String(n).padStart(2, '0'); }

function getTarget(now) {
  const t = new Date(now);
  t.setMonth(10);  // November (0-indexed)
  t.setDate(27);
  t.setHours(0,0,0,0);
  if (t <= now) t.setFullYear(t.getFullYear() + 1);
  return t;
}

function updateCountdown(now) {
  const target = getTarget(now);
  const diff = target - now;
  if (diff <= 0) {
    display.textContent = '00 00:00:00';
    return;
  }
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  display.textContent = `${pad(d)} ${pad(h)}:${pad(m)}:${pad(sec)}`;
}

async function init() {
  // get accurate current time once
  let now = new Date();
  try {
    const res = await fetch('https://worldtimeapi.org/api/ip');
    const data = await res.json();
    now = new Date(data.datetime);
  } catch(e) {
    console.warn('Time API failed, using local clock.');
  }

  let lastSecond = -1;
  function loop() {
    const current = new Date();
    const diff = current - now;
    const syncedNow = new Date(now.getTime() + diff);
    const sec = Math.floor(syncedNow.getTime() / 1000);
    if (sec !== lastSecond) {
      updateCountdown(syncedNow);
      tickSound();
      lastSecond = sec;
    }
    requestAnimationFrame(loop);
  }
  loop();
}

init();
