class AntikingRules extends ChessRules
{
	// Path to pieces
	static getPpath(b)
	{
		return b[1]=='a' ? "Antiking/"+b : b;
	}

	static get ANTIKING() { return 'a'; }
	
	initVariables(fen)
	{
		super.initVariables(fen);
		this.antikingPos = {'w':[-1,-1], 'b':[-1,-1]};
		const position = fen.split(" ")[0].split("/");
		for (let i=0; i<position.length; i++)
		{
			let k = 0;
			for (let j=0; j<position[i].length; j++)
			{
				switch (position[i].charAt(j))
				{
					case 'a':
						this.antikingPos['b'] = [i,k];
						break;
					case 'A':
						this.antikingPos['w'] = [i,k];
						break;
					default:
						let num = parseInt(position[i].charAt(j));
						if (!isNaN(num))
							k += (num-1);
				}
				k++;
			}
		}
	}

	canTake([x1,y1], [x2,y2])
	{
		const piece1 = this.getPiece(x1,y1);
		const piece2 = this.getPiece(x2,y2);
		const color1 = this.getColor(x1,y1);
		const color2 = this.getColor(x2,y2);
		return piece2 != "a" &&
			((piece1 != "a" && color1 != color2) || (piece1 == "a" && color1 == color2));
	}

	getPotentialMovesFrom([x,y])
	{
		switch (this.getPiece(x,y))
		{
			case VariantRules.ANTIKING:
				return this.getPotentialAntikingMoves([x,y]);
			default:
				return super.getPotentialMovesFrom([x,y]);
		}
	}

	getPotentialAntikingMoves(sq)
	{
		const V = VariantRules;
		return this.getSlideNJumpMoves(sq,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	isAttacked(sq, colors)
	{
		return (super.isAttacked(sq, colors) || this.isAttackedByAntiking(sq, colors));
	}

	isAttackedByKing([x,y], colors)
	{
		const V = VariantRules;
		if (this.getPiece(x,y) == V.ANTIKING)
			return false; //antiking is not attacked by king
		return this.isAttackedBySlideNJump([x,y], colors, V.KING,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	isAttackedByAntiking([x,y], colors)
	{
		const V = VariantRules;
		if ([V.KING,V.ANTIKING].includes(this.getPiece(x,y)))
			return false; //(anti)king is not attacked by antiking
		return this.isAttackedBySlideNJump([x,y], colors, V.ANTIKING,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	underCheck(move)
	{
		const c = this.turn;
		const oppCol = this.getOppCol(c);
		this.play(move)
		let res = this.isAttacked(this.kingPos[c], [oppCol])
			|| !this.isAttacked(this.antikingPos[c], [oppCol]);
		this.undo(move);
		return res;
	}

	getCheckSquares(move)
	{
		let res = super.getCheckSquares(move);
		this.play(move);
		const c = this.turn;
		if (!this.isAttacked(this.antikingPos[c], [this.getOppCol(c)]))
			res.push(JSON.parse(JSON.stringify(this.antikingPos[c])));
		this.undo(move);
		return res;
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		const piece = this.getPiece(move.start.x,move.start.y);
		const c = this.getColor(move.start.x,move.start.y);
		// Update antiking position
		if (piece == VariantRules.ANTIKING)
		{
			this.antikingPos[c][0] = move.appear[0].x;
			this.antikingPos[c][1] = move.appear[0].y;
		}
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		const c = this.getColor(move.start.x,move.start.y);
		if (this.getPiece(move.start.x,move.start.y) == VariantRules.ANTIKING)
			this.antikingPos[c] = [move.start.x, move.start.y];
	}

	checkGameEnd()
	{
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		if (!this.isAttacked(this.kingPos[color], [oppCol])
			&& this.isAttacked(this.antikingPos[color], [oppCol]))
		{
			return "1/2";
		}
		return color == "w" ? "0-1" : "1-0";
	}

	// Pieces values (TODO: use Object.assign() + ChessRules.VALUES ?)
	static get VALUES() {
		return {
			'p': 1,
			'r': 5,
			'n': 3,
			'b': 3,
			'q': 9,
			'k': 1000,
			'a': 1000
		};
	}

	static GenRandInitFen()
	{
		let randFen = ChessRules.GenRandInitFen();
		// Black side
		let antikingPos = _.random(7);
		let ranks23 = "pppppppp/" + (antikingPos>0?antikingPos:"") + "A" + (antikingPos<7?7-antikingPos:"");
		randFen = randFen.replace("pppppppp/8", ranks23);
		// White side
		antikingPos = _.random(7);
		ranks23 = (antikingPos>0?antikingPos:"") + "a" + (antikingPos<7?7-antikingPos:"") + "/PPPPPPPP";
		randFen = randFen.replace("8/PPPPPPPP", ranks23);
		return randFen;
	}
}
