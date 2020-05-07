import { extractTime } from "@/utils/timeControl";

export function checkChallenge(c) {
  const vid = parseInt(c.vid);
  if (isNaN(vid) || vid <= 0) return "Please select a variant";

  const tc = extractTime(c.cadence);
  if (!tc) return "Wrong time control";

  // Basic alphanumeric check for opponent name
  if (c.to) {
    // NOTE: slightly redundant (see data/userCheck.js)
    if (!c.to.match(/^[\w]+$/)) return "Name: alphanumerics and underscore";
  }

  // Allow custom FEN (and check it) only for individual challenges
  if (c.fen.length > 0 && !!c.to) {
    if (!V.IsGoodFen(c.fen)) return "Errors in FEN";
  }
  else c.fen = "";

  return "";
}
