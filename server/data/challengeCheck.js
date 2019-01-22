function checkChallenge(c)
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

	// Just characters check on server:
	if (!c.fen.match(/^[a-zA-Z0-9, /-]*$/))
		return "Bad FEN string";
}

module.exports = checkChallenge;
