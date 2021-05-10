import { randInt } from "@/utils/alea";
import { ChessRules, PiPo, Move } from "@/base_rules";

export class EightpiecesRules extends ChessRules {

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

  getPPpath(m, orientation) {
    return (
      this.getPpath(
        m.appear[0].c + m.appear[0].p,
        null,
        null,
        orientation
      )
    );
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
      !fenParsed.sentrypush.match(/^([a-h][1-8]){2,2}$/)
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
    const spL = this.sentryPush[L-1].length;
    // Condensate path: just need initial and final squares:
    return [0, spL - 1]
      .map(i => V.CoordsToSquare(this.sentryPush[L-1][i]))
      .join("");
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
      // Expand init + dest squares into a full path:
      const init = V.SquareToCoords(parsedFen.sentrypush.substr(0, 2)),
            dest = V.SquareToCoords(parsedFen.sentrypush.substr(2));
      let newPath = [init];
      const delta = ['x', 'y'].map(i => Math.abs(dest[i] - init[i]));
      // Check that it's not a knight movement:
      if (delta[0] == 0 || delta[1] == 0 || delta[0] == delta[1]) {
        const step = ['x', 'y'].map((i, idx) => {
          return (dest[i] - init[i]) / delta[idx] || 0
        });
        let x = init.x + step[0],
            y = init.y + step[1];
        while (x != dest.x || y != dest.y) {
          newPath.push({ x: x, y: y });
          x += step[0];
          y += step[1];
        }
      }
      newPath.push(dest);
      this.sentryPush = [newPath];
    }
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0)
      return "jfsqkbnr/pppppppp/8/8/8/8/PPPPPPPP/JDSQKBNR w 0 ahah - -";

    const baseFen = ChessRules.GenRandInitFen(options);
    const fenParts = baseFen.split(' ');
    const posParts = fenParts[0].split('/');

    // Replace one bishop by sentry, so that sentries on different colors
    // Also replace one random rook by jailer,
    // and one random knight by lancer (facing north/south)

    // "replaced" array contains -2 initially, then either -1 if skipped,
    // or (eventually) the index of replacement:
    let newPos = { 0: "", 7: "" };
    let sentryOddity = -1;
    let replaced = {};
    if (options.randomness == 1) replaced = { 'b': -2, 'n': -2, 'r': -2 };
    for (let rank of [0, 7]) {
      if (options.randomness == 2) replaced = { 'b': -2, 'n': -2, 'r': -2 };
      for (let i = 0; i < 8; i++) {
        const curChar = posParts[rank].charAt(i).toLowerCase();
        if (['b', 'n', 'r'].includes(curChar)) {
          if (
            replaced[curChar] == -1 ||
            (curChar == 'b' && rank == 7 && i % 2 == sentryOddity) ||
            (
              (curChar != 'b' || rank == 0) &&
              replaced[curChar] == -2 &&
              randInt(2) == 0
            )
          ) {
            replaced[curChar] = i;
            if (curChar == 'b') {
              if (sentryOddity < 0) sentryOddity = i % 2;
              newPos[rank] += 's';
            }
            else if (curChar == 'r') newPos[rank] += 'j';
            else
              // Lancer: orientation depends on side
              newPos[rank] += (rank == 0 ? 'g' : 'c');
          }
          else {
            if (replaced[curChar] == -2) replaced[curChar]++;
            newPos[rank] += curChar;
          }
        }
        else newPos[rank] += curChar;
      }
    }

    return (
      newPos[0] + "/" + posParts.slice(1, 7).join('/') + "/" +
      newPos[7].toUpperCase() + " " + fenParts.slice(1, 5).join(' ') + " -"
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

  canIplay(side, [x, y]) {
    return (
      (this.subTurn == 1 && this.turn == side && this.getColor(x, y) == side)
      ||
      (this.subTurn == 2 && x == this.sentryPos.x && y == this.sentryPos.y)
    );
  }

  getPotentialMovesFrom([x, y]) {
    const piece = this.getPiece(x, y);
    const L = this.sentryPush.length;
    // At subTurn == 2, jailers aren't effective (Jeff K)
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
    }
    else if (this.subTurn == 2) {
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

    // A push cannot put a pawn on last rank (it goes backward)
    let finalPieces = [V.PAWN];
    if (x + shiftX == lastRank) {
      // Only allow direction facing inside board:
      const allowedLancerDirs =
        lastRank == 0
          ? ['e', 'f', 'g', 'h', 'm']
          : ['c', 'd', 'e', 'm', 'o'];
      finalPieces =
        allowedLancerDirs
        .concat([V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.SENTRY, V.JAILER]);
    }
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

  doClick(square) {
    if (isNaN(square[0])) return null;
    const L = this.sentryPush.length;
    const [x, y] = [square[0], square[1]];
    const color = this.turn;
    if (
      this.subTurn == 2 ||
      this.board[x][y] == V.EMPTY ||
      this.getPiece(x, y) != V.LANCER ||
      this.getColor(x, y) != color ||
      !!this.sentryPush[L-1]
    ) {
      return null;
    }
    // Stuck lancer?
    const orientation = this.board[x][y][1];
    const step = V.LANCER_DIRS[orientation];
    if (!V.OnBoard(x + step[0], y + step[1])) {
      let choices = [];
      Object.keys(V.LANCER_DIRS).forEach(k => {
        const dir = V.LANCER_DIRS[k];
        if (
          (dir[0] != step[0] || dir[1] != step[1]) &&
          V.OnBoard(x + dir[0], y + dir[1])
        ) {
          choices.push(
            new Move({
              vanish: [
                new PiPo({
                  x: x,
                  y: y,
                  c: color,
                  p: orientation
                })
              ],
              appear: [
                new PiPo({
                  x: x,
                  y: y,
                  c: color,
                  p: k
                })
              ],
              start: { x: x, y : y },
              end: { x: -1, y: -1 }
            })
          );
        }
      });
      return choices;
    }
    return null;
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
    const dirCode = this.board[x][y][1];
    const curDir = V.LANCER_DIRS[dirCode];
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
        // Also allow simple reorientation ("capturing king"):
        if (!V.OnBoard(x + curDir[0], y + curDir[1])) {
          const kp = this.kingPos[color];
          let reorientMoves = [];
          Object.keys(V.LANCER_DIRS).forEach(k => {
            const dir = V.LANCER_DIRS[k];
            if (
              (dir[0] != curDir[0] || dir[1] != curDir[1]) &&
              V.OnBoard(x + dir[0], y + dir[1])
            ) {
              reorientMoves.push(
                new Move({
                  vanish: [
                    new PiPo({
                      x: x,
                      y: y,
                      c: color,
                      p: dirCode
                    })
                  ],
                  appear: [
                    new PiPo({
                      x: x,
                      y: y,
                      c: color,
                      p: k
                    })
                  ],
                  start: { x: x, y : y },
                  end: { x: kp[0], y: kp[1] }
                })
              );
            }
          });
          Array.prototype.push.apply(moves, reorientMoves);
        }
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
                const newDir = V.LANCER_DIRS[k];
                // Prevent orientations toward outer board:
                if (V.OnBoard(m.end.x + newDir[0], m.end.y + newDir[1])) {
                  let mk = JSON.parse(JSON.stringify(m));
                  mk.appear[0].p = k;
                  chooseMoves.push(mk);
                }
              });
            });
            Array.prototype.push.apply(moves, chooseMoves);
          }
          else Array.prototype.push.apply(moves, dirMoves);
        });
        return moves;
      }
    }
    // I wasn't pushed: standard lancer move
    const monodirMoves =
      this.getPotentialLancerMoves_aux([x, y], V.LANCER_DIRS[dirCode]);
    // Add all possible orientations aftermove except if I'm being pushed
    if (this.subTurn == 1) {
      monodirMoves.forEach(m => {
        Object.keys(V.LANCER_DIRS).forEach(k => {
          const newDir = V.LANCER_DIRS[k];
          // Prevent orientations toward outer board:
          if (V.OnBoard(m.end.x + newDir[0], m.end.y + newDir[1])) {
            let mk = JSON.parse(JSON.stringify(m));
            mk.appear[0].p = k;
            moves.push(mk);
          }
        });
      });
      return moves;
    }
    else {
      // I'm pushed: add potential nudges, except for current orientation
      let potentialNudges = [];
      for (let step of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
        if (
          (step[0] != curDir[0] || step[1] != curDir[1]) &&
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
      sq, V.steps[V.ROOK].concat(V.steps[V.BISHOP]), 1);
    return (
      this.subTurn == 1
        ? moves.concat(this.getCastleMoves(sq))
        : moves
    );
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

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByLancer(sq, color) ||
      this.isAttackedBySentry(sq, color)
      // The jailer doesn't capture.
    );
  }

  isAttackedBySlideNJump([x, y], color, piece, steps, oneStep) {
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx += step[0];
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color &&
        !this.isImmobilized([rx, ry])
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByPawn([x, y], color) {
    const pawnShift = (color == "w" ? 1 : -1);
    if (x + pawnShift >= 0 && x + pawnShift < V.size.x) {
      for (let i of [-1, 1]) {
        if (
          y + i >= 0 &&
          y + i < V.size.y &&
          this.getPiece(x + pawnShift, y + i) == V.PAWN &&
          this.getColor(x + pawnShift, y + i) == color &&
          !this.isImmobilized([x + pawnShift, y + i])
        ) {
          return true;
        }
      }
    }
    return false;
  }

  isAttackedByLancer([x, y], color) {
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
          this.getColor(coord.x, coord.y) == color
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
      const L = this.sentryPush.length;
      const pl = (!!this.sentryPush[L-1] ? this.sentryPush[L-1].length : 0);
      for (let xy of lancerPos) {
        const dir = V.LANCER_DIRS[this.board[xy.x][xy.y].charAt(1)];
        if (
          (dir[0] == -step[0] && dir[1] == -step[1]) ||
          // If the lancer was just pushed, this is an attack too:
          (
            !!this.sentryPush[L-1] &&
            this.sentryPush[L-1][pl-1].x == xy.x &&
            this.sentryPush[L-1][pl-1].y == xy.y
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // Helper to check sentries attacks:
  selfAttack([x1, y1], [x2, y2]) {
    const color = this.getColor(x1, y1);
    const oppCol = V.GetOppCol(color);
    const sliderAttack = (allowedSteps, lancer) => {
      const deltaX = x2 - x1,
            deltaY = y2 - y1;
      const absDeltaX = Math.abs(deltaX),
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
      while (sq[0] != x2 || sq[1] != y2) {
        // NOTE: no need to check OnBoard in this special case
        if (this.board[sq[0]][sq[1]] != V.EMPTY) {
          const p = this.getPiece(sq[0], sq[1]);
          const pc = this.getColor(sq[0], sq[1]);
          if (
            // Enemy sentry on the way will be gone:
            (p != V.SENTRY || pc != oppCol) &&
            // Lancer temporarily "changed color":
            (!lancer || pc == color)
          ) {
            return false;
          }
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
        // Special case: as long as no enemy units stands in-between,
        // it attacks (if it points toward the king).
        const allowedStep = V.LANCER_DIRS[this.board[x1][y1].charAt(1)];
        return sliderAttack([allowedStep], "lancer");
      }
      // No sentries or jailer tests: they cannot self-capture
    }
    return false;
  }

  isAttackedBySentry([x, y], color) {
    // Attacked by sentry means it can self-take our king.
    // Just check diagonals of enemy sentry(ies), and if it reaches
    // one of our pieces: can I self-take?
    const myColor = V.GetOppCol(color);
    let candidates = [];
    for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.getPiece(i,j) == V.SENTRY &&
          this.getColor(i,j) == color &&
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
              this.getColor(sq[0], sq[1]) == myColor
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
  }

  postUndo(move) {
    super.postUndo(move);
    this.sentryPush.pop();
  }

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

  // For moves notation:
  static get LANCER_DIRNAMES() {
    return {
      'c': "N",
      'd': "NE",
      'e': "E",
      'f': "SE",
      'g': "S",
      'h': "SW",
      'm': "W",
      'o': "NW"
    };
  }

  getNotation(move) {
    // Special case "king takes jailer" is a pass move
    if (move.appear.length == 0 && move.vanish.length == 0) return "pass";
    let notation = undefined;
    if (this.subTurn == 2) {
      // Do not consider appear[1] (sentry) for sentry pushes
      const simpleMove = {
        appear: [move.appear[0]],
        vanish: move.vanish,
        start: move.start,
        end: move.end
      };
      notation = super.getNotation(simpleMove);
    }
    else if (
      move.appear.length > 0 &&
      move.vanish[0].x == move.appear[0].x &&
      move.vanish[0].y == move.appear[0].y
    ) {
      // Lancer in-place reorientation:
      notation = "L" + V.CoordsToSquare(move.start) + ":R";
    }
    else notation = super.getNotation(move);
    if (Object.keys(V.LANCER_DIRNAMES).includes(move.vanish[0].p))
      // Lancer: add direction info
      notation += "=" + V.LANCER_DIRNAMES[move.appear[0].p];
    else if (
      move.vanish[0].p == V.PAWN &&
      Object.keys(V.LANCER_DIRNAMES).includes(move.appear[0].p)
    ) {
      // Fix promotions in lancer:
      notation = notation.slice(0, -1) +
        "L:" + V.LANCER_DIRNAMES[move.appear[0].p];
    }
    return notation;
  }

};
