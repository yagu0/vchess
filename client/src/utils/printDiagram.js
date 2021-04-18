import { ArrayFun } from "@/utils/array";
import { store } from "@/store";

// Turn (human) marks into coordinates
function getMarkArray(marks) {
  if (!marks || marks == "-") return [];
  let markArray = ArrayFun.init(V.size.x, V.size.y, false);
  const squares = marks.split(",");
  for (let i = 0; i < squares.length; i++) {
    const coords = V.SquareToCoords(squares[i]);
    markArray[coords.x][coords.y] = true;
  }
  return markArray;
}

// Turn (human) shadow indications into coordinates
function getShadowArray(shadow) {
  if (!shadow || shadow == "-") return [];
  let shadowArray = ArrayFun.init(V.size.x, V.size.y, false);
  const squares = shadow.split(",");
  for (let i = 0; i < squares.length; i++) {
    const rownum = V.size.x - parseInt(squares[i], 10);
    if (!isNaN(rownum)) {
      // Shadow a full row
      for (let i = 0; i < V.size.y; i++) shadowArray[rownum][i] = true;
      continue;
    }
    if (squares[i].length == 1) {
      // Shadow a full column
      const colnum = V.ColumnToCoord(squares[i]);
      for (let i = 0; i < V.size.x; i++) shadowArray[i][colnum] = true;
      continue;
    }
    if (squares[i].indexOf("-") >= 0) {
      // Shadow a range of squares, horizontally or vertically
      const firstLastSq = squares[i].split("-");
      const range = [
        V.SquareToCoords(firstLastSq[0]),
        V.SquareToCoords(firstLastSq[1])
      ];
      const step = [
        range[1].x == range[0].x
          ? 0
          : (range[1].x - range[0].x) / Math.abs(range[1].x - range[0].x),
        range[1].y == range[0].y
          ? 0
          : (range[1].y - range[0].y) / Math.abs(range[1].y - range[0].y)
      ];
      // Convention: range always from smaller to larger number
      for (
        let x = range[0].x, y = range[0].y;
        x <= range[1].x && y <= range[1].y;
        x += step[0], y += step[1]
      ) {
        shadowArray[x][y] = true;
      }
      continue;
    }
    // Shadow just one square:
    const coords = V.SquareToCoords(squares[i]);
    shadowArray[coords.x][coords.y] = true;
  }
  return shadowArray;
}

// args: object with position (mandatory), and
// orientation, marks, shadow (optional)
// TODO: in time, find a strategy to draw middle lines (weiqi, xianqi...)
//       and maybe also some diagonals (fanorona...)
// https://stackoverflow.com/questions/40697231/horizontal-line-in-the-middle-of-divs
// + CSS rotate?
export function getDiagram(args) {
  // Obtain the array of pieces images names:
  const board = V.GetBoard(args.position);
  const orientation = args.orientation || "w";
  const darkBottomRight = !!args.darkBottomRight;
  const markArray = getMarkArray(args.marks);
  const shadowArray = getShadowArray(args.shadow);
  const vr = new V(); //just for pieces images paths
  let boardDiv = "";
  const [startX, startY, inc] =
    orientation == "w" ? [0, 0, 1] : [V.size.x - 1, V.size.y - 1, -1];
  for (let i = startX; i >= 0 && i < V.size.x; i += inc) {
    boardDiv += "<div class='row";
    if (i == startX && V.Monochrome) boardDiv += " border-top";
    boardDiv += "'>";
    for (let j = startY; j >= 0 && j < V.size.y; j += inc) {
      boardDiv += "<div class='board board" + V.size.y + " ";
      if (V.Monochrome) {
        boardDiv += "monochrome " +
          (V.Notoodark ? "middle-square" : "dark-square");
        if (j == startY) boardDiv += " border-left";
      }
      else {
        const oddity = (i + j) % 2;
        if (
          (oddity == 0 && !V.DarkBottomRight) ||
          (oddity == 1 && V.DarkBottomRight)
        ) {
          boardDiv += "light-square";
        }
        else boardDiv += "dark-square";
      }
      boardDiv += " " + store.state.settings.bcolor;
      if (shadowArray.length > 0 && shadowArray[i][j])
        boardDiv += " in-shadow";
      boardDiv += "'>";
      if (board[i][j] != V.EMPTY) {
        boardDiv +=
          "<img " +
          "src='/images/pieces/" +
          vr.getPpath(board[i][j], null, null, orientation) +
          V.IMAGE_EXTENSION + "' " +
          "class='piece'/>";
      }
      if (markArray.length > 0 && markArray[i][j])
        boardDiv += "<img src='/images/diag_mark.svg' class='mark-square'/>";
      boardDiv += "</div>";
    }
    boardDiv += "</div>";
  }
  return boardDiv;
}

// Method to replace diagrams in loaded HTML
export function replaceByDiag(match, p1, p2) {
  const diagParts = p2.split(" ");
  return getDiagram({
    position: diagParts[0],
    marks: diagParts[1],
    orientation: diagParts[2],
    shadow: diagParts[3]
  });
}
