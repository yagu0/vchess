class AliceRules extends ChessRUles
{
	// TODO: more general double correspondance normal <--> alice
	static get ALICE_PIECES()
	{
		return ['s','t','u','c','o','l']; //king is 'l'
	}

	static getPpath(b)
	{
		return (this.ALICE_PIECES.includes(b[1]) ? "Alice/" : "") + b;
	}

	getPotentialMovesFrom([x,y])
	{
		// Build board1+board2 from complete board
		let board1 = doubleArray(sizeX, sizeY, "");
		let board2 = doubleArray(sizeX, sizeY, "");
		const [sizeX,sizeY] = variantRules.size;
		for (let i=0; i<sizeX; i++)
		{
			for (let j=0; j<sizeY; j++)
			{
				const piece = this.getPiece(i,j);
				if (this.ALICE_PIECES.includes(piece))
					board2[i][j] = this.board[i][j];
				else
					board1[i][j] = this.board[i][j];
			}
		}
		let saveBoard = JSON.parse(JSON.stringify(this.board));

		// Search valid moves on both boards
		let moves = [];
		this.board = board1;


		this.board = board2;

		this.board = saveBoard;

		// Finally filter impossible moves

		return moves;
	}

	underCheck(move)
	{
		// 1 where is king ? if board1 then build it, if board2 then build it. then check.
		const color = this.turn;
		this.play(move);
		let res = this.isAttacked(this.kingPos[color], this.getOppCol(color));
		this.undo(move);
		return res;
	}

	// TODO also:
	//getCheckSquares(move)

	// TODO: pieces change side!
	static PlayOnBoard(board, move)
	{
		for (let psq of move.vanish)
			board[psq.x][psq.y] = VariantRules.EMPTY;
		for (let psq of move.appear)
			board[psq.x][psq.y] = psq.c + psq.p;
	}
	static UndoOnBoard(board, move)
	{
		for (let psq of move.appear)
			board[psq.x][psq.y] = VariantRules.EMPTY;
		for (let psq of move.vanish)
			board[psq.x][psq.y] = psq.c + psq.p;
	}

	checkGameEnd()
	{
		const color = this.turn;
		// No valid move: stalemate or checkmate?
		// TODO: here also, need to build the board with king on it
		if (!this.isAttacked(this.kingPos[color], this.getOppCol(color)))
			return "1/2";
		// OK, checkmate
		return color == "w" ? "0-1" : "1-0";
	}
}
