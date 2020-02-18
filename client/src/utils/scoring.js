// Default score message if none provided
export function getScoreMessage(score) {
  let eogMessage = "Undefined"; //not translated: unused
  switch (score) {
    case "1-0":
      eogMessage = "White win";
      break;
    case "0-1":
      eogMessage = "Black win";
      break;
    case "1/2":
      eogMessage = "Draw";
      break;
    case "?":
      eogMessage = "Unknown";
      break;
  }
  return eogMessage;
}
