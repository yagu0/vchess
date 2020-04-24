import { ChessRules } from "@/base_rules";

export class ChakartRules extends ChessRules {
  // NOTE: getBasicMove, ajouter les bonus à vanish array
  // + déterminer leur effet (si cavalier) ou case (si banane ou bombe)
  // (L'effet doit être caché au joueur : devrait être OK)
  //
  // Saut possible par dessus bonus ou champis mais pas bananes ou bombes
//==> redefinir isAttackedBySlide et getPotentialSlide...

// keep track of captured pieces: comme Grand; pieces can get back to board with toadette bonus.
// --> pour ce bonus, passer "capture" temporairement en "reserve" pour permettre de jouer le coup.

  // "pièces" supplémentaires : bananes, bombes, champis, bonus --> + couleur ?
  //   (Semble mieux sans couleur => couleur spéciale indiquant que c'est pas jouable)
  // (Attention: pas jouables cf. getPotentialMoves...)

  hoverHighlight(x, y) {
    // TODO: exact squares
    return this.subTurn == 2; //&& this.firstMove.donkey or wario or bonus roi boo
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

  getPpath(b) {
    let prefix = "";
    if (
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
    // 4 for castle + 4 for Peach + Mario w, b
    return !!flags.match(/^[a-z]{4,4}[01]{4,4}$/);
  }

  setFlags(fenflags) {
    super.setFlags(fenflags); //castleFlags
    this.powerFlags = {
      w: [...Array(2)], //king can send red shell? Queen can be invisible?
      b: [...Array(2)]
    };
    const flags = fenflags.substr(4); //skip first 4 letters, for castle
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 2; i++)
        this.pawnFlags[c][i] = flags.charAt((c == "w" ? 0 : 2) + i) == "1";
    }
  }

  aggregateFlags() {
    return [this.castleFlags, this.powerFlags];
  }

  disaggregateFlags(flags) {
    this.castleFlags = flags[0];
    this.powerFlags = flags[1];
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
    super.setOtherVariables(fen);
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
    let fen = super.getFlagsFen();
    // Add power flags
    for (let c of ["w", "b"])
      for (let i = 0; i < 2; i++) fen += (this.powerFlags[c][i] ? "1" : "0");
    return fen;
  }

  getPotentialMovesFrom([x, y]) {
    // TODO: bananes et bombes limitent les déplacements (agissent comme un mur "capturable")
    // bananes jaunes et rouges ?! (agissant sur une seule couleur ?) --> mauvaise idée.
    if (this.subTurn == 2) {
      // TODO: coup compatible avec firstMove
    }
  //Détails :
  //Si une pièce pose quelque chose sur une case ça remplace ce qui y était déjà.
  // TODO: un-immobilize my immobilized piece at the end of this turn, if any
  }

  getPotentialPawnMoves(sq) {
    //Toad: pion
    //  laisse sur sa case de départ un champi turbo permettant à Peach et cavalier et autres pions d'aller
    //  un dep plus loin (evt 2 cases si pion saut initial), et aux pièces arrivant sur cette case de sauter par
    //  dessus une pièce immédiatement adjacente dans leur trajectoire (en atterissant juste derrière).
  }

  // Coups en 2 temps (si pose possible)
  getPotentialRookMoves(sq) {
    //Donkey : tour
    //  pose une banane (optionnel) sur une case adjacente (diagonale) à celle d'arrivée
    //  Si une pièce arrive sur la peau de banane, alors elle effectue un déplacement
    //  aléatoire d'une (2?) case (vertical ou horizontal) depuis sa position finale.
  }

  // Coups en 2 temps (si pose)
  getPotentialBishopMoves([x, y]) {
    //Wario: fou
    //  pose une bombe (optionnel) sur une case orthogonalement adjacente à la case d'arrivée
    //  Si une pièce arrive sur une bombe, alors elle effectue un déplacement diagonal
    //  aléatoire d'une (2?) case depuis sa position finale (juste une case si impossible).
  }

