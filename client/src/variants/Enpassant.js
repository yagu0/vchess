import { ChessRules, PiPo, Move } from "@/base_rules";

export const VariantRules = class EnpassantRules extends ChessRules {

  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") {
      const squares = enpassant.split(",");
      for (let sq of squares) {
        const ep = V.SquareToCoords(sq);
        if (isNaN(ep.x) || !V.OnBoard(ep)) return false;
      }
    }
    return true;
  }

  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined;
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      let res = [];
      square.split(",").forEach(sq => {
        res.push(V.SquareToCoords(sq));
      });
      return res;
    }
    // Argument is a move: all intermediate squares are en-passant candidates,
    // except if the moving piece is a king.
    const move = moveOrSquare;
    const piece = move.appear[0].p;
    if (piece == V.KING ||
      (
        Math.abs(move.end.x-move.start.x) <= 1 &&
        Math.abs(move.end.y-move.start.y) <= 1
      )
    ) {
      return undefined;
    }
    const delta = [move.end.x-move.start.x, move.end.y-move.start.y];
    let step = undefined;
    if (piece == V.KNIGHT) {
      const divisor = Math.min(Math.abs(delta[0]), Math.abs(delta[1]));
      step = [delta[0]/divisor || 0, delta[1]/divisor || 0];
    } else {
      step = [delta[0]/Math.abs(delta[0]) || 0, delta[1]/Math.abs(delta[1]) || 0];
    }
    let res = [];
    for (
      let [x,y] = [move.start.x+step[0],move.start.y+step[1]];
      x != move.end.x || y != move.end.y;
      x += step[0], y += step[1]
    ) {
      res.push({x:x, y:y});
    }
    // Add final square to know which piece is taken en passant:
    res.push(move.end);
    return res;
  }

  getEnpassantFen() {
    const L = this.epSquares.length;
    if (!this.epSquares[L - 1]) return "-"; //no en-passant
    let res = "";
    this.epSquares[L - 1].forEach(sq => {
      res += V.CoordsToSquare(sq) + ",";
    });
    return res.slice(0, -1); //remove last comma
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x,y]);
    // Add en-passant captures from this square:
    const L = this.epSquares.length;
    if (!this.epSquares[L - 1]) return moves;
    const squares = this.epSquares[L - 1];
    const S = squares.length;
    // Object describing the removed opponent's piece:
    const pipoV = new PiPo({
      x: squares[S-1].x,
      y: squares[S-1].y,
      c: V.GetOppCol(this.turn),
      p: this.getPiece(squares[S-1].x, squares[S-1].y)
    });
    // Check if existing non-capturing moves could also capture en passant
    moves.forEach(m => {
      if (
        m.appear[0].p != V.PAWN && //special pawn case is handled elsewhere
        m.vanish.length <= 1 &&
        [...Array(S-1).keys()].some(i => {
          return m.end.x == squares[i].x && m.end.y == squares[i].y;
        })
      ) {
        m.vanish.push(pipoV);
      }
    });
    // Special case of the king knight's movement:
    if (this.getPiece(x, y) == V.KING) {
      V.steps[V.KNIGHT].forEach(step => {
        const endX = x + step[0];
        const endY = y + step[1];
        if (
          V.OnBoard(endX, endY) &&
          [...Array(S-1).keys()].some(i => {
            return endX == squares[i].x && endY == squares[i].y;
          })
        ) {
          let enpassantMove = this.getBasicMove([x, y], [endX, endY]);
          enpassantMove.vanish.push(pipoV);
          moves.push(enpassantMove);
        }
      });
    }
    return moves;
  }

  // TODO: this getPotentialPawnMovesFrom() is mostly duplicated:
  // it could be split in "capture", "promotion", "enpassant"...
  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;

    const finalPieces =
      x + shiftX == lastRank
        ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]
        : [V.PAWN];
    // One square forward
    if (this.board[x + shiftX][y] == V.EMPTY) {
      for (let piece of finalPieces) {
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y], {
            c: color,
            p: piece
          })
        );
      }
      if (
        x == startRank &&
        this.board[x + 2 * shiftX][y] == V.EMPTY
      ) {
        // Two squares jump
        moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
      }
    }
    // Captures
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < sizeY &&
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        this.canTake([x, y], [x + shiftX, y + shiftY])
      ) {
        for (let piece of finalPieces) {
          moves.push(
            this.getBasicMove([x, y], [x + shiftX, y + shiftY], {
              c: color,
              p: piece
            })
          );
        }
      }
    }

    // En passant
    const Lep = this.epSquares.length;
    const squares = this.epSquares[Lep - 1];
    if (!!squares) {
      const S = squares.length;
      const taken = squares[S-1];
      const pipoV = new PiPo({
        x: taken.x,
        y: taken.y,
        p: this.getPiece(taken.x, taken.y),
        c: this.getColor(taken.x, taken.y)
      });
      [...Array(S-1).keys()].forEach(i => {
        const sq = squares[i];
        if (sq.x == x + shiftX && Math.abs(sq.y - y) == 1) {
          let enpassantMove = this.getBasicMove([x, y], [sq.x, sq.y]);
          enpassantMove.vanish.push(pipoV);
          moves.push(enpassantMove);
        }
      });
    }

    return moves;
  }

  // Remove the "onestep" condition: knight promote to knightrider:
  getPotentialKnightMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT]);
  }

  filterValid(moves) {
    const filteredMoves = super.filterValid(moves);
    // If at least one full move made, everything is allowed:
    if (this.movesCount >= 2)
      return filteredMoves;
    // Else, forbid captures:
    return filteredMoves.filter(m => m.vanish.length == 1);
  }

  isAttackedByKnight(sq, colors) {
    return this.isAttackedBySlideNJump(
      sq,
      colors,
      V.KNIGHT,
      V.steps[V.KNIGHT]
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 4,
      b: 3,
      q: 9,
      k: 1000
    };
  }
};
