// 'vname' for 'variant name' is defined when run on client side
function checkChallenge(c, vname)
{
	const vid = parseInt(c.vid);
	if (isNaN(vid) || vid <= 0)
		return "Please select a variant";

	const mainTime = parseInt(c.mainTime);
	const increment = parseInt(c.increment);
	if (isNaN(mainTime) || mainTime <= 0)
		return "Main time should be strictly positive";
	if (isNaN(increment) || increment < 0)
		return "Increment must be positive";

	// Basic alphanumeric check for players names
	let playerCount = 0;
	for (p of c.players)
	{
		if (p.name.length > 0)
		{
			if (!p.name.match(/^[\w]+$/))
				return "Wrong characters in players names";
			playerCount++;
		}
	}

	if (playerCount > 0 && playerCount != c.nbPlayers-1)
		return "None, or all of the opponent names must be filled"

	if (typeof document !== "undefined") //client side
	{
		const V = eval(vname + "Rules");
		// Allow custom FEN (and check it) only for individual challenges
		if (c.fen.length > 0 && playerCount > 0)
		{
			if (!V.IsGoodFen(c.fen))
				return "Bad FEN string";
		}
		else
		{
			// Generate a FEN
			c.fen = V.GenRandInitFen();
		}
	}
	else
	{
		// Just characters check on server:
		if (!c.fen.match(/^[a-zA-Z0-9, /-]*$/))
			return "Bad FEN string";
	}
}

try { module.exports = checkChallenge; } catch(e) { } //for server