  getPotentialKnightMoves([x, y]) {
    //Yoshi: cavalier
    //  laisse sur sa case de départ un bonus aléatoire
    //  (NOTE: certains bonus pourraient ne pas être applicables ==> pion bloqué par exemple)
    //    - i) roi boo(*E*) : échange avec n'importe quelle pièce (choix du joueur, type et/ou couleur différents)
    //    - i*) koopa(*B*) : ramène sur la case initiale
    //    - ii) toadette(*R*) : permet de poser une pièce capturée sur le plateau
    //                         (n'importe où sauf 8eme rangée pour les pions)
    //    - ii*) chomp(*W*) : mange la pièce ; si c'est Peach, c'est perdu
    //    - iii) daisy(*T*) : permet de rejouer un coup avec la même pièce --> cumulable si ensuite coup sur bonus Daisy.
    //    - iii*) bowser(*M*) : immobilise la pièce (marquée jaune/rouge), qui ne pourra pas jouer au tour suivant
    //    - iv) luigi(*L*) : fait changer de camp une pièce adverse (aléatoire) (sauf le roi)
    //    - iv*) waluigi(*D*) : fait changer de camp une de nos pièces (aléatoire, sauf le roi)
    //  --> i, ii, iii en deux temps (subTurn 1 & 2)
  }

  getPotentialQueenMoves(sq) {
    //Mario: dame
    //  pouvoir "fantôme" : peut effectuer une fois dans la partie un coup non-capturant invisible (=> choix à chaque coup, getPPpath(m) teste m.nvisible...)
    //wg bg ghost once in the game the queen can make an invisible move --> printed as "?"
  }

  getPotentialKingMoves(sq) {
    //Peach: roi
    //  Carapace rouge (disons ^^) jouable une seule fois dans la partie,
    //  au lieu de se déplacer. Capture un ennemi au choix parmi les plus proches,
    //  à condition qu'ils soient visibles (suivant les directions de déplacement d'une dame).
    //  Profite des accélérateurs posés par les pions (+ 1 case : obligatoire).
  }

  atLeastOneMove() {
    // TODO: check that
    return true;
  }

  play(move) {
    // TODO: subTurn passe à 2 si arrivée sur bonus cavalier
    // potentiellement pose (tour, fou) ou si choix (reconnaître i (ok), ii (ok) et iii (si coup normal + pas immobilisé) ?)
    // voire +2 si plusieurs daisy...
    // si pièce immobilisée de ma couleur : elle redevient utilisable (changer status fin de play)
  }

  undo(move) {
    // TODO: reconnaissance inverse si subTurn == 1 --> juste impossible ==> marquer pendant play (comme DoubleMove1 : move.turn = ...)
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
        !this.underCheck(this.turn) &&
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

  postPlay(move) {
    // TODO: king may also be "chomped"
    super.updateCastleFlags(move, piece);
  }
  postPlay(move) {
    super.postPlay(move);
    if (move.vanish.length == 2 && move.appear.length == 1)
      // Capture: update this.captured
      this.captured[move.vanish[1].c][move.vanish[1].p]++;
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.appear.length == 1)
      this.captured[move.vanish[1].c][move.vanish[1].p]--;
  }

  getCurrentScore() {
    if (this.kingPos[this.turn][0] < 0)
      // King captured (or "chomped")
      return this.turn == "w" ? "0-1" : "1-0";
    return '*';
  }

  static GenRandInitFen(randomness) {
    return (
      ChessRules.GenRandInitFen(randomness).slice(0, -2) +
      // Add Peach + Mario flags, re-add en-passant + capture counts
      "0000 - 0000000000"
    );
  }

  getComputerMove() {
    // TODO: random mover
  }

  getNotation(move) {
    // invisibility used? --> move notation Q??
  }
};
