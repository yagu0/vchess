import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { shuffle } from "@/utils/alea";

export class BallRules extends ChessRules {

  static get Lines() {
    return [
      // White goal:
      [[0, 3], [0, 6]],
      [[0, 6], [1, 6]],
      [[1, 6], [1, 3]],
      [[1, 3], [0, 3]],
      // Black goal:
      [[9, 3], [9, 6]],
      [[9, 6], [8, 6]],
      [[8, 6], [8, 3]],
      [[8, 3], [9, 3]]
    ];
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: ChessRules.PawnSpecs.promotions.concat([V.PHOENIX]) }
    );
  }

  static get HasFlags() {
    return false;
  }

  static get PHOENIX() {
    return 'h';
  }

  static get BALL() {
    // 'b' is already taken:
    return "aa";
  }

  static get HAS_BALL_CODE() {
    return {
      'p': 's',
      'r': 'u',
      'n': 'o',
      'b': 'c',
      'q': 't',
      'k': 'l',
      'h': 'i'
    };
  }

  static get HAS_BALL_DECODE() {
    return {
      's': 'p',
      'u': 'r',
      'o': 'n',
      'c': 'b',
      't': 'q',
      'l': 'k',
      'i': 'h'
    };
  }

  static get PIECES() {
    return ChessRules.PIECES
      .concat([V.PHOENIX])
      .concat(Object.keys(V.HAS_BALL_DECODE))
      .concat(['a']);
  }

  static board2fen(b) {
    if (b == V.BALL) return 'a';
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    if (f == 'a') return V.BALL;
    return ChessRules.fen2board(f);
  }

  static ParseFen(fen) {
    return Object.assign(
      ChessRules.ParseFen(fen),
      { pmove: fen.split(" ")[4] }
    );
  }

  // Check that exactly one ball is on the board
  // + at least one piece per color.
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let pieces = { "w": 0, "b": 0 };
    const withBall = Object.keys(V.HAS_BALL_DECODE).concat(['a']);
    let ballCount = 0;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        const lowerRi = row[i].toLowerCase();
        if (V.PIECES.includes(lowerRi)) {
          if (lowerRi != 'a') pieces[row[i] == lowerRi ? "b" : "w"]++;
          if (withBall.includes(lowerRi)) ballCount++;
          sumElts++;
        }
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (ballCount != 1 || Object.values(pieces).some(v => v == 0))
      return false;
    return true;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParts = fen.split(" ");
    if (fenParts.length != 5) return false;
    if (
      fenParts[4] != "-" &&
      !fenParts[4].match(/^([a-i][1-9]){2,2}$/)
    ) {
      return false;
    }
    return true;
  }

  getPpath(b) {
    let prefix = "";
    const withPrefix =
      Object.keys(V.HAS_BALL_DECODE)
      .concat([V.PHOENIX])
      .concat(['a']);
    if (withPrefix.includes(b[1])) prefix = "Ball/";
    return prefix + b;
  }

  getPPpath(m) {
    if (
      m.vanish.length == 2 &&
      m.appear.length == 2 &&
      m.appear[0].c != m.appear[1].c
    ) {
      // Take ball in place (from opponent)
      return "Ball/inplace";
    }
    return super.getPPpath(m);
  }

  canTake([x1, y1], [x2, y2]) {
    if (this.getColor(x1, y1) !== this.getColor(x2, y2)) {
      // The piece holding the ball cannot capture:
      return (
        !(Object.keys(V.HAS_BALL_DECODE)
          .includes(this.board[x1][y1].charAt(1)))
      );
    }
    // Pass: possible only if one of the friendly pieces has the ball
    return (
      Object.keys(V.HAS_BALL_DECODE).includes(this.board[x1][y1].charAt(1)) ||
      Object.keys(V.HAS_BALL_DECODE).includes(this.board[x2][y2].charAt(1))
    );
  }

  getFen() {
    return super.getFen() + " " + this.getPmoveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getPmoveFen();
  }

  getPmoveFen() {
    const L = this.pmoves.length;
    if (!this.pmoves[L-1]) return "-";
    return (
      V.CoordsToSquare(this.pmoves[L-1].start) +
      V.CoordsToSquare(this.pmoves[L-1].end)
    );
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "hbnrqrnhb/ppppppppp/9/9/4a4/9/9/PPPPPPPPP/HBNRQRNHB w 0 - -";

    let pieces = { w: new Array(9), b: new Array(9) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      // Get random squares for every piece, with bishops and phoenixes
      // on different colors:
      let positions = shuffle(ArrayFun.range(9));
      const composition = ['b', 'b', 'h', 'h', 'n', 'n', 'r', 'r', 'q'];
      let rem2 = positions[0] % 2;
      if (rem2 == positions[1] % 2) {
        // Fix bishops (on different colors)
        for (let i=4; i<9; i++) {
          if (positions[i] % 2 != rem2)
            [positions[1], positions[i]] = [positions[i], positions[1]];
        }
      }
      rem2 = positions[2] % 2;
      if (rem2 == positions[3] % 2) {
        // Fix phoenixes too:
        for (let i=4; i<9; i++) {
          if (positions[i] % 2 != rem2)
            [positions[3], positions[i]] = [positions[i], positions[3]];
        }
      }
      for (let i = 0; i < 9; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      pieces["b"].join("") +
      "/ppppppppp/9/9/4a4/9/9/PPPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 - -"
    );
  }

  scanKings() {}

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const pmove = V.ParseFen(fen).pmove;
    // Local stack of "pass moves" (no need for appear & vanish)
    this.pmoves = [
      pmove != "-"
        ?
          {
            start: V.SquareToCoords(pmove.substr(0, 2)),
            end: V.SquareToCoords(pmove.substr(2))
          }
        : null
    ];
  }

  static get size() {
    return { x: 9, y: 9 };
  }

  getPiece(i, j) {
    const p = this.board[i][j].charAt(1);
    if (Object.keys(V.HAS_BALL_DECODE).includes(p))
      return V.HAS_BALL_DECODE[p];
    return p;
  }

  static get steps() {
    return Object.assign(
      {},
      ChessRules.steps,
      // Add phoenix moves
      {
        h: [
          [-2, -2],
          [-2, 2],
          [2, -2],
          [2, 2],
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1]
        ]
      }
    );
  }

  // Because of the ball, getPiece() could be wrong:
  // use board[x][y][1] instead (always valid).
  getBasicMove([sx, sy], [ex, ey], tr) {
    const initColor = this.getColor(sx, sy);
    const initPiece = this.board[sx][sy].charAt(1);
    let mv = new Move({
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: tr ? tr.c : initColor,
          p: tr ? tr.p : initPiece
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

    // Fix "ball holding" indication in case of promotions:
    if (!!tr && Object.keys(V.HAS_BALL_DECODE).includes(initPiece))
      mv.appear[0].p = V.HAS_BALL_CODE[tr.p];

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

    // Post-processing: maybe the ball was taken, or a piece + ball,
    // or maybe a pass (ball <--> piece)
    if (mv.vanish.length == 2) {
      if (
        // Take the ball?
        mv.vanish[1].c == 'a' ||
        // Capture a ball-holding piece? If friendly one, then adjust
        Object.keys(V.HAS_BALL_DECODE).includes(mv.vanish[1].p)
      ) {
        mv.appear[0].p = V.HAS_BALL_CODE[mv.appear[0].p];
        if (mv.vanish[1].c == mv.vanish[0].c) {
          // "Capturing" self => pass
          mv.appear[0].x = mv.start.x;
          mv.appear[0].y = mv.start.y;
          mv.appear.push(
            new PiPo({
              x: mv.end.x,
              y: mv.end.y,
              p: V.HAS_BALL_DECODE[mv.vanish[1].p],
              c: mv.vanish[0].c
            })
          );
        }
      }
      else if (mv.vanish[1].c == mv.vanish[0].c) {
        // Pass the ball: the passing unit does not disappear
        mv.appear.push(JSON.parse(JSON.stringify(mv.vanish[0])));
        mv.appear[0].p = V.HAS_BALL_CODE[mv.vanish[1].p];
        mv.appear[1].p = V.HAS_BALL_DECODE[mv.appear[1].p];
      }
      // Else: standard capture
    }

    return mv;
  }

  // NOTE: if a pawn captures en-passant, he doesn't hold the ball
  // So base implementation is fine.

  getPotentialMovesFrom([x, y]) {
    let moves = undefined;
    const piece = this.getPiece(x, y);
    if (piece == V.PHOENIX)
      moves = this.getPotentialPhoenixMoves([x, y]);
    else moves = super.getPotentialMovesFrom([x, y]);
    // Add "taking ball in place" move (at most one in list)
    for (let m of moves) {
      if (
        m.vanish.length == 2 &&
        m.vanish[1].p != 'a' &&
        m.vanish[0].c != m.vanish[1].c &&
        Object.keys(V.HAS_BALL_DECODE).includes(m.appear[0].p)
      ) {
        const color = this.turn;
        const oppCol = V.GetOppCol(color);
        moves.push(
          new Move({
            appear: [
              new PiPo({
                x: x,
                y: y,
                c: color,
                p: m.appear[0].p
              }),
              new PiPo({
                x: m.vanish[1].x,
                y: m.vanish[1].y,
                c: oppCol,
                p: V.HAS_BALL_DECODE[m.vanish[1].p]
              })
            ],
            vanish: [
              new PiPo({
                x: x,
                y: y,
                c: color,
                p: piece
              }),
              new PiPo({
                x: m.vanish[1].x,
                y: m.vanish[1].y,
                c: oppCol,
                p: m.vanish[1].p
              })
            ],
            end: { x: m.end.x, y: m.end.y }
          })
        );
        break;
      }
    }
    return moves;
  }

  // "Sliders": at most 3 steps
  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      let stepCount = 1;
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep || stepCount == 3) continue outerLoop;
        i += step[0];
        j += step[1];
        stepCount++;
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getPotentialPhoenixMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.PHOENIX], "oneStep");
  }

  getPmove(move) {
    if (
      move.vanish.length == 2 &&
      move.appear.length == 2 &&
      move.appear[0].c != move.appear[1].c
    ) {
      // In-place pass:
      return {
        start: move.start,
        end: move.end
      };
    }
    return null;
  }

  oppositePasses(m1, m2) {
    return (
      m1.start.x == m2.end.x &&
      m1.start.y == m2.end.y &&
      m1.end.x == m2.start.x &&
      m1.end.y == m2.start.y
    );
  }

  filterValid(moves) {
    const L = this.pmoves.length;
    const lp = this.pmoves[L-1];
    if (!lp) return moves;
    return moves.filter(m => {
      return (
        m.vanish.length == 1 ||
        m.appear.length == 1 ||
        m.appear[0].c == m.appear[1].c ||
        !this.oppositePasses(lp, m)
      );
    });
  }

  // isAttacked: unused here (no checks)

  postPlay(move) {
    this.pmoves.push(this.getPmove(move));
  }

  postUndo() {
    this.pmoves.pop();
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // Turn has changed:
    const color = V.GetOppCol(this.turn);
    const lastRank = (color == "w" ? 0 : 8);
    if ([3,4,5].some(
      i => {
        return (
          Object.keys(V.HAS_BALL_DECODE).includes(
            this.board[lastRank][i].charAt(1)) &&
          this.getColor(lastRank, i) == color
        );
      }
    )) {
      // Goal scored!
      return color == "w" ? "1-0" : "0-1";
    }
    if (this.atLeastOneMove()) return "*";
    // Stalemate (quite unlikely?)
    return "1/2";
  }

  static get VALUES() {
    return {
      p: 1,
      r: 3,
      n: 3,
      b: 2,
      q: 5,
      h: 3,
      a: 0 //ball: neutral
    };
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  evalPosition() {
    // Count material:
    let evaluation = super.evalPosition();
    if (this.board[4][4] == V.BALL)
      // Ball not captured yet
      return evaluation;
    // Ponder depending on ball position
    for (let i=0; i<9; i++) {
      for (let j=0; j<9; j++) {
        if (Object.keys(V.HAS_BALL_DECODE).includes(this.board[i][j][1]))
          return evaluation/2 + (this.getColor(i, j) == "w" ? 8 - i : -i);
      }
    }
    return 0; //never reached
  }

  getNotation(move) {
    const finalSquare = V.CoordsToSquare(move.end);
    if (move.appear.length == 2)
      // A pass: special notation
      return V.CoordsToSquare(move.start) + "P" + finalSquare;
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
      if (![V.PAWN, V.HAS_BALL_CODE[V.PAWN]].includes(move.appear[0].p)) {
        // Promotion
        const promotePiece =
          V.HAS_BALL_DECODE[move.appear[0].p] || move.appear[0].p;
        notation += "=" + promotePiece.toUpperCase();
      }
      return notation;
    }
    // Piece movement
    return (
      piece.toUpperCase() +
      (move.vanish.length > move.appear.length ? "x" : "") +
      finalSquare
    );
  }

};
