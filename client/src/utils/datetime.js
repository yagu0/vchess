function zeroPad(x) {
  return (x < 10 ? "0" : "") + x;
}

export function getDate(d) {
  return (
    d.getFullYear() +
    "-" +
    zeroPad(d.getMonth() + 1) +
    "-" +
    zeroPad(d.getDate())
  );
}

export function getTime(d) {
  return (
    zeroPad(d.getHours()) +
    ":" +
    zeroPad(d.getMinutes()) +
    ":" +
    zeroPad(d.getSeconds())
  );
}

function padDigits(x) {
  if (x < 10) return "0" + x;
  return x;
}

export function ppt(t) {
  // "Pretty print" an amount of time given in seconds
  const dayInSeconds = 60 * 60 * 24;
  const hourInSeconds = 60 * 60;
  let days = Math.floor(t / dayInSeconds);
  const hours = Math.floor((t % dayInSeconds) / hourInSeconds);
  const minutes = Math.floor((t % hourInSeconds) / 60);
  const seconds = Math.floor(t % 60);
  let res = "";
  // NOTE: 3 days limit is rather arbitrary
  if (days >= 3 && hours >= 12) days++;
  if (days > 0) res += days + "d ";
  if (days < 3 && hours > 0) res += hours + "h ";
  if (days == 0 && minutes > 0)
    res += hours > 0 ? padDigits(minutes) + "m " : minutes + ":";
  if (days == 0 && hours == 0) {
    res += padDigits(seconds);
    // Seconds indicator, since this is the only number printed:
    if (minutes == 0) res += "s";
  }
  return res.trim(); //remove potential last space
}
