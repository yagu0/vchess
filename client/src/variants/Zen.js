import { ChessRules } from "@/base_rules";

export class ZenRules extends ChessRules {

  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined;
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      return V.SquareToCoords(square);
    }
    const move = moveOrSquare;
    const s = move.start,
          e = move.end;
    if (
      // Exclude captures (of rooks for example)
      move.vanish.length == 1 &&
      s.y == e.y &&
      Math.abs(s.x - e.x) == 2 &&
      move.appear[0].p == V.PAWN
    ) {
      return {
        x: (s.x + e.x) / 2,
        y: s.y
      };
    }
    return undefined;
  }

  // TODO(?): some duplicated code in 2 next functions
  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let loop = 0; loop < steps.length; loop++) {
      const step = steps[loop];
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      // No capture check: handled elsewhere (next method)
    }
    return moves;
  }

  // follow steps from x,y until something is met.
  // if met piece is opponent and same movement (asA): eat it!
  findCaptures_aux([x, y], asA) {
    const color = this.getColor(x, y);
    let moves = [];
    const steps =
      asA != V.PAWN
        ? asA == V.QUEEN
          ? V.steps[V.ROOK].concat(V.steps[V.BISHOP])
          : V.steps[asA]
        : color == "w"
          ? [
            [-1, -1],
            [-1, 1]
          ]
          : [
            [1, -1],
            [1, 1]
          ];
    const oneStep = [V.KNIGHT,V.PAWN].includes(asA); //we don't capture king
    const lastRank = color == "w" ? 0 : V.size.x - 1;
    const promotionPieces = [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN];
    const oppCol = V.GetOppCol(color);
    outerLoop: for (let loop = 0; loop < steps.length; loop++) {
      const step = steps[loop];
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (
        V.OnBoard(i, j) &&
        this.getColor(i, j) == oppCol &&
        this.getPiece(i, j) == asA
      ) {
        // eat!
        if (this.getPiece(x, y) == V.PAWN && i == lastRank) {
          // Special case of promotion:
          promotionPieces.forEach(p => {
            moves.push(this.getBasicMove([x, y], [i, j], { c: color, p: p }));
          });
        } else {
          // All other cases
          moves.push(this.getBasicMove([x, y], [i, j]));
        }
      }
    }
    return moves;
  }

  // Find possible captures from a square: look in every direction!
  findCaptures(sq) {
    let moves = [];
    Array.prototype.push.apply(moves, this.findCaptures_aux(sq, V.PAWN));
    Array.prototype.push.apply(moves, this.findCaptures_aux(sq, V.ROOK));
    Array.prototype.push.apply(moves, this.findCaptures_aux(sq, V.KNIGHT));
    Array.prototype.push.apply(moves, this.findCaptures_aux(sq, V.BISHOP));
    Array.prototype.push.apply(moves, this.findCaptures_aux(sq, V.QUEEN));
    return moves;
  }

  canTake(sq1, sq2) {
    return false; //captures handled separately
  }

  getPotentialMovesFrom(sq) {
    return super.getPotentialMovesFrom(sq).concat(this.findCaptures(sq));
  }

  getNotation(move) {
    // Recognize special moves first
    if (move.appear.length == 2) {
      // castle
      if (move.end.y < move.start.y) return "0-0-0";
      return "0-0";
    }

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

  static get VALUES() {
    return {
      p: 1,
      r: 3,
      n: 2,
      b: 2,
      q: 5,
      k: 1000
    };
  }

};
