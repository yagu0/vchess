class MagneticRules extends ChessRules
{
	getEpSquare(move)
	{
		return undefined; //no en-passant
	}

	// Complete a move with magnetic actions
	applyMagneticLaws([x,y], move)
	{
		const standardMove = JSON.parse(JSON.stringify(move));
		this.play(standardMove);
		const color = this.getColor(x,y);
		const [sizeX,sizeY] = VariantRules.size;
		for (let step of [[-1,0],[1,0],[0,-1],[0,1]])
		{
			let [i,j] = [x+step[0],y+step[1]];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY)
			{
				if (this.board[i][j] != VariantRules.EMPTY)
				{
					// Found something. Same color or not?
					if (this.getColor(i,j) != color)
					{
						// Attraction
						if ((Math.abs(i-x)>=2 || Math.abs(j-y)>=2)
							&& this.getPiece(i,j) != VariantRules.KING)
						{
							move.vanish.push(
								new PiPo({
									p:this.getPiece(i,j),
									c:this.getColor(i,j),
									x:i,
									y:j
								})
							);
							move.appear.push(
								new PiPo({
									p:this.getPiece(i,j),
									c:this.getColor(i,j),
									x:x+step[0],
									y:y+step[1]
								})
							);
						}
					}
					else
					{
						// Repulsion
						if (this.getPiece(i,j) != VariantRules.KING)
						{
							// Push it until we meet an obstacle or edge of the board
							let [ii,jj] = [i+step[0],j+step[1]];
							while (ii>=0 && ii<sizeX && jj>=0 && jj<sizeY)
							{
								if (this.board[ii][jj] != VariantRules.EMPTY)
									break;
								ii += step[0];
								jj += step[1];
							}
							ii -= step[0];
							jj -= step[1];
							if (Math.abs(ii-i)>=1 || Math.abs(jj-j)>=1)
							{
								move.vanish.push(
									new PiPo({
										p:this.getPiece(i,j),
										c:this.getColor(i,j),
										x:i,
										y:j
									})
								);
								move.appear.push(
									new PiPo({
										p:this.getPiece(i,j),
										c:this.getColor(i,j),
										x:ii,
										y:jj
									})
								);
							}
						}
					}
					break;
				}
				i += step[0];
				j += step[1];
			}
		}
		this.undo(standardMove);
	}

	// TODO: when pawn is pushed to 8th rank, apply promotions (similar change as in Checkered)
	getBasicMove([sx,sy], [ex,ey], tr)
	{
		var mv = new Move({
			appear: [
				new PiPo({
					x: ex,
					y: ey,
					c: !!tr ? tr.c : this.getColor(sx,sy),
					p: !!tr ? tr.p : this.getPiece(sx,sy)
				})
			],
			vanish: [
				new PiPo({
					x: sx,
					y: sy,
					c: this.getColor(sx,sy),
					p: this.getPiece(sx,sy)
				})
			]
		});

		if (this.board[ex][ey] != VariantRules.EMPTY)
		{
			mv.vanish.push(
				new PiPo({
					x: ex,
					y: ey,
					c: this.getColor(ex,ey),
					p: this.getPiece(ex,ey)
				})
			);
		}
		this.applyMagneticLaws([ex,ey], mv);
		return mv;
	}

	getPotentialPawnMoves([x,y])
	{
		const color = this.getColor(x,y);
		var moves = [];
		var V = VariantRules;
		const [sizeX,sizeY] = VariantRules.size;
		let shift = (color == "w" ? -1 : 1);
		let startRank = (color == "w" ? sizeY-2 : 1);
		let firstRank = (color == 'w' ? sizeY-1 : 0);
		let lastRank = (color == "w" ? 0 : sizeY-1);

		if (x+shift >= 0 && x+shift < sizeX && x+shift != lastRank)
		{
			// Normal moves
			if (this.board[x+shift][y] == V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y]));
				if ([startRank,firstRank].includes(x) && this.board[x+2*shift][y] == V.EMPTY)
				{
					// Two squares jump
					moves.push(this.getBasicMove([x,y], [x+2*shift,y]));
				}
			}
			// Captures
			if (y>0 && this.canTake([x,y], [x+shift,y-1]) && this.board[x+shift][y-1] != V.EMPTY)
				moves.push(this.getBasicMove([x,y], [x+shift,y-1]));
			if (y<sizeY-1 && this.canTake([x,y], [x+shift,y+1]) && this.board[x+shift][y+1] != V.EMPTY)
				moves.push(this.getBasicMove([x,y], [x+shift,y+1]));
		}

		if (x+shift == lastRank)
		{
			// Promotion
			let promotionPieces = [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN];
			promotionPieces.forEach(p => {
				// Normal move
				if (this.board[x+shift][y] == V.EMPTY)
					moves.push(this.getBasicMove([x,y], [x+shift,y], {c:color,p:p}));
				// Captures
				if (y>0 && this.canTake([x,y], [x+shift,y-1]) && this.board[x+shift][y-1] != V.EMPTY)
					moves.push(this.getBasicMove([x,y], [x+shift,y-1], {c:color,p:p}));
				if (y<sizeY-1 && this.canTake([x,y], [x+shift,y+1]) && this.board[x+shift][y+1] != V.EMPTY)
					moves.push(this.getBasicMove([x,y], [x+shift,y+1], {c:color,p:p}));
			});
		}

		// No en passant

		return moves;
	}

	getCastleMoves([x,y])
	{
		const c = this.getColor(x,y);
		if (x != (c=="w" ? 7 : 0) || y != this.INIT_COL_KING[c])
			return []; //x isn't first rank, or king has moved (shortcut)

		const V = VariantRules;

		// Castling ?
		const oppCol = this.getOppCol(c);
		let moves = [];
		let i = 0;
		const finalSquares = [ [2,3], [6,5] ]; //king, then rook
		castlingCheck:
		for (let castleSide=0; castleSide < 2; castleSide++) //large, then small
		{
			if (!this.flags[c][castleSide])
				continue;
			// If this code is reached, rooks and king are on initial position

			// Nothing on the path of the king (and no checks; OK also if y==finalSquare)?
			let step = finalSquares[castleSide][0] < y ? -1 : 1;
			for (i=y; i!=finalSquares[castleSide][0]; i+=step)
			{
				if (this.isAttacked([x,i], oppCol) || (this.board[x][i] != V.EMPTY &&
					// NOTE: next check is enough, because of chessboard constraints
					(this.getColor(x,i) != c || ![V.KING,V.ROOK].includes(this.getPiece(x,i)))))
				{
					continue castlingCheck;
				}
			}

			// Nothing on the path to the rook?
			step = castleSide == 0 ? -1 : 1;
			for (i = y + step; i != this.INIT_COL_ROOK[c][castleSide]; i += step)
			{
				if (this.board[x][i] != V.EMPTY)
					continue castlingCheck;
			}
			const rookPos = this.INIT_COL_ROOK[c][castleSide];

			// Nothing on final squares, except maybe king and castling rook?
			for (i=0; i<2; i++)
			{
				if (this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
					this.getPiece(x,finalSquares[castleSide][i]) != V.KING &&
					finalSquares[castleSide][i] != rookPos)
				{
					continue castlingCheck;
				}
			}

			// If this code is reached, castle is valid
			let cmove = new Move({
				appear: [
					new PiPo({x:x,y:finalSquares[castleSide][0],p:V.KING,c:c}),
					new PiPo({x:x,y:finalSquares[castleSide][1],p:V.ROOK,c:c})],
				vanish: [
					new PiPo({x:x,y:y,p:V.KING,c:c}),
					new PiPo({x:x,y:rookPos,p:V.ROOK,c:c})],
				end: Math.abs(y - rookPos) <= 2
					? {x:x, y:rookPos}
					: {x:x, y:y + 2 * (castleSide==0 ? -1 : 1)}
			});
			this.applyMagneticLaws([x,finalSquares[castleSide][1]], cmove);
			moves.push(cmove);
		}

		return moves;
	}

	// TODO: verify this assertion
//	atLeastOneMove()
//	{
//		return true; //always at least one possible move
//	}

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
			? [ JSON.parse(JSON.stringify(saveKingPos)) ]
			: [ ];
		this.undo(move);
		return res;
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		const c = this.getColor(move.start.x,move.start.y);
		if (c != this.getColor(move.end.x,move.end.y)
			&& this.board[move.end.x][move.end.y] != VariantRules.EMPTY
			&& this.getPiece(move.end.x,move.end.y) == VariantRules.KING)
		{
			// We took opponent king !
			const oppCol = this.getOppCol(c);
			this.kingPos[oppCol] = [-1,-1];
			this.flags[oppCol] = [false,false];
		}
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		const c = this.getColor(move.start.x,move.start.y);
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
	}

	checkGameOver()
	{
		if (this.checkRepetition())
			return "1/2";

		const color = this.turn;
		// TODO: do we need "atLeastOneMove()"?
		if (this.atLeastOneMove() && this.kingPos[color][0] >= 0)
			return "*";

		return this.checkGameEnd();
	}

	checkGameEnd()
	{
		// No valid move: our king disappeared
		return this.turn == "w" ? "0-1" : "1-0";
	}
}
