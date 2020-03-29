import { ChessRules, PiPo, Move } from "@/base_rules";

export class EnpassantRules extends ChessRules {
  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") {
      const squares = enpassant.split(",");
      if (squares.length > 2) return false;
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
      // Expand init + dest squares into a full path:
      const init = V.SquareToCoords(square.substr(0, 2));
      let newPath = [init];
      if (square.length == 2) return newPath;
      const dest = V.SquareToCoords(square.substr(2));
      const delta = ['x', 'y'].map(i => Math.abs(dest[i] - init[i]));
      // Check if it's a knight(rider) movement:
      let step = [0, 0];
      if (delta[0] > 0 && delta[1] > 0 && delta[0] != delta[1]) {
        // Knightrider
        const minShift = Math.min(delta[0], delta[1]);
        step[0] = (dest.x - init.x) / minShift;
        step[1] = (dest.y - init.y) / minShift;
      } else {
        // "Sliders"
        step = ['x', 'y'].map((i, idx) => {
          return (dest[i] - init[i]) / delta[idx] || 0
        });
      }
      let x = init.x + step[0],
          y = init.y + step[1];
      while (x != dest.x || y != dest.y) {
        newPath.push({ x: x, y: y });
        x += step[0];
        y += step[1];
      }
      newPath.push(dest);
      return newPath;
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
      step = [
        delta[0]/Math.abs(delta[0]) || 0,
        delta[1]/Math.abs(delta[1]) || 0
      ];
    }
    let res = [];
    for (
      let [x,y] = [move.start.x+step[0],move.start.y+step[1]];
      x != move.end.x || y != move.end.y;
      x += step[0], y += step[1]
    ) {
      res.push({ x: x, y: y });
    }
    // Add final square to know which piece is taken en passant:
    res.push(move.end);
    return res;
  }

  getEnpassantFen() {
    const L = this.epSquares.length;
    if (!this.epSquares[L - 1]) return "-"; //no en-passant
    const epsq = this.epSquares[L - 1];
    if (epsq.length <= 2) return epsq.map(V.CoordsToSquare).join("");
    // Condensate path: just need initial and final squares:
    return V.CoordsToSquare(epsq[0]) + V.CoordsToSquare(epsq[epsq.length - 1]);
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

  getEnpassantCaptures([x, y], shiftX) {
    const Lep = this.epSquares.length;
    const squares = this.epSquares[Lep - 1];
    let moves = [];
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

  isAttackedByKnight(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
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
