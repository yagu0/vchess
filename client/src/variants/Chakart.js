import { ChessRules, Move, PiPo } from "@/base_rules";
import { SuicideRules } from "@/variants/Suicide";

export class ChakartRules extends ChessRules {
  static get PawnSpecs() {
    return SuicideRules.PawnSpecs;
  }

  static get HasCastle() {
    return false;
  }

  static get CorrConfirm() {
    // Because of bonus effects
    return false;
  }

  static get CanAnalyze() {
    return false;
  }

  hoverHighlight(x, y) {
    if (this.subTurn == 1) return false;
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    if (fm.end.effect != 0) return false;
    const deltaX = Math.abs(fm.end.x - x);
    const deltaY = Math.abs(fm.end.y - y);
    return (
      (deltaX == 0 && deltaY == 0) ||
      (
        this.board[x][y] == V.EMPTY &&
        (
          (fm.vanish[0].p == V.ROOK && deltaX == 1 && deltaY == 1) ||
          (fm.vanish[0].p == V.BISHOP && deltaX + deltaY == 1)
        )
      )
    );
  }

  static get IMMOBILIZE_CODE() {
    return {
      'p': 's',
      'r': 'u',
      'n': 'o',
      'b': 'c',
      'q': 't',
      'k': 'l'
    };
  }

  static get IMMOBILIZE_DECODE() {
    return {
      's': 'p',
      'u': 'r',
      'o': 'n',
      'c': 'b',
      't': 'q',
      'l': 'k'
    };
  }

  static get INVISIBLE_QUEEN() {
    return 'i';
  }

  // Fictive color 'a', bomb banana mushroom egg
  static get BOMB() {
    // Doesn't collide with bishop because color 'a'
    return 'b';
  }
  static get BANANA() {
    return 'n';
  }
  static get EGG() {
    return 'e';
  }
  static get MUSHROOM() {
    return 'm';
  }

  static get PIECES() {
    return (
      ChessRules.PIECES.concat(
      Object.keys(V.IMMOBILIZE_DECODE)).concat(
      [V.BANANA, V.BOMB, V.EGG, V.MUSHROOM, V.INVISIBLE_QUEEN])
    );
  }

