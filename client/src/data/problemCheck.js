export function checkProblem(p) {
  const vid = parseInt(p.vid);
  if (isNaN(vid) || vid <= 0) return "Please select a variant";

  if (!V.IsGoodFen(p.fen)) return "Errors in FEN";

  if (p.instruction.trim().length == 0) return "Missing instructions";

  if (p.solution.trim().length == 0) return "Missing solution";

  return "";
}
