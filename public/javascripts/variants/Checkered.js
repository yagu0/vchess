class CheckeredRules extends ChessRules
{
	static getPpath(b)
	{
		return b[0]=='c' ? "Checkered/"+b : b;
	}
	static board2fen(b)
	{
		const checkered_codes = {
			'p': 's',
			'q': 't',
			'r': 'u',
			'b': 'c',
			'n': 'o',
		};
		if (b[0]=="c")
			return checkered_codes[b[1]];
		return ChessRules.board2fen(b);
	}
	static fen2board(f)
	{
		const checkered_pieces = {
			's': 'p',
			't': 'q',
			'u': 'r',
			'c': 'b',
			'o': 'n',
		};
		if (Object.keys(checkered_pieces).includes(f))
			return 'c'+checkered_pieces[f];
		return ChessRules.fen2board(f);
	}

	setFlags(fen)
	{
		super.setFlags(fen); //castleFlags
		this.pawnFlags =
		{
			"w": new Array(8), //pawns can move 2 squares?
			"b": new Array(8)
		};
		const flags = fen.split(" ")[1].substr(4); //skip first 4 digits, for castle
		for (let c of ['w','b'])
		{
			for (let i=0; i<8; i++)
				this.pawnFlags[c][i] = (flags.charAt((c=='w'?0:8)+i) == '1');
		}
	}

	// Aggregates flags into one object
	get flags() {
		return [this.castleFlags, this.pawnFlags];
	}

	// Reverse operation
	parseFlags(flags)
	{
		this.castleFlags = flags[0];
		this.pawnFlags = flags[1];
	}

	canTake([x1,y1], [x2,y2])
	{
		const color1 = this.getColor(x1,y1);
		const color2 = this.getColor(x2,y2);
		// Checkered aren't captured
		return color1 != color2 && color2 != 'c' && (color1 != 'c' || color2 != this.turn);
	}

	// Post-processing: apply "checkerization" of standard moves
	getPotentialMovesFrom([x,y])
	{
		let standardMoves = super.getPotentialMovesFrom([x,y]);
		const lastRank = this.turn == "w" ? 0 : 7;
		if (this.getPiece(x,y) == VariantRules.KING)
			return standardMoves; //king has to be treated differently (for castles)
		let moves = [];
		standardMoves.forEach(m => {
			if (m.vanish[0].p == VariantRules.PAWN && Math.abs(m.end.x-m.start.x)==2
				&& !this.pawnFlags[this.turn][m.start.y])
			{
				return; //skip forbidden 2-squares jumps
			}
			if (m.vanish.length == 1)
				moves.push(m); //no capture
			else
			{
				// A capture occured (m.vanish.length == 2)
				m.appear[0].c = "c";
				moves.push(m);
				if (m.appear[0].p != m.vanish[1].p //avoid promotions (already treated):
					&& (m.vanish[0].p != VariantRules.PAWN || m.end.x != lastRank))
				{
					// Add transformation into captured piece
					let m2 = JSON.parse(JSON.stringify(m));
					m2.appear[0].p = m.vanish[1].p;
					moves.push(m2);
				}
			}
		});
		return moves;
	}

	canIplay(side, [x,y])
	{
		return ((side=='w' && this.moves.length%2==0) || (side=='b' && this.moves.length%2==1))
			&& [side,'c'].includes(this.getColor(x,y));
	}

	// Does m2 un-do m1 ? (to disallow undoing checkered moves)
	oppositeMoves(m1, m2)
	{
		return m1.appear.length == 1 && m2.appear.length == 1
			&& m1.vanish.length == 1 && m2.vanish.length == 1
			&& m1.start.x == m2.end.x && m1.end.x == m2.start.x
			&& m1.start.y == m2.end.y && m1.end.y == m2.start.y
			&& m1.appear[0].c == m2.vanish[0].c && m1.appear[0].p == m2.vanish[0].p
			&& m1.vanish[0].c == m2.appear[0].c && m1.vanish[0].p == m2.appear[0].p;
	}

	filterValid(moves)
	{
		if (moves.length == 0)
			return [];
		const color = this.turn;
		return moves.filter(m => {
			const L = this.moves.length;
			if (L > 0 && this.oppositeMoves(this.moves[L-1], m))
				return false;
			return !this.underCheck(m);
		});
	}

	isAttackedByPawn([x,y], colors)
	{
		for (let c of colors)
		{
			const color = (c=="c" ? this.turn : c);
			let pawnShift = (color=="w" ? 1 : -1);
			if (x+pawnShift>=0 && x+pawnShift<8)
			{
				for (let i of [-1,1])
				{
					if (y+i>=0 && y+i<8 && this.getPiece(x+pawnShift,y+i)==VariantRules.PAWN
						&& this.getColor(x+pawnShift,y+i)==c)
					{
						return true;
					}
				}
			}
		}
		return false;
	}

	underCheck(move)
	{
		const color = this.turn;
		this.play(move);
		let res = this.isAttacked(this.kingPos[color], [this.getOppCol(color),'c']);
		this.undo(move);
		return res;
	}

	getCheckSquares(move)
	{
		this.play(move);
		const color = this.turn;
		this.moves.push(move); //artifically change turn, for checkered pawns (TODO)
		const kingAttacked = this.isAttacked(this.kingPos[color], [this.getOppCol(color),'c']);
		let res = kingAttacked
			? [ JSON.parse(JSON.stringify(this.kingPos[color])) ] //need to duplicate!
			: [ ];
		this.moves.pop();
		this.undo(move);
		return res;
	}

	updateVariables(move)
	{
		const c = this.getColor(move.start.x,move.start.y);
		if (c != 'c') //checkered not concerned by castle flags
			super.updateVariables(move);

		// Does it turn off a 2-squares pawn flag?
		const secondRank = [1,6];
		if (secondRank.includes(move.start.x) && move.vanish[0].p == VariantRules.PAWN)
			this.pawnFlags[move.start.x==6 ? "w" : "b"][move.start.y] = false;
	}

	checkGameEnd()
	{
		const color = this.turn;
		this.moves.length++; //artifically change turn, for checkered pawns (TODO)
		const res = this.isAttacked(this.kingPos[color], [this.getOppCol(color),'c'])
			? (color == "w" ? "0-1" : "1-0")
			: "1/2";
		this.moves.length--;
		return res;
	}

	evalPosition()
	{
		const [sizeX,sizeY] = VariantRules.size;
		let evaluation = 0;
		//Just count material for now, considering checkered neutral (...)
		for (let i=0; i<sizeX; i++)
		{
			for (let j=0; j<sizeY; j++)
			{
				if (this.board[i][j] != VariantRules.EMPTY)
				{
					const sqColor = this.getColor(i,j);
					const sign = sqColor == "w" ? 1 : (sqColor=="b" ? -1 : 0);
					evaluation += sign * VariantRules.VALUES[this.getPiece(i,j)];
				}
			}
		}
		return evaluation;
	}

	static GenRandInitFen()
	{
		return ChessRules.GenRandInitFen() + "1111111111111111"; //add 16 pawns flags
	}

	getFlagsFen()
	{
		let fen = super.getFlagsFen();
		// Add pawns flags
		for (let c of ['w','b'])
		{
			for (let i=0; i<8; i++)
				fen += this.pawnFlags[c][i] ? '1' : '0';
		}
		return fen;
	}

	getNotation(move)
	{
		if (move.appear.length == 2)
		{
			// Castle
			if (move.end.y < move.start.y)
				return "0-0-0";
			else
				return "0-0";
		}

		// Translate final square
		let finalSquare =
			String.fromCharCode(97 + move.end.y) + (VariantRules.size[0]-move.end.x);

		let piece = this.getPiece(move.start.x, move.start.y);
		if (piece == VariantRules.PAWN)
		{
			// Pawn move
			let notation = "";
			if (move.vanish.length > 1)
			{
				// Capture
				let startColumn = String.fromCharCode(97 + move.start.y);
				notation = startColumn + "x" + finalSquare + "=" + move.appear[0].p.toUpperCase();
			}
			else //no capture
				notation = finalSquare;
			if (move.appear.length > 0 && piece != move.appear[0].p) //promotion
				notation += "=" + move.appear[0].p.toUpperCase();
			return notation;
		}

		else
		{
			// Piece movement
			return piece.toUpperCase() + (move.vanish.length > 1 ? "x" : "") + finalSquare
				+ (move.vanish.length > 1 ? "=" + move.appear[0].p.toUpperCase() : "");
		}
	}
}
