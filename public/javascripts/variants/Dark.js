class Chess960Rules extends ChessRules
{
	// Standard rules, in the shadow
	setOtherVariables(fen)
	{
		super.setOtherVariables(fen);
		const [sizeX,sizeY] = {V.size.x,V.size.y};
		this.enlightened = {
			"w": doubleArray(sizeX,sizeY,false),
			"b": doubleArray(sizeX,sizeY,false)
		};
		setup enlightened: squares reachable by each side (TODO: one side would be enough)
	}

	isEnlightened(x, y, color)
	{
		//TODO: artificlaly change turn
	}

	getAllPotentialMoves()
	{
		let moves = []; //TODO
	}

	atLeastOneMove()
	{
		if (this.kingPos[this.turn][0] < 0)
			return false;
		return true; //TODO: is it right?
	}

	underCheck(move)
	{
		return false; //there is no check
	}

	getCheckSquares(move)
	{
		const c = this.getOppCol(this.turn); //opponent
		const saveKingPos = this.kingPos[c]; //king might be taken
		this.play(move);
		// The only way to be "under check" is to have lost the king (thus game over)
		let res = this.kingPos[c][0] < 0
			? [JSON.parse(JSON.stringify(saveKingPos))]
			: [];
		this.undo(move);
		return res;
	}

	// NOTE: no (un)updateVariables() because no computer mode
	// --> but isEnlightened() should have its variable updated
	// --> in fact an array is enough (no need for a function)
	// recomputed after every play/undo (although there are no undo here for now)

	checkGameEnd()
	{
		// No valid move: our king disappeared
		return this.turn == "w" ? "0-1" : "1-0";
	}

	static get THRESHOLD_MATE()
	{
		return 500; //checkmates evals may be slightly below 1000
	}
}

const VariantRules = DarkRules;
