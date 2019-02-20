import { extractTime } from "@/utils/timeControl";

export function checkChallenge(c)
{
	const vid = parseInt(c.vid);
	if (isNaN(vid) || vid <= 0)
		return "Please select a variant";

  const tc = extractTime(c.timeControl);
  if (!tc)
    return "Wrong time control";
  // Less than 3 days ==> live game (TODO: heuristic... 40 moves also)
  c.liveGame = (tc.mainTime + 40 * tc.increment < 3*24*60*60);

	// Basic alphanumeric check for players names
	let playerCount = 0;
	for (const pname of c.to)
	{
		if (pname.length > 0)
		{
      // TODO: slightly redundant (see data/userCheck.js)
			if (!pname.match(/^[\w]+$/))
				return "Wrong characters in players names";
			playerCount++;
		}
	}

	if (playerCount > 0 && playerCount != c.nbPlayers-1)
		return "None, or all of the opponent names must be filled"

  // Allow custom FEN (and check it) only for individual challenges
  if (c.fen.length > 0 && playerCount > 0)
  {
    if (!V.IsGoodFen(c.fen))
      return "Bad FEN string";
  }
  else
    c.fen = "";
}
