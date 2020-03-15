import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";
import { ChessRules, PiPo, Move } from "@/base_rules";

export const VariantRules = class EightpiecesRules extends ChessRules {
  static get JAILER() {
    return "j";
  }
  static get SENTRY() {
    return "s";
  }
  static get LANCER() {
    return "l";
  }

  static get IMAGE_EXTENSION() {
    // Temporarily, for the time SVG pieces are being designed:
    return ".png";
  }

  // Lancer directions *from white perspective*
  static get LANCER_DIRS() {
    return {
      'c': [-1, 0], //north
      'd': [-1, 1], //N-E
      'e': [0, 1], //east
      'f': [1, 1], //S-E
      'g': [1, 0], //south
      'h': [1, -1], //S-W
      'm': [0, -1], //west
      'o': [-1, -1] //N-W
    };
  }

  static get PIECES() {
    return ChessRules.PIECES
      .concat([V.JAILER, V.SENTRY])
      .concat(Object.keys(V.LANCER_DIRS));
  }

  getPiece(i, j) {
    const piece = this.board[i][j].charAt(1);
    // Special lancer case: 8 possible orientations
    if (Object.keys(V.LANCER_DIRS).includes(piece)) return V.LANCER;
    return piece;
  }

  getPpath(b, color, score, orientation) {
    if ([V.JAILER, V.SENTRY].includes(b[1])) return "Eightpieces/tmp_png/" + b;
    if (Object.keys(V.LANCER_DIRS).includes(b[1])) {
      if (orientation == 'w') return "Eightpieces/tmp_png/" + b;
      // Find opposite direction for adequate display:
      let oppDir = '';
      switch (b[1]) {
        case 'c':
          oppDir = 'g';
          break;
        case 'g':
          oppDir = 'c';
          break;
        case 'd':
          oppDir = 'h';
          break;
        case 'h':
          oppDir = 'd';
          break;
        case 'e':
          oppDir = 'm';
          break;
        case 'm':
          oppDir = 'e';
          break;
        case 'f':
          oppDir = 'o';
          break;
        case 'o':
          oppDir = 'f';
          break;
      }
      return "Eightpieces/tmp_png/" + b[0] + oppDir;
    }
    // TODO: after we have SVG pieces, remove the folder and next prefix:
    return "Eightpieces/tmp_png/" + b;
  }

  getPPpath(b, orientation) {
    return this.getPpath(b, null, null, orientation);
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { sentrypush: fenParts[5] }
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check sentry push (if any)
    if (
      fenParsed.sentrypush != "-" &&
      !fenParsed.sentrypush.match(/^([a-h][1-8],?)+$/)
    ) {
      return false;
    }
    return true;
  }

  getFen() {
    return super.getFen() + " " + this.getSentrypushFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getSentrypushFen();
  }

  getSentrypushFen() {
    const L = this.sentryPush.length;
    if (!this.sentryPush[L-1]) return "-";
    let res = "";
    this.sentryPush[L-1].forEach(coords =>
      res += V.CoordsToSquare(coords) + ",");
    return res.slice(0, -1);
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // subTurn == 2 only when a sentry moved, and is about to push something
    this.subTurn = 1;
    // Sentry position just after a "capture" (subTurn from 1 to 2)
    this.sentryPos = null;
    // Stack pieces' forbidden squares after a sentry move at each turn
    const parsedFen = V.ParseFen(fen);
    if (parsedFen.sentrypush == "-") this.sentryPush = [null];
    else {
      this.sentryPush = [
        parsedFen.sentrypush.split(",").map(sq => {
          return V.SquareToCoords(sq);
        })
      ];
    }
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      // Deterministic:
      return "jsfqkbnr/pppppppp/8/8/8/8/PPPPPPPP/JSDQKBNR w 0 ahah - -";

    let pieces = { w: new Array(8), b: new Array(8) };
    let flags = "";
    // Shuffle pieces on first (and last rank if randomness == 2)
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        const lancerIdx = pieces['w'].findIndex(p => {
          return Object.keys(V.LANCER_DIRS).includes(p);
        });
        pieces['b'] =
          pieces['w'].slice(0, lancerIdx)
          .concat(['g'])
          .concat(pieces['w'].slice(lancerIdx + 1));
        flags += flags;
        break;
      }

      let positions = ArrayFun.range(8);

      // Get random squares for bishop and sentry
      let randIndex = 2 * randInt(4);
      let bishopPos = positions[randIndex];
      // The sentry must be on a square of different color
      let randIndex_tmp = 2 * randInt(4) + 1;
      let sentryPos = positions[randIndex_tmp];
      if (c == 'b') {
        // Check if white sentry is on the same color as ours.
        // If yes: swap bishop and sentry positions.
        if ((pieces['w'].indexOf('s') - sentryPos) % 2 == 0)
          [bishopPos, sentryPos] = [sentryPos, bishopPos];
      }
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for knight and lancer
      randIndex = randInt(6);
      const knightPos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const lancerPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rook, jailer and king positions are now almost fixed,
      // only the ordering rook-> jailer or jailer->rook must be decided.
      let rookPos = positions[0];
      let jailerPos = positions[2];
      const kingPos = positions[1];
      flags += V.CoordToColumn(rookPos) + V.CoordToColumn(jailerPos);
      if (Math.random() < 0.5) [rookPos, jailerPos] = [jailerPos, rookPos];

      pieces[c][rookPos] = "r";
      pieces[c][knightPos] = "n";
      pieces[c][bishopPos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][sentryPos] = "s";
      // Lancer faces north for white, and south for black:
      pieces[c][lancerPos] = c == 'w' ? 'c' : 'g';
      pieces[c][jailerPos] = "j";
    }
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 " + flags + " - -"
    );
  }

  canTake([x1, y1], [x2, y2]) {
    if (this.subTurn == 2)
      // Only self captures on this subturn:
      return this.getColor(x1, y1) == this.getColor(x2, y2);
    return super.canTake([x1, y1], [x2, y2]);
  }

  // Is piece on square (x,y) immobilized?
  isImmobilized([x, y]) {
    const color = this.getColor(x, y);
    const oppCol = V.GetOppCol(color);
    for (let step of V.steps[V.ROOK]) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol
      ) {
        if (this.getPiece(i, j) == V.JAILER) return [i, j];
      }
    }
    return null;
  }

  // Because of the lancers, getPiece() could be wrong:
  // use board[x][y][1] instead (always valid).
  getBasicMove([sx, sy], [ex, ey], tr) {
    let mv = new Move({
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: tr ? tr.c : this.getColor(sx, sy),
          p: tr ? tr.p : this.board[sx][sy].charAt(1)
        })
      ],
      vanish: [
        new PiPo({
          x: sx,
          y: sy,
          c: this.getColor(sx, sy),
          p: this.board[sx][sy].charAt(1)
        })
      ]
    });

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

    return mv;
  }

  canIplay(side, [x, y]) {
    return (
      (this.subTurn == 1 && this.turn == side && this.getColor(x, y) == side) ||
      (this.subTurn == 2 && x == this.sentryPos.x && y == this.sentryPos.y)
    );
  }

  getPotentialMovesFrom([x, y]) {
    // At subTurn == 2, jailers aren't effective (Jeff K)
    const piece = this.getPiece(x, y);
    const L = this.sentryPush.length;
    if (this.subTurn == 1) {
      const jsq = this.isImmobilized([x, y]);
      if (!!jsq) {
        let moves = [];
        // Special pass move if king:
        if (piece == V.KING) {
          moves.push(
            new Move({
              appear: [],
              vanish: [],
              start: { x: x, y: y },
              end: { x: jsq[0], y: jsq[1] }
            })
          );
        }
        else if (piece == V.LANCER && !!this.sentryPush[L-1]) {
          // A pushed lancer next to the jailer: reorient
          const color = this.getColor(x, y);
          const curDir = this.board[x][y].charAt(1);
          Object.keys(V.LANCER_DIRS).forEach(k => {
            moves.push(
              new Move({
                appear: [{ x: x, y: y, c: color, p: k }],
                vanish: [{ x: x, y: y, c: color, p: curDir }],
                start: { x: x, y: y },
                end: { x: jsq[0], y: jsq[1] }
              })
            );
          });
        }
        return moves;
      }
    }
    let moves = [];
    switch (piece) {
      case V.JAILER:
        moves = this.getPotentialJailerMoves([x, y]);
        break;
      case V.SENTRY:
        moves = this.getPotentialSentryMoves([x, y]);
        break;
      case V.LANCER:
        moves = this.getPotentialLancerMoves([x, y]);
        break;
      default:
        moves = super.getPotentialMovesFrom([x, y]);
        break;
    }
    if (!!this.sentryPush[L-1]) {
      // Delete moves walking back on sentry push path,
      // only if not a pawn, and the piece is the pushed one.
      const pl = this.sentryPush[L-1].length;
      const finalPushedSq = this.sentryPush[L-1][pl-1];
      moves = moves.filter(m => {
        if (
          m.vanish[0].p != V.PAWN &&
          m.start.x == finalPushedSq.x && m.start.y == finalPushedSq.y &&
          this.sentryPush[L-1].some(sq => sq.x == m.end.x && sq.y == m.end.y)
        ) {
          return false;
        }
        return true;
      });
    } else if (this.subTurn == 2) {
      // Put back the sentinel on board:
      const color = this.turn;
      moves.forEach(m => {
        m.appear.push({x: x, y: y, p: V.SENTRY, c: color});
      });
    }
    return moves;
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.getColor(x, y);
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    let shiftX = (color == "w" ? -1 : 1);
    if (this.subTurn == 2) shiftX *= -1;
    const firstRank = color == "w" ? sizeX - 1 : 0;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;

    // Pawns might be pushed on 1st rank and attempt to move again:
    if (!V.OnBoard(x + shiftX, y)) return [];

    const finalPieces =
      // A push cannot put a pawn on last rank (it goes backward)
      x + shiftX == lastRank
        ? Object.keys(V.LANCER_DIRS).concat(
          [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.SENTRY, V.JAILER])
        : [V.PAWN];
    if (this.board[x + shiftX][y] == V.EMPTY) {
      // One square forward
      for (let piece of finalPieces) {
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y], {
            c: color,
            p: piece
          })
        );
      }
      if (
        // 2-squares jumps forbidden if pawn push
        this.subTurn == 1 &&
        [startRank, firstRank].includes(x) &&
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

    // En passant: only on subTurn == 1
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1];
    if (
      this.subTurn == 1 &&
      !!epSquare &&
      epSquare.x == x + shiftX &&
      Math.abs(epSquare.y - y) == 1
    ) {
      let enpassantMove = this.getBasicMove([x, y], [epSquare.x, epSquare.y]);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: "p",
        c: this.getColor(x, epSquare.y)
      });
      moves.push(enpassantMove);
    }

    return moves;
  }

  // Obtain all lancer moves in "step" direction
  getPotentialLancerMoves_aux([x, y], step, tr) {
    let moves = [];
    // Add all moves to vacant squares until opponent is met:
    const color = this.getColor(x, y);
    const oppCol =
      this.subTurn == 1
        ? V.GetOppCol(color)
        // at subTurn == 2, consider own pieces as opponent
        : color;
    let sq = [x + step[0], y + step[1]];
    while (V.OnBoard(sq[0], sq[1]) && this.getColor(sq[0], sq[1]) != oppCol) {
      if (this.board[sq[0]][sq[1]] == V.EMPTY)
        moves.push(this.getBasicMove([x, y], sq, tr));
      sq[0] += step[0];
      sq[1] += step[1];
    }
    if (V.OnBoard(sq[0], sq[1]))
      // Add capturing move
      moves.push(this.getBasicMove([x, y], sq, tr));
    return moves;
  }

  getPotentialLancerMoves([x, y]) {
    let moves = [];
    // Add all lancer possible orientations, similar to pawn promotions.
    // Except if just after a push: allow all movements from init square then
    const L = this.sentryPush.length;
    const color = this.getColor(x, y);
    if (!!this.sentryPush[L-1]) {
      // Maybe I was pushed
      const pl = this.sentryPush[L-1].length;
      if (
        this.sentryPush[L-1][pl-1].x == x &&
        this.sentryPush[L-1][pl-1].y == y
      ) {
        // I was pushed: allow all directions (for this move only), but
        // do not change direction after moving, *except* if I keep the
        // same orientation in which I was pushed.
        const curDir = V.LANCER_DIRS[this.board[x][y].charAt(1)];
        Object.values(V.LANCER_DIRS).forEach(step => {
          const dirCode = Object.keys(V.LANCER_DIRS).find(k => {
            return (
              V.LANCER_DIRS[k][0] == step[0] &&
              V.LANCER_DIRS[k][1] == step[1]
            );
          });
          const dirMoves =
            this.getPotentialLancerMoves_aux(
              [x, y],
              step,
              { p: dirCode, c: color }
            );
          if (curDir[0] == step[0] && curDir[1] == step[1]) {
            // Keeping same orientation: can choose after
            let chooseMoves = [];
            dirMoves.forEach(m => {
              Object.keys(V.LANCER_DIRS).forEach(k => {
                let mk = JSON.parse(JSON.stringify(m));
                mk.appear[0].p = k;
                moves.push(mk);
              });
            });
            Array.prototype.push.apply(moves, chooseMoves);
          } else Array.prototype.push.apply(moves, dirMoves);
        });
        return moves;
      }
    }
    // I wasn't pushed: standard lancer move
    const dirCode = this.board[x][y][1];
    const monodirMoves =
      this.getPotentialLancerMoves_aux([x, y], V.LANCER_DIRS[dirCode]);
    // Add all possible orientations aftermove except if I'm being pushed
    if (this.subTurn == 1) {
      monodirMoves.forEach(m => {
        Object.keys(V.LANCER_DIRS).forEach(k => {
          let mk = JSON.parse(JSON.stringify(m));
          mk.appear[0].p = k;
          moves.push(mk);
        });
      });
      return moves;
    } else {
      // I'm pushed: add potential nudges
      let potentialNudges = [];
      for (let step of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
        if (
          V.OnBoard(x + step[0], y + step[1]) &&
          this.board[x + step[0]][y + step[1]] == V.EMPTY
        ) {
          const newDirCode = Object.keys(V.LANCER_DIRS).find(k => {
            const codeStep = V.LANCER_DIRS[k];
            return (codeStep[0] == step[0] && codeStep[1] == step[1]);
          });
          potentialNudges.push(
            this.getBasicMove(
              [x, y],
              [x + step[0], y + step[1]],
              { c: color, p: newDirCode }
            )
          );
        }
      }
      return monodirMoves.concat(potentialNudges);
    }
  }

  getPotentialSentryMoves([x, y]) {
    // The sentry moves a priori like a bishop:
    let moves = super.getPotentialBishopMoves([x, y]);
    // ...but captures are replaced by special move, if and only if
    // "captured" piece can move now, considered as the capturer unit.
    // --> except is subTurn == 2, in this case I don't push anything.
    if (this.subTurn == 2) return moves.filter(m => m.vanish.length == 1);
    moves.forEach(m => {
      if (m.vanish.length == 2) {
        // Temporarily cancel the sentry capture:
        m.appear.pop();
        m.vanish.pop();
      }
    });
    const color = this.getColor(x, y);
    const fMoves = moves.filter(m => {
      // Can the pushed unit make any move? ...resulting in a non-self-check?
      if (m.appear.length == 0) {
        let res = false;
        this.play(m);
        let moves2 = this.getPotentialMovesFrom([m.end.x, m.end.y]);
        for (let m2 of moves2) {
          this.play(m2);
          res = !this.underCheck(color);
          this.undo(m2);
          if (res) break;
        }
        this.undo(m);
        return res;
      }
      return true;
    });
    return fMoves;
  }

  getPotentialJailerMoves([x, y]) {
    return super.getPotentialRookMoves([x, y]).filter(m => {
      // Remove jailer captures
      return m.vanish[0].p != V.JAILER || m.vanish.length == 1;
    });
  }

  getPotentialKingMoves(sq) {
    const moves = this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
    return (
      this.subTurn == 1
        ? moves.concat(this.getCastleMoves(sq))
        : moves
    );
  }

  // Adapted: castle with jailer possible
  getCastleMoves([x, y]) {
    const c = this.getColor(x, y);
    const firstRank = (c == "w" ? V.size.x - 1 : 0);
    if (x != firstRank || y != this.INIT_COL_KING[c])
      return [];

    const oppCol = V.GetOppCol(c);
    let moves = [];
    let i = 0;
    // King, then rook or jailer:
    const finalSquares = [
      [2, 3],
      [V.size.y - 2, V.size.y - 3]
    ];
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++
    ) {
      if (this.castleFlags[c][castleSide] >= 8) continue;
      // Rook (or jailer) and king are on initial position
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      i = y;
      do {
        if (
          this.isAttacked([x, i], [oppCol]) ||
          (this.board[x][i] != V.EMPTY &&
            (this.getColor(x, i) != c ||
              ![V.KING, V.ROOK, V.JAILER].includes(this.getPiece(x, i))))
        ) {
          continue castlingCheck;
        }
        i += step;
      } while (i != finalSquares[castleSide][0]);
      step = castleSide == 0 ? -1 : 1;
      const rookOrJailerPos = this.castleFlags[c][castleSide];
      for (i = y + step; i != rookOrJailerPos; i += step)
        if (this.board[x][i] != V.EMPTY) continue castlingCheck;

      // Nothing on final squares, except maybe king and castling rook or jailer?
      for (i = 0; i < 2; i++) {
        if (
          this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
          this.getPiece(x, finalSquares[castleSide][i]) != V.KING &&
          finalSquares[castleSide][i] != rookOrJailerPos
        ) {
          continue castlingCheck;
        }
      }

      // If this code is reached, castle is valid
      const castlingPiece = this.getPiece(firstRank, rookOrJailerPos);
      moves.push(
        new Move({
          appear: [
            new PiPo({ x: x, y: finalSquares[castleSide][0], p: V.KING, c: c }),
            new PiPo({ x: x, y: finalSquares[castleSide][1], p: castlingPiece, c: c })
          ],
          vanish: [
            new PiPo({ x: x, y: y, p: V.KING, c: c }),
            new PiPo({ x: x, y: rookOrJailerPos, p: castlingPiece, c: c })
          ],
          end:
            Math.abs(y - rookOrJailerPos) <= 2
              ? { x: x, y: rookOrJailerPos }
              : { x: x, y: y + 2 * (castleSide == 0 ? -1 : 1) }
        })
      );
    }

    return moves;
  }

  atLeastOneMove() {
    // If in second-half of a move, we already know that a move is possible
    if (this.subTurn == 2) return true;
    return super.atLeastOneMove();
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const basicFilter = (m, c) => {
      this.play(m);
      const res = !this.underCheck(c);
      this.undo(m);
      return res;
    };
    // Disable check tests for sentry pushes,
    // because in this case the move isn't finished
    let movesWithoutSentryPushes = [];
    let movesWithSentryPushes = [];
    moves.forEach(m => {
      // Second condition below for special king "pass" moves
      if (m.appear.length > 0 || m.vanish.length == 0)
        movesWithoutSentryPushes.push(m);
      else movesWithSentryPushes.push(m);
    });
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const filteredMoves =
      movesWithoutSentryPushes.filter(m => basicFilter(m, color));
    // If at least one full move made, everything is allowed.
    // Else: forbid checks and captures.
    return (
      this.movesCount >= 2
        ? filteredMoves
        : filteredMoves.filter(m => {
          return (m.vanish.length <= 1 && basicFilter(m, oppCol));
        })
    ).concat(movesWithSentryPushes);
  }

  getAllValidMoves() {
    if (this.subTurn == 1) return super.getAllValidMoves();
    // Sentry push:
    const sentrySq = [this.sentryPos.x, this.sentryPos.y];
    return this.filterValid(this.getPotentialMovesFrom(sentrySq));
  }

  prePlay(move) {
    if (move.appear.length == 0 && move.vanish.length == 1)
      // The sentry is about to push a piece: subTurn goes from 1 to 2
      this.sentryPos = { x: move.end.x, y: move.end.y };
    if (this.subTurn == 2 && move.vanish[0].p != V.PAWN) {
      // A piece is pushed: forbid array of squares between start and end
      // of move, included (except if it's a pawn)
      let squares = [];
      if ([V.KNIGHT,V.KING].includes(move.vanish[0].p))
        // short-range pieces: just forbid initial square
        squares.push({ x: move.start.x, y: move.start.y });
      else {
        const deltaX = move.end.x - move.start.x;
        const deltaY = move.end.y - move.start.y;
        const step = [
          deltaX / Math.abs(deltaX) || 0,
          deltaY / Math.abs(deltaY) || 0
        ];
        for (
          let sq = {x: move.start.x, y: move.start.y};
          sq.x != move.end.x || sq.y != move.end.y;
          sq.x += step[0], sq.y += step[1]
        ) {
          squares.push({ x: sq.x, y: sq.y });
        }
      }
      // Add end square as well, to know if I was pushed (useful for lancers)
      squares.push({ x: move.end.x, y: move.end.y });
      this.sentryPush.push(squares);
    } else this.sentryPush.push(null);
  }

  play(move) {
//    if (!this.states) this.states = [];
//    const stateFen = this.getFen();
//    this.states.push(stateFen);

    this.prePlay(move);
    move.flags = JSON.stringify(this.aggregateFlags());
    this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    // Is it a sentry push? (useful for undo)
    move.sentryPush = (this.subTurn == 2);
    if (this.subTurn == 1) this.movesCount++;
    if (move.appear.length == 0 && move.vanish.length == 1) this.subTurn = 2;
    else {
      // Turn changes only if not a sentry "pre-push"
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
    }
    this.postPlay(move);
  }

  postPlay(move) {
    if (move.vanish.length == 0 || this.subTurn == 2)
      // Special pass move of the king, or sentry pre-push: nothing to update
      return;
    const c = move.vanish[0].c;
    const piece = move.vanish[0].p;
    const firstRank = c == "w" ? V.size.x - 1 : 0;

    if (piece == V.KING) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
      this.castleFlags[c] = [V.size.y, V.size.y];
      return;
    }
    // Update castling flags if rooks are moved
    const oppCol = V.GetOppCol(c);
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (
      move.start.x == firstRank && //our rook moves?
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    } else if (
      move.end.x == oppFirstRank && //we took opponent rook?
      this.castleFlags[oppCol].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
      this.castleFlags[oppCol][flagIdx] = V.size.y;
    }
  }

  undo(move) {
    this.epSquares.pop();
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    // Decrement movesCount except if the move is a sentry push
    if (!move.sentryPush) this.movesCount--;
    if (this.subTurn == 2) this.subTurn = 1;
    else {
      this.turn = V.GetOppCol(this.turn);
      if (move.sentryPush) this.subTurn = 2;
    }
    this.postUndo(move);

//    const stateFen = this.getFen();
//    if (stateFen != this.states[this.states.length-1]) debugger;
//    this.states.pop();
  }

  postUndo(move) {
    super.postUndo(move);
    this.sentryPush.pop();
  }

  isAttacked(sq, colors) {
    return (
      super.isAttacked(sq, colors) ||
      this.isAttackedByLancer(sq, colors) ||
      this.isAttackedBySentry(sq, colors)
    );
  }

  isAttackedBySlideNJump([x, y], colors, piece, steps, oneStep) {
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx += step[0];
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) === piece &&
        colors.includes(this.getColor(rx, ry)) &&
        !this.isImmobilized([rx, ry])
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByPawn([x, y], colors) {
    for (let c of colors) {
      const pawnShift = c == "w" ? 1 : -1;
      if (x + pawnShift >= 0 && x + pawnShift < V.size.x) {
        for (let i of [-1, 1]) {
          if (
            y + i >= 0 &&
            y + i < V.size.y &&
            this.getPiece(x + pawnShift, y + i) == V.PAWN &&
            this.getColor(x + pawnShift, y + i) == c &&
            !this.isImmobilized([x + pawnShift, y + i])
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isAttackedByLancer([x, y], colors) {
    for (let step of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
      // If in this direction there are only enemy pieces and empty squares,
      // and we meet a lancer: can he reach us?
      // NOTE: do not stop at first lancer, there might be several!
      let coord = { x: x + step[0], y: y + step[1] };
      let lancerPos = [];
      while (
        V.OnBoard(coord.x, coord.y) &&
        (
          this.board[coord.x][coord.y] == V.EMPTY ||
          colors.includes(this.getColor(coord.x, coord.y))
        )
      ) {
        if (
          this.getPiece(coord.x, coord.y) == V.LANCER &&
          !this.isImmobilized([coord.x, coord.y])
        ) {
          lancerPos.push({x: coord.x, y: coord.y});
        }
        coord.x += step[0];
        coord.y += step[1];
      }
      for (let xy of lancerPos) {
        const dir = V.LANCER_DIRS[this.board[xy.x][xy.y].charAt(1)];
        if (dir[0] == -step[0] && dir[1] == -step[1]) return true;
      }
    }
    return false;
  }

  // Helper to check sentries attacks:
  selfAttack([x1, y1], [x2, y2]) {
    const color = this.getColor(x1, y1);
    const sliderAttack = (allowedSteps, lancer) => {
      const deltaX = x2 - x1,
            absDeltaX = Math.abs(deltaX);
      const deltaY = y2 - y1,
            absDeltaY = Math.abs(deltaY);
      const step = [ deltaX / absDeltaX || 0, deltaY / absDeltaY || 0 ];
      if (
        // Check that the step is a priori valid:
        (absDeltaX != absDeltaY && deltaX != 0 && deltaY != 0) ||
        allowedSteps.every(st => st[0] != step[0] || st[1] != step[1])
      ) {
        return false;
      }
      let sq = [ x1 + step[0], y1 + step[1] ];
      while (sq[0] != x2 && sq[1] != y2) {
        if (
          // NOTE: no need to check OnBoard in this special case
          (!lancer && this.board[sq[0]][sq[1]] != V.EMPTY) ||
          (!!lancer && this.getColor(sq[0], sq[1]) != color)
        ) {
          return false;
        }
        sq[0] += step[0];
        sq[1] += step[1];
      }
      return true;
    };
    switch (this.getPiece(x1, y1)) {
      case V.PAWN: {
        // Pushed pawns move as enemy pawns
        const shift = (color == 'w' ? 1 : -1);
        return (x1 + shift == x2 && Math.abs(y1 - y2) == 1);
      }
      case V.KNIGHT: {
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        return (
          deltaX + deltaY == 3 &&
          [1, 2].includes(deltaX) &&
          [1, 2].includes(deltaY)
        );
      }
      case V.ROOK:
        return sliderAttack(V.steps[V.ROOK]);
      case V.BISHOP:
        return sliderAttack(V.steps[V.BISHOP]);
      case V.QUEEN:
        return sliderAttack(V.steps[V.ROOK].concat(V.steps[V.BISHOP]));
      case V.LANCER: {
        // Special case: as long as no enemy units stands in-between, it attacks
        // (if it points toward the king).
        const allowedStep = V.LANCER_DIRS[this.board[x1][y1].charAt(1)];
        return sliderAttack([allowedStep], "lancer");
      }
      // No sentries or jailer tests: they cannot self-capture
    }
    return false;
  }

  isAttackedBySentry([x, y], colors) {
    // Attacked by sentry means it can self-take our king.
    // Just check diagonals of enemy sentry(ies), and if it reaches
    // one of our pieces: can I self-take?
    const color = V.GetOppCol(colors[0]);
    let candidates = [];
    for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.getPiece(i,j) == V.SENTRY &&
          colors.includes(this.getColor(i,j)) &&
          !this.isImmobilized([i, j])
        ) {
          for (let step of V.steps[V.BISHOP]) {
            let sq = [ i + step[0], j + step[1] ];
            while (
              V.OnBoard(sq[0], sq[1]) &&
              this.board[sq[0]][sq[1]] == V.EMPTY
            ) {
              sq[0] += step[0];
              sq[1] += step[1];
            }
            if (
              V.OnBoard(sq[0], sq[1]) &&
              this.getColor(sq[0], sq[1]) == color
            ) {
              candidates.push([ sq[0], sq[1] ]);
            }
          }
        }
      }
    }
    for (let c of candidates)
      if (this.selfAttack(c, [x, y])) return true;
    return false;
  }

  // Jailer doesn't capture or give check

  static get VALUES() {
    return Object.assign(
      { l: 4.8, s: 2.8, j: 3.8 }, //Jeff K. estimations
      ChessRules.VALUES
    );
  }

  getComputerMove() {
    const maxeval = V.INFINITY;
    const color = this.turn;
    let moves1 = this.getAllValidMoves();

    if (moves1.length == 0)
      // TODO: this situation should not happen
      return null;

    const setEval = (move, next) => {
      const score = this.getCurrentScore();
      const curEval = move.eval;
      if (score != "*") {
        move.eval =
          score == "1/2"
            ? 0
            : (score == "1-0" ? 1 : -1) * maxeval;
      } else move.eval = this.evalPosition();
      if (
        // "next" is defined after sentry pushes
        !!next && (
          !curEval ||
          color == 'w' && move.eval > curEval ||
          color == 'b' && move.eval < curEval
        )
      ) {
        move.second = next;
      }
    };

    // Just search_depth == 1 (because of sentries. TODO: can do better...)
    moves1.forEach(m1 => {
      this.play(m1);
      if (this.subTurn == 1) setEval(m1);
      else {
        // Need to play every pushes and count:
        const moves2 = this.getAllValidMoves();
        moves2.forEach(m2 => {
          this.play(m2);
          setEval(m1, m2);
          this.undo(m2);
        });
      }
      this.undo(m1);
    });

    moves1.sort((a, b) => {
      return (color == "w" ? 1 : -1) * (b.eval - a.eval);
    });
    let candidates = [0];
    for (let j = 1; j < moves1.length && moves1[j].eval == moves1[0].eval; j++)
      candidates.push(j);
    const choice = moves1[candidates[randInt(candidates.length)]];
    return (!choice.second ? choice : [choice, choice.second]);
  }

  getNotation(move) {
    // Special case "king takes jailer" is a pass move
    if (move.appear.length == 0 && move.vanish.length == 0) return "pass";
    if (this.subTurn == 2) {
      // Do not consider appear[1] (sentry) for sentry pushes
      const simpleMove = {
        appear: [move.appear[0]],
        vanish: move.vanish,
        start: move.start,
        end: move.end
      };
      return super.getNotation(simpleMove);
    }
    return super.getNotation(move);
  }
};
