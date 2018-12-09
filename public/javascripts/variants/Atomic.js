class AtomicRules extends ChessRules
{
	getPotentialMovesFrom([x,y])
	{
		let moves = super.getPotentialMovesFrom([x,y]);

		// Handle explosions
		moves.forEach(m => {
			if (m.vanish.length > 1 && m.appear.length <= 1) //avoid castles
			{
				// Explosion! TODO: drop moves which explode our king here
				let steps = [ [-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1] ];
				for (let step of steps)
				{
					let x = m.end.x + step[0];
					let y = m.end.y + step[1];
					if (x>=0 && x<8 && y>=0 && y<8 && this.board[x][y] != VariantRules.EMPTY
						&& this.getPiece(x,y) != VariantRules.PAWN)
					{
						m.vanish.push(new PiPo({p:this.getPiece(x,y),c:this.getColor(x,y),x:x,y:y}));
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
		const V = VariantRules;
		// King cannot capture:
		let moves = [];
		let [sizeX,sizeY] = V.size;
		const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		for (let step of steps)
		{
			var i = x + step[0];
			var j = y + step[1];
			if (i>=0 && i<sizeX && j>=0 && j<sizeY && this.board[i][j] == VariantRules.EMPTY)
				moves.push(this.getBasicMove([x,y], [i,j]));
		}
		return moves.concat(this.getCastleMoves([x,y]));
	}

	isAttacked(sq, colors)
	{
		if (this.getPiece(sq[0],sq[1]) == VariantRules.KING && this.isAttackedByKing(sq, colors))
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
		const color = this.getColor(move.start.x,move.start.y);
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
		const c = this.getColor(move.start.x,move.start.y);
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

	underCheck(move)
	{
		const c = this.turn;
		const oppCol = this.getOppCol(c);
		this.play(move);
		let res = undefined;
		// If our king disappeared, move is not valid
		if (this.kingPos[c][0] < 0)
			res = true;
		// If opponent king disappeared, move is valid
		else if (this.kingPos[oppCol][0] < 0)
			res = false;
		// Otherwise, if we remain under check, move is not valid
		else
			res = this.isAttacked(this.kingPos[c], [oppCol]);
		this.undo(move);
		return res;
	}

	getCheckSquares(move)
	{
		const c = this.getOppCol(this.turn);
		// King might explode:
		const saveKingPos = JSON.parse(JSON.stringify(this.kingPos[c]));
		this.play(move);
		let res = [ ];
		if (this.kingPos[c][0] < 0)
			res = [saveKingPos];
		else if (this.isAttacked(this.kingPos[c], [this.getOppCol(c)]))
			res = [ JSON.parse(JSON.stringify(this.kingPos[c])) ]
		this.undo(move);
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
		// Checkmate
		return color == "w" ? "0-1" : "1-0";
	}
}
