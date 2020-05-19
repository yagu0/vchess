function timeUnitToSeconds(value, unit) {
  let seconds = value;
  switch (unit) {
    case "d":
      seconds *= 86400; //24*60*60
      break;
    case "h":
      seconds *= 3600;
      break;
    case "m":
      seconds *= 60;
      break;
  }
  return seconds;
}

// Used only if increment, hence live game: no "day" unit
function isLargerUnit(unit1, unit2) {
  return (
    (unit1 == "h" && ["s", "m"].includes(unit2)) ||
    (unit1 == "m" && unit2 == "s")
  );
}

export function extractTime(cadence) {
  let tcParts = cadence.replace(/ /g, "").split("+");
  // Concatenate usual time control suffix, in case of none is provided
  tcParts[0] += "m";
  const mainTimeArray = tcParts[0].match(/^([0-9]+)([smhd]+)$/);
  if (!mainTimeArray) return null;
  const mainTimeValue = parseInt(mainTimeArray[1], 10);
  const mainTimeUnit = mainTimeArray[2][0];
  const mainTime = timeUnitToSeconds(mainTimeValue, mainTimeUnit);
  let increment = 0;
  if (tcParts.length >= 2) {
    // Correspondance games don't use an increment:
    if (mainTimeUnit == 'd') return null;
    tcParts[1] += "s";
    const incrementArray = tcParts[1].match(/^([0-9]+)([smhd]+)$/);
    if (!incrementArray) return null;
    const incrementValue = parseInt(incrementArray[1], 10);
    const incrementUnit = incrementArray[2][0];
    // Increment unit cannot be larger than main unit:
    if (isLargerUnit(incrementUnit, mainTimeUnit)) return null;
    increment = timeUnitToSeconds(incrementValue, incrementUnit);
  }
  return { mainTime: mainTime, increment: increment };
}
