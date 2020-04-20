import { ChessRules } from "@/base_rules";

export class ChakartRules extends ChessRules {
  // NOTE: getBasicMove, ajouter les bonus à vanish array
  // + déterminer leur effet (si cavalier) ou case (si banane ou bombe)
  // (L'effet doit être caché au joueur : devrait être OK)
  //
  // Saut possible par dessus bonus ou champis mais pas bananes ou bombes

  // FEN : immobilized (pas flag), castle flags + flags peach (power used?)
  // "pièces" supplémentaires : bananes, bombes, champis, bonus --> + couleur ?
  //   (Semble mieux sans couleur => couleur spéciale indiquant que c'est pas jouable)
  // (Attention: pas jouables cf. getPotentialMoves...)

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
  }

  getPotentialPawnMoves(sq) {
    //Toad: pion
    //  laisse sur sa case de départ un champi turbo permettant à Peach d'aller
    //  une case plus loin, et aux pièces arrivant sur cette case de sauter par
    //  dessus une pièce immédiatement adjacente (en atterissant juste derrière).
  }

  // Coups en 2 temps (si pose)
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
    //                       à condition que la position résultante ne soit pas un auto-échec
    //    - i*) koopa(*B*) : ramène sur la case initiale
    //    - ii) toadette(*R*) : permet de poser une pièce capturée sur le plateau
    //                         (n'importe où sauf 8eme rangée pour les pions)
    //    - ii*) chomp(*W*) : mange la pièce ; si c'est Peach, c'est perdu
    //    - iii) daisy(*T*) : permet de rejouer un coup avec la même pièce --> cumulable si ensuite coup sur bonus Daisy.
    //    - iii*) bowser(*M*) : immobilise la pièce (marquée jaune/rouge), qui ne pourra pas jouer au tour suivant
    //    - iv) luigi(*L*) : fait changer de camp une pièce adverse (aléatoire ?) (sauf le roi)
    //    - iv*) waluigi(*D*) : fait changer de camp une de nos pièces (aléatoire ?) (sauf le roi)
    //  --> i, ii, iii en deux temps (subTurn 1 & 2)
    //      iii* : indication dans FEN (immobilized)
  }

  getPotentialQueenMoves(sq) {
    //Mario: dame
    //  pouvoir "casquette ailée" (à chaque coup?) : peut sauter par dessus n'importe quelle pièce (une seule), sans la capturer.
  }

  getPotentialKingMoves(sq) {
    //Peach: roi
    //  Carapace rouge (disons ^^) jouable une seule fois dans la partie,
    //  au lieu de se déplacer. Capture un ennemi au choix parmi les plus proches,
    //  à condition qu'ils soient visible (suivant les directions de déplacement d'une dame).
    //  Profite des accélérateurs posés par les pions (+ 1 case : obligatoire).
  }

  play(move) {
    // TODO: subTurn passe à 2 si potentiellement pose (tour, fou) ou si choix (reconnaître i (ok), ii (ok) et iii (si coup normal + pas immobilisé) ?)
    // voire +2 si plusieurs daisy...
  }

  undo(move) {
    // TODO: reconnaissance inverse si subTurn == 1 --> juste impossible ==> marquer pendant play (comme DoubleMove1 : move.turn = ...)
  }

  //atLeastOneMove() should be OK

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
    const color = V.GetOppCol(this.turn);
    const lastRank = (color == 'w' ? 0 : 7);
    if (this.kingPos[color][0] == lastRank)
      // The opposing edge is reached!
      return color == "w" ? "1-0" : "0-1";
    if (this.atLeastOneMove()) return "*";
    // Game over
    const oppCol = this.turn;
    if (!this.underCheck(oppCol)) return "1/2";
    return (oppCol == "w" ? "0-1" : "1-0");
    //TODO: But = capturer la princesse adverse. Variante : but = la princesse arrive de l'autre côté de l'échiquier.
    //==> On peut mixer ces deux conditions : arriver au bout du plateau ou capturer la princesse adverse.
    return '*';
  }

  getComputerMove() {
    // TODO: random mover
  }

  //Détails :
  //Si une pièce pose quelque chose sur une case ça remplace ce qui y était déjà.
  //Pas de condition de pat, puisque l'objectif est la capture de la reine :)
};
