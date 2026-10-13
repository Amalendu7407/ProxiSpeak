const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.display = "none";

let username = "";
const player = { x: 400, y: 300, r: 15, speed: 5 };
const keys = {};

document.getElementById("join").onclick = () => {
  username = document.getElementById("username").value || "Guest";
  document.getElementById("login").style.display = "none";
  canvas.style.display = "block";
  loop();
};

window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function update() {
  if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
  if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
  if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
  if (keys["d"] || keys["arrowright"]) player.x += player.speed;
  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
  ctx.beginPath();
  ctx.arc(player.x, player.y, 120, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "lime";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(username, player.x, player.y - 22);

}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}