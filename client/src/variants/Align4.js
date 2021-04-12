import { ChessRules, Move, PiPo } from "@/base_rules";

export class Align4Rules extends ChessRules {

  static get Options() {
    return {
      check: [
        {
          label: "Random",
          defaut: false,
          variable: "random"
        }
      ]
    };
  }

  static GenRandInitFen(options) {
    const baseFen = ChessRules.GenRandInitFen(
      { randomness: (options.random ? 1 : 0) });
    return "4k3/8" + baseFen.substring(17, 50) + " -";
  }

  getReservePpath() {
    return "bp";
  }

  static get RESERVE_PIECES() {
    return [V.PAWN]; //only black pawns
  }

  getColor(i, j) {
    if (i >= V.size.x) return "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.PAWN;
    return this.board[i][j].charAt(1);
  }

  static IsGoodFlags(flags) {
    // Only white can castle
    return !!flags.match(/^[a-z]{2,2}$/);
  }

  getFlagsFen() {
    return this.castleFlags['w'].map(V.CoordToColumn).join("");
  }

  setFlags(fenflags) {
    this.castleFlags = { 'w': [-1, -1] };
    for (let i = 0; i < 2; i++)
      this.castleFlags['w'][i] = V.ColumnToCoord(fenflags.charAt(i));
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.reserve = { b: { [V.PAWN]: 1 } };
  }

  getReserveMoves() {
    if (this.turn != 'b') return [];
    let moves = [];
    for (let i = 1; i <= 6; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] == V.EMPTY) {
          let mv = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: 'b',
                p: 'p'
              })
            ],
            vanish: [],
            start: { x: 9, y: 0 },
            end: { x: i, y: j }
          });
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom(sq) {
    if (sq[0] >= V.size.x) return this.getReserveMoves();
    return super.getPotentialMovesFrom(sq);
  }

  getPotentialKingMoves([x, y]) {
    if (this.getColor(x, y) == 'w') return super.getPotentialKingMoves([x, y]);
    // Black doesn't castle:
    return super.getSlideNJumpMoves(
      [x, y], V.steps[V.ROOK].concat(V.steps[V.BISHOP]), 1);
  }

  getAllValidMoves() {
    return (
      super.getAllValidMoves().concat(
        super.filterValid(this.getReserveMoves()))
    );
  }

  atLeastOneMove() {
    if (super.atLeastOneMove()) return true;
    // Search one reserve move
    if (this.filterValid(this.getReserveMoves()).length > 0) return true;
    return false;
  }

  updateCastleFlags(move, piece) {
    // Only white can castle:
    const firstRank = 7;
    if (piece == V.KING && move.appear[0].c == 'w')
      this.castleFlags['w'] = [8, 8];
    else if (
      move.start.x == firstRank &&
      this.castleFlags['w'].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags['w'][0] ? 0 : 1);
      this.castleFlags['w'][flagIdx] = 8;
    }
    else if (
      move.end.x == firstRank &&
      this.castleFlags['w'].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags['w'][0] ? 0 : 1);
      this.castleFlags['w'][flagIdx] = 8;
    }
  }

  getCurrentScore() {
    const score = super.getCurrentScore();
    if (score != "*") return score;
    // Check pawns connection:
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == 'b' &&
          this.getPiece(i, j) == V.PAWN
        ) {
          // Exploration "rightward + downward" is enough
          for (let step of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
            let [ii, jj] = [i + step[0], j + step[1]];
            let kounter = 1;
            while (
              V.OnBoard(ii, jj) &&
              this.board[ii][jj] != V.EMPTY &&
              this.getColor(ii, jj) == 'b' &&
              this.getPiece(ii, jj) != V.KING
            ) {
              kounter++;
              ii += step[0];
              jj += step[1];
            }
            if (kounter == 4) return "0-1";
          }
        }
      }
    }
    return "*";
  }

  evalPosition() {
    let evaluation = 0;
    // Count white material + check pawns alignments
    let maxAlign = 0;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const piece = this.getPiece(i, j);
          if (piece != V.KING) {
            const color = this.getColor(i, j);
            if (color == 'w') evaluation += V.VALUES[piece];
            else {
              // Exploration "rightward + downward" is enough
              for (let step of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
                let [ii, jj] = [i + step[0], j + step[1]];
                let kounter = 1;
                while (
                  V.OnBoard(ii, jj) &&
                  this.board[ii][jj] != V.EMPTY &&
                  this.getColor(ii, jj) == 'b' &&
                  this.getPiece(ii, jj) != V.KING
                ) {
                  kounter++;
                  ii += step[0];
                  jj += step[1];
                }
                if (kounter > maxAlign) maxAlign = kounter;
              }
            }
          }
        }
      }
    }
    // -1 for two aligned pawns, -3 for 3 aligned pawns.
    if ([1, 2].includes(maxAlign)) maxAlign--;
    return evaluation - maxAlign;
  }

  getNotation(move) {
    if (move.vanish.length == 0) return "@" + V.CoordsToSquare(move.end);
    return super.getNotation(move);
  }

};