  getPpath(b) {
    let prefix = "";
    if (
      b[0] == 'a' ||
      b[1] == V.INVISIBLE_QUEEN ||
      Object.keys(V.IMMOBILIZE_DECODE).includes(b[1])
    ) {
      prefix = "Chakart/";
    }
    return prefix + b;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { captured: fenParts[5] }
    );
  }

  // King can be l or L (immobilized) --> similar to Alice variant
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0, 'l': 0, 'L': 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k','L','l'].includes(row[i])) kings[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i]);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (kings['k'] + kings['l'] != 1 || kings['K'] + kings['L'] != 1)
      return false;
    return true;
  }

  static IsGoodFlags(flags) {
    // 4 for Peach + Mario w, b
    return !!flags.match(/^[01]{4,4}$/);
  }

  setFlags(fenflags) {
    // King can send shell? Queen can be invisible?
    this.powerFlags = {
      w: [{ 'k': false, 'q': false }],
      b: [{ 'k': false, 'q': false }]
    };
    for (let c of ["w", "b"]) {
      for (let p of ['k', 'q']) {
        this.powerFlags[c][p] =
          fenFlags.charAt((c == "w" ? 0 : 2) + (p == 'k' ? 0 : 1)) == "1";
      }
    }
  }

  aggregateFlags() {
    return this.powerFlags;
  }

  disaggregateFlags(flags) {
    this.powerFlags = flags;
  }

  getFen() {
    return super.getFen() + " " + this.getCapturedFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getCapturedFen();
  }

  getCapturedFen() {
    let counts = [...Array(10).fill(0)];
    let i = 0;
    for (let p of [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.PAWN]) {
      counts[i] = this.captured["w"][p];
      counts[5 + i] = this.captured["b"][p];
      i++;
    }
    return counts.join("");
  }

  setOtherVariables(fen) {
    const fenParsed = V.ParseFen(fen);
    // Initialize captured pieces' counts from FEN
    this.captured = {
      w: {
        [V.ROOK]: parseInt(fenParsed.captured[0]),
        [V.KNIGHT]: parseInt(fenParsed.captured[1]),
        [V.BISHOP]: parseInt(fenParsed.captured[2]),
        [V.QUEEN]: parseInt(fenParsed.captured[3]),
        [V.PAWN]: parseInt(fenParsed.captured[4]),
      },
      b: {
        [V.ROOK]: parseInt(fenParsed.captured[5]),
        [V.KNIGHT]: parseInt(fenParsed.captured[6]),
        [V.BISHOP]: parseInt(fenParsed.captured[7]),
        [V.QUEEN]: parseInt(fenParsed.captured[8]),
        [V.PAWN]: parseInt(fenParsed.captured[9]),
      }
    };
    this.firstMove = [];
    this.subTurn = 1;
  }

  getFlagsFen() {
    let fen = "";
    // Add power flags
    for (let c of ["w", "b"])
      for (let p of ['k', 'q']) fen += (this.powerFlags[c][p] ? "1" : "0");
    return fen;
  }

  static get RESERVE_PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN];
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    const start = (color == 'w' && p == V.PAWN ? 1 : 0);
    const end = (color == 'b' && p == V.PAWN ? 7 : 8);
    for (let i = start; i < end; i++) {
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
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    if (this.subTurn == 1) return super.getPotentialMovesFrom([x, y]);
    if (this.subTurn == 2) {
      let moves = [];
      const L = this.firstMove.length;
      const fm = this.firstMove[L-1];
      switch (fm.end.effect) {
        // case 0: a click is required (banana or bomb)
        case 1:
          // Exchange position with any piece
          for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
              const colIJ = this.getColor(i, j);
              if (
                i != x &&
                j != y &&
                this.board[i][j] != V.EMPTY &&
                colIJ != 'a'
              ) {
                const movedUnit = new PiPo({
                  x: x,
                  y: y,
                  c: colIJ,
                  p: this.getPiece(i, j)
                });
                let mMove = this.getBasicMove([x, y], [i, j]);
                mMove.appear.push(movedUnit);
                moves.push(mMove);
              }
            }
          }
          break;
        case 2:
          // Resurrect a captured piece
          if (x >= V.size.x) moves = this.getReserveMoves([x, y]);
          break;
        case 3:
          // Play again with the same piece
          if (fm.end.x == x && fm.end.y == y)
            moves = super.getPotentialMovesFrom([x, y]);
          break;
      }
      return moves;
    }
  }

  getBasicMove([x1, y1], [x2, y2], tr) {
    // TODO: if this.subTurn == 2 :: no mushroom effect
    // (first, transformation. then:)
    // Apply mushroom, bomb or banana effect (hidden to the player).
    // Determine egg effect, too, and apply its first part if possible.
    // add egg + add mushroom for pawns.
    let move = super.getBasicMove([x1, y1], [x2, y2]);
    // TODO
    return move;
    // Infer move type based on its effects (used to decide subTurn 1 --> 2)
    // --> impossible étant donné juste first part (egg --> effect?)
    // => stocker l'effet (i, ii ou iii) dans le coup directement,
    // Pas terrible, mais y'aura pas 36 variantes comme ça. Disons end.effect == 0, 1, 2 ou 3
    // 0 => tour ou fou, pose potentielle.
    // If queen can be invisible, add move same start + end but final type changes
    // set move.end.effect (if subTurn --> 2)
  }

  getEnpassantCaptures([x, y], shiftX) {
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    let enpassantMove = null;
    if (
      !!epSquare &&
      epSquare.x == x + shiftX &&
      Math.abs(epSquare.y - y) == 1
    ) {
      // Not using this.getBasicMove() because the mushroom has no effect
      enpassantMove = super.getBasicMove([x, y], [epSquare.x, epSquare.y]);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: V.PAWN,
        c: this.getColor(x, epSquare.y)
      });
    }
    return !!enpassantMove ? [enpassantMove] : [];
  }

  getPotentialQueenMoves(sq) {
    const normalMoves = super.getPotentialQueenMoves(sq);
    // If flag allows it, add 'invisible movements'
    let invisibleMoves = [];
    if (this.powerFlags[this.turn][V.QUEEN]) {
      normalMoves.forEach(m => {
        if (m.vanish.length == 1) {
          let im = JSON.parse(JSON.stringify(m));
          m.appear[0].p = V.INVISIBLE_QUEEN;
          invisibleMoves.push(im);
        }
      });
    }
    return normalMoves.concat(invisibleMoves);
  }

  getPotentialKingMoves([x, y]) {
    let moves = super.getPotentialKingMoves([x, y]);
    const color = this.turn;
    // If flag allows it, add 'remote shell captures'
    if (this.powerFlags[this.turn][V.KING]) {
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(step => {
        let [i, j] = [x + 2 * step[0], y + 2 * step[1]];
        while (
          V.OnBoard(i, j) &&
          (
            this.board[i][j] == V.EMPTY ||
            (
              this.getColor(i, j) == 'a' &&
              [V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
            )
          )
        ) {
          i += step[0];
          j += step[1];
        }
        if (V.OnBoard(i, j) && this.getColor(i, j) != color)
          // May just destroy a bomb or banana:
          moves.push(this.getBasicMove([x, y], [i, j]));
      });
    }
    return moves;
  }

  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (
        V.OnBoard(i, j) &&
        (
          this.board[i][j] == V.EMPTY ||
          (
            this.getColor(i, j) == 'a' &&
            [V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
          )
        )
      ) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getAllPotentialMoves() {
    if (this.subTurn == 1) return super.getAllPotentialMoves();
    let moves = [];
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    //switch (fm.end.effect) {
    //  case 0: //...
  }

  doClick(square) {
    if (isNaN(square[0])) return null;
    if (this.subTurn == 1) return null;
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    if (fm.end.effect != 0) return null;
    const [x, y] = [square[0], square[1]];
    const deltaX = Math.abs(fm.end.x - x);
    const deltaY = Math.abs(fm.end.y - y);
    if (deltaX == 0 && deltaY == 0) {
      // Empty move:
      return {
        start: { x: -1, y: -1 },
        end: { x: -1, y: -1 },
        appear: [],
        vanish: []
      };
    }
    if (
      this.board[x][y] == V.EMPTY &&
      (
        (fm.vanish[0].p == V.ROOK && deltaX == 1 && deltaY == 1) ||
        (fm.vanish[0].p == V.BISHOP && deltaX + deltaY == 1)
      )
    ) {
      return new Move({
        start: { x: -1, y: -1 },
        end: { x: x, y: y },
        appear: [
          new PiPo({
            x: x,
            y: y,
            c: 'a',
            p: (fm.vanish[0].p == V.ROOK ? V.BANANA : V.BOMB)
          })
        ],
        vanish: []
      });
    }
    return null;
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    if (move.end.effect !== undefined) {
      this.firstMove.push(move);
      this.subTurn = 2;
      if (move.end.effect == 2) this.reserve = this.captured;
    }
    else {
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
      this.reserve = null;
    }
  }

  postPlay(move) {
    if (move.vanish[0].p == V.KING) { }
    //si roi et delta >= 2 ou dame et appear invisible queen : turn flag off
    if (move.vanish.length == 2 && move.vanish[1].c != 'a')
      // Capture: update this.captured
      this.captured[move.vanish[1].c][move.vanish[1].p]++;
    else if (move.vanish.length == 0) {
      // A piece is back on board
      this.captured[move.vanish[1].c][move.vanish[1].p]++;
      this.reserve = null;
    }
    // si pièce immobilisée de ma couleur : elle redevient utilisable (changer status fin de play)
    // TODO: un-immobilize my formerly immobilized piece, if any.
    // Make invisible queen visible again, if any opponent invisible queen.
  }

  undo(move) {
    // TODO: should be easy once end.effect is set in getBasicMove()
    if (move.end.effect !== undefined)
      this.firstMove.pop();
  }

  postUndo(move) {
    if (move.vanish.length == 2 && move.vanish[1].c != 'a')
      this.captured[move.vanish[1].c][move.vanish[1].p]--;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // Find kings (not tracked in this variant)
    let kingThere = { w: false, b: false };
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] != V.EMPTY && this.getPiece(i, j) == V.KING)
          kingThere[this.getColor(i, j)] = true;
      }
    }
    if (!kingThere['w']) return "0-1";
    if (!kingThere['b']) return "1-0";
    return "*";
  }

  static GenRandInitFen(randomness) {
    return (
      SuicideRules.GenRandInitFen(randomness).slice(0, -1) +
      // Add Peach + Mario flags, re-add en-passant + capture counts
      "0000 - 0000000000"
    );
  }

  filterValid(moves) {
    return moves;
  }

  getComputerMove() {
    // Random mover:
    const moves = this.getAllValidMoves();
    let move1 = moves[randInt(movs.length)];
    this.play(move1);
    let move2 = undefined;
    if (this.subTurn == 2) {
      const moves2 = this.getAllValidMoves();
      move2 = moves2[randInt(moves2.length)];
    }
    this.undo(move1);
    if (!move2) return move1;
    return [move1, move2];
  }

  getNotation(move) {
    // TODO: invisibility used => move notation Q??
    // Also, bonus should be clearly indicated + bomb/bananas locations
    return super.getNotation(move);
  }
};
