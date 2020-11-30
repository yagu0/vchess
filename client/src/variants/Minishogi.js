import { ChessRules, PiPo, Move } from "@/base_rules";
import { ShogiRules } from "@/variants/Shogi";

export class MinishogiRules extends ShogiRules {

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 3) Check reserves
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{10,10}$/))
      return false;
    return true;
  }

  // No knight or lance
  static get PIECES() {
    return [
      ChessRules.PAWN,
      ChessRules.ROOK,
      ChessRules.BISHOP,
      ChessRules.KING,
      V.GOLD_G,
      V.SILVER_G,
      V.P_PAWN,
      V.P_SILVER,
      V.P_ROOK,
      V.P_BISHOP
    ];
  }

  static GenRandInitFen() {
    return "rbsgk/4p/5/P4/KGSBR w 0 0000000000";
  }

  getReserveFen() {
    let counts = new Array(10);
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      counts[i] = this.reserve["w"][V.RESERVE_PIECES[i]];
      counts[5 + i] = this.reserve["b"][V.RESERVE_PIECES[i]];
    }
    return counts.join("");
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Also init reserves (used by the interface to show landable pieces)
    const reserve =
      V.ParseFen(fen).reserve.split("").map(x => parseInt(x, 10));
    this.reserve = {
      w: {
        [V.PAWN]: reserve[0],
        [V.ROOK]: reserve[1],
        [V.BISHOP]: reserve[2],
        [V.GOLD_G]: reserve[3],
        [V.SILVER_G]: reserve[4]
      },
      b: {
        [V.PAWN]: reserve[5],
        [V.ROOK]: reserve[6],
        [V.BISHOP]: reserve[7],
        [V.GOLD_G]: reserve[8],
        [V.SILVER_G]: reserve[9]
      }
    };
  }

  static get size() {
    return { x: 5, y: 5 };
  }

  static get RESERVE_PIECES() {
    return (
      [V.PAWN, V.ROOK, V.BISHOP, V.GOLD_G, V.SILVER_G]
    );
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (p == V.PAWN) {
      var oppCol = V.GetOppCol(color);
      var allowedFiles =
        [...Array(5).keys()].filter(j =>
          [...Array(5).keys()].every(i => {
            return (
              this.board[i][j] == V.EMPTY ||
              this.getColor(i, j) != color ||
              this.getPiece(i, j) != V.PAWN
            );
          })
        )
    }
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    const forward = color == 'w' ? -1 : 1;
    const lastRank = color == 'w' ? 0 : 4;
    for (let i = 0; i < V.size.x; i++) {
      if (p == V.PAWN && i == lastRank) continue;
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] == V.EMPTY &&
          (p != V.PAWN || allowedFiles.includes(j))
        ) {
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
          if (p == V.PAWN) {
            // Do not drop on checkmate:
            this.play(mv);
            const res = (this.underCheck(oppCol) && !this.atLeastOneMove());
            this.undo(mv);
            if (res) continue;
          }
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getSlideNJumpMoves([x, y], steps, options) {
    options = options || {};
    const color = this.turn;
    const oneStep = options.oneStep;
    const forcePromoteOnLastRank = options.force;
    const promoteInto = options.promote;
    const lastRank = (color == 'w' ? 0 : 4);
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        if (i != lastRank || !forcePromoteOnLastRank)
          moves.push(this.getBasicMove([x, y], [i, j]));
        if (i == lastRank && !!promoteInto) {
          moves.push(
            this.getBasicMove(
              [x, y], [i, j], { c: color, p: promoteInto })
          );
        }
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j])) {
        if (i != lastRank || !forcePromoteOnLastRank)
          moves.push(this.getBasicMove([x, y], [i, j]));
        if (i == lastRank && !!promoteInto) {
          moves.push(
            this.getBasicMove(
              [x, y], [i, j], { c: color, p: promoteInto })
          );
        }
      }
    }
    return moves;
  }

  static get SEARCH_DEPTH() {
    return 3;
  }

};
