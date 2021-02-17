import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";

// NOTE: alternative implementation, probably cleaner = use only 1 board
// TODO? atLeastOneMove() would be more efficient if rewritten here
// (less sideBoard computations)
export class AliceRules extends ChessRules {

  static get ALICE_PIECES() {
    return {
      s: "p",
      t: "q",
      u: "r",
      c: "b",
      o: "n",
      l: "k"
    };
  }
  static get ALICE_CODES() {
    return {
      p: "s",
      q: "t",
      r: "u",
      b: "c",
      n: "o",
      k: "l"
    };
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(Object.keys(V.ALICE_PIECES));
  }

  getPpath(b) {
    return (Object.keys(V.ALICE_PIECES).includes(b[1]) ? "Alice/" : "") + b;
  }

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
      // Special conditions: a pawn can be on the other side
      ['p','s'].includes(move.appear[0].p) &&
      ['p','s'].includes(move.vanish[0].p)
    ) {
      return {
        x: (s.x + e.x) / 2,
        y: s.y
      };
    }
    return undefined; //default
  }

  // king can be l or L (on the other mirror side)
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0, 'l': 0, 'L': 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k','L','l'].includes(row[i])) kings[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (kings['k'] + kings['l'] != 1 || kings['K'] + kings['L'] != 1)
      return false;
    return true;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const rows = V.ParseFen(fen).position.split("/");
    if (this.kingPos["w"][0] < 0 || this.kingPos["b"][0] < 0) {
      // INIT_COL_XXX won't be required if Alice kings are found
      // (it means 'king moved')
      for (let i = 0; i < rows.length; i++) {
        let k = 0; //column index on board
        for (let j = 0; j < rows[i].length; j++) {
          switch (rows[i].charAt(j)) {
            case "l":
              this.kingPos["b"] = [i, k];
              break;
            case "L":
              this.kingPos["w"] = [i, k];
              break;
            default: {
              const num = parseInt(rows[i].charAt(j), 10);
              if (!isNaN(num)) k += num - 1;
            }
          }
          k++;
        }
      }
    }
  }

  // Return the (standard) color+piece notation at a square for a board
  getSquareOccupation(i, j, mirrorSide) {
    const piece = this.getPiece(i, j);
    if (mirrorSide == 1 && Object.keys(V.ALICE_CODES).includes(piece))
      return this.board[i][j];
    if (mirrorSide == 2 && Object.keys(V.ALICE_PIECES).includes(piece))
      return this.getColor(i, j) + V.ALICE_PIECES[piece];
    return "";
  }

  // Build board of the given (mirror)side
  getSideBoard(mirrorSide) {
    // Build corresponding board from complete board
    let sideBoard = ArrayFun.init(V.size.x, V.size.y, "");
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++)
        sideBoard[i][j] = this.getSquareOccupation(i, j, mirrorSide);
    }
    return sideBoard;
  }

  // NOTE: castle & enPassant
  // https://www.chessvariants.com/other.dir/alice.html
  getPotentialMovesFrom([x, y], sideBoard) {
    const pieces = Object.keys(V.ALICE_CODES);
    const codes = Object.keys(V.ALICE_PIECES);
    const mirrorSide = pieces.includes(this.getPiece(x, y)) ? 1 : 2;
    if (!sideBoard) sideBoard = [this.getSideBoard(1), this.getSideBoard(2)];
    const color = this.getColor(x, y);

    // Search valid moves on sideBoard
    const saveBoard = this.board;
    this.board = sideBoard[mirrorSide - 1];
    const moves = super.getPotentialMovesFrom([x, y]).filter(m => {
      // Filter out king moves which result in under-check position on
      // current board (before mirror traversing)
      let aprioriValid = true;
      if (m.appear[0].p == V.KING) {
        this.play(m);
        if (this.underCheck(color, sideBoard)) aprioriValid = false;
        this.undo(m);
      }
      return aprioriValid;
    });
    this.board = saveBoard;

    // Finally filter impossible moves
    const res = moves.filter(m => {
      if (m.appear.length == 2) {
        // Castle: appear[i] must be an empty square on the other board
        for (let psq of m.appear) {
          if (
            this.getSquareOccupation(psq.x, psq.y, 3 - mirrorSide) != V.EMPTY
          ) {
            return false;
          }
        }
      }
      else if (this.board[m.end.x][m.end.y] != V.EMPTY) {
        // Attempt to capture
        const piece = this.getPiece(m.end.x, m.end.y);
        if (
          (mirrorSide == 1 && codes.includes(piece)) ||
          (mirrorSide == 2 && pieces.includes(piece))
        ) {
          return false;
        }
      }
      // If the move is computed on board1, m.appear change for Alice pieces.
      if (mirrorSide == 1) {
        m.appear.forEach(psq => {
          // forEach: castling taken into account
          psq.p = V.ALICE_CODES[psq.p]; //goto board2
        });
      }
      else {
        // Move on board2: mark vanishing pieces as Alice
        m.vanish.forEach(psq => {
          psq.p = V.ALICE_CODES[psq.p];
        });
      }
      // Fix en-passant captures
      if (
        m.vanish[0].p == V.PAWN &&
        m.vanish.length == 2 &&
        this.board[m.end.x][m.end.y] == V.EMPTY
      ) {
        m.vanish[1].c = V.GetOppCol(this.turn);
        const [epX, epY] = [m.vanish[1].x, m.vanish[1].y];
        m.vanish[1].p = this.getPiece(epX, epY);
      }
      return true;
    });
    return res;
  }

  filterValid(moves, sideBoard) {
    if (moves.length == 0) return [];
    if (!sideBoard) sideBoard = [this.getSideBoard(1), this.getSideBoard(2)];
    const color = this.turn;
    return moves.filter(m => {
      this.playSide(m, sideBoard); //no need to track flags
      const res = !this.underCheck(color, sideBoard);
      this.undoSide(m, sideBoard);
      return res;
    });
  }

  getAllValidMoves() {
    const color = this.turn;
    let potentialMoves = [];
    const sideBoard = [this.getSideBoard(1), this.getSideBoard(2)];
    for (var i = 0; i < V.size.x; i++) {
      for (var j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j], sideBoard)
          );
        }
      }
    }
    return this.filterValid(potentialMoves, sideBoard);
  }

  // Play on sideboards [TODO: only one sideBoard required]
  playSide(move, sideBoard) {
    const pieces = Object.keys(V.ALICE_CODES);
    move.vanish.forEach(psq => {
      const mirrorSide = pieces.includes(psq.p) ? 1 : 2;
      sideBoard[mirrorSide - 1][psq.x][psq.y] = V.EMPTY;
    });
    move.appear.forEach(psq => {
      const mirrorSide = pieces.includes(psq.p) ? 1 : 2;
      const piece = mirrorSide == 1 ? psq.p : V.ALICE_PIECES[psq.p];
      sideBoard[mirrorSide - 1][psq.x][psq.y] = psq.c + piece;
      if (piece == V.KING) this.kingPos[psq.c] = [psq.x, psq.y];
    });
  }

  // Undo on sideboards
  undoSide(move, sideBoard) {
    const pieces = Object.keys(V.ALICE_CODES);
    move.appear.forEach(psq => {
      const mirrorSide = pieces.includes(psq.p) ? 1 : 2;
      sideBoard[mirrorSide - 1][psq.x][psq.y] = V.EMPTY;
    });
    move.vanish.forEach(psq => {
      const mirrorSide = pieces.includes(psq.p) ? 1 : 2;
      const piece = mirrorSide == 1 ? psq.p : V.ALICE_PIECES[psq.p];
      sideBoard[mirrorSide - 1][psq.x][psq.y] = psq.c + piece;
      if (piece == V.KING) this.kingPos[psq.c] = [psq.x, psq.y];
    });
  }

  // sideBoard: arg containing both boards (see getAllValidMoves())
  underCheck(color, sideBoard) {
    const kp = this.kingPos[color];
    const mirrorSide = sideBoard[0][kp[0]][kp[1]] != V.EMPTY ? 1 : 2;
    let saveBoard = this.board;
    this.board = sideBoard[mirrorSide - 1];
    let res = this.isAttacked(kp, [V.GetOppCol(color)]);
    this.board = saveBoard;
    return res;
  }

  getCheckSquares() {
    const color = this.turn;
    const pieces = Object.keys(V.ALICE_CODES);
    const kp = this.kingPos[color];
    const mirrorSide = pieces.includes(this.getPiece(kp[0], kp[1])) ? 1 : 2;
    let sideBoard = this.getSideBoard(mirrorSide);
    let saveBoard = this.board;
    this.board = sideBoard;
    let res = this.isAttacked(this.kingPos[color], [V.GetOppCol(color)])
      ? [JSON.parse(JSON.stringify(this.kingPos[color]))]
      : [];
    this.board = saveBoard;
    return res;
  }

  postPlay(move) {
    super.postPlay(move); //standard king
    const piece = move.vanish[0].p;
    const c = move.vanish[0].c;
    // "l" = Alice king
    if (piece == "l") {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
      this.castleFlags[c] = [8, 8];
    }
  }

  postUndo(move) {
    super.postUndo(move);
    const c = move.vanish[0].c;
    if (move.vanish[0].p == "l")
      this.kingPos[c] = [move.start.x, move.start.y];
  }

  getCurrentScore() {
    if (this.atLeastOneMove()) return "*";
    const pieces = Object.keys(V.ALICE_CODES);
    const color = this.turn;
    const kp = this.kingPos[color];
    const mirrorSide = pieces.includes(this.getPiece(kp[0], kp[1])) ? 1 : 2;
    let sideBoard = this.getSideBoard(mirrorSide);
    let saveBoard = this.board;
    this.board = sideBoard;
    let res = "*";
    if (!this.isAttacked(this.kingPos[color], [V.GetOppCol(color)]))
      res = "1/2";
    else res = color == "w" ? "0-1" : "1-0";
    this.board = saveBoard;
    return res;
  }

  static get VALUES() {
    return Object.assign(
      {
        s: 1,
        u: 5,
        o: 3,
        c: 3,
        t: 9,
        l: 1000
      },
      ChessRules.VALUES
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    if (move.appear.length == 2) {
      if (move.end.y < move.start.y) return "0-0-0";
      return "0-0";
    }

    const finalSquare = V.CoordsToSquare(move.end);
    const piece = this.getPiece(move.start.x, move.start.y);

    const captureMark = move.vanish.length > move.appear.length ? "x" : "";
    let pawnMark = "";
    if (["p", "s"].includes(piece) && captureMark.length == 1)
      pawnMark = V.CoordToColumn(move.start.y); //start column

    // Piece or pawn movement
    let notation = piece.toUpperCase() + pawnMark + captureMark + finalSquare;
    if (["s", "p"].includes(piece) && !["s", "p"].includes(move.appear[0].p))
      // Promotion
      notation += "=" + move.appear[0].p.toUpperCase();
    return notation;
  }

};
