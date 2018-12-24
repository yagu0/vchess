class DarkRules extends ChessRules
{
	// Standard rules, in the shadow
	setOtherVariables(fen)
	{
		super.setOtherVariables(fen);
		const [sizeX,sizeY] = [V.size.x,V.size.y];
		this.enlightened = {
			"w": doubleArray(sizeX,sizeY),
			"b": doubleArray(sizeX,sizeY)
		};
		// Setup enlightened: squares reachable by each side
		// (TODO: one side would be enough ?)
		this.updateEnlightened();
	}

	updateEnlightened()
	{
		// Initialize with pieces positions (which are seen)
		for (let i=0; i<V.size.x; i++)
		{
			for (let j=0; j<V.size.y; j++)
			{
				this.enlightened["w"][i][j] = false;
				this.enlightened["b"][i][j] = false;
				if (this.board[i][j] != V.EMPTY)
					this.enlightened[this.getColor(i,j)][i][j] = true;
			}
		}
		const currentTurn = this.turn;
		this.turn = "w";
		const movesWhite = this.getAllValidMoves();
		this.turn = "b";
		const movesBlack = this.getAllValidMoves();
		this.turn = currentTurn;
		for (let move of movesWhite)
			this.enlightened["w"][move.end.x][move.end.y] = true;
		for (let move of movesBlack)
			this.enlightened["b"][move.end.x][move.end.y] = true;
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

	updateVariables(move)
	{
		// Update kings positions
		const piece = move.vanish[0].p;
		const c = move.vanish[0].c;
		if (piece == V.KING && move.appear.length > 0)
		{
			this.kingPos[c][0] = move.appear[0].x;
			this.kingPos[c][1] = move.appear[0].y;
		}
		if (move.vanish.length >= 2 && move.vanish[1].p == V.KING)
		{
			// We took opponent king !
			const oppCol = this.getOppCol(c);
			this.kingPos[oppCol] = [-1,-1];
		}

		// Update moves for both colors:
		this.updateEnlightened();
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		const c = move.vanish[0].c;
		const oppCol = this.getOppCol(c);
		if (this.kingPos[oppCol][0] < 0)
		{
			// Last move took opponent's king
			for (let psq of move.vanish)
			{
				if (psq.p == 'k')
				{
					this.kingPos[oppCol] = [psq.x, psq.y];
					break;
				}
			}
		}

		// Update moves for both colors:
		this.updateEnlightened();
	}

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
