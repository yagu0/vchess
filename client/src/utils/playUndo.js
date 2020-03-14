export function playMove(move, vr) {
  if (!Array.isArray(move)) move = [move];
  move.forEach(m => vr.play(m));
}

export function undoMove(move, vr) {
  if (!Array.isArray(move)) move = [move];
  // If multi-move, undo all submoves from last to first
  for (let i = move.length - 1; i >= 0; i--)
    vr.undo(move[i]);
}

export function getFilteredMove(move) {
  if (!Array.isArray(move)) move = [move];
  const filtered_move = move.map(m => {
    return {
      appear: m.appear,
      vanish: m.vanish,
      start: m.start,
      end: m.end
    };
  });
  return filtered_move.length == 1 ? filtered_move[0] : filtered_move;
}
