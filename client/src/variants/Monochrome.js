import { ChessRules } from "@/base_rules";

export class MonochromeRules extends ChessRules {
  static get HasEnpassant() {
    // Pawns would be on the same side
    return false;
  }

  static get HasFlags() {
    return false;
  }

  static get Lines() {
    return [ [[4, 0], [4, 8]] ];
  }

  get showFirstTurn() {
    return true;
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (V.PIECES.includes(row[i])) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    return true;
  }

  canIplay(side, [x, y]) {
    const xBounds = side == 'w' ? [4,7] : [0,3];
    return this.turn == side && x >= xBounds[0] && x <= xBounds[1];
  }

  canTake([x1, y1], [x2, y2]) {
    // Capture in other half-board
    return ((x1 <= 3 && x2 >= 4) || (x1 >= 4 && x2 <= 3));
  }

  // Trim all non-capturing moves
  static KeepCaptures(moves) {
    return moves.filter(m => m.vanish.length == 2);
  }

  getPotentialKnightMoves(sq) {
    // Knight becomes knightrider:
    return this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT]);
  }

  getPotentialKingMoves(sq) {
    // King become queen:
    return (
      this.getSlideNJumpMoves(sq, V.steps[V.ROOK].concat(V.steps[V.BISHOP]));
    )
  }

  getAllPotentialMoves() {
    const xBounds = this.turn == 'w' ? [4,7] : [0,3];
    let potentialMoves = [];
    for (let i = xBounds[0]; i <= xBounds[1]; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j])
          );
        }
      }
    }
    if (potentialMoves.some(m => m.vanish.length == 2 && m.appear.length == 1))
      return V.KeepCaptures(potentialMoves);
    return potentialMoves;
  }

  atLeastOneMove() {
    const xBounds = this.turn == 'w' ? [4,7] : [0,3];
    for (let i = xBounds[0]; i <= xBounds[1]; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getPotentialMovesFrom([i, j]).length > 0
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // Stop at the first capture found (if any)
  atLeastOneCapture() {
    const xBounds = this.turn == 'w' ? [4,7] : [0,3];
    for (let i = xBounds[0]; i <= xBounds[1]; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getPotentialMovesFrom([i, j]).some(m => m.vanish.length == 2)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getPossibleMovesFrom(sq) {
    let moves = this.getPotentialMovesFrom(sq);
    const captureMoves = V.KeepCaptures(moves);
    if (captureMoves.length > 0) return captureMoves;
    if (this.atLeastOneCapture()) return [];
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  isAttacked() {
    return false;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // Is there anything in opponent's half board?
    const color = V.GetOppCol(this.turn);
    const xBounds = color == 'w' ? [4,7] : [0,3];
    let nothingHere = true;
    outerLoop: for (let i = xBounds[0]; i <= xBounds[1]; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          nothingHere = false;
          break outerLoop;
        }
      }
    }
    if (nothingHere) return color == 'w' ? "0-1" : "1-0";
    if (this.atLeastOneMove()) return '*';
    return "1/2";
  }

  static GenRandInitFen(randomness) {
    // Remove the en-passant + castle part of the FEN
    const fen = ChessRules.GenRandInitFen(randomness).slice(0, -6);
    const firstSpace = fen.indexOf(' ');
    return (
      fen.substr(0, firstSpace).replace(/[A-Z]/g, (c) => c.toLowerCase()) +
      fen.substr(firstSpace)
    );
  }

  static get SEARCH_DEPTH() {
    return 4;
  }

  evalPosition() {
    let evaluation = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const sign = (i <= 3 ? -1 : 1);
          // I don't think taking pieces' values into account would help
          evaluation += sign; //* V.VALUES[this.getPiece(i, j)];
        }
      }
    }
    return evaluation;
  }

  getNotation(move) {
    // Translate initial square (because pieces may fly unusually!)
    const initialSquare = V.CoordsToSquare(move.start);

    // Translate final square
    const finalSquare = V.CoordsToSquare(move.end);

    let notation = "";
    const piece = this.getPiece(move.start.x, move.start.y);
    if (piece == V.PAWN) {
      // pawn move (TODO: enPassant indication)
      if (move.vanish.length == 2) {
        // capture
        notation = initialSquare + "x" + finalSquare;
      }
      else notation = finalSquare;
      if (piece != move.appear[0].p)
        //promotion
        notation += "=" + move.appear[0].p.toUpperCase();
    }
    else {
      // Piece movement
      notation = piece.toUpperCase();
      if (move.vanish.length > 1) notation += initialSquare + "x";
      notation += finalSquare;
    }
    return notation;
  }
};
