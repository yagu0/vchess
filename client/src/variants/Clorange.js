import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";

export class ClorangeRules extends ChessRules {
  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check reserves
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{20,20}$/))
      return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { reserve: fenParts[5] }
    );
  }

  static GenRandInitFen(randomness) {
    // Capturing and non-capturing reserves:
    return ChessRules.GenRandInitFen(randomness) + " 00000000000000000000";
  }

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    return (
      Object.keys(this.reserve).map(
        c => Object.values(this.reserve[c]).join("")).join("")
    );
  }

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
      s.y == e.y &&
      Math.abs(s.x - e.x) == 2 &&
      move.vanish.length > 0 && ['p', 's'].includes(move.vanish[0].p)
    ) {
      return {
        x: (s.x + e.x) / 2,
        y: s.y
      };
    }
    return undefined;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Also init reserves (used by the interface to show landable pieces)
    const reserve =
      V.ParseFen(fen).reserve.split("").map(x => parseInt(x, 10));
    this.reserve = {
      w: {
        'p': reserve[0],
        'r': reserve[1],
        'n': reserve[2],
        'b': reserve[3],
        'q': reserve[4],
        's': reserve[5],
        'u': reserve[6],
        'o': reserve[7],
        'c': reserve[8],
        't': reserve[9]
      },
      b: {
        'p': reserve[10],
        'r': reserve[11],
        'n': reserve[12],
        'b': reserve[13],
        'q': reserve[14],
        's': reserve[15],
        'u': reserve[16],
        'o': reserve[17],
        'c': reserve[18],
        't': reserve[19]
      }
    };
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  getPpath(b) {
    return (V.NON_VIOLENT.includes(b[1]) ? "Clorange/" : "") + b;
  }

  getReservePpath(index, color) {
    const prefix =
      (V.NON_VIOLENT.includes(V.RESERVE_PIECES[index]) ? "Clorange/" : "");
    return prefix + color + V.RESERVE_PIECES[index];
  }

  static get NON_VIOLENT() {
    return ['s', 'u', 'o', 'c', 't'];
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(V.NON_VIOLENT);
  }

  // Ordering on reserve pieces
  static get RESERVE_PIECES() {
    return V.PIECES.filter(p => p != 'k');
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    let rank1 = 0;
    let rank2 = V.size.x - 1;
    if (['p', 's'].includes(p)) {
      if (color == 'w') rank1++;
      else rank2--;
    }
    for (let i = rank1; i <= rank2; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] == V.EMPTY) {
          let mv = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: p
              })
            ],
            vanish: [],
            start: { x: x, y: y }, //a bit artificial...
            end: { x: i, y: j }
          });
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    if (x >= V.size.x)
      // Reserves, outside of board: x == sizeX(+1)
      return this.getReserveMoves([x, y]);
    // Standard moves
    switch (this.getPiece(x, y)) {
      case 's': return super.getPotentialPawnMoves([x, y]);
      case 'u': return super.getPotentialRookMoves([x, y]);
      case 'o': return super.getPotentialKnightMoves([x, y]);
      case 'c': return super.getPotentialBishopMoves([x, y]);
      case 't': return super.getPotentialQueenMoves([x, y]);
      default: return super.getPotentialMovesFrom([x, y]);
    }
    return []; //never reached
  }

  getPotentialPawnMoves(sq) {
    let moves = super.getPotentialPawnMoves(sq);
    moves.forEach(m => {
      if (m.vanish[0].p == 's' && m.appear[0].p != 's') {
        // Promotion pieces should be non-violent as well:
        const pIdx = ChessRules.PIECES.findIndex(p => p == m.appear[0].p)
        m.appear[0].p = V.NON_VIOLENT[pIdx];
      }
    });
    return moves;
  }

  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    const canTake = ChessRules.PIECES.includes(this.getPiece(x, y));
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && canTake && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getAllValidMoves() {
    let moves = super.getAllPotentialMoves();
    const color = this.turn;
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      moves = moves.concat(
        this.getReserveMoves([V.size.x + (color == "w" ? 0 : 1), i])
      );
    }
    return this.filterValid(moves);
  }

  atLeastOneMove() {
    if (!super.atLeastOneMove()) {
      // Search one reserve move
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        let moves = this.filterValid(
          this.getReserveMoves([V.size.x + (this.turn == "w" ? 0 : 1), i])
        );
        if (moves.length > 0) return true;
      }
      return false;
    }
    return true;
  }

  prePlay(move) {
    super.prePlay(move);
    // Skip castle:
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = this.turn;
    if (move.vanish.length == 0) this.reserve[color][move.appear[0].p]--;
    else if (move.vanish.length == 2) {
      // Capture
      const normal = ChessRules.PIECES.includes(move.vanish[1].p);
      const pIdx =
        normal
          ? ChessRules.PIECES.findIndex(p => p == move.vanish[1].p)
          : V.NON_VIOLENT.findIndex(p => p == move.vanish[1].p);
      const rPiece = (normal ? V.NON_VIOLENT : ChessRules.PIECES)[pIdx];
      this.reserve[move.vanish[1].c][rPiece]++;
    }
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = this.turn;
    if (move.vanish.length == 0) this.reserve[color][move.appear[0].p]++;
    else if (move.vanish.length == 2) {
      const normal = ChessRules.PIECES.includes(move.vanish[1].p);
      const pIdx =
        normal
          ? ChessRules.PIECES.findIndex(p => p == move.vanish[1].p)
          : V.NON_VIOLENT.findIndex(p => p == move.vanish[1].p);
      const rPiece = (normal ? V.NON_VIOLENT : ChessRules.PIECES)[pIdx];
      this.reserve[move.vanish[1].c][rPiece]--;
    }
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    return Object.assign(
      {
        s: 0.75,
        u: 4,
        o: 2,
        c: 2,
        t: 7
      },
      ChessRules.VALUES
    );
  }

  evalPosition() {
    let evaluation = super.evalPosition();
    // Add reserves:
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      const p = V.RESERVE_PIECES[i];
      evaluation += this.reserve["w"][p] * V.VALUES[p];
      evaluation -= this.reserve["b"][p] * V.VALUES[p];
    }
    return evaluation;
  }

  getNotation(move) {
    const finalSquare = V.CoordsToSquare(move.end);
    if (move.vanish.length > 0) {
      // Standard move (maybe with non-violent piece)
      let notation = super.getNotation(move);
      if (move.vanish[0].p == 's' && move.appear[0].p != 's')
        // Fix non-violent promotions:
        notation += "=" + move.appear[0].p.toUpperCase();
      return notation;
    }
    // Rebirth:
    const piece =
      move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
    return piece + "@" + V.CoordsToSquare(move.end);
  }
};
