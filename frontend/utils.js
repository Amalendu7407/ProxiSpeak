function hitsObstacle(x, y, r, obstacles) {
  return obstacles.some(o => {
    const cx = Math.max(o.x, Math.min(x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(y, o.y + o.h));
    return Math.hypot(x - cx, y - cy) < r;
  });
}

function getNearbyUsers(others, player, range = 100) {
  return Object.keys(others).filter(id =>
    Math.hypot(others[id].x - player.x, others[id].y - player.y) <= range
  );
}

if (typeof module !== "undefined") module.exports = { hitsObstacle, getNearbyUsers };