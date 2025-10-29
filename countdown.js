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

const tick1 = new Audio("tick1.mp3");
const tick2 = new Audio("tick2.mp3");
tick1.preload = "auto";
tick2.preload = "auto";

let tickToggle = false;
function tickSound() {
  const snd = tickToggle ? tick1 : tick2;
  tickToggle = !tickToggle;
  snd.currentTime = 0;
  snd.play().catch(() => {});
}

function getTarget() {
  const t = new Date();
  t.setFullYear(2025);
  t.setMonth(10);  // November (0-indexed)
  t.setDate(27);
  t.setHours(0,0,0,0);
  return t;
}

function updateCountdown(now) {
  const target = getTarget();
  const diff = target - now;
  
  if (diff <= 0) {
    display.textContent = '';
    document.body.style.display = 'none';
    return false;
  }

  const seconds = Math.floor(diff / 1000);
  display.textContent = seconds.toString(); // no commas
  return true;
}

function init() {
  let lastSecond = -1;
  function loop() {
    const now = new Date();
    const sec = Math.floor(now.getTime() / 1000);
    if (sec !== lastSecond) {
      const shouldContinue = updateCountdown(now);
      if (!shouldContinue) return;
      tickSound();
      lastSecond = sec;
    }
    requestAnimationFrame(loop);
  }
  loop();
}

init();