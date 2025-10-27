const css = `
  html,body{height:100%;margin:0;background:#000}
  .wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column}
  .count{color:#fff;font-family:monospace,monospace;font-size:4.5vmin;text-align:center;letter-spacing:0.2vmin}
  .note{color:#bbb;font-size:1.6vmin;margin-top:1vmin}
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

const wrap = document.createElement('div');
wrap.className = 'wrap';
const display = document.createElement('div');
display.className = 'count';
display.textContent = 'Loading…';
const link = document.createElement('a'); // Time.is requires a visible link back to Time.is when using widget
link.href = 'https://time.is/';
link.textContent = 'Time.is';
link.className = 'note';
link.target = '_blank';
wrap.appendChild(display);
wrap.appendChild(link);
document.body.appendChild(wrap);

// Hidden span used by time.is widget (the widget will render the current time there)
// id can be arbitrary; we'll use it to receive the rendered template via callback.
const timeSpanId = 'ti_now_span';
const span = document.createElement('span');
span.id = timeSpanId;
span.style.display = 'none';
document.body.appendChild(span);

// --- WebAudio tick (short click) ---
let audioCtx;
function tickSound() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioCtx.currentTime;
  // short click via oscillator with quick decay
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = 1000;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.25, now + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(now);
  o.stop(now + 0.1);
}

// --- countdown target logic ---
function makeTargetForYear(year) {
  // Note: month is 0-indexed: 10 = November
  return new Date(year, 10, 27, 0, 0, 0, 0);
}

// Format helpers
function pad(n, len = 2) { return String(n).padStart(len, '0'); }

function updateDisplayFromNow(nowDate) {
  // determine the appropriate target year
  let year = nowDate.getFullYear();
  let target = makeTargetForYear(year);
  if (nowDate >= target) { // if target passed this year -> next year's Nov 27
    target = makeTargetForYear(year + 1);
  }

  let diffMs = target - nowDate;
  if (diffMs <= 0) {
    display.textContent = '00 00:00:00';
    return;
  }
  const sec = Math.floor(diffMs / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;

  display.textContent = `${pad(days, 2)} ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

// --- time.is widget integration ---
// We'll inject the t.js widget, then init it on our hidden span with a callback.
// The callback is called every second with the rendered template (string like "17:12:00")
// We'll parse HH:MM:SS from that, combine into a local Date (preserving local Y-M-D), and update countdown.

function injectTimeIsWidgetAndStart() {
  const s = document.createElement('script');
  s.src = '//widget.time.is/t.js';
  s.async = true;
  s.onload = () => {
    // wait for time_is_widget to be available
    if (!window.time_is_widget) {
      // very unlikely, but fallback to using local clock if widget fails
      startFallbackLocalTimer();
      return;
    }

    // Create an init config: the key must match the span id.
    // We use template TIME and time_format hours:minutes:seconds.
    // Provide callback function name 'timeIsCallback'
    window.time_is_widget.init({
      [timeSpanId]: {
        template: 'TIME',
        time_format: 'hours:minutes:seconds',
        // callback should be a *global* function name (string) per time.is docs
        callback: 'timeIsCallback'
      }
    });

    // define global callback
    window.timeIsCallback = function(rendered) {
      // rendered may contain HTML; extract HH:MM:SS
      // strip tags then match HH:MM:SS
      const txt = rendered.replace(/<[^>]*>/g, '').trim();
      const m = txt.match(/(\d{1,2}):(\d{2}):(\d{2})/);
      if (!m) {
        return;
      }
      const hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ss = parseInt(m[3], 10);

      // build a Date using the user's local year/month/day but replace time components with hh:mm:ss
      const nowLocal = new Date();
      const syncedNow = new Date(
        nowLocal.getFullYear(),
        nowLocal.getMonth(),
        nowLocal.getDate(),
        hh, mm, ss, 0
      );

      // If the synced time appears to be off by more than 12 hours vs local (rare), don't adjust date.
      // But handle day rollovers: if local time was 23:59 and time.is gives 00:00, adjust date accordingly.
      // Check difference between syncedNow and local nowLocal; if difference > 12h, adjust day by +/-1
      const diffHours = (syncedNow - nowLocal) / 3600000;
      if (diffHours > 12) { syncedNow.setDate(syncedNow.getDate() - 1); }
      else if (diffHours < -12) { syncedNow.setDate(syncedNow.getDate() + 1); }

      updateDisplayFromNow(syncedNow);
      // play tick as long as the second changed (callback runs every second anyway)
      try { tickSound(); } catch (e) { /* ignore audio errors */ }
    };
  };
  s.onerror = () => {
    // if widget failed to load, fallback to a local-ticking timer (less accurate)
    startFallbackLocalTimer();
  };
  document.head.appendChild(s);
}

// Fallback if time.is widget fails — use local Date and setInterval
function startFallbackLocalTimer() {
  function tick() {
    const now = new Date();
    updateDisplayFromNow(now);
    tickSound();
  }
  tick(); // immediate
  setInterval(tick, 1000);
}

// Start
injectTimeIsWidgetAndStart();
