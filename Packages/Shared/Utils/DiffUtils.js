const MAX_DIFF_LINES = 400;

export function computeDiff(before, after, { maxLines = MAX_DIFF_LINES } = {}) {
  const left = (before || '').replace(/\r\n/g, '\n').split('\n');
  const right = (after || '').replace(/\r\n/g, '\n').split('\n');

  if (left.length > maxLines || right.length > maxLines) {
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    return {
      ops: null,
      added: right.filter((line) => !leftSet.has(line)).length,
      removed: left.filter((line) => !rightSet.has(line)).length,
      tooLarge: true,
    };
  }

  const rows = left.length;
  const cols = right.length;
  const matrix = Array.from({ length: rows + 1 }, () => new Int32Array(cols + 1));

  for (let r = 1; r <= rows; r += 1) {
    for (let c = 1; c <= cols; c += 1) {
      matrix[r][c] =
        left[r - 1] === right[c - 1]
          ? matrix[r - 1][c - 1] + 1
          : Math.max(matrix[r - 1][c], matrix[r][c - 1]);
    }
  }

  const ops = [];
  let r = rows;
  let c = cols;

  while (r > 0 || c > 0) {
    if (r > 0 && c > 0 && left[r - 1] === right[c - 1]) {
      ops.push({ type: 'eq', line: left[r - 1] });
      r -= 1;
      c -= 1;
    } else if (c > 0 && (r === 0 || matrix[r][c - 1] >= matrix[r - 1][c])) {
      ops.push({ type: 'add', line: right[c - 1] });
      c -= 1;
    } else {
      ops.push({ type: 'rem', line: left[r - 1] });
      r -= 1;
    }
  }

  ops.reverse();

  return {
    ops,
    added: ops.filter((entry) => entry.type === 'add').length,
    removed: ops.filter((entry) => entry.type === 'rem').length,
    tooLarge: false,
  };
}
