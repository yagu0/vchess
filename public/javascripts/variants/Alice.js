class AliceRules extends ChessRules
{
	static get ALICE_PIECES()
	{
		return {
			's': 'p',
			't': 'q',
			'u': 'r',
			'c': 'b',
			'o': 'n',
			'l': 'k',
		};
	}
	static get ALICE_CODES()
	{
		return {
			'p': 's',
			'q': 't',
			'r': 'u',
			'b': 'c',
			'n': 'o',
			'k': 'l',
		};
	}

	static getPpath(b)
	{
		return (Object.keys(this.ALICE_PIECES).includes(b[1]) ? "Alice/" : "") + b;
	}

	getBoardOfPiece([x,y])
	{
		const V = VariantRules;
		// Build board where the piece is
		const mirrorSide = (Object.keys(V.ALICE_CODES).includes(this.getPiece(x,y)) ? 1 : 2);
		// Build corresponding board from complete board
		const [sizeX,sizeY] = V.size;
		let sideBoard = doubleArray(sizeX, sizeY, "");
		for (let i=0; i<sizeX; i++)
		{
			for (let j=0; j<sizeY; j++)
			{
				const piece = this.getPiece(i,j);
				if (mirrorSide==1 && Object.keys(V.ALICE_CODES).includes(piece))
					sideBoard[i][j] = this.board[i][j];
				else if (mirrorSide==2 && Object.keys(V.ALICE_PIECES).includes(piece))
					sideBoard[i][j] = this.getColor(i,j) + V.ALICE_PIECES[piece];
			}
		}
		return sideBoard;
	}

	// TODO: castle & enPassant https://www.chessvariants.com/other.dir/alice.html
	// TODO: enPassant seulement si l'on est du même coté que le coté de départ du pion adverse
	// (en passant en sortant du monde... : il faut donc ajouter des coups non trouvés)
	// castle: check that all destination squares are not occupied
	getPotentialMovesFrom([x,y])
	{
		let sideBoard = this.getBoardOfPiece([x,y]);

		// Search valid moves on sideBoard
		let saveBoard = this.board;
		this.board = sideBoard;
		let moves = super.getPotentialMovesFrom([x,y]);
		this.board = saveBoard;

		// Finally filter impossible moves
		const mirrorSide = (Object.keys(VariantRules.ALICE_CODES).includes(this.getPiece(x,y)) ? 1 : 2);
		return moves.filter(m => {
			if (this.board[m.end.x][m.end.y] != VariantRules.EMPTY)
			{
				const piece = this.getPiece(m.end.x,m.end.y);
				if ((mirrorSide==1 && Object.keys(VariantRules.ALICE_PIECES).includes(piece))
					|| (mirrorSide==2 && Object.keys(VariantRules.ALICE_CODES).includes(piece)))
				{
					return false;
				}
			}
			m.appear.forEach(psq => {
				if (Object.keys(VariantRules.ALICE_CODES).includes(psq.p))
					psq.p = VariantRules.ALICE_CODES[psq.p]; //goto board2
				else
					psq.p = VariantRules.ALICE_PIECES[psq.p]; //goto board1
			});
			return true;
		});
	}

	underCheck(move)
	{
		const color = this.turn;
		this.play(move);
		let sideBoard = this.getBoardOfPiece(this.kingPos[color]);
		let saveBoard = this.board;
		this.board = sideBoard;
		let res = this.isAttacked(this.kingPos[color], this.getOppCol(color));
		this.board = saveBoard;
		this.undo(move);
		return res;
	}

	getCheckSquares(move)
	{
		this.play(move);
		const color = this.turn; //opponent
		let sideBoard = this.getBoardOfPiece(this.kingPos[color]);
		let saveBoard = this.board;
		this.board = sideBoard;
		let res = this.isAttacked(this.kingPos[color], this.getOppCol(color))
			? [ JSON.parse(JSON.stringify(this.kingPos[color])) ]
			: [ ];
		this.board = saveBoard;
		this.undo(move);
		return res;
	}

	getNotation(move)
	{
		if (move.appear.length == 2 && move.appear[0].p == VariantRules.KING)
		{
			if (move.end.y < move.start.y)
				return "0-0-0";
			else
				return "0-0";
		}

		const finalSquare =
			String.fromCharCode(97 + move.end.y) + (VariantRules.size[0]-move.end.x);
		const piece = this.getPiece(move.start.x, move.start.y);

		// Piece or pawn movement
		let notation = piece.toUpperCase() +
			(move.vanish.length > move.appear.length ? "x" : "") + finalSquare;
		if (['s','p'].includes(piece) && !['s','p'].includes(move.appear[0].p))
		{
			// Promotion
			notation += "=" + move.appear[0].p.toUpperCase();
		}
		return notation;
	}

	checkGameEnd()
	{
		const color = this.turn;
		let sideBoard = this.getBoardOfPiece(this.kingPos[color]);
		let saveBoard = this.board;
		this.board = sideBoard;
		let res = "*";
		if (!this.isAttacked(this.kingPos[color], this.getOppCol(color)))
			res = "1/2";
		else
			res = (color == "w" ? "0-1" : "1-0");
		this.board = saveBoard;
		return res;
	}
}
