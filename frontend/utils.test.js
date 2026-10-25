const { hitsObstacle, getNearbyUsers } = require("./utils");

const walls = [{ x: 100, y: 100, w: 20, h: 100 }];

test("character wall se takraya", () => {
  expect(hitsObstacle(110, 150, 15, walls)).toBe(true);
});

test("khuli jagah par collision nahi", () => {
  expect(hitsObstacle(400, 300, 15, walls)).toBe(false);
});

test("100px ke andar wala user mila", () => {
  const others = { a: { x: 450, y: 300 }, b: { x: 700, y: 300 } };
  expect(getNearbyUsers(others, { x: 400, y: 300 })).toEqual(["a"]);
});

test("100px se door wala user nahi mila", () => {
  const others = { b: { x: 700, y: 300 } };
  expect(getNearbyUsers(others, { x: 400, y: 300 })).toEqual([]);
});