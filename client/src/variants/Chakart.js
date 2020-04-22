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

  // FEN : castle flags + flags peach (power used?) + Mario (invisibility used? --> move notation Q??)
  // "pièces" supplémentaires : bananes, bombes, champis, bonus --> + couleur ?
  //   (Semble mieux sans couleur => couleur spéciale indiquant que c'est pas jouable)
  // (Attention: pas jouables cf. getPotentialMoves...)

  hoverHighlight(x, y) {
    // TODO: exact squares
    return this.subTurn == 2; //&& this.firstMove.donkey or wario or bonus roi boo
  }

  // king can be l or L (immobilized) --> copy-paste from Alice variant
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kings[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i]);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.subTurn = 1;
  }

  getPotentialMovesFrom([x, y]) {
    // TODO: bananes et bombes limitent les déplacements (agissent comme un mur "capturable")
    // bananes jaunes et rouges ?! (agissant sur une seule couleur ?) --> mauvaise idée.
    if (this.subTurn == 2) {
      // TODO: coup compatible avec firstMove
    }
  //Détails :
  //Si une pièce pose quelque chose sur une case ça remplace ce qui y était déjà.
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
    // A click to promote a piece on subTurn 2 would trigger this.
    // For now it would then return [NaN, NaN] because surrounding squares
    // have no IDs in the promotion modal. TODO: improve this?
    if (isNaN(square[0])) return null;
    // If subTurn == 2:
    // if square is empty && firstMove is compatible,
    // complete the move (banana or bomb).
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

  getCurrentScore() {
    if (this.kingPos[this.turn][0] < 0)
      // King captured (or "chomped")
      return this.turn == "w" ? "0-1" : "1-0";
    //TODO: But = capturer la princesse adverse (téléportation possible donc pas but = arriver de l'autre côté)
    return '*';
  }

  getComputerMove() {
    // TODO: random mover
  }
};
