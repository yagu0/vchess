import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { shuffle } from "@/utils/alea";

export class BallRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: ChessRules.PawnSpecs.promotions.concat([V.CHAMPION]) }
    );
  }

  static get HasFlags() {
    return false;
  }

  static get CHAMPION() {
    return 'c';
  }

  static get BALL() {
    // 'b' is already taken:
    return "aa";
  }

  // Special code for "something to fill space" (around goals)
  // --> If goal is outside the board (current prototype: it's inside)
//  static get FILL() {
//    return "ff";
//  }

  static get HAS_BALL_CODE() {
    return {
      'p': 's',
      'r': 'u',
      'n': 'o',
      'b': 'd',
      'q': 't',
      'k': 'l',
      'c': 'h'
    };
  }

  static get HAS_BALL_DECODE() {
    return {
      's': 'p',
      'u': 'r',
      'o': 'n',
      'd': 'b',
      't': 'q',
      'l': 'k',
      'h': 'c'
    };
  }

  static get PIECES() {
    return ChessRules.PIECES
      .concat([V.CHAMPION])
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

  // Check that exactly one ball is on the board
  // + at least one piece per color.
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let pieces = { "w": 0, "b": 0 };
    const withBall = Object.keys(V.HAS_BALL_DECODE).concat([V.BALL]);
    let ballCount = 0;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        const lowerRi = row[i].toLowerCase();
        if (V.PIECES.includes(lowerRi)) {
          if (lowerRi != V.BALL) pieces[row[i] == lowerRi ? "b" : "w"]++;
          if (withBall.includes(lowerRi)) ballCount++;
          sumElts++;
        } else {
          const num = parseInt(row[i]);
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

  getPpath(b) {
    let prefix = "";
    const withPrefix =
      Object.keys(V.HAS_BALL_DECODE)
      .concat([V.CHAMPION])
      .concat(['a']);
    if (withPrefix.includes(b[1])) prefix = "Ball/";
    return prefix + b;
  }

  canTake([x1, y1], [x2, y2]) {
    // Capture enemy or pass ball to friendly pieces
    return (
      this.getColor(x1, y1) !== this.getColor(x2, y2) ||
      Object.keys(V.HAS_BALL_DECODE).includes(this.board[x1][y1].charAt(1))
    );
  }

  getCheckSquares(color) {
    return [];
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rnbcqcnbr/ppppppppp/9/9/4a4/9/9/PPPPPPPPP/RNBCQCNBR w 0 -";

    let pieces = { w: new Array(9), b: new Array(9) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      // Get random squares for every piece, totally freely
      let positions = shuffle(ArrayFun.range(9));
      const composition = ['b', 'b', 'r', 'r', 'n', 'n', 'c', 'c', 'q'];
      const rem2 = positions[0] % 2;
      if (rem2 == positions[1] % 2) {
        // Fix bishops (on different colors)
        for (let i=2; i<9; i++) {
          if (positions[i] % 2 != rem2)
            [positions[1], positions[i]] = [positions[i], positions[1]];
        }
      }
      for (let i = 0; i < 9; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      pieces["b"].join("") +
      "/ppppppppp/9/9/4a4/9/9/PPPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      // En-passant allowed, but no flags
      " w 0 -"
    );
  }

  scanKings() {}

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
      // Add champion moves
      {
        c: [
          [-2, -2],
          [-2, 0],
          [-2, 2],
          [0, -2],
          [0, 2],
          [2, -2],
          [2, 0],
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

    // Post-processing: maybe the ball was taken, or a piece + ball
    if (mv.vanish.length == 2) {
      if (
        // Take the ball?
        mv.vanish[1].c == 'a' ||
        // Capture a ball-holding piece?
        Object.keys(V.HAS_BALL_DECODE).includes(mv.vanish[1].p)
      ) {
        mv.appear[0].p = V.HAS_BALL_CODE[mv.appear[0].p];
      } else if (mv.vanish[1].c == mv.vanish[0].c) {
        // Pass the ball: the passing unit does not disappear
        mv.appear.push(JSON.parse(JSON.stringify(mv.vanish[0])));
        mv.appear[0].p = V.HAS_BALL_CODE[mv.vanish[1].p];
        mv.appear[1].p = V.HAS_BALL_DECODE[mv.appear[1].p];
      }
      // Else: standard capture
    }

    return mv;
  }

  // NOTE: if a pawn is captured en-passant, he doesn't hold the ball
  // So base implementation is fine.

  getPotentialMovesFrom([x, y]) {
    if (this.getPiece(x, y) == V.CHAMPION)
      return this.getPotentialChampionMoves([x, y]);
    return super.getPotentialMovesFrom([x, y]);
  }

  // "Sliders": at most 2 steps
  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      let stepCount = 1;
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep || stepCount == 2) continue outerLoop;
        i += step[0];
        j += step[1];
        stepCount++;
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getPotentialChampionMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.CHAMPION], "oneStep");
  }

  filterValid(moves) {
    return moves;
  }

  // isAttacked: unused here (no checks)

  postPlay() {}
  postUndo() {}

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
      n: 4,
      b: 2,
      q: 5,
      c: 4,
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
