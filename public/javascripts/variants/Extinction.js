class ExtinctionRules extends ChessRules
{
	initVariables(fen)
	{
		super.initVariables(fen);
		const V = VariantRules;
		this.material =
		{
			"w":
			{
				[V.KING]: 1,
				[V.QUEEN]: 1,
				[V.ROOK]: 2,
				[V.KNIGHT]: 2,
				[V.BISHOP]: 2,
				[V.PAWN]: 8
			},
			"b":
			{
				[V.KING]: 1,
				[V.QUEEN]: 1,
				[V.ROOK]: 2,
				[V.KNIGHT]: 2,
				[V.BISHOP]: 2,
				[V.PAWN]: 8
			}
		};
	}

	// TODO: verify this assertion
	atLeastOneMove()
	{
		return true; //always at least one possible move
	}

	underCheck(move)
	{
		return false; //there is no check
	}

	getCheckSquares(move)
	{
		return [];
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		if (move.vanish.length==2 && move.appear.length==1)
			this.material[move.vanish[1].c][move.vanish[1].p]--;
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		if (move.vanish.length==2 && move.appear.length==1)
			this.material[move.vanish[1].c][move.vanish[1].p]++;
	}

	checkGameOver()
	{
		if (this.checkRepetition())
			return "1/2";

		if (this.atLeastOneMove()) // game not over?
		{
			const color = this.turn;
			if (Object.keys(this.material[color]).some(
				p => { return this.material[color][p] == 0; }))
			{
				return this.checkGameEnd();
			}
			return "*";
		}

		return this.checkGameEnd();
	}

	// Very negative (resp. positive) if white (reps. black) pieces set is incomplete
	evalPosition()
	{
		if (this.missAkind())
			return (this.turn=="w"?-1:1) * VariantRules.INFINITY;
		return super.evalPosition();
	}
}
