export function checkProblem(p) {
  const vid = parseInt(p.vid);
  if (isNaN(vid) || vid <= 0) return "Please select a variant";

  if (!V.IsGoodFen(p.fen)) return "Errors in FEN";

  if (p.instruction.trim().length == 0) return "Empty instructions";

  if (p.solution.trim().length == 0) return "Empty solution";

  return "";
}
