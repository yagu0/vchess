// (Orthodox) Chess rules are defined in ChessRules class.
// Variants generally inherit from it, and modify some parts.

import { ArrayFun } from "@/utils/array";
import { randInt, shuffle } from "@/utils/alea";

// class "PiPo": Piece + Position
export const PiPo = class PiPo {
  // o: {piece[p], color[c], posX[x], posY[y]}
  constructor(o) {
    this.p = o.p;
    this.c = o.c;
    this.x = o.x;
    this.y = o.y;
  }
};

export const Move = class Move {
  // o: {appear, vanish, [start,] [end,]}
  // appear,vanish = arrays of PiPo
  // start,end = coordinates to apply to trigger move visually (think castle)
  constructor(o) {
    this.appear = o.appear;
    this.vanish = o.vanish;
    this.start = o.start ? o.start : { x: o.vanish[0].x, y: o.vanish[0].y };
    this.end = o.end ? o.end : { x: o.appear[0].x, y: o.appear[0].y };
  }
};

// NOTE: x coords = top to bottom; y = left to right
// (from white player perspective)
export const ChessRules = class ChessRules {

  //////////////
  // MISC UTILS

  // Some variants don't have flags:
  static get HasFlags() {
    return true;
  }

  // Or castle
  static get HasCastle() {
    return V.HasFlags;
  }

  // Pawns specifications
  static get PawnSpecs() {
    return {
      directions: { 'w': -1, 'b': 1 },
      initShift: { w: 1, b: 1 },
      twoSquares: true,
      threeSquares: false,
      promotions: [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN],
      canCapture: true,
      captureBackward: false,
      bidirectional: false
    };
  }

  // En-passant captures need a stack of squares:
  static get HasEnpassant() {
    return true;
  }

  // Some variants cannot have analyse mode
  static get CanAnalyze() {
    return true;
  }
  // Patch: issues with javascript OOP, objects can't access static fields.
  get canAnalyze() {
    return V.CanAnalyze;
  }

  // Some variants show incomplete information,
  // and thus show only a partial moves list or no list at all.
  static get ShowMoves() {
    return "all";
  }
  get showMoves() {
    return V.ShowMoves;
  }

  // Sometimes moves must remain hidden until game ends
  static get SomeHiddenMoves() {
    return false;
  }
  get someHiddenMoves() {
    return V.SomeHiddenMoves;
  }

  // Generally true, unless the variant includes random effects
  static get CorrConfirm() {
    return true;
  }

  // Used for Monochrome variant (TODO: harmonize: !canFlip ==> showFirstTurn)
  get showFirstTurn() {
    return false;
  }

  // Some variants always show the same orientation
  static get CanFlip() {
    return true;
  }
  get canFlip() {
    return V.CanFlip;
  }

  // For (generally old) variants without checkered board
  static get Monochrome() {
    return false;
  }

  // Some games are drawn unusually (bottom right corner is black)
  static get DarkBottomRight() {
    return false;
  }

  // Some variants require lines drawing
  static get Lines() {
    if (V.Monochrome) {
      let lines = [];
      // Draw all inter-squares lines
      for (let i = 0; i <= V.size.x; i++)
        lines.push([[i, 0], [i, V.size.y]]);
      for (let j = 0; j <= V.size.y; j++)
        lines.push([[0, j], [V.size.x, j]]);
      return lines;
    }
    return null;
  }

  // In some variants, the player who repeat a position loses
  static get LoseOnRepetition() {
    return false;
  }

  // Some variants use click infos:
  doClick() {
    return null;
  }

  // Some variants may need to highlight squares on hover (Hamilton, Weiqi...)
  hoverHighlight() {
    return false;
  }

  static get IMAGE_EXTENSION() {
    // All pieces should be in the SVG format
    return ".svg";
  }

  // Turn "wb" into "B" (for FEN)
  static board2fen(b) {
    return b[0] == "w" ? b[1].toUpperCase() : b[1];
  }

  // Turn "p" into "bp" (for board)
  static fen2board(f) {
    return f.charCodeAt() <= 90 ? "w" + f.toLowerCase() : "b" + f;
  }

  // Check if FEN describes a board situation correctly
  static IsGoodFen(fen) {
    const fenParsed = V.ParseFen(fen);
    // 1) Check position
    if (!V.IsGoodPosition(fenParsed.position)) return false;
    // 2) Check turn
    if (!fenParsed.turn || !V.IsGoodTurn(fenParsed.turn)) return false;
    // 3) Check moves count
    if (!fenParsed.movesCount || !(parseInt(fenParsed.movesCount, 10) >= 0))
      return false;
    // 4) Check flags
    if (V.HasFlags && (!fenParsed.flags || !V.IsGoodFlags(fenParsed.flags)))
      return false;
    // 5) Check enpassant
    if (
      V.HasEnpassant &&
      (!fenParsed.enpassant || !V.IsGoodEnpassant(fenParsed.enpassant))
    ) {
      return false;
    }
    return true;
  }

  // Is position part of the FEN a priori correct?
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kings[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // Both kings should be on board. Exactly one per color.
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  // For FEN checking
  static IsGoodTurn(turn) {
    return ["w", "b"].includes(turn);
  }

  // For FEN checking
  static IsGoodFlags(flags) {
    // NOTE: a little too permissive to work with more variants
    return !!flags.match(/^[a-z]{4,4}$/);
  }

  // NOTE: not with regexp to adapt to different board sizes. (TODO?)
  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") {
      const ep = V.SquareToCoords(enpassant);
      if (isNaN(ep.x) || !V.OnBoard(ep)) return false;
    }
    return true;
  }

  // 3 --> d (column number to letter)
  static CoordToColumn(colnum) {
    return String.fromCharCode(97 + colnum);
  }

  // d --> 3 (column letter to number)
  static ColumnToCoord(column) {
    return column.charCodeAt(0) - 97;
  }

  // a4 --> {x:3,y:0}
  static SquareToCoords(sq) {
    return {
      // NOTE: column is always one char => max 26 columns
      // row is counted from black side => subtraction
      x: V.size.x - parseInt(sq.substr(1), 10),
      y: sq[0].charCodeAt() - 97
    };
  }

  // {x:0,y:4} --> e8
  static CoordsToSquare(coords) {
    return V.CoordToColumn(coords.y) + (V.size.x - coords.x);
  }

  // Path to pieces (standard ones in pieces/ folder)
  getPpath(b) {
    return b;
  }

  // Path to promotion pieces (usually the same)
  getPPpath(m) {
    return this.getPpath(m.appear[0].c + m.appear[0].p);
  }

  // Aggregates flags into one object
  aggregateFlags() {
    return this.castleFlags;
  }

  // Reverse operation
  disaggregateFlags(flags) {
    this.castleFlags = flags;
  }

  // En-passant square, if any
  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined;
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      return V.SquareToCoords(square);
    }
    // Argument is a move:
    const move = moveOrSquare;
    const s = move.start,
          e = move.end;
    if (
      s.y == e.y &&
      Math.abs(s.x - e.x) == 2 &&
      // Next conditions for variants like Atomic or Rifle, Recycle...
      (move.appear.length > 0 && move.appear[0].p == V.PAWN) &&
      (move.vanish.length > 0 && move.vanish[0].p == V.PAWN)
    ) {
      return {
        x: (s.x + e.x) / 2,
        y: s.y
      };
    }
    return undefined; //default
  }

  // Can thing on square1 take thing on square2
  canTake([x1, y1], [x2, y2]) {
    return this.getColor(x1, y1) !== this.getColor(x2, y2);
  }

  // Is (x,y) on the chessboard?
  static OnBoard(x, y) {
    return x >= 0 && x < V.size.x && y >= 0 && y < V.size.y;
  }

  // Used in interface: 'side' arg == player color
  canIplay(side, [x, y]) {
    return this.turn == side && this.getColor(x, y) == side;
  }

  // On which squares is color under check ? (for interface)
  getCheckSquares() {
    const color = this.turn;
    return (
      this.underCheck(color)
        // kingPos must be duplicated, because it may change:
        ? [JSON.parse(JSON.stringify(this.kingPos[color]))]
        : []
    );
  }

  /////////////
  // FEN UTILS

  // Setup the initial random (asymmetric) position
  static GenRandInitFen(randomness) {
    if (randomness == 0)
      // Deterministic:
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0 ahah -";

    let pieces = { w: new Array(8), b: new Array(8) };
    let flags = "";
    // Shuffle pieces on first (and last rank if randomness == 2)
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        flags += flags;
        break;
      }

      let positions = ArrayFun.range(8);

      // Get random squares for bishops
      let randIndex = 2 * randInt(4);
      const bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(4) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for knights
      randIndex = randInt(6);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rooks and king positions are now fixed,
      // because of the ordering rook-king-rook
      const rook1Pos = positions[0];
      const kingPos = positions[1];
      const rook2Pos = positions[2];

      // Finally put the shuffled pieces in the board array
      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      flags += V.CoordToColumn(rook1Pos) + V.CoordToColumn(rook2Pos);
    }
    // Add turn + flags + enpassant
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 " + flags + " -"
    );
  }

  // "Parse" FEN: just return untransformed string data
  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    let res = {
      position: fenParts[0],
      turn: fenParts[1],
      movesCount: fenParts[2]
    };
    let nextIdx = 3;
    if (V.HasFlags) Object.assign(res, { flags: fenParts[nextIdx++] });
    if (V.HasEnpassant) Object.assign(res, { enpassant: fenParts[nextIdx] });
    return res;
  }

  // Return current fen (game state)
  getFen() {
    return (
      this.getBaseFen() + " " +
      this.getTurnFen() + " " +
      this.movesCount +
      (V.HasFlags ? " " + this.getFlagsFen() : "") +
      (V.HasEnpassant ? " " + this.getEnpassantFen() : "")
    );
  }

  getFenForRepeat() {
    // Omit movesCount, only variable allowed to differ
    return (
      this.getBaseFen() + "_" +
      this.getTurnFen() +
      (V.HasFlags ? "_" + this.getFlagsFen() : "") +
      (V.HasEnpassant ? "_" + this.getEnpassantFen() : "")
    );
  }

  // Position part of the FEN string
  getBaseFen() {
    const format = (count) => {
      // if more than 9 consecutive free spaces, break the integer,
      // otherwise FEN parsing will fail.
      if (count <= 9) return count;
      // Currently only boards of size up to 11 or 12:
      return "9" + (count - 9);
    };
    let position = "";
    for (let i = 0; i < V.size.x; i++) {
      let emptyCount = 0;
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] == V.EMPTY) emptyCount++;
        else {
          if (emptyCount > 0) {
            // Add empty squares in-between
            position += format(emptyCount);
            emptyCount = 0;
          }
          position += V.board2fen(this.board[i][j]);
        }
      }
      if (emptyCount > 0) {
        // "Flush remainder"
        position += format(emptyCount);
      }
      if (i < V.size.x - 1) position += "/"; //separate rows
    }
    return position;
  }

  getTurnFen() {
    return this.turn;
  }

  // Flags part of the FEN string
  getFlagsFen() {
    let flags = "";
    // Castling flags
    for (let c of ["w", "b"])
      flags += this.castleFlags[c].map(V.CoordToColumn).join("");
    return flags;
  }

  // Enpassant part of the FEN string
  getEnpassantFen() {
    const L = this.epSquares.length;
    if (!this.epSquares[L - 1]) return "-"; //no en-passant
    return V.CoordsToSquare(this.epSquares[L - 1]);
  }

  // Turn position fen into double array ["wb","wp","bk",...]
  static GetBoard(position) {
    const rows = position.split("/");
    let board = ArrayFun.init(V.size.x, V.size.y, "");
    for (let i = 0; i < rows.length; i++) {
      let j = 0;
      for (let indexInRow = 0; indexInRow < rows[i].length; indexInRow++) {
        const character = rows[i][indexInRow];
        const num = parseInt(character, 10);
        // If num is a number, just shift j:
        if (!isNaN(num)) j += num;
        // Else: something at position i,j
        else board[i][j++] = V.fen2board(character);
      }
    }
    return board;
  }

  // Extract (relevant) flags from fen
  setFlags(fenflags) {
    // white a-castle, h-castle, black a-castle, h-castle
    this.castleFlags = { w: [-1, -1], b: [-1, -1] };
    for (let i = 0; i < 4; i++) {
      this.castleFlags[i < 2 ? "w" : "b"][i % 2] =
        V.ColumnToCoord(fenflags.charAt(i));
    }
  }

  //////////////////
  // INITIALIZATION

  // Fen string fully describes the game state
  constructor(fen) {
    if (!fen)
      // In printDiagram() fen isn't supply because only getPpath() is used
      // TODO: find a better solution!
      return;
    const fenParsed = V.ParseFen(fen);
    this.board = V.GetBoard(fenParsed.position);
    this.turn = fenParsed.turn;
    this.movesCount = parseInt(fenParsed.movesCount, 10);
    this.setOtherVariables(fen);
  }

  // Scan board for kings positions
  scanKings(fen) {
    // Squares of white and black king:
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    const startRow = { 'w': V.size.x - 1, 'b': 0 };
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0; //column index on board
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "k":
            this.kingPos["b"] = [i, k];
            break;
          case "K":
            this.kingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j), 10);
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  // Some additional variables from FEN (variant dependant)
  setOtherVariables(fen) {
    // Set flags and enpassant:
    const parsedFen = V.ParseFen(fen);
    if (V.HasFlags) this.setFlags(parsedFen.flags);
    if (V.HasEnpassant) {
      const epSq =
        parsedFen.enpassant != "-"
          ? this.getEpSquare(parsedFen.enpassant)
          : undefined;
      this.epSquares = [epSq];
    }
    // Search for kings positions:
    this.scanKings(fen);
  }

  /////////////////////
  // GETTERS & SETTERS

  static get size() {
    return { x: 8, y: 8 };
  }

  // Color of thing on square (i,j). 'undefined' if square is empty
  getColor(i, j) {
    return this.board[i][j].charAt(0);
  }

  // Piece type on square (i,j). 'undefined' if square is empty
  getPiece(i, j) {
    return this.board[i][j].charAt(1);
  }

  // Get opponent color
  static GetOppCol(color) {
    return color == "w" ? "b" : "w";
  }

  // Pieces codes (for a clearer code)
  static get PAWN() {
    return "p";
  }
  static get ROOK() {
    return "r";
  }
  static get KNIGHT() {
    return "n";
  }
  static get BISHOP() {
    return "b";
  }
  static get QUEEN() {
    return "q";
  }
  static get KING() {
    return "k";
  }

  // For FEN checking:
  static get PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.KING];
  }

  // Empty square
  static get EMPTY() {
    return "";
  }

  // Some pieces movements
  static get steps() {
    return {
      r: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ],
      n: [
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [-2, -1],
        [-2, 1],
        [2, -1],
        [2, 1]
      ],
      b: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ]
    };
  }

  ////////////////////
  // MOVES GENERATION

  // All possible moves from selected square
  getPotentialMovesFrom(sq) {
    switch (this.getPiece(sq[0], sq[1])) {
      case V.PAWN: return this.getPotentialPawnMoves(sq);
      case V.ROOK: return this.getPotentialRookMoves(sq);
      case V.KNIGHT: return this.getPotentialKnightMoves(sq);
      case V.BISHOP: return this.getPotentialBishopMoves(sq);
      case V.QUEEN: return this.getPotentialQueenMoves(sq);
      case V.KING: return this.getPotentialKingMoves(sq);
    }
    return []; //never reached
  }

  // Build a regular move from its initial and destination squares.
  // tr: transformation
  getBasicMove([sx, sy], [ex, ey], tr) {
    const initColor = this.getColor(sx, sy);
    const initPiece = this.board[sx][sy].charAt(1);
    let mv = new Move({
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: !!tr ? tr.c : initColor,
          p: !!tr ? tr.p : initPiece
        })
      ],
      vanish: [
        new PiPo({
          x: sx,
          y: sy,
          c: initColor,
          p: initPiece
        })
      ]
    });

    // The opponent piece disappears if we take it
    if (this.board[ex][ey] != V.EMPTY) {
      mv.vanish.push(
        new PiPo({
          x: ex,
          y: ey,
          c: this.getColor(ex, ey),
          p: this.board[ex][ey].charAt(1)
        })
      );
    }

    return mv;
  }

  // Generic method to find possible moves of non-pawn pieces:
  // "sliding or jumping"
  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  // Special case of en-passant captures: treated separately
  getEnpassantCaptures([x, y], shiftX) {
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    let enpassantMove = null;
    if (
      !!epSquare &&
      epSquare.x == x + shiftX &&
      Math.abs(epSquare.y - y) == 1
    ) {
      enpassantMove = this.getBasicMove([x, y], [epSquare.x, epSquare.y]);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: this.board[x][epSquare.y].charAt(1),
        c: this.getColor(x, epSquare.y)
      });
    }
    return !!enpassantMove ? [enpassantMove] : [];
  }

  // Consider all potential promotions:
  addPawnMoves([x1, y1], [x2, y2], moves, promotions) {
    let finalPieces = [V.PAWN];
    const color = this.turn; //this.getColor(x1, y1);
    const lastRank = (color == "w" ? 0 : V.size.x - 1);
    if (x2 == lastRank) {
      // promotions arg: special override for Hiddenqueen variant
      if (!!promotions) finalPieces = promotions;
      else if (!!V.PawnSpecs.promotions) finalPieces = V.PawnSpecs.promotions;
    }
    let tr = null;
    for (let piece of finalPieces) {
      tr = (piece != V.PAWN ? { c: color, p: piece } : null);
      moves.push(this.getBasicMove([x1, y1], [x2, y2], tr));
    }
  }

  // What are the pawn moves from square x,y ?
  getPotentialPawnMoves([x, y], promotions) {
    const color = this.turn; //this.getColor(x, y);
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const pawnShiftX = V.PawnSpecs.directions[color];
    const firstRank = (color == "w" ? sizeX - 1 : 0);
    const forward = (color == 'w' ? -1 : 1);

    // Pawn movements in shiftX direction:
    const getPawnMoves = (shiftX) => {
      let moves = [];
      // NOTE: next condition is generally true (no pawn on last rank)
      if (x + shiftX >= 0 && x + shiftX < sizeX) {
        if (this.board[x + shiftX][y] == V.EMPTY) {
          // One square forward (or backward)
          this.addPawnMoves([x, y], [x + shiftX, y], moves, promotions);
          // Next condition because pawns on 1st rank can generally jump
          if (
            V.PawnSpecs.twoSquares &&
            (
              (color == 'w' && x >= V.size.x - 1 - V.PawnSpecs.initShift['w'])
              ||
              (color == 'b' && x <= V.PawnSpecs.initShift['b'])
            )
          ) {
            if (
              shiftX == forward &&
              this.board[x + 2 * shiftX][y] == V.EMPTY
            ) {
              // Two squares jump
              moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
              if (
                V.PawnSpecs.threeSquares &&
                this.board[x + 3 * shiftX][y] == V.EMPTY
              ) {
                // Three squares jump
                moves.push(this.getBasicMove([x, y], [x + 3 * shiftX, y]));
              }
            }
          }
        }
        // Captures
        if (V.PawnSpecs.canCapture) {
          for (let shiftY of [-1, 1]) {
            if (y + shiftY >= 0 && y + shiftY < sizeY) {
              if (
                this.board[x + shiftX][y + shiftY] != V.EMPTY &&
                this.canTake([x, y], [x + shiftX, y + shiftY])
              ) {
                this.addPawnMoves(
                  [x, y], [x + shiftX, y + shiftY],
                  moves, promotions
                );
              }
              if (
                V.PawnSpecs.captureBackward && shiftX == forward &&
                x - shiftX >= 0 && x - shiftX < V.size.x &&
                this.board[x - shiftX][y + shiftY] != V.EMPTY &&
                this.canTake([x, y], [x - shiftX, y + shiftY])
              ) {
                this.addPawnMoves(
                  [x, y], [x - shiftX, y + shiftY],
                  moves, promotions
                );
              }
            }
          }
        }
      }
      return moves;
    }

    let pMoves = getPawnMoves(pawnShiftX);
    if (V.PawnSpecs.bidirectional)
      pMoves = pMoves.concat(getPawnMoves(-pawnShiftX));

    if (V.HasEnpassant) {
      // NOTE: backward en-passant captures are not considered
      // because no rules define them (for now).
      Array.prototype.push.apply(
        pMoves,
        this.getEnpassantCaptures([x, y], pawnShiftX)
      );
    }

    return pMoves;
  }

  // What are the rook moves from square x,y ?
  getPotentialRookMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]);
  }

  // What are the knight moves from square x,y ?
  getPotentialKnightMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep");
  }

  // What are the bishop moves from square x,y ?
  getPotentialBishopMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]);
  }

  // What are the queen moves from square x,y ?
  getPotentialQueenMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
    );
  }

  // What are the king moves from square x,y ?
  getPotentialKingMoves(sq) {
    // Initialize with normal moves
    let moves = this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
    if (V.HasCastle && this.castleFlags[this.turn].some(v => v < V.size.y))
      moves = moves.concat(this.getCastleMoves(sq));
    return moves;
  }

  // "castleInCheck" arg to let some variants castle under check
  getCastleMoves([x, y], finalSquares, castleInCheck, castleWith) {
    const c = this.getColor(x, y);

    // Castling ?
    const oppCol = V.GetOppCol(c);
    let moves = [];
    let i = 0;
    // King, then rook:
    finalSquares = finalSquares || [ [2, 3], [V.size.y - 2, V.size.y - 3] ];
    const castlingKing = this.board[x][y].charAt(1);
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++ //large, then small
    ) {
      if (this.castleFlags[c][castleSide] >= V.size.y) continue;
      // If this code is reached, rook and king are on initial position

      // NOTE: in some variants this is not a rook
      const rookPos = this.castleFlags[c][castleSide];
      const castlingPiece = this.board[x][rookPos].charAt(1);
      if (
        this.board[x][rookPos] == V.EMPTY ||
        this.getColor(x, rookPos) != c ||
        (!!castleWith && !castleWith.includes(castlingPiece))
      ) {
        // Rook is not here, or changed color (see Benedict)
        continue;
      }

      // Nothing on the path of the king ? (and no checks)
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      i = y;
      do {
        if (
          (!castleInCheck && this.isAttacked([x, i], oppCol)) ||
          (
            this.board[x][i] != V.EMPTY &&
            // NOTE: next check is enough, because of chessboard constraints
            (this.getColor(x, i) != c || ![y, rookPos].includes(i))
          )
        ) {
          continue castlingCheck;
        }
        i += step;
      } while (i != finalSquares[castleSide][0]);

      // Nothing on the path to the rook?
      step = castleSide == 0 ? -1 : 1;
      for (i = y + step; i != rookPos; i += step) {
        if (this.board[x][i] != V.EMPTY) continue castlingCheck;
      }

      // Nothing on final squares, except maybe king and castling rook?
      for (i = 0; i < 2; i++) {
        if (
          finalSquares[castleSide][i] != rookPos &&
          this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
          (
            finalSquares[castleSide][i] != y ||
            this.getColor(x, finalSquares[castleSide][i]) != c
          )
        ) {
          continue castlingCheck;
        }
      }

      // If this code is reached, castle is valid
      moves.push(
        new Move({
          appear: [
            new PiPo({
              x: x,
              y: finalSquares[castleSide][0],
              p: castlingKing,
              c: c
            }),
            new PiPo({
              x: x,
              y: finalSquares[castleSide][1],
              p: castlingPiece,
              c: c
            })
          ],
          vanish: [
            // King might be initially disguised (Titan...)
            new PiPo({ x: x, y: y, p: castlingKing, c: c }),
            new PiPo({ x: x, y: rookPos, p: castlingPiece, c: c })
          ],
          end:
            Math.abs(y - rookPos) <= 2
              ? { x: x, y: rookPos }
              : { x: x, y: y + 2 * (castleSide == 0 ? -1 : 1) }
        })
      );
    }

    return moves;
  }

  ////////////////////
  // MOVES VALIDATION

  // For the interface: possible moves for the current turn from square sq
  getPossibleMovesFrom(sq) {
    return this.filterValid(this.getPotentialMovesFrom(sq));
  }

  // TODO: promotions (into R,B,N,Q) should be filtered only once
  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    return moves.filter(m => {
      this.play(m);
      const res = !this.underCheck(color);
      this.undo(m);
      return res;
    });
  }

  getAllPotentialMoves() {
    const color = this.turn;
    let potentialMoves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j])
          );
        }
      }
    }
    return potentialMoves;
  }

  // Search for all valid moves considering current turn
  // (for engine and game end)
  getAllValidMoves() {
    return this.filterValid(this.getAllPotentialMoves());
  }

  // Stop at the first move found
  // TODO: not really, it explores all moves from a square (one is enough).
  atLeastOneMove() {
    const color = this.turn;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.length > 0) {
            for (let k = 0; k < moves.length; k++)
              if (this.filterValid([moves[k]]).length > 0) return true;
          }
        }
      }
    }
    return false;
  }

  // Check if pieces of given color are attacking (king) on square x,y
  isAttacked(sq, color) {
    return (
      this.isAttackedByPawn(sq, color) ||
      this.isAttackedByRook(sq, color) ||
      this.isAttackedByKnight(sq, color) ||
      this.isAttackedByBishop(sq, color) ||
      this.isAttackedByQueen(sq, color) ||
      this.isAttackedByKing(sq, color)
    );
  }

  // Generic method for non-pawn pieces ("sliding or jumping"):
  // is x,y attacked by a piece of given color ?
  isAttackedBySlideNJump([x, y], color, piece, steps, oneStep) {
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx += step[0];
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color
      ) {
        return true;
      }
    }
    return false;
  }

  // Is square x,y attacked by 'color' pawns ?
  isAttackedByPawn(sq, color) {
    const pawnShift = (color == "w" ? 1 : -1);
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.PAWN,
      [[pawnShift, 1], [pawnShift, -1]],
      "oneStep"
    );
  }

  // Is square x,y attacked by 'color' rooks ?
  isAttackedByRook(sq, color) {
    return this.isAttackedBySlideNJump(sq, color, V.ROOK, V.steps[V.ROOK]);
  }

  // Is square x,y attacked by 'color' knights ?
  isAttackedByKnight(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.KNIGHT,
      V.steps[V.KNIGHT],
      "oneStep"
    );
  }

  // Is square x,y attacked by 'color' bishops ?
  isAttackedByBishop(sq, color) {
    return this.isAttackedBySlideNJump(sq, color, V.BISHOP, V.steps[V.BISHOP]);
  }

  // Is square x,y attacked by 'color' queens ?
  isAttackedByQueen(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.QUEEN,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
    );
  }

  // Is square x,y attacked by 'color' king(s) ?
  isAttackedByKing(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.KING,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  // Is color under check after his move ?
  underCheck(color) {
    return this.isAttacked(this.kingPos[color], V.GetOppCol(color));
  }

  /////////////////
  // MOVES PLAYING

  // Apply a move on board
  static PlayOnBoard(board, move) {
    for (let psq of move.vanish) board[psq.x][psq.y] = V.EMPTY;
    for (let psq of move.appear) board[psq.x][psq.y] = psq.c + psq.p;
  }
  // Un-apply the played move
  static UndoOnBoard(board, move) {
    for (let psq of move.appear) board[psq.x][psq.y] = V.EMPTY;
    for (let psq of move.vanish) board[psq.x][psq.y] = psq.c + psq.p;
  }

  prePlay() {}

  play(move) {
    // DEBUG:
//    if (!this.states) this.states = [];
//    const stateFen = this.getFen() + JSON.stringify(this.kingPos);
//    this.states.push(stateFen);

    this.prePlay(move);
    // Save flags (for undo)
    if (V.HasFlags) move.flags = JSON.stringify(this.aggregateFlags());
    if (V.HasEnpassant) this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    this.turn = V.GetOppCol(this.turn);
    this.movesCount++;
    this.postPlay(move);
  }

  updateCastleFlags(move, piece, color) {
    const c = color || V.GetOppCol(this.turn);
    const firstRank = (c == "w" ? V.size.x - 1 : 0);
    // Update castling flags if rooks are moved
    const oppCol = this.turn;
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (piece == V.KING && move.appear.length > 0)
      this.castleFlags[c] = [V.size.y, V.size.y];
    else if (
      move.start.x == firstRank && //our rook moves?
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
    // NOTE: not "else if" because a rook could take an opposing rook
    if (
      move.end.x == oppFirstRank && //we took opponent rook?
      this.castleFlags[oppCol].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
      this.castleFlags[oppCol][flagIdx] = V.size.y;
    }
  }

  // After move is played, update variables + flags
  postPlay(move) {
    const c = V.GetOppCol(this.turn);
    let piece = undefined;
    if (move.vanish.length >= 1)
      // Usual case, something is moved
      piece = move.vanish[0].p;
    else
      // Crazyhouse-like variants
      piece = move.appear[0].p;

    // Update king position + flags
    if (piece == V.KING && move.appear.length > 0)
      this.kingPos[c] = [move.appear[0].x, move.appear[0].y];
    if (V.HasCastle) this.updateCastleFlags(move, piece);
  }

  preUndo() {}

  undo(move) {
    this.preUndo(move);
    if (V.HasEnpassant) this.epSquares.pop();
    if (V.HasFlags) this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    this.turn = V.GetOppCol(this.turn);
    this.movesCount--;
    this.postUndo(move);

    // DEBUG:
//    const stateFen = this.getFen() + JSON.stringify(this.kingPos);
//    if (stateFen != this.states[this.states.length-1]) debugger;
//    this.states.pop();
  }

  // After move is undo-ed *and flags resetted*, un-update other variables
  // TODO: more symmetry, by storing flags increment in move (?!)
  postUndo(move) {
    // (Potentially) Reset king position
    const c = this.getColor(move.start.x, move.start.y);
    if (this.getPiece(move.start.x, move.start.y) == V.KING)
      this.kingPos[c] = [move.start.x, move.start.y];
  }

  ///////////////
  // END OF GAME

  // What is the score ? (Interesting if game is over)
  getCurrentScore() {
    if (this.atLeastOneMove()) return "*";
    // Game over
    const color = this.turn;
    // No valid move: stalemate or checkmate?
    if (!this.underCheck(color)) return "1/2";
    // OK, checkmate
    return (color == "w" ? "0-1" : "1-0");
  }

  ///////////////
  // ENGINE PLAY

  // Pieces values
  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 3,
      q: 9,
      k: 1000
    };
  }

  // "Checkmate" (unreachable eval)
  static get INFINITY() {
    return 9999;
  }

  // At this value or above, the game is over
  static get THRESHOLD_MATE() {
    return V.INFINITY;
  }

  // Search depth: 1,2 for e.g. higher branching factor, 4 for smaller
  static get SEARCH_DEPTH() {
    return 3;
  }

  // 'movesList' arg for some variants to provide a custom list
  getComputerMove(movesList) {
    const maxeval = V.INFINITY;
    const color = this.turn;
    let moves1 = movesList || this.getAllValidMoves();

    if (moves1.length == 0)
      // TODO: this situation should not happen
      return null;

    // Rank moves using a min-max at depth 2 (if search_depth >= 2!)
    for (let i = 0; i < moves1.length; i++) {
      this.play(moves1[i]);
      const score1 = this.getCurrentScore();
      if (score1 != "*") {
        moves1[i].eval =
          score1 == "1/2"
            ? 0
            : (score1 == "1-0" ? 1 : -1) * maxeval;
      }
      if (V.SEARCH_DEPTH == 1 || score1 != "*") {
        if (!moves1[i].eval) moves1[i].eval = this.evalPosition();
        this.undo(moves1[i]);
        continue;
      }
      // Initial self evaluation is very low: "I'm checkmated"
      moves1[i].eval = (color == "w" ? -1 : 1) * maxeval;
      // Initial enemy evaluation is very low too, for him
      let eval2 = (color == "w" ? 1 : -1) * maxeval;
      // Second half-move:
      let moves2 = this.getAllValidMoves();
      for (let j = 0; j < moves2.length; j++) {
        this.play(moves2[j]);
        const score2 = this.getCurrentScore();
        let evalPos = 0; //1/2 value
        switch (score2) {
          case "*":
            evalPos = this.evalPosition();
            break;
          case "1-0":
            evalPos = maxeval;
            break;
          case "0-1":
            evalPos = -maxeval;
            break;
        }
        if (
          (color == "w" && evalPos < eval2) ||
          (color == "b" && evalPos > eval2)
        ) {
          eval2 = evalPos;
        }
        this.undo(moves2[j]);
      }
      if (
        (color == "w" && eval2 > moves1[i].eval) ||
        (color == "b" && eval2 < moves1[i].eval)
      ) {
        moves1[i].eval = eval2;
      }
      this.undo(moves1[i]);
    }
    moves1.sort((a, b) => {
      return (color == "w" ? 1 : -1) * (b.eval - a.eval);
    });
//    console.log(moves1.map(m => { return [this.getNotation(m), m.eval]; }));

    // Skip depth 3+ if we found a checkmate (or if we are checkmated in 1...)
    if (V.SEARCH_DEPTH >= 3 && Math.abs(moves1[0].eval) < V.THRESHOLD_MATE) {
      for (let i = 0; i < moves1.length; i++) {
        this.play(moves1[i]);
        // 0.1 * oldEval : heuristic to avoid some bad moves (not all...)
        moves1[i].eval =
          0.1 * moves1[i].eval +
          this.alphabeta(V.SEARCH_DEPTH - 1, -maxeval, maxeval);
        this.undo(moves1[i]);
      }
      moves1.sort((a, b) => {
        return (color == "w" ? 1 : -1) * (b.eval - a.eval);
      });
    }

    let candidates = [0];
    for (let i = 1; i < moves1.length && moves1[i].eval == moves1[0].eval; i++)
      candidates.push(i);
    return moves1[candidates[randInt(candidates.length)]];
  }

  alphabeta(depth, alpha, beta) {
    const maxeval = V.INFINITY;
    const color = this.turn;
    const score = this.getCurrentScore();
    if (score != "*")
      return score == "1/2" ? 0 : (score == "1-0" ? 1 : -1) * maxeval;
    if (depth == 0) return this.evalPosition();
    const moves = this.getAllValidMoves();
    let v = color == "w" ? -maxeval : maxeval;
    if (color == "w") {
      for (let i = 0; i < moves.length; i++) {
        this.play(moves[i]);
        v = Math.max(v, this.alphabeta(depth - 1, alpha, beta));
        this.undo(moves[i]);
        alpha = Math.max(alpha, v);
        if (alpha >= beta) break; //beta cutoff
      }
    }
    else {
      // color=="b"
      for (let i = 0; i < moves.length; i++) {
        this.play(moves[i]);
        v = Math.min(v, this.alphabeta(depth - 1, alpha, beta));
        this.undo(moves[i]);
        beta = Math.min(beta, v);
        if (alpha >= beta) break; //alpha cutoff
      }
    }
    return v;
  }

  evalPosition() {
    let evaluation = 0;
    // Just count material for now
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const sign = this.getColor(i, j) == "w" ? 1 : -1;
          evaluation += sign * V.VALUES[this.getPiece(i, j)];
        }
      }
    }
    return evaluation;
  }

  /////////////////////////
  // MOVES + GAME NOTATION
  /////////////////////////

  // Context: just before move is played, turn hasn't changed
  // TODO: un-ambiguous notation (switch on piece type, check directions...)
  getNotation(move) {
    if (move.appear.length == 2 && move.appear[0].p == V.KING)
      // Castle
      return move.end.y < move.start.y ? "0-0-0" : "0-0";

    // Translate final square
    const finalSquare = V.CoordsToSquare(move.end);

    const piece = this.getPiece(move.start.x, move.start.y);
    if (piece == V.PAWN) {
      // Pawn move
      let notation = "";
      if (move.vanish.length > move.appear.length) {
        // Capture
        const startColumn = V.CoordToColumn(move.start.y);
        notation = startColumn + "x" + finalSquare;
      }
      else notation = finalSquare;
      if (move.appear.length > 0 && move.appear[0].p != V.PAWN)
        // Promotion
        notation += "=" + move.appear[0].p.toUpperCase();
      return notation;
    }
    // Piece movement
    return (
      piece.toUpperCase() +
      (move.vanish.length > move.appear.length ? "x" : "") +
      finalSquare
    );
  }

  static GetUnambiguousNotation(move) {
    // Machine-readable format with all the informations about the move
    return (
      (!!move.start && V.OnBoard(move.start.x, move.start.y)
        ? V.CoordsToSquare(move.start)
        : "-"
      ) + "." +
      (!!move.end && V.OnBoard(move.end.x, move.end.y)
        ? V.CoordsToSquare(move.end)
        : "-"
      ) + " " +
      (!!move.appear && move.appear.length > 0
        ? move.appear.map(a =>
          a.c + a.p + V.CoordsToSquare({ x: a.x, y: a.y })).join(".")
        : "-"
      ) + "/" +
      (!!move.vanish && move.vanish.length > 0
        ? move.vanish.map(a =>
          a.c + a.p + V.CoordsToSquare({ x: a.x, y: a.y })).join(".")
        : "-"
      )
    );
  }

};
