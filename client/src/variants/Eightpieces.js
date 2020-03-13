import { ArrayFun } from "@/utils/array";
import { randInt, shuffle } from "@/utils/alea";
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

  static get PIECES() {
    return ChessRules.PIECES.concat([V.JAILER, V.SENTRY, V.LANCER]);
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

  getPiece(i, j) {
    const piece = this.board[i][j].charAt(1);
    // Special lancer case: 8 possible orientations
    if (Object.keys(V.LANCER_DIRS).includes(piece)) return V.LANCER;
    return piece;
  }

  getPpath(b) {
    if ([V.JAILER, V.SENTRY].concat(Object.keys(V.LANCER_DIRS)).includes(b[1]))
      return "Eightpieces/" + b;
    return b;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(ChessRules.ParseFen(fen), {
      sentrypush: fenParts[5]
    });
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
    // Pushing sentry position, updated after each push (subTurn == 1)
    this.sentryPos = { x: -1, y: -1 };
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
      return "jsfqkbnr/pppppppp/8/8/8/8/PPPPPPPP/JSDQKBNR w 0 1111 - -";

    let pieces = { w: new Array(8), b: new Array(8) };
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
      " w 0 1111 - -"
    );
  }

  // Scan kings, rooks and jailers
  scanKingsRooks(fen) {
    this.INIT_COL_KING = { w: -1, b: -1 };
    this.INIT_COL_ROOK = { w: -1, b: -1 };
    this.INIT_COL_JAILER = { w: -1, b: -1 };
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    const startRow = { 'w': V.size.x - 1, 'b': 0 };
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0;
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "k":
            this.kingPos["b"] = [i, k];
            this.INIT_COL_KING["b"] = k;
            break;
          case "K":
            this.kingPos["w"] = [i, k];
            this.INIT_COL_KING["w"] = k;
            break;
          case "r":
            if (i == startRow['b'] && this.INIT_COL_ROOK["b"] < 0)
              this.INIT_COL_ROOK["b"] = k;
            break;
          case "R":
            if (i == startRow['w'] && this.INIT_COL_ROOK["w"] < 0)
              this.INIT_COL_ROOK["w"] = k;
            break;
          case "j":
            if (i == startRow['b'] && this.INIT_COL_JAILER["b"] < 0)
              this.INIT_COL_JAILER["b"] = k;
            break;
          case "J":
            if (i == startRow['w'] && this.INIT_COL_JAILER["w"] < 0)
              this.INIT_COL_JAILER["w"] = k;
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
          p: tr ? tr.p : this.board[sx][sy][1]
        })
      ],
      vanish: [
        new PiPo({
          x: sx,
          y: sy,
          c: this.getColor(sx, sy),
          p: this.board[sx][sy][1]
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
          p: this.board[ex][ey][1]
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

  getPotentialMovesFrom([x,y]) {
    // At subTurn == 2, jailers aren't effective (Jeff K)
    if (this.subTurn == 1 && !!this.isImmobilized([x, y])) return [];
    if (this.subTurn == 2) {
      // Temporarily change pushed piece color.
      // (Not using getPiece() because of lancers)
      var oppCol = this.getColor(x, y);
      var color = V.GetOppCol(oppCol);
      var saveXYstate = this.board[x][y];
      this.board[x][y] = color + this.board[x][y][1];
    }
    let moves = [];
    switch (this.getPiece(x, y)) {
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
    const L = this.sentryPush.length;
    if (!!this.sentryPush[L-1]) {
      // Delete moves walking back on sentry push path
      moves = moves.filter(m => {
        if (
          m.vanish[0].p != V.PAWN &&
          this.sentryPush[L-1].some(sq => sq.x == m.end.x && sq.y == m.end.y)
        ) {
          return false;
        }
        return true;
      });
    }
    if (this.subTurn == 2) {
      // Don't forget to re-add the sentry on the board:
      // Also fix color of pushed piece afterward:
      moves.forEach(m => {
        m.appear.push({x: x, y: y, p: V.SENTRY, c: color});
        m.appear[0].c = oppCol;
        m.vanish[0].c = oppCol;
      });
    }
    return moves;
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.getColor(x, y);
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;

    const finalPieces =
      x + shiftX == lastRank
        ?
          Object.keys(V.LANCER_DIRS).concat(
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
        x == startRank &&
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

    // En passant:
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    if (
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

  // Obtain all lancer moves in "step" direction,
  // without final re-orientation.
  getPotentialLancerMoves_aux([x, y], step) {
    let moves = [];
    // Add all moves to vacant squares until opponent is met:
    const oppCol = V.GetOppCol(this.getColor(x, y));
    let sq = [x + step[0], y + step[1]];
    while (V.OnBoard(sq[0], sq[1]) && this.getColor(sq[0], sq[1]) != oppCol) {
      if (this.board[sq[0]][sq[1]] == V.EMPTY)
        moves.push(this.getBasicMove([x, y], sq));
      sq[0] += step[0];
      sq[1] += step[1];
    }
    if (V.OnBoard(sq[0], sq[1]))
      // Add capturing move
      moves.push(this.getBasicMove([x, y], sq));
    return moves;
  }

  getPotentialLancerMoves([x, y]) {
    let moves = [];
    // Add all lancer possible orientations, similar to pawn promotions.
    // Except if just after a push: allow all movements from init square then
    const L = this.sentryPush.length;
    if (!!this.sentryPush[L-1]) {
      // Maybe I was pushed
      const pl = this.sentryPush[L-1].length;
      if (
        this.sentryPush[L-1][pl-1].x == x &&
        this.sentryPush[L-1][pl-1].y == y
      ) {
        // I was pushed: allow all directions (for this move only), but
        // do not change direction after moving.
        Object.values(V.LANCER_DIRS).forEach(step => {
          Array.prototype.push.apply(
            moves,
            this.getPotentialLancerMoves_aux([x, y], step)
          );
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
    } else return monodirMoves;
  }

  getPotentialSentryMoves([x, y]) {
    // The sentry moves a priori like a bishop:
    let moves = super.getPotentialBishopMoves([x, y]);
    // ...but captures are replaced by special move, if and only if
    // "captured" piece can move now, considered as the capturer unit.
    moves.forEach(m => {
      if (m.vanish.length == 2) {
        // Temporarily cancel the sentry capture:
        m.appear.pop();
        m.vanish.pop();
      }
    });
    // Can the pushed unit make any move? ...resulting in a non-self-check?
    const color = this.getColor(x, y);
    const fMoves = moves.filter(m => {
      // Sentry push?
      if (m.appear.length == 0) {
        let res = false;
        this.play(m);
        let moves2 = this.filterValid(
          this.getPotentialMovesFrom([m.end.x, m.end.y]));
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

  getPotentialKingMoves([x, y]) {
    let moves = super.getPotentialKingMoves([x, y]);
    // Augment with pass move is the king is immobilized:
    const jsq = this.isImmobilized([x, y]);
    if (!!jsq) {
      moves.push(
        new Move({
          appear: [],
          vanish: [],
          start: { x: x, y: y },
          end: { x: jsq[0], y: jsq[1] }
        })
      );
    }
    return moves;
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
      if (!this.castleFlags[c][castleSide]) continue;
      // Rook (or jailer) and king are on initial position

      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      i = y;
      do {
        if (
          this.isAttacked([x, i], [oppCol]) ||
          (this.board[x][i] != V.EMPTY &&
            (this.getColor(x, i) != c ||
              ![V.KING, V.ROOK].includes(this.getPiece(x, i))))
        ) {
          continue castlingCheck;
        }
        i += step;
      } while (i != finalSquares[castleSide][0]);

      step = castleSide == 0 ? -1 : 1;
      const rookOrJailerPos =
        castleSide == 0
          ? Math.min(this.INIT_COL_ROOK[c], this.INIT_COL_JAILER[c])
          : Math.max(this.INIT_COL_ROOK[c], this.INIT_COL_JAILER[c]);
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

  filterValid(moves) {
    // Disable check tests for sentry pushes,
    // because in this case the move isn't finished
    let movesWithoutSentryPushes = [];
    let movesWithSentryPushes = [];
    moves.forEach(m => {
      if (m.appear.length > 0) movesWithoutSentryPushes.push(m);
      else movesWithSentryPushes.push(m);
    });
    const filteredMoves = super.filterValid(movesWithoutSentryPushes)
    // If at least one full move made, everything is allowed:
    if (this.movesCount >= 2)
      return filteredMoves.concat(movesWithSentryPushes);
    // Else, forbid check and captures:
    const oppCol = V.GetOppCol(this.turn);
    return filteredMoves.filter(m => {
      if (m.vanish.length == 2 && m.appear.length == 1) return false;
      this.play(m);
      const res = !this.underCheck(oppCol);
      this.undo(m);
      return res;
    }).concat(movesWithSentryPushes);
  }

  getAllValidMoves() {
    if (this.subTurn == 1) return super.getAllValidMoves();
    // Sentry push:
    const sentrySq = [this.sentryPos.x, this.SentryPos.y];
    return this.filterValid(this.getPotentialMovesFrom(sentrySq));
  }

  updateVariables(move) {
    const c = this.turn;
    const piece = move.vanish[0].p;
    const firstRank = c == "w" ? V.size.x - 1 : 0;

    // Update king position + flags
    if (piece == V.KING) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
      this.castleFlags[c] = [false, false];
      return;
    }

    // Update castling flags if rook or jailer moved (or is captured)
    const oppCol = V.GetOppCol(c);
    const oppFirstRank = V.size.x - 1 - firstRank;
    let flagIdx = 0;
    if (
      // Our rook moves?
      move.start.x == firstRank &&
      this.INIT_COL_ROOK[c] == move.start.y
    ) {
      if (this.INIT_COL_ROOK[c] > this.INIT_COL_JAILER[c]) flagIdx++;
      this.castleFlags[c][flagIdx] = false;
    } else if (
      // Our jailer moves?
      move.start.x == firstRank &&
      this.INIT_COL_JAILER[c] == move.start.y
    ) {
      if (this.INIT_COL_JAILER[c] > this.INIT_COL_ROOK[c]) flagIdx++;
      this.castleFlags[c][flagIdx] = false;
    } else if (
      // We took opponent's rook?
      move.end.x == oppFirstRank &&
      this.INIT_COL_ROOK[oppCol] == move.end.y
    ) {
      if (this.INIT_COL_ROOK[oppCol] > this.INIT_COL_JAILER[oppCol]) flagIdx++;
      this.castleFlags[oppCol][flagIdx] = false;
    } else if (
      // We took opponent's jailer?
      move.end.x == oppFirstRank &&
      this.INIT_COL_JAILER[oppCol] == move.end.y
    ) {
      if (this.INIT_COL_JAILER[oppCol] > this.INIT_COL_ROOK[oppCol]) flagIdx++;
      this.castleFlags[oppCol][flagIdx] = false;
    }

    if (move.appear.length == 0 && move.vanish.length == 1) {
      // The sentry is about to push a piece:
      this.sentryPos = { x: move.end.x, y: move.end.y };
    } else if (this.subTurn == 2) {
      // A piece is pushed: forbid array of squares between start and end
      // of move, included (except if it's a pawn)
      let squares = [];
      if (move.vanish[0].p != V.PAWN) {
        if ([V.KNIGHT,V.KING].includes(move.vanish[0].p))
          // short-range pieces: just forbid initial square
          squares.push(move.start);
        else {
          const deltaX = move.end.x - move.start.x;
          const deltaY = move.end.y - move.start.y;
          const step = [
            deltaX / Math.abs(deltaX) || 0,
            deltaY / Math.abs(deltaY) || 0
          ];
          for (
            let sq = {x: move.start.x, y: move.start.y};
            sq.x != move.end.x && sq.y != move.end.y;
            sq.x += step[0], sq.y += step[1]
          ) {
            squares.push(sq);
          }
        }
        // Add end square as well, to know if I was pushed (useful for lancers)
        squares.push(move.end);
      }
      this.sentryPush.push(squares);
    } else this.sentryPush.push(null);
  }

  // TODO: cleaner (global) update/unupdate variables logic, rename...
  unupdateVariables(move) {
    super.unupdateVariables(move);
    this.sentryPush.pop();
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    if (this.subTurn == 1) this.movesCount++;
    if (move.appear.length == 0 && move.vanish.length == 1)
      this.subTurn = 2;
    else {
      // Turn changes only if not a sentry "pre-push"
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
    }
    this.updateVariables(move);
    const L = this.sentryPush.length;
    // Is it a sentry push? (useful for undo)
    move.sentryPush = !!this.sentryPush[L-1];
  }

  undo(move) {
    this.epSquares.pop();
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    const L = this.sentryPush.length;
    // Decrement movesCount except if the move is a sentry push
    if (!move.sentryPush) this.movesCount--;
    // Turn changes only if not undoing second part of a sentry push
    if (!move.sentryPush || this.subTurn == 1)
      this.turn = V.GetOppCol(this.turn);
    this.unupdateVariables(move);
  }

  static get VALUES() {
    return Object.assign(
      { l: 4.8, s: 2.8, j: 3.8 }, //Jeff K. estimations
      ChessRules.VALUES
    );
  }

  getNotation(move) {
    // Special case "king takes jailer" is a pass move
    if (move.appear.length == 0 && move.vanish.length == 0) return "pass";
    return super.getNotation(move);
  }
};
