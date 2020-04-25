import { ChessRules } from "@/base_rules";
import { SuicideRules } from "@/variants/Suicide";

export class ChakartRules extends ChessRules {
  static get PawnSpecs() {
    return SuicideRules.PawnSpecs;
  }

  static get HasCastle() {
    return false;
  }

  static get HasEnpassant() {
    // TODO: maybe enable them later, but then the capturing pawn take the
    // mushroom and continue diagonally?!
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
    if (
      this.firstMove.appear.length == 0 ||
      this.firstMove.vanish.length == 0 ||
      this.board[x][y] != V.EMPTY
    ) {
      return false;
    }
    const deltaX = Math.abs(this.firstMove.end.x - x);
    const deltaY = Math.abs(this.firstMove.end.y - y);
    return (
      this.subTurn == 2 &&
      // Condition: rook or bishop move, may capture, but no bonus move
      [V.ROOK, V.BISHOP].includes(this.firstMove.vanish[0].p) &&
      (
        this.firstMove.vanish.length == 1 ||
        ['w', 'b'].includes(this.firstMove.vanish[1].c)
      ) &&
      (
        this.firstMove.vanish[0].p == V.ROOK && deltaX == 1 && deltaY == 1 ||
        this.firstMove.vanish[0].p == V.BISHOP && deltaX + deltaY == 1
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
      { captured: fenParts[4] }
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
    this.powerFlags = {
      w: [...Array(2)], //king can send shell? Queen can be invisible?
      b: [...Array(2)]
    };
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 2; i++)
        this.pawnFlags[c][i] = fenFlags.charAt((c == "w" ? 0 : 2) + i) == "1";
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
    this.subTurn = 1;
  }

  getFlagsFen() {
    let fen = "";
    // Add power flags
    for (let c of ["w", "b"])
      for (let i = 0; i < 2; i++) fen += (this.powerFlags[c][i] ? "1" : "0");
    return fen;
  }

  getPotentialMovesFrom(sq) {
    if (this.subTurn == 1) return super.getPotentialMovesFrom(sq);
    if (this.subTurn == 2) {
      // TODO: coup compatible avec firstMove
    }
  }

  getBasicMove([x1, y1], [x2, y2]) {
    // Apply mushroom, bomb or banana effect (hidden to the player).
    // Determine egg effect, too, and apply its first part if possible.
    // add egg + add mushroom for pawns.
    let move = super.getBasicMove([x1, y1], [x2, y2]);
    // TODO
    return move;
    // Infer move type based on its effects (used to decide subTurn 1 --> 2)
    // --> impossible étant donné juste first part (egg --> effect?)
    // => stocker l'effet (i, ii ou iii) dans le coup directement,
    // Pas terrible, mais y'aura pas 36 variantes comme ça. Disons end.effect == null, 0, 1, 2 ou 3
    // 0 => tour ou fou, pose potentielle.
    // If queen can be invisible, add move same start + end but final type changes
  }

  getPotentialKingMoves([x, y]) {
    let moves = super.getPotentialKingMoves([x, y]);
    // TODO: if flags allows it, add 'remote shell captures'
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
    // TODO: subTurn == 2, switch on firstMove.end.effect --> lack firstMove, setOtherVariables, play/undo, see Dynamo
  }

  doClick(square) {
    if (isNaN(square[0])) return null;
    // TODO: If subTurn == 2:
    // if square is empty && firstMove is compatible,
    // complete the move (banana or bomb or piece exchange).
    // if square not empty, just complete with empty move
    const Lf = this.firstMove.length;
    if (this.subTurn == 2) {
      if (
        this.board[square[0]][square[1]] == V.EMPTY &&
        (La == 0 || !this.oppositeMoves(this.amoves[La-1], this.firstMove[Lf-1]))
      ) {
        return {
          start: { x: -1, y: -1 },
          end: { x: -1, y: -1 },
          appear: [],
          vanish: []
        };
      }
    }
    return null;
  }

  play(move) {
    // TODO
// --> pour bonus toadette, passer "capture" temporairement en "reserve" pour permettre de jouer le coup.
    // il faut alors mettre à jour 'captured'
    // TODO: subTurn passe à 2 si arrivée sur bonus cavalier + effect == 1, 2 ou 3 ou si coup de tour ou fou (non cumulables)
  }

  postPlay(move) {
    // TODO: if effect = resurect a piece, then this.reserve = this.captured;
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
    const moves = this.getAllValidMoves();
    // TODO: random mover
    return moves[0];
  }

  getNotation(move) {
    // TODO
    // invisibility used? --> move notation Q??
    return "?";
  }
};
