export function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export class SpatialGrid {
  constructor(cellSize = 150) {
    this.cellSize = cellSize;
    // Map of cellKey -> Set of entity IDs
    this.cells = new Map();
    // Map of entity ID -> { id, x, y, data, cellKey }
    this.entities = new Map();
  }

  _getCellKey(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx}:${cy}`;
  }

  insert(id, x, y, data = {}) {
    this.remove(id);

    const cellKey = this._getCellKey(x, y);
    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, new Set());
    }
    this.cells.get(cellKey).add(id);

    this.entities.set(id, {
      id,
      x,
      y,
      data,
      cellKey,
    });
  }

  update(id, x, y, data) {
    const existing = this.entities.get(id);
    if (!existing) {
      this.insert(id, x, y, data);
      return;
    }

    const newCellKey = this._getCellKey(x, y);
    if (existing.cellKey !== newCellKey) {
      // Move between cells
      const oldCell = this.cells.get(existing.cellKey);
      if (oldCell) {
        oldCell.delete(id);
        if (oldCell.size === 0) {
          this.cells.delete(existing.cellKey);
        }
      }

      if (!this.cells.has(newCellKey)) {
        this.cells.set(newCellKey, new Set());
      }
      this.cells.get(newCellKey).add(id);
      existing.cellKey = newCellKey;
    }

    existing.x = x;
    existing.y = y;
    if (data !== undefined) {
      existing.data = { ...existing.data, ...data };
    }
  }

  remove(id) {
    const existing = this.entities.get(id);
    if (!existing) return;

    const cell = this.cells.get(existing.cellKey);
    if (cell) {
      cell.delete(id);
      if (cell.size === 0) {
        this.cells.delete(existing.cellKey);
      }
    }

    this.entities.delete(id);
  }

  get(id) {
    return this.entities.get(id);
  }

  has(id) {
    return this.entities.has(id);
  }

  /**
   * Find all entities within Euclidean distance `radius` from (x, y), excluding `excludeId`
   */
  getNearby(x, y, radius, excludeId = null) {
    const results = [];
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    const checkedIds = new Set();

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = `${cx}:${cy}`;
        const cell = this.cells.get(key);
        if (!cell) continue;

        for (const id of cell) {
          if (id === excludeId || checkedIds.has(id)) continue;
          checkedIds.add(id);

          const entity = this.entities.get(id);
          if (!entity) continue;

          const dist = calculateDistance(x, y, entity.x, entity.y);
          if (dist <= radius) {
            results.push({
              id: entity.id,
              x: entity.x,
              y: entity.y,
              data: entity.data,
              distance: dist,
            });
          }
        }
      }
    }

    return results;
  }

  getAll() {
    return Array.from(this.entities.values());
  }

  clear() {
    this.cells.clear();
    this.entities.clear();
  }
}
