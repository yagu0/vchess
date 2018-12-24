class BerolinaRules extends ChessRules
{
	// En-passant after 2-sq jump
	getEpSquare(moveOrSquare)
	{
		if (!moveOrSquare)
			return undefined;
		if (typeof moveOrSquare === "string")
		{
			const square = moveOrSquare;
			if (square == "-")
				return undefined;
			return V.SquareToCoords(square);
		}
		// Argument is a move:
		const move = moveOrSquare;
		const [sx,ex,sy] = [move.start.x,move.end.x,move.start.y];
		if (this.getPiece(sx,sy) == V.PAWN && Math.abs(sx - ex) == 2)
		{
			return {
				x: ex,
				y: (move.end.y + sy)/2
			};
		}
		return undefined; //default
	}

	// Special pawn rules: promotions to captured friendly pieces,
	// optional on ranks 8-9 and mandatory on rank 10.
	getPotentialPawnMoves([x,y])
	{
		const color = this.turn;
		let moves = [];
		const [sizeX,sizeY] = [V.size.x,V.size.y];
		const shiftX = (color == "w" ? -1 : 1);
		const firstRank = (color == 'w' ? sizeX-1 : 0);
		const startRank = (color == "w" ? sizeX-2 : 1);
		const lastRank = (color == "w" ? 0 : sizeX-1);

		if (x+shiftX >= 0 && x+shiftX < sizeX) //TODO: always true
		{
			const finalPieces = x + shiftX == lastRank
				? [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN]
				: [V.PAWN]
			// One square diagonally
			for (let shiftY of [-1,1])
			{
				if (this.board[x+shiftX][y+shiftY] == V.EMPTY)
				{
					for (let piece of finalPieces)
					{
						moves.push(this.getBasicMove([x,y], [x+shiftX,y+shiftY],
							{c:pawnColor,p:piece}));
					}
					if (x == startRank && this.board[x+2*shiftX][y] == V.EMPTY)
					{
						// Two squares jump
						moves.push(this.getBasicMove([x,y], [x+2*shiftX,y+2*shiftY]);
					}
				}
			}
			// Capture
			if (this.board[x+shiftX][y] != V.EMPTY
				&& this.canTake([x,y], [x+shiftX,y]))
			{
				for (let piece of finalPieces)
				{
					moves.push(this.getBasicMove([x,y], [x+shiftX,y+shiftY],
						{c:pawnColor,p:piece}));
				}
			}
		}

		// En passant
		const Lep = this.epSquares.length;
		const epSquare = this.epSquares[Lep-1]; //always at least one element
		if (!!epSquare && epSquare.x == x+shiftX && epSquare.y == y)
		{
			let enpassantMove = this.getBasicMove([x,y], [x+shift,y]);
			enpassantMove.vanish.push({
				x: epSquare.x,
				y: y,
				p: 'p',
				c: this.getColor(epSquare.x,y)
			});
			moves.push(enpassantMove);
		}

		return moves;
	}
}

const VariantRules = BerolinaRules;
