// Default score message if none provided
export function getScoreMessage(score, reverseColors) {
  let eogMessage = "Undefined"; //not translated: unused
  switch (score) {
    case "1-0":
      eogMessage = (!reverseColors ? "White win" : "Black win");
      break;
    case "0-1":
      eogMessage = (!reverseColors ? "Black win" : "White win");
      break;
    case "1/2":
      eogMessage = "Draw";
      break;
    case "?":
      eogMessage = "Undetermined result";
      break;
  }
  return eogMessage;
}
