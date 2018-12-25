class AtomicRules extends ChessRules
{
	getPotentialMovesFrom([x,y])
	{
		let moves = super.getPotentialMovesFrom([x,y]);

		// Handle explosions
		moves.forEach(m => {
			if (m.vanish.length > 1 && m.appear.length <= 1) //avoid castles
			{
				// Explosion! TODO(?): drop moves which explode our king here
				let steps = [ [-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1] ];
				for (let step of steps)
				{
					let x = m.end.x + step[0];
					let y = m.end.y + step[1];
					if (V.OnBoard(x,y) && this.board[x][y] != V.EMPTY
						&& this.getPiece(x,y) != V.PAWN)
					{
						m.vanish.push(
							new PiPo({p:this.getPiece(x,y),c:this.getColor(x,y),x:x,y:y}));
					}
				}
				m.end = {x:m.appear[0].x, y:m.appear[0].y};
				m.appear.pop(); //Nothin appears in this case
			}
		});

		return moves;
	}

	getPotentialKingMoves([x,y])
	{
		// King cannot capture:
		let moves = [];
		const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		for (let step of steps)
		{
			const i = x + step[0];
			const j = y + step[1];
			if (V.OnBoard(i,j) && this.board[i][j] == V.EMPTY)
				moves.push(this.getBasicMove([x,y], [i,j]));
		}
		return moves.concat(this.getCastleMoves([x,y]));
	}

	isAttacked(sq, colors)
	{
		if (this.getPiece(sq[0],sq[1]) == V.KING && this.isAttackedByKing(sq, colors))
			return false; //king cannot take...
		return (this.isAttackedByPawn(sq, colors)
			|| this.isAttackedByRook(sq, colors)
			|| this.isAttackedByKnight(sq, colors)
			|| this.isAttackedByBishop(sq, colors)
			|| this.isAttackedByQueen(sq, colors));
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		const color = move.vanish[0].c;
		if (move.appear.length == 0) //capture
		{
			const firstRank = {"w": 7, "b": 0};
			for (let c of ["w","b"])
			{
				// Did we explode king of color c ? (TODO: remove move earlier)
				if (Math.abs(this.kingPos[c][0]-move.end.x) <= 1
					&& Math.abs(this.kingPos[c][1]-move.end.y) <= 1)
				{
					this.kingPos[c] = [-1,-1];
					this.castleFlags[c] = [false,false];
				}
				else
				{
					// Now check if init rook(s) exploded
					if (Math.abs(move.end.x-firstRank[c]) <= 1)
					{
						if (Math.abs(move.end.y-this.INIT_COL_ROOK[c][0]) <= 1)
							this.castleFlags[c][0] = false;
						if (Math.abs(move.end.y-this.INIT_COL_ROOK[c][1]) <= 1)
							this.castleFlags[c][1] = false;
					}
				}
			}
		}
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		const c = move.vanish[0].c;
		const oppCol = this.getOppCol(c);
		if ([this.kingPos[c][0],this.kingPos[oppCol][0]].some(e => { return e < 0; }))
		{
			// There is a chance that last move blowed some king away..
			for (let psq of move.vanish)
			{
				if (psq.p == 'k')
					this.kingPos[psq.c==c ? c : oppCol] = [psq.x, psq.y];
			}
		}
	}

	underCheck(color)
	{
		const oppCol = this.getOppCol(color);
		let res = undefined;
		// If our king disappeared, move is not valid
		if (this.kingPos[color][0] < 0)
			res = true;
		// If opponent king disappeared, move is valid
		else if (this.kingPos[oppCol][0] < 0)
			res = false;
		// Otherwise, if we remain under check, move is not valid
		else
			res = this.isAttacked(this.kingPos[color], [oppCol]);
		return res;
	}

	getCheckSquares(color)
	{
		let res = [ ];
		if (this.kingPos[color][0] >= 0 //king might have exploded
			&& this.isAttacked(this.kingPos[color], [this.getOppCol(color)]))
		{
			res = [ JSON.parse(JSON.stringify(this.kingPos[color])) ]
		}
		return res;
	}

	checkGameEnd()
	{
		const color = this.turn;
		const kp = this.kingPos[color];
		if (kp[0] < 0) //king disappeared
			return color == "w" ? "0-1" : "1-0";
		if (!this.isAttacked(kp, [this.getOppCol(color)]))
			return "1/2";
		return color == "w" ? "0-1" : "1-0"; //checkmate
	}
}

const VariantRules = AtomicRules;
