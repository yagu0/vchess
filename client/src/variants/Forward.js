import { ChessRules } from "@/base_rules";

export class ForwardRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        bidirectional: true,
        captureBackward: true,
        promotions: [V.PAWN]
      }
    );
  }

  static get PROMOTED() {
    return ['s', 'u', 'o', 'c', 't', 'l'];
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(V.PROMOTED);
  }

  getPpath(b) {
    return (V.PROMOTED.includes(b[1]) ? "Forward/" : "") + b;
  }

  scanKings(fen) {
    this.INIT_COL_KING = { w: -1, b: -1 };
    // Squares of white and black king:
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    const startRow = { 'w': V.size.x - 1, 'b': 0 };
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0; //column index on board
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "k":
          case "l":
            this.kingPos["b"] = [i, k];
            this.INIT_COL_KING["b"] = k;
            break;
          case "K":
          case "L":
            this.kingPos["w"] = [i, k];
            this.INIT_COL_KING["w"] = k;
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j));
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  getPotentialMovesFrom(sq) {
    const piece = this.getPiece(sq[0], sq[1]);
    if (V.PROMOTED.includes(piece)) {
      switch (piece) {
        case 's':
          return (
            super.getPotentialPawnMoves(sq)
            // Promoted pawns back on initial rank don't jump 2 squares:
            .filter(m => Math.abs(m.end.x - m.start.x) == 1)
          );
        case 'u': return super.getPotentialRookMoves(sq);
        case 'o': return super.getPotentialKnightMoves(sq);
        case 'c': return super.getPotentialBishopMoves(sq);
        case 't': return super.getPotentialQueenMoves(sq);
        case 'l': return super.getPotentialKingMoves(sq);
      }
    }
    // Unpromoted piece: only go forward
    const color = this.turn;
    let moves =
      super.getPotentialMovesFrom(sq)
      .filter(m => {
        const delta = m.end.x - m.start.x;
        return ((color == 'w' && delta <= 0) || (color == 'b' && delta >= 0));
      });
    // Apply promotions:
    const lastRank = (color == 'w' ? 0 : 7);
    moves.forEach(m => {
      if (m.end.x == lastRank) {
        const pIdx = ChessRules.PIECES.findIndex(p => p == m.appear[0].p);
        m.appear[0].p = V.PROMOTED[pIdx];
      }
    });
    return moves;
  }

  isAttackedBySlideNJump([x, y], color, piece, steps, oneStep) {
    const pIdx = ChessRules.PIECES.findIndex(p => p == piece);
    const ppiece = V.PROMOTED[pIdx];
    const forward = (color == 'w' ? -1 : 1);
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx += step[0];
        ry += step[1];
      }
      if (V.OnBoard(rx, ry) && this.getColor(rx, ry) == color) {
        const pieceR = this.getPiece(rx, ry);
        if (
          pieceR == ppiece ||
          (pieceR == piece && (step[0] == 0 || -step[0] == forward))
        ) {
          return true;
        }
      }
    }
    return false;
  }

  postPlay(move) {
    super.postPlay(move);
    if (move.appear[0].p == "l")
      this.kingPos[move.appear[0].c] = [move.appear[0].x, move.appear[0].y];
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.appear[0].p == "l")
      this.kingPos[this.turn] = [move.start.x, move.start.y];
  }

  static get VALUES() {
    return Object.assign(
      {
        s: 2,
        u: 8,
        o: 5,
        c: 5,
        t: 15,
        l: 1500
      },
      ChessRules.VALUES
    );
  }
};
