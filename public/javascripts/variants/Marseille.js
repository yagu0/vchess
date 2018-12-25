//TODO:
//adapter alphabeta (dans baserules ? --> basé sur turn OK)
// le reste == standard

class MarseilleRules extends ChessRules
{
	// TODO: fen indication pour turn : w1, w2 ou b1, ou b2 (about to play 1st or 2nd sub-turn)
	// + quelque chose pour indiquer si c'est le tout premier coup ("w" sans + d'indications)
	//
	// this.turn == "w" ou "b"
	// this.subTurn == 0 ou 1 (ou 1 et 2)
	//
	// Alpha-beta ?
}

const VariantRules = MarseilleRules;
