// Take into account that the move may be a multi-move
export function getFullNotation(move, type) {
  if (!type) type = "notation";
  if (Array.isArray(move)) {
    if (move.length <= 3) {
      let notation = "";
      for (let i=0; i<move.length; i++)
        notation += move[i][type] + ",";
      // Remove last comma:
      return notation.slice(0,-1);
    }
    // Four sub-moves or more:
    return "&#8734;";
  }
  // Simple (usual) case
  return move[type];
}
