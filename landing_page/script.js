const header = document.querySelector(".site-header");
const canvas = document.querySelector("#glucose-canvas");
const ctx = canvas.getContext("2d");

const state = {
  width: 0,
  height: 0,
  points: [],
  pointerX: 0.5,
  pointerY: 0.5,
};

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  state.width = canvas.clientWidth;
  state.height = canvas.clientHeight;
  canvas.width = Math.floor(state.width * ratio);
  canvas.height = Math.floor(state.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  buildPoints();
}

function buildPoints() {
  const count = Math.max(26, Math.floor(state.width / 48));
  state.points = Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const base = state.height * (0.5 + Math.sin(progress * Math.PI * 3) * 0.08);
    return {
      x: progress * state.width,
      y: base,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.5,
    };
  });
}

function drawGrid() {
  ctx.strokeStyle = "rgba(23, 32, 51, 0.08)";
  ctx.lineWidth = 1;

  for (let x = 0; x < state.width; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.height);
    ctx.stroke();
  }

  for (let y = 0; y < state.height; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }
}

function drawBand(y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(state.width, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCurve(time) {
  const influenceX = state.pointerX * state.width;
  const influenceY = state.pointerY * state.height;

  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1d4eff";
  ctx.beginPath();

  state.points.forEach((point, index) => {
    const distance = Math.abs(point.x - influenceX) / Math.max(state.width, 1);
    const pointerLift = (0.5 - state.pointerY) * 60 * Math.max(0, 1 - distance * 2);
    const wave = Math.sin(time * point.speed + point.phase) * 18;
    const y = point.y + wave + pointerLift + (influenceY - state.height / 2) * 0.03;

    if (index === 0) {
      ctx.moveTo(point.x, y);
    } else {
      const prev = state.points[index - 1];
      const cx = (prev.x + point.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y + wave * 0.6, cx, y);
    }
  });

  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(8, 166, 200, 0.42)";
  ctx.beginPath();
  state.points.forEach((point, index) => {
    const y = point.y + Math.sin(time * 0.8 + point.phase) * 28 + 70;
    if (index === 0) {
      ctx.moveTo(point.x, y);
    } else {
      ctx.lineTo(point.x, y);
    }
  });
  ctx.stroke();
}

function animate(timestamp) {
  const time = timestamp / 1000;
  ctx.clearRect(0, 0, state.width, state.height);
  drawGrid();
  drawBand(state.height * 0.36, "rgba(255, 107, 107, 0.34)");
  drawBand(state.height * 0.62, "rgba(24, 169, 133, 0.32)");
  drawCurve(time);
  requestAnimationFrame(animate);
}

function updateHeader() {
  header.dataset.elevated = window.scrollY > 24 ? "true" : "false";
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("pointermove", (event) => {
  state.pointerX = event.clientX / Math.max(window.innerWidth, 1);
  state.pointerY = event.clientY / Math.max(window.innerHeight, 1);
});

resizeCanvas();
updateHeader();
requestAnimationFrame(animate);
