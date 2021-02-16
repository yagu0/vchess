import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class PandemoniumRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        threeSquares: true,
        promotions: [V.GILDING]
      }
    );
  }

  static get GILDING() {
    return "g";
  }

  static get SCEPTER() {
    return "s";
  }

  static get HORSE() {
    return "h";
  }

  static get DRAGON() {
    return "d";
  }

  static get CARDINAL() {
    return "c";
  }

  static get WHOLE() {
    return "w";
  }

  static get MARSHAL() {
    return "m";
  }

  static get APRICOT() {
    return "a";
  }

  static get PIECES() {
    return (
      ChessRules.PIECES.concat([
        V.GILDING, V.SCEPTER, V.HORSE, V.DRAGON,
        V.CARDINAL, V.WHOLE, V.MARSHAL, V.APRICOT])
    );
  }

  getPpath(b) {
    const prefix = (ChessRules.PIECES.includes(b[1]) ? "" : "Pandemonium/");
    return prefix + b;
  }

  static get size() {
    return { x: 10, y: 10};
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Sub-turn is useful only at first move...
    this.subTurn = 1;
    // Also init reserves (used by the interface to show landable pieces)
    const reserve =
      V.ParseFen(fen).reserve.split("").map(x => parseInt(x, 10));
    this.reserve = {
      w: {
        [V.PAWN]: reserve[0],
        [V.ROOK]: reserve[1],
        [V.KNIGHT]: reserve[2],
        [V.BISHOP]: reserve[3],
        [V.QUEEN]: reserve[4],
        [V.CARDINAL]: reserve[5],
        [V.MARSHAL]: reserve[6],
      },
      b: {
        [V.PAWN]: reserve[7],
        [V.ROOK]: reserve[8],
        [V.KNIGHT]: reserve[9],
        [V.BISHOP]: reserve[10],
        [V.QUEEN]: reserve[11],
        [V.CARDINAL]: reserve[12],
        [V.MARSHAL]: reserve[13]
      }
    };
  }

  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") {
      const squares = enpassant.split(",");
      if (squares.length > 2) return false;
      for (let sq of squares) {
        if (!sq.match(/[a-j0-9]/)) return false;
      }
    }
    return true;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // Check reserves
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{14,14}$/))
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

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    let counts = new Array(14);
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      counts[i] = this.reserve["w"][V.RESERVE_PIECES[i]];
      counts[7 + i] = this.reserve["b"][V.RESERVE_PIECES[i]];
    }
    return counts.join("");
  }

  setFlags(fenflags) {
    // white a-castle, h-castle, king pos, then same for black.
    this.castleFlags = { w: [-1, -1, -1], b: [-1, -1, -1] };
    for (let i = 0; i < 6; i++) {
      this.castleFlags[i < 3 ? "w" : "b"][i % 3] =
        V.ColumnToCoord(fenflags.charAt(i));
    }
  }

  static GenRandInitFen(randomness) {
    // No randomization here for now (but initial setup choice)
    return (
      "rnbqkmcbnr/pppppppppp/91/91/91/91/91/91/PPPPPPPPPP/RNBQKMCBNR " +
      "w 0 ajeaje - 00000000000000"
    );
    // TODO later: randomization too --> 2 bishops, not next to each other.
    // then knights next to bishops. Then other pieces (...).
  }

  getEnpassantFen() {
    const L = this.epSquares.length;
    if (!this.epSquares[L - 1]) return "-"; //no en-passant
    let res = "";
    this.epSquares[L - 1].forEach(sq => {
      res += V.CoordsToSquare(sq) + ",";
    });
    return res.slice(0, -1); //remove last comma
  }

  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined;
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      let res = [];
      square.split(",").forEach(sq => {
        res.push(V.SquareToCoords(sq));
      });
      return res;
    }
    // Argument is a move:
    const move = moveOrSquare;
    const [sx, sy, ex] = [move.start.x, move.start.y, move.end.x];
    if (this.getPiece(sx, sy) == V.PAWN && Math.abs(sx - ex) >= 2) {
      const step = (ex - sx) / Math.abs(ex - sx);
      let res = [{
        x: sx + step,
        y: sy
      }];
      if (sx + 2 * step != ex) {
        // 3-squares jump
        res.push({
          x: sx + 2 * step,
          y: sy
        });
      }
      return res;
    }
    return undefined; //default
  }

  getReservePpath(index, color) {
    const p = V.RESERVE_PIECES[index];
    const prefix = (ChessRules.PIECES.includes(p) ? "" : "Pandemonium/");
    return prefix + color + p;;
  }

  // Ordering on reserve pieces
  static get RESERVE_PIECES() {
    return (
      [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.CARDINAL, V.MARSHAL]
    );
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    const bounds = (p == V.PAWN ? [1, V.size.x - 1] : [0, V.size.x]);
    let moves = [];
    for (let i = bounds[0]; i < bounds[1]; i++) {
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
          if (p == V.PAWN) {
            // Do not drop on checkmate:
            this.play(mv);
            const res = (
              this.underCheck(oppCol) && !this.atLeastOneMove("noReserve")
            );
            this.undo(mv);
            if (res) continue;
          }
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  static get PromoteMap() {
    return {
      r: 'd',
      n: 's',
      b: 'h',
      c: 'w',
      m: 'a'
    };
  }

  getPotentialMovesFrom([x, y]) {
    const c = this.getColor(x, y);
    const oppCol = V.GetOppCol(c);
    if (this.movesCount <= 1) {
      if (this.kingPos[c][0] == x && this.kingPos[c][1] == y) {
        // Pass (if setup is ok)
        return [
          new Move({
            appear: [],
            vanish: [],
            start: { x: this.kingPos[c][0], y: this.kingPos[c][1] },
            end: { x: this.kingPos[oppCol][0], y: this.kingPos[oppCol][1] }
          })
        ];
      }
      const firstRank = (this.movesCount == 0 ? 9 : 0);
      // TODO: initDestFile currently hardcoded for deterministic setup
      const initDestFile = new Map([[1, 2], [8, 7]]);
      // Only option is knight --> bishop swap:
      if (
        x == firstRank &&
        !!initDestFile.get(y) &&
        this.getPiece(x, y) == V.KNIGHT
      ) {
        const destFile = initDestFile.get(y);
        return [
          new Move({
            appear: [
              new PiPo({
                x: x,
                y: destFile,
                c: c,
                p: V.KNIGHT
              }),
              new PiPo({
                x: x,
                y: y,
                c: c,
                p: V.BISHOP
              })
            ],
            vanish: [
              new PiPo({
                x: x,
                y: y,
                c: c,
                p: V.KNIGHT
              }),
              new PiPo({
                x: x,
                y: destFile,
                c: c,
                p: V.BISHOP
              })
            ],
            start: { x: x, y: y },
            end: { x: x, y: destFile }
          })
        ];
      }
      return [];
    }
    // Normal move (after initial setup)
    if (x >= V.size.x) return this.getReserveMoves(x, y);
    const p = this.getPiece(x, y);
    const sq = [x, y];
    let moves = [];
    if (ChessRules.PIECES.includes(p))
      moves = super.getPotentialMovesFrom(sq);
    if ([V.GILDING, V.APRICOT, V.WHOLE].includes(p))
      moves = super.getPotentialQueenMoves(sq);
    switch (p) {
      case V.SCEPTER:
        moves = this.getPotentialScepterMoves(sq);
        break;
      case V.HORSE:
        moves = this.getPotentialHorseMoves(sq);
        break;
      case V.DRAGON:
        moves = this.getPotentialDragonMoves(sq);
        break;
      case V.CARDINAL:
        moves = this.getPotentialCardinalMoves(sq);
        break;
      case V.MARSHAL:
        moves = this.getPotentialMarshalMoves(sq);
        break;
    }
    // Maybe apply promotions:
    if (Object.keys(V.PromoteMap).includes(p)) {
      const promoted = V.PromoteMap[p];
      const lastRank = (c == 'w' ? 0 : 9);
      let promotions = [];
      moves.forEach(m => {
        if (m.start.x == lastRank || m.end.x == lastRank) {
          let pMove = JSON.parse(JSON.stringify(m));
          pMove.appear[0].p = promoted;
          promotions.push(pMove);
        }
      });
      Array.prototype.push.apply(moves, promotions);
    }
    return moves;
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    const shiftX = V.PawnSpecs.directions[color];
    let moves = [];
    if (this.board[x + shiftX][y] == V.EMPTY) {
      this.addPawnMoves([x, y], [x + shiftX, y], moves);
      if ((color == 'w' && x >= V.size.x - 3) || (color == 'b' && x <= 3)) {
        if (this.board[x + 2 * shiftX][y] == V.EMPTY) {
          moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
          if (
            (
              (color == 'w' && x >= V.size.x - 2) ||
              (color == 'b' && x <= 2)
            )
            &&
            this.board[x + 3 * shiftX][y] == V.EMPTY
          ) {
            moves.push(this.getBasicMove([x, y], [x + 3 * shiftX, y]));
          }
        }
      }
    }
    for (let shiftY of [-1, 1]) {
      if (y + shiftY >= 0 && y + shiftY < V.size.y) {
        if (
          this.board[x + shiftX][y + shiftY] != V.EMPTY &&
          this.canTake([x, y], [x + shiftX, y + shiftY])
        ) {
          this.addPawnMoves([x, y], [x + shiftX, y + shiftY], moves);
        }
      }
    }
    Array.prototype.push.apply(
      moves,
      this.getEnpassantCaptures([x, y], shiftX)
    );
    return moves;
  }

  getPotentialMarshalMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
    );
  }

  getPotentialCardinalMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
    );
  }

  getPotentialScepterMoves(sq) {
    const steps =
      V.steps[V.KNIGHT].concat(V.steps[V.BISHOP]).concat(V.steps[V.ROOK]);
    return this.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  getPotentialHorseMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.ROOK], "oneStep"));
  }

  getPotentialDragonMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.BISHOP], "oneStep"));
  }

  getEnpassantCaptures([x, y], shiftX) {
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1];
    let moves = [];
    if (!!epSquare) {
      for (let epsq of epSquare) {
        // TODO: some redundant checks
        if (epsq.x == x + shiftX && Math.abs(epsq.y - y) == 1) {
          let enpassantMove = this.getBasicMove([x, y], [epsq.x, epsq.y]);
          // WARNING: the captured pawn may be diagonally behind us,
          // if it's a 3-squares jump and we take on 1st passing square
          const px = this.board[x][epsq.y] != V.EMPTY ? x : x - shiftX;
          enpassantMove.vanish.push({
            x: px,
            y: epsq.y,
            p: "p",
            c: this.getColor(px, epsq.y)
          });
          moves.push(enpassantMove);
        }
      }
    }
    return moves;
  }

  getPotentialKingMoves(sq) {
    // Initialize with normal moves
    let moves = this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
    const c = this.turn;
    if (
      this.castleFlags[c][0] < V.size.y ||
      this.castleFlags[c][1] < V.size.y
    ) {
      moves = moves.concat(this.getCastleMoves(sq));
    }
    return moves;
  }

  getCastleMoves([x, y]) {
    const c = this.getColor(x, y);
    if (
      ((c == 'w' && x == 9) || (c == 'b' && x == 0)) &&
      y == this.castleFlags[c][2]
    ) {
      const finalSquares = [
        [1, 2],
        [7, 6]
      ];
      return super.getCastleMoves([x, y], finalSquares, false, [V.ROOK]);
    }
    return [];
  }

  isAttacked(sq, color) {
    return (
      this.isAttackedByPawn(sq, color) ||
      this.isAttackedByRook(sq, color) ||
      this.isAttackedByKnight(sq, color) ||
      this.isAttackedByBishop(sq, color) ||
      this.isAttackedByKing(sq, color) ||
      this.isAttackedByQueens(sq, color) ||
      this.isAttackedByScepter(sq, color) ||
      this.isAttackedByDragon(sq, color) ||
      this.isAttackedByHorse(sq, color) ||
      this.isAttackedByMarshal(sq, color) ||
      this.isAttackedByCardinal(sq, color)
    );
  }

  isAttackedByQueens([x, y], color) {
    // pieces: because queen = gilding = whole = apricot
    const pieces = [V.QUEEN, V.GILDING, V.WHOLE, V.APRICOT];
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY) {
        rx += step[0];
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.board[rx][ry] != V.EMPTY &&
        pieces.includes(this.getPiece(rx, ry)) &&
        this.getColor(rx, ry) == color
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByScepter(sq, color) {
    const steps =
      V.steps[V.KNIGHT].concat(V.steps[V.ROOK]).concat(V.steps[V.BISHOP]);
    return (
      super.isAttackedBySlideNJump(sq, color, V.SCEPTER, steps, "oneStep")
    );
  }

  isAttackedByHorse(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.steps[V.BISHOP], V.HORSE) ||
      super.isAttackedBySlideNJump(
        sq, color, V.HORSE, V.steps[V.ROOK], "oneStep")
    );
  }

  isAttackedByDragon(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.steps[V.ROOK], V.DRAGON) ||
      super.isAttackedBySlideNJump(
        sq, color, V.DRAGON, V.steps[V.BISHOP], "oneStep")
    );
  }

  isAttackedByMarshal(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.MARSHAL, V.steps[V.ROOK]) ||
      super.isAttackedBySlideNJump(
        sq,
        color,
        V.MARSHAL,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  isAttackedByCardinal(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.CARDINAL, V.steps[V.BISHOP]) ||
      super.isAttackedBySlideNJump(
        sq,
        color,
        V.CARDINAL,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  getAllValidMoves() {
    let moves = super.getAllPotentialMoves();
    if (this.movesCount >= 2) {
      const color = this.turn;
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        moves = moves.concat(
          this.getReserveMoves([V.size.x + (color == "w" ? 0 : 1), i])
        );
      }
    }
    return this.filterValid(moves);
  }

  atLeastOneMove(noReserve) {
    if (!super.atLeastOneMove()) {
      if (!noReserve) {
        // Search one reserve move
        for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
          let moves = this.filterValid(
            this.getReserveMoves([V.size.x + (this.turn == "w" ? 0 : 1), i])
          );
          if (moves.length > 0) return true;
        }
      }
      return false;
    }
    return true;
  }

  // Reverse 'PromoteMap'
  static get P_CORRESPONDANCES() {
    return {
      d: 'r',
      s: 'n',
      h: 'b',
      w: 'c',
      a: 'm'
    };
  }

  static MayDecode(piece) {
    if (Object.keys(V.P_CORRESPONDANCES).includes(piece))
      return V.P_CORRESPONDANCES[piece];
    return piece;
  }

  play(move) {
    move.subTurn = this.subTurn; //much easier
    if (this.movesCount >= 2 || this.subTurn == 2 || move.vanish.length == 0) {
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
      this.movesCount++;
    }
    else this.subTurn = 2;
    move.flags = JSON.stringify(this.aggregateFlags());
    this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    this.postPlay(move);
  }

  updateCastleFlags(move, piece) {
    if (piece == V.KING && move.appear.length == 2) {
      // Castling (only move which disable flags)
      this.castleFlags[move.appear[0].c][0] = 10;
      this.castleFlags[move.appear[0].c][1] = 10;
    }
  }

  postPlay(move) {
    if (move.vanish.length == 0 && move.appear.length == 0) return;
    super.postPlay(move);
    const color = move.appear[0].c;
    if (move.vanish.length == 0)
      // Drop unpromoted piece:
      this.reserve[color][move.appear[0].p]--;
    else if (move.vanish.length == 2 && move.appear.length == 1)
      // May capture a promoted piece:
      this.reserve[color][V.MayDecode(move.vanish[1].p)]++;
  }

  undo(move) {
    this.epSquares.pop();
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (this.movesCount >= 2 || this.subTurn == 1 || move.vanish.length == 0) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
    this.subTurn = move.subTurn;
    this.postUndo(move);
  }

  postUndo(move) {
    if (move.vanish.length == 0 && move.appear.length == 0) return;
    super.postUndo(move);
    const color = move.appear[0].c;
    if (move.vanish.length == 0)
      this.reserve[color][move.appear[0].p]++;
    else if (move.vanish.length == 2 && move.appear.length == 1)
      this.reserve[color][V.MayDecode(move.vanish[1].p)]--;
  }

  getCurrentScore() {
    const c = this.turn,
          oppCol = V.GetOppCol(this.turn);
    let facingKings = false;
    if (
      this.kingPos[c][0] == this.kingPos[oppCol][0] ||
      this.kingPos[c][1] == this.kingPos[oppCol][1]
    ) {
      facingKings = true;
      let step = [
        this.kingPos[oppCol][0] - this.kingPos[c][0],
        this.kingPos[oppCol][1] - this.kingPos[c][1]
      ];
      if (step[0] != 0) step[0] /= Math.abs(step[0]);
      else step[1] /= Math.abs(step[1]);
      let [x, y] =
        [ this.kingPos[c][0] + step[0], this.kingPos[c][1] + step[1] ];
      while (x != this.kingPos[oppCol][0] || y != this.kingPos[oppCol][1]) {
        if (this.board[x][y] != V.EMPTY) {
          facingKings = false;
          break;
        }
        x += step[0];
        y += step[1];
      }
    }
    if (facingKings) return (c == "w" ? "1-0" : "0-1");
    if (!this.atLeastOneMove()) return (c == "w" ? "0-1" : "1-0");
    return "*";
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      {
        n: 2.5, //knight is weaker
        g: 9,
        s: 5,
        h: 6,
        d: 7,
        c: 7,
        w: 9,
        m: 8,
        a: 9
      }
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getComputerMove() {
    if (this.movesCount <= 1) {
      // Special case: swap and pass at random
      const moves1 = this.getAllValidMoves();
      const m1 = moves1[randInt(moves1.length)];
      this.play(m1);
      if (m1.vanish.length == 0) {
        this.undo(m1);
        return m1;
      }
      const moves2 = this.getAllValidMoves();
      const m2 = moves2[randInt(moves2.length)];
      this.undo(m1);
      return [m1, m2];
    }
    return super.getComputerMove();
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
    if (move.vanish.length == 0) {
      if (move.appear.length == 0) return "pass";
      const pieceName =
        (move.appear[0].p == V.PAWN ? "" : move.appear[0].p.toUpperCase());
      return pieceName + "@" + V.CoordsToSquare(move.end);
    }
    if (move.appear.length == 2) {
      if (move.appear[0].p != V.KING)
        return V.CoordsToSquare(move.start) + "S" + V.CoordsToSquare(move.end);
      return (move.end.y < move.start.y ? "0-0" : "0-0-0");
    }
    let notation = super.getNotation(move);
    if (move.vanish[0].p != V.PAWN && move.appear[0].p != move.vanish[0].p)
      // Add promotion indication:
      notation += "=" + move.appear[0].p.toUpperCase();
    return notation;
  }

};
