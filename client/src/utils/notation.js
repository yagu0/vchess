// Take into account that the move may be a multi-move
export function getFullNotation(move) {
  if (Array.isArray(move)) {
    let notation = "";
    for (let i=0; i<move.length; i++)
      notation += move[i].notation + ",";
    // Remove last comma:
    return notation.slice(0,-1);
  }
  // Simple (usual) case
  return move.notation;
}
