class AliceRules extends ChessRUles
{
	getPpath(b)
	{
		return ""; //TODO
	}

	// Idee : this.board assigné tour à tour à board1, board2
	// board1 initialisé plein, board2 vide (via fen: s,t,u,o,c)
	// coups cherchés suivant règles normales sur l'un puis l'autre
	// puis au final filtre.
}
