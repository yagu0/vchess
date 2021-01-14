import { ChessRules, PiPo, Move } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class PacosakoRules extends ChessRules {

  static get IMAGE_EXTENSION() {
    return ".png";
  }

  // Unions (left = white if upperCase, black otherwise)
  static get UNIONS() {
    return {
      a: ['p', 'p'],
      c: ['p', 'r'],
      d: ['p', 'n'],
      e: ['p', 'b'],
      f: ['p', 'q'],
      g: ['p', 'k'],
      h: ['r', 'r'],
      i: ['r', 'n'],
      j: ['r', 'b'],
      l: ['r', 'q'],
      m: ['r', 'k'],
      o: ['n', 'n'],
      s: ['n', 'b'],
      t: ['n', 'q'],
      u: ['n', 'k'],
      v: ['b', 'b'],
      w: ['b', 'q'],
      x: ['b', 'k'],
      y: ['q', 'q'],
      z: ['q', 'k'],
      '_': ['k', 'k']
    };
  }

  static fen2board(f) {
    // Underscore is character 95, in file w_
    return f.charCodeAt() <= 95 ? "w" + f.toLowerCase() : "b" + f;
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kingSymb = ['k', 'g', 'm', 'u', 'x', 'z', '_'];
    let kings = { 'k': 0, 'K': 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (!!(row[i].toLowerCase().match(/[a-z_]/))) {
          sumElts++;
          if (kingSymb.includes(row[i])) kings['k']++;
          // Not "else if", if two kings dancing together
          if (kingSymb.some(s => row[i] == s.toUpperCase())) kings['K']++;
        }
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // Both kings should be on board. Exactly one per color.
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  getPpath(b) {
    return "Pacosako/" + b;
  }

  getPPpath(m) {
    if (ChessRules.PIECES.includes(m.appear[0].p)) return super.getPPpath(m);
    // For an union, show only relevant piece:
    // The color must be deduced from the move: reaching final rank of who?
    const color = (m.appear[0].x == 0 ? 'w' : 'b');
    const up = this.getUnionPieces(m.appear[0].c, m.appear[0].p);
    return "Pacosako/" + color + up[color];
  }

  canTake([x1, y1], [x2, y2]) {
    const p1 = this.board[x1][y1].charAt(1);
    if (!(ChessRules.PIECES.includes(p1))) return false;
    const p2 = this.board[x2][y2].charAt(1);
    if (!(ChessRules.PIECES.includes(p2))) return true;
    const c1 = this.board[x1][y1].charAt(0);
    const c2 = this.board[x2][y2].charAt(0);
    return (c1 != c2);
  }

  canIplay(side, [x, y]) {
    return (
      this.turn == side &&
      (
        !(ChessRules.PIECES.includes(this.board[x][y].charAt(1))) ||
        this.board[x][y].charAt(0) == side
      )
    );
  }

  scanKings(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    const startRow = { 'w': V.size.x - 1, 'b': 0 };
    const kingSymb = ['k', 'g', 'm', 'u', 'x', 'z', '_'];
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0;
      for (let j = 0; j < fenRows[i].length; j++) {
        const c = fenRows[i].charAt(j);
        if (!!(c.toLowerCase().match(/[a-z_]/))) {
          if (kingSymb.includes(c))
            this.kingPos["b"] = [i, k];
          // Not "else if", in case of two kings dancing together
          if (kingSymb.some(s => c == s.toUpperCase()))
            this.kingPos["w"] = [i, k];
        }
        else {
          const num = parseInt(fenRows[i].charAt(j), 10);
          if (!isNaN(num)) k += num - 1;
        }
        k++;
      }
    }
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Stack of "last move" only for intermediate chaining
    this.lastMoveEnd = [null];
    // Local stack of non-capturing union moves:
    this.umoves = [];
    const umove = V.ParseFen(fen).umove;
    if (umove == "-") this.umoves.push(null);
    else {
      this.umoves.push({
        start: ChessRules.SquareToCoords(umove.substr(0, 2)),
        end: ChessRules.SquareToCoords(umove.substr(2))
      });
    }
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParts = fen.split(" ");
    if (fenParts.length != 6) return false;
    if (fenParts[5] != "-" && !fenParts[5].match(/^([a-h][1-8]){2}$/))
      return false;
    return true;
  }

  static IsGoodFlags(flags) {
    // 4 for castle + 16 for pawns
    return !!flags.match(/^[a-z]{4,4}[01]{16,16}$/);
  }

  setFlags(fenflags) {
    super.setFlags(fenflags); //castleFlags
    this.pawnFlags = {
      w: [...Array(8)], //pawns can move 2 squares?
      b: [...Array(8)]
    };
    const flags = fenflags.substr(4); //skip first 4 letters, for castle
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++)
        this.pawnFlags[c][i] = flags.charAt((c == "w" ? 0 : 8) + i) == "1";
    }
  }

  aggregateFlags() {
    return [this.castleFlags, this.pawnFlags];
  }

  disaggregateFlags(flags) {
    this.castleFlags = flags[0];
    this.pawnFlags = flags[1];
  }

  getUmove(move) {
    if (
      move.vanish.length == 1 &&
      !(ChessRules.PIECES.includes(move.appear[0].p)) &&
      move.appear[0].p == move.vanish[0].p //not a promotion
    ) {
      // An union moving
      return { start: move.start, end: move.end };
    }
    return null;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { umove: fenParts[5] }
    );
  }

  static GenRandInitFen(randomness) {
    // Add 16 pawns flags + empty umove:
    return ChessRules.GenRandInitFen(randomness)
      .slice(0, -2) + "1111111111111111 - -";
  }

  getFlagsFen() {
    let fen = super.getFlagsFen();
    // Add pawns flags
    for (let c of ["w", "b"])
      for (let i = 0; i < 8; i++) fen += (this.pawnFlags[c][i] ? "1" : "0");
    return fen;
  }

  getUmoveFen() {
    const L = this.umoves.length;
    return (
      !this.umoves[L - 1]
        ? "-"
        : ChessRules.CoordsToSquare(this.umoves[L - 1].start) +
          ChessRules.CoordsToSquare(this.umoves[L - 1].end)
    );
  }

  getFen() {
    return super.getFen() + " " + this.getUmoveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getUmoveFen();
  }

  getColor(i, j) {
    const p = this.board[i][j].charAt(1);
    if (ChessRules.PIECES.includes(p)) return super.getColor(i, j);
    return this.turn; //union: I can use it, so it's "my" color...
  }

  getPiece(i, j, color) {
    const p = this.board[i][j].charAt(1);
    if (ChessRules.PIECES.includes(p)) return p;
    const c = this.board[i][j].charAt(0);
    // NOTE: this.turn == HACK, but should work...
    color = color || this.turn;
    return V.UNIONS[p][c == color ? 0 : 1];
  }

  getUnionPieces(color, code) {
    const pieces = V.UNIONS[code];
    return {
      w: pieces[color == 'w' ? 0 : 1],
      b: pieces[color == 'b' ? 0 : 1]
    };
  }

  // p1: white piece, p2: black piece
  getUnionCode(p1, p2) {
    let uIdx = (
      Object.values(V.UNIONS).findIndex(v => v[0] == p1 && v[1] == p2)
    );
    const c = (uIdx >= 0 ? 'w' : 'b');
    if (uIdx == -1) {
      uIdx = (
        Object.values(V.UNIONS).findIndex(v => v[0] == p2 && v[1] == p1)
      );
    }
    return { c: c, p: Object.keys(V.UNIONS)[uIdx] };
  }

  getBasicMove([sx, sy], [ex, ey], tr) {
    const L = this.lastMoveEnd.length;
    const lm = this.lastMoveEnd[L-1];
    const piece = (!!lm ? lm.p : null);
    const initColor = (!!piece ? this.turn : this.board[sx][sy].charAt(0));
    const initPiece = (piece || this.board[sx][sy].charAt(1));
    const c = this.turn;
    const oppCol = V.GetOppCol(c);
    if (!!tr && !(ChessRules.PIECES.includes(initPiece))) {
      // Transformation computed without taking union into account
      const up = this.getUnionPieces(initColor, initPiece);
      let args = [tr.p, up[oppCol]];
      if (c == 'b') args = args.reverse();
      const cp = this.getUnionCode(args[0], args[1]);
      tr.c = cp.c;
      tr.p = cp.p;
    }
    // 4 cases : moving
    //  - union to free square (other cases are illegal: return null)
    //  - normal piece to free square,
    //                 to enemy normal piece, or
    //                 to union (releasing our piece)
    let mv = new Move({
      start: { x: sx, y: sy },
      end: { x: ex, y: ey },
      vanish: []
    });
    if (!piece) {
      mv.vanish = [
        new PiPo({
          x: sx,
          y: sy,
          c: initColor,
          p: initPiece
        })
      ];
    }
    // Treat free square cases first:
    if (this.board[ex][ey] == V.EMPTY) {
      mv.appear = [
        new PiPo({
          x: ex,
          y: ey,
          c: !!tr ? tr.c : initColor,
          p: !!tr ? tr.p : initPiece
        })
      ];
      return mv;
    }
    // Now the two cases with union / release:
    const destColor = this.board[ex][ey].charAt(0);
    const destPiece = this.board[ex][ey].charAt(1);
    mv.vanish.push(
      new PiPo({
        x: ex,
        y: ey,
        c: destColor,
        p: destPiece
      })
    );
    if (ChessRules.PIECES.includes(destPiece)) {
      // Normal piece: just create union
      let args = [!!tr ? tr.p : initPiece, destPiece];
      if (c == 'b') args = args.reverse();
      const cp = this.getUnionCode(args[0], args[1]);
      mv.appear = [
        new PiPo({
          x: ex,
          y: ey,
          c: cp.c,
          p: cp.p
        })
      ];
      return mv;
    }
    // Releasing a piece in an union: keep track of released piece
    const up = this.getUnionPieces(destColor, destPiece);
    let args = [!!tr ? tr.p : initPiece, up[oppCol]];
    if (c == 'b') args = args.reverse();
    const cp = this.getUnionCode(args[0], args[1]);
    mv.appear = [
      new PiPo({
        x: ex,
        y: ey,
        c: cp.c,
        p: cp.p
      })
    ];
    // In move.end, to be sent to the server
    mv.end.released = up[c];
    return mv;
  }

  getPotentialMovesFrom([x, y]) {
    const L = this.lastMoveEnd.length;
    const lm = this.lastMoveEnd[L-1];
    if (!!lm && (x != lm.x || y != lm.y)) return [];
    const piece = (!!lm ? lm.p : this.getPiece(x, y));
    if (!!lm) {
      var saveSquare = this.board[x][y];
      this.board[x][y] = this.turn + piece;
    }
    let baseMoves = [];
    const c = this.turn;
    switch (piece || this.getPiece(x, y)) {
      case V.PAWN: {
        const firstRank = (c == 'w' ? 7 : 0);
        baseMoves = this.getPotentialPawnMoves([x, y]).filter(m => {
          // Skip forbidden 2-squares jumps (except from first rank)
          // Also skip unions capturing en-passant (not allowed).
          return (
            (
              m.start.x == firstRank ||
              Math.abs(m.end.x - m.start.x) == 1 ||
              this.pawnFlags[c][m.start.y]
            )
            &&
            (
              this.board[x][y].charAt(1) == V.PAWN ||
              m.start.y == m.end.y
            )
          );
        });
        break;
      }
      case V.ROOK:
        baseMoves = this.getPotentialRookMoves([x, y]);
        break;
      case V.KNIGHT:
        baseMoves = this.getPotentialKnightMoves([x, y]);
        break;
      case V.BISHOP:
        baseMoves = this.getPotentialBishopMoves([x, y]);
        break;
      case V.QUEEN:
        baseMoves = this.getPotentialQueenMoves([x, y]);
        break;
      case V.KING:
        baseMoves = this.getPotentialKingMoves([x, y]);
        break;
    }
    // When a pawn in an union reaches final rank with a non-standard
    // promotion move: apply promotion anyway
    let moves = [];
    const oppCol = V.GetOppCol(c);
    const oppLastRank = (c == 'w' ? 7 : 0);
    baseMoves.forEach(m => {
      if (
        m.end.x == oppLastRank &&
        ['c', 'd', 'e', 'f', 'g'].includes(m.appear[0].p)
      ) {
        // Move to first rank, which is last rank for opponent's pawn.
        // => Show promotion choices.
        // Find our piece in union (not a pawn)
        const up = this.getUnionPieces(m.appear[0].c, m.appear[0].p);
        // merge with all potential promotion pieces + push (loop)
        for (let promotionPiece of [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]) {
          let args = [up[c], promotionPiece];
          if (c == 'b') args = args.reverse();
          const cp = this.getUnionCode(args[0], args[1]);
          let cpMove = JSON.parse(JSON.stringify(m));
          cpMove.appear[0].c = cp.c;
          cpMove.appear[0].p = cp.p;
          moves.push(cpMove);
        }
      }
      else {
        if (
          m.vanish.length > 0 &&
          m.vanish[0].p == V.PAWN &&
          m.start.y != m.end.y &&
          this.board[m.end.x][m.end.y] == V.EMPTY
        ) {
          if (!!lm)
            // No en-passant inside a chaining
            return;
          // Fix en-passant capture: union type, maybe released piece too
          const cs = [m.end.x + (c == 'w' ? 1 : -1), m.end.y];
          const code = this.board[cs[0]][cs[1]].charAt(1);
          if (code == V.PAWN) {
            // Simple en-passant capture (usual: just form union)
            m.appear[0].c = 'w';
            m.appear[0].p = 'a';
          }
          else {
            // An union pawn + something just moved two squares
            const color = this.board[cs[0]][cs[1]].charAt(0);
            const up = this.getUnionPieces(color, code);
            m.end.released = up[c];
            let args = [V.PAWN, up[oppCol]];
            if (c == 'b') args = args.reverse();
            const cp = this.getUnionCode(args[0], args[1]);
            m.appear[0].c = cp.c;
            m.appear[0].p = cp.p;
          }
        }
        moves.push(m);
      }
    });
    if (!!lm) this.board[x][y] = saveSquare;
    return moves;
  }

  getEpSquare(moveOrSquare) {
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
      this.getPiece(s.x, s.y, this.turn) == V.PAWN
    ) {
      return {
        x: (s.x + e.x) / 2,
        y: s.y
      };
    }
    return undefined;
  }

  // Does m2 un-do m1 ? (to disallow undoing union moves)
  oppositeMoves(m1, m2) {
    return (
      !!m1 &&
      !(ChessRules.PIECES.includes(m2.appear[0].p)) &&
      m2.vanish.length == 1 &&
      !m2.end.released &&
      m1.start.x == m2.end.x &&
      m1.end.x == m2.start.x &&
      m1.start.y == m2.end.y &&
      m1.end.y == m2.start.y
    );
  }

  getCastleMoves([x, y]) {
    const c = this.getColor(x, y);
    const oppCol = V.GetOppCol(c);
    let moves = [];
    const finalSquares = [ [2, 3], [6, 5] ];
    castlingCheck: for (let castleSide = 0; castleSide < 2; castleSide++) {
      if (this.castleFlags[c][castleSide] >= 8) continue;
      const rookPos = this.castleFlags[c][castleSide];
      const castlingColor = this.board[x][rookPos].charAt(0);
      const castlingPiece = this.board[x][rookPos].charAt(1);

      // Nothing on the path of the king ?
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      let i = y;
      let kingSquares = [y];
      do {
        if (
          (
            this.board[x][i] != V.EMPTY &&
            (this.getColor(x, i) != c || ![y, rookPos].includes(i))
          )
        ) {
          continue castlingCheck;
        }
        i += step;
        kingSquares.push(i);
      } while (i != finalSquares[castleSide][0]);
      // No checks on the path of the king ?
      if (this.isAttacked(kingSquares, oppCol)) continue castlingCheck;

      // Nothing on the path to the rook?
      step = castleSide == 0 ? -1 : 1;
      for (i = y + step; i != rookPos; i += step) {
        if (this.board[x][i] != V.EMPTY) continue castlingCheck;
      }

      // Nothing on final squares, except maybe king and castling rook?
      for (i = 0; i < 2; i++) {
        if (
          finalSquares[castleSide][i] != rookPos &&
          this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
          (
            finalSquares[castleSide][i] != y ||
            this.getColor(x, finalSquares[castleSide][i]) != c
          )
        ) {
          continue castlingCheck;
        }
      }

      moves.push(
        new Move({
          appear: [
            new PiPo({
              x: x,
              y: finalSquares[castleSide][0],
              p: V.KING,
              c: c
            }),
            new PiPo({
              x: x,
              y: finalSquares[castleSide][1],
              p: castlingPiece,
              c: castlingColor
            })
          ],
          vanish: [
            // King might be initially disguised (Titan...)
            new PiPo({ x: x, y: y, p: V.KING, c: c }),
            new PiPo({ x: x, y: rookPos, p: castlingPiece, c: castlingColor })
          ],
          end:
            Math.abs(y - rookPos) <= 2
              ? { x: x, y: rookPos }
              : { x: x, y: y + 2 * (castleSide == 0 ? -1 : 1) }
        })
      );
    }

    return moves;
  }

  getEnpassantCaptures(sq, shiftX) {
    // HACK: when artificially change turn, do not consider en-passant
    const mcMod2 = this.movesCount % 2;
    const c = this.turn;
    if ((c == 'w' && mcMod2 == 1) || (c == 'b' && mcMod2 == 0)) return [];
    return super.getEnpassantCaptures(sq, shiftX);
  }

  isAttacked_aux(files, color, positions, fromSquare, released) {
    // "positions" = array of FENs to detect infinite loops. Example:
    // r1q1k2r/p1Pb1ppp/5n2/1f1p4/AV5P/P1eDP3/3B1PP1/R3K1NR,
    // Bxd2 Bxc3 Bxb4 Bxc3 Bxb4 etc.
    const newPos = {
      fen: super.getBaseFen(),
      piece: released,
      from: fromSquare
    };
    if (
      positions.some(p => {
        return (
          p.piece == newPos.piece &&
          p.fen == newPos.fen &&
          p.from == newPos.from
        );
      })
    ) {
      // Start of an infinite loop: exit
      return false;
    }
    positions.push(newPos);
    const rank = (color == 'w' ? 0 : 7);
    const moves = this.getPotentialMovesFrom(fromSquare);
    if (moves.some(m => m.end.x == rank && files.includes(m.end.y)))
      // Found an attack!
      return true;
    for (let m of moves) {
      if (!!m.end.released) {
        // Turn won't change since !!m.released
        this.play(m);
        const res = this.isAttacked_aux(
          files, color, positions, [m.end.x, m.end.y], m.end.released);
        this.undo(m);
        if (res) return true;
      }
    }
    return false;
  }

  isAttacked(files, color) {
    const rank = (color == 'w' ? 0 : 7);
    // Since it's too difficult (impossible?) to search from the square itself,
    // let's adopt a suboptimal but working strategy: find all attacks.
    const c = this.turn;
    // Artificial turn change is required:
    this.turn = color;
    let res = false;
    outerLoop: for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        // Attacks must start from a normal piece, not an union.
        // Therefore, the following test is correct.
        if (
          this.board[i][j] != V.EMPTY &&
          // Do not start with king (irrelevant, and lead to infinite calls)
          [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN].includes(
            this.board[i][j].charAt(1)) &&
          this.board[i][j].charAt(0) == color
        ) {
          // Try from here.
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.some(m => m.end.x == rank && files.includes(m.end.y))) {
            res = true;
            break outerLoop;
          }
          for (let m of moves) {
            if (!!m.end.released) {
              // Turn won't change since !!m.released
              this.play(m);
              let positions = [];
              res = this.isAttacked_aux(
                files, color, positions, [m.end.x, m.end.y], m.end.released);
              this.undo(m);
              if (res) break outerLoop;
            }
          }
        }
      }
    }
    this.turn = c;
    return res;
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
        this.board[rx][ry] != V.EMPTY &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color &&
        this.canTake([rx, ry], [x, y]) //TODO: necessary line?
                                       //If not, generic method is OK
      ) {
        return true;
      }
    }
    return false;
  }

  // Do not consider checks, except to forbid castling
  getCheckSquares() {
    return [];
  }
  filterValid(moves) {
    if (moves.length == 0) return [];
    const L = this.umoves.length; //at least 1: init from FEN
    return moves.filter(m => !this.oppositeMoves(this.umoves[L - 1], m));
  }

  updateCastleFlags(move, piece) {
    const c = this.turn;
    const firstRank = (c == "w" ? 7 : 0);
    if (piece == V.KING && move.appear.length > 0)
      this.castleFlags[c] = [V.size.y, V.size.y];
    else if (
      move.start.x == firstRank &&
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
    else if (
      move.end.x == firstRank &&
      this.castleFlags[c].includes(move.end.y)
    ) {
      // Move to our rook: necessary normal piece, to union, releasing
      // (or the rook was moved before!)
      const flagIdx = (move.end.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
  }

  prePlay(move) {
    // Easier before move is played in this case (flags are saved)
    const c = this.turn;
    const L = this.lastMoveEnd.length;
    const lm = this.lastMoveEnd[L-1];
    // NOTE: lm.p != V.KING, always.
    const piece =
      !!lm
        ? lm.p :
        this.getPiece(move.vanish[0].x, move.vanish[0].y);
    if (piece == V.KING)
      this.kingPos[c] = [move.appear[0].x, move.appear[0].y];
    this.updateCastleFlags(move, piece);
    const pawnFirstRank = (c == 'w' ? 6 : 1);
    if (
      move.start.x == pawnFirstRank &&
      piece == V.PAWN &&
      Math.abs(move.end.x - move.start.x) == 2
    ) {
      // This move turns off a 2-squares pawn flag
      this.pawnFlags[c][move.start.y] = false;
    }
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    this.prePlay(move);
    this.epSquares.push(this.getEpSquare(move));
    // Check if the move is the last of the turn: all cases except releases
    if (!move.end.released) {
      // No more union releases available
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
      this.lastMoveEnd.push(null);
    }
    else {
      this.lastMoveEnd.push({
        p: move.end.released,
        x: move.end.x,
        y: move.end.y
      });
    }
    V.PlayOnBoard(this.board, move);
    this.umoves.push(this.getUmove(move));
  }

  undo(move) {
    this.epSquares.pop();
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    this.lastMoveEnd.pop();
    if (!move.end.released) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
    this.umoves.pop();
    this.postUndo(move);
  }

  postUndo(move) {
    if (this.getPiece(move.start.x, move.start.y) == V.KING)
      this.kingPos[this.turn] = [move.start.x, move.start.y];
  }

  getCurrentScore() {
    // Check kings: if one is dancing, the side lost
    // But, if both dancing, let's say it's a draw :-)
    const [kpW, kpB] = [this.kingPos['w'], this.kingPos['b']];
    const atKingPlace = [
      this.board[kpW[0]][kpW[1]].charAt(1),
      this.board[kpB[0]][kpB[1]].charAt(1)
    ];
    if (!atKingPlace.includes('k')) return "1/2";
    if (atKingPlace[0] != 'k') return "0-1";
    if (atKingPlace[1] != 'k') return "1-0";
    return "*";
  }

  getComputerMove() {
    let initMoves = this.getAllValidMoves();
    if (initMoves.length == 0) return null;
    // Loop until valid move is found (no blocked pawn released...)
    while (true) {
      let moves = JSON.parse(JSON.stringify(initMoves));
      let mvArray = [];
      let mv = null;
      // Just play random moves (for now at least. TODO?)
      while (moves.length > 0) {
        mv = moves[randInt(moves.length)];
        mvArray.push(mv);
        this.play(mv);
        if (!!mv.end.released)
          // A piece was just released from an union
          moves = this.getPotentialMovesFrom([mv.end.x, mv.end.y]);
        else break;
      }
      for (let i = mvArray.length - 1; i >= 0; i--) this.undo(mvArray[i]);
      if (!mv.end.released) return (mvArray.length > 1 ? mvArray : mvArray[0]);
    }
  }

  // NOTE: evalPosition() is wrong, but unused since bot plays at random

  getNotation(move) {
    if (move.appear.length == 2 && move.appear[0].p == V.KING)
      return (move.end.y < move.start.y ? "0-0-0" : "0-0");

    const c = this.turn;
    const L = this.lastMoveEnd.length;
    const lm = this.lastMoveEnd[L-1];
    let piece = null;
    if (!lm && move.vanish.length == 0)
      // When importing a game, the info move.released is lost
      piece = move.appear[0].p;
    else piece = (!!lm ? lm.p : move.vanish[0].p);
    if (!(ChessRules.PIECES.includes(piece))) {
      // Decode (moving) union
      const up = this.getUnionPieces(
        move.vanish.length > 0 ? move.vanish[0].c : move.appear[0].c, piece);
      piece = up[c]
    }

    // Basic move notation:
    let notation = piece.toUpperCase();
    if (
      this.board[move.end.x][move.end.y] != V.EMPTY ||
      (piece == V.PAWN && move.start.y != move.end.y)
    ) {
      notation += "x";
    }
    const finalSquare = V.CoordsToSquare(move.end);
    notation += finalSquare;

    // Add potential promotion indications:
    const firstLastRank = (c == 'w' ? [7, 0] : [0, 7]);
    if (move.end.x == firstLastRank[1] && piece == V.PAWN) {
      const up = this.getUnionPieces(move.appear[0].c, move.appear[0].p);
      notation += "=" + up[c].toUpperCase();
    }
    else if (
      move.end.x == firstLastRank[0] &&
      move.vanish.length > 0 &&
      ['c', 'd', 'e', 'f', 'g'].includes(move.vanish[0].p)
    ) {
      // We promoted an opponent's pawn
      const oppCol = V.GetOppCol(c);
      const up = this.getUnionPieces(move.appear[0].c, move.appear[0].p);
      notation += "=" + up[oppCol].toUpperCase();
    }

    return notation;
  }

};
