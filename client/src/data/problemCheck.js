export function checkProblem(p) {
  const vid = parseInt(p.vid);
  if (isNaN(vid) || vid <= 0) return "Please select a variant";

  if (!V.IsGoodFen(p.fen)) return "Bad FEN string";

  return "";
}
