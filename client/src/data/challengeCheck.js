

function timeUnitToSeconds(value, unit)
{
  let seconds = value;
  switch (unit)
  {
    case 'd':
      seconds *= 24;
    case 'h':
      seconds *= 60;
    case 'm':
      seconds *= 60;
  }
  return seconds;
}

function isLargerUnit(unit1, unit2)
{
  return (unit1 == 'd' && unit2 != 'd')
    || (unit1 == 'h' && ['s','m'].includes(unit2))
    || (unit1 == 'm' && unit2 == 's');
}

export function checkChallenge(c)
{
	const vid = parseInt(c.vid);
	if (isNaN(vid) || vid <= 0)
		return "Please select a variant";

  const tcParts = c.timeControl.replace(/ /g,"").split('+');
	const mainTime = tcParts[0].match(/([0-9]+)([smhd])/);
  if (!mainTime)
    return "Wrong time control";
  const mainTimeValue = parseInt(mainTime[1]);
  const mainTimeUnit = mainTime[2];
	if (isNaN(mainTimeValue) || mainTimeValue <= 0)
		return "Main time should be strictly positive";
  c.mainTime = timeUnitToSeconds(mainTimeValue, mainTimeUnit);
  if (tcParts.length >= 2)
  {
    const increment = tcParts[1].match(/([0-9]+)([smhd])/);
    if (!increment)
      return "Wrong time control";
    const incrementValue = parseInt(increment[1]);
    const incrementUnit = increment[2];
    if (isLargerUnit(incrementUnit, mainTimeUnit))
      return "Increment unit cannot be larger than main unit";
    if (isNaN(incrementValue) || incrementValue < 0)
      return "Increment must be positive";
    c.increment = timeUnitToSeconds(incrementValue, incrementUnit);
  }
  else
    c.increment = 0;

	// Basic alphanumeric check for players names
	let playerCount = 0;
	for (const p of c.to)
	{
		if (p.name.length > 0)
		{
      // TODO: slightly redundant (see data/userCheck.js)
			if (!p.name.match(/^[\w]+$/))
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
  else //generate a FEN
    c.fen = V.GenRandInitFen();
}
