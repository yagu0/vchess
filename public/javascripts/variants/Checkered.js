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
		// Tolerate upper-case versions of checkered pieces (why not?)
		const checkered_pieces = {
			's': 'p',
			'S': 'p',
			't': 'q',
			'T': 'q',
			'u': 'r',
			'U': 'r',
			'c': 'b',
			'C': 'b',
			'o': 'n',
			'O': 'n',
		};
		if (Object.keys(checkered_pieces).includes(f))
			return 'c'+checkered_pieces[f];
		return ChessRules.fen2board(f);
	}

	static get PIECES()
	{
		return ChessRules.PIECES.concat(['s','t','u','c','o']);
	}

	static IsGoodFlags(flags)
	{
		// 4 for castle + 16 for pawns
		return !!flags.match(/^[01]{20,20}$/);
	}

	setFlags(fenflags)
	{
		super.setFlags(fenflags); //castleFlags
		this.pawnFlags =
		{
			"w": _.map(_.range(8), i => true), //pawns can move 2 squares?
			"b": _.map(_.range(8), i => true)
		};
		if (!fenflags)
			return;
		const flags = fenflags.substr(4); //skip first 4 digits, for castle
		for (let c of ['w','b'])
		{
			for (let i=0; i<8; i++)
				this.pawnFlags[c][i] = (flags.charAt((c=='w'?0:8)+i) == '1');
		}
	}

	aggregateFlags()
	{
		return [this.castleFlags, this.pawnFlags];
	}

	disaggregateFlags(flags)
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
		if (this.getPiece(x,y) == V.KING)
			return standardMoves; //king has to be treated differently (for castles)
		let moves = [];
		standardMoves.forEach(m => {
			if (m.vanish[0].p == V.PAWN)
			{
				if (Math.abs(m.end.x-m.start.x)==2 && !this.pawnFlags[this.turn][m.start.y])
					return; //skip forbidden 2-squares jumps
				if (this.board[m.end.x][m.end.y] == V.EMPTY && m.vanish.length==2
					&& this.getColor(m.start.x,m.start.y) == 'c')
				{
					return; //checkered pawns cannot take en-passant
				}
			}
			if (m.vanish.length == 1)
				moves.push(m); //no capture
			else
			{
				// A capture occured (m.vanish.length == 2)
				m.appear[0].c = "c";
				moves.push(m);
				if (m.appear[0].p != m.vanish[1].p //avoid promotions (already treated):
					&& (m.vanish[0].p != V.PAWN || m.end.x != lastRank))
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
		return (side == this.turn && [side,'c'].includes(this.getColor(x,y)));
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
			this.play(m);
			const res = !this.underCheck(color);
			this.undo(m);
			return res;
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
					if (y+i>=0 && y+i<8 && this.getPiece(x+pawnShift,y+i)==V.PAWN
						&& this.getColor(x+pawnShift,y+i)==c)
					{
						return true;
					}
				}
			}
		}
		return false;
	}

	underCheck(color)
	{
		return this.isAttacked(this.kingPos[color], [this.getOppCol(color),'c']);
	}

	getCheckSquares(color)
	{
		// Artifically change turn, for checkered pawns
		this.turn = this.getOppCol(color);
		const kingAttacked = this.isAttacked(
			this.kingPos[color], [this.getOppCol(color),'c']);
		let res = kingAttacked
			? [JSON.parse(JSON.stringify(this.kingPos[color]))] //need to duplicate!
			: [];
		this.turn = color;
		return res;
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		// Does this move turn off a 2-squares pawn flag?
		const secondRank = [1,6];
		if (secondRank.includes(move.start.x) && move.vanish[0].p == V.PAWN)
			this.pawnFlags[move.start.x==6 ? "w" : "b"][move.start.y] = false;
	}

	checkGameEnd()
	{
		const color = this.turn;
		// Artifically change turn, for checkered pawns
		this.turn = this.getOppCol(this.turn);
		const res = this.isAttacked(this.kingPos[color], [this.getOppCol(color),'c'])
			? (color == "w" ? "0-1" : "1-0")
			: "1/2";
		this.turn = this.getOppCol(this.turn);
		return res;
	}

	evalPosition()
	{
		let evaluation = 0;
		//Just count material for now, considering checkered neutral (...)
		for (let i=0; i<V.size.x; i++)
		{
			for (let j=0; j<V.size.y; j++)
			{
				if (this.board[i][j] != V.EMPTY)
				{
					const sqColor = this.getColor(i,j);
					const sign = sqColor == "w" ? 1 : (sqColor=="b" ? -1 : 0);
					evaluation += sign * V.VALUES[this.getPiece(i,j)];
				}
			}
		}
		return evaluation;
	}

	static GenRandInitFen()
	{
		const randFen = ChessRules.GenRandInitFen();
		// Add 16 pawns flags:
		return randFen.replace(" w 1111", " w 11111111111111111111");
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
		const finalSquare = V.CoordsToSquare(move.end);

		const piece = this.getPiece(move.start.x, move.start.y);
		if (piece == V.PAWN)
		{
			// Pawn move
			let notation = "";
			if (move.vanish.length > 1)
			{
				// Capture
				const startColumn = V.GetColumn(move.start.y);
				notation = startColumn + "x" + finalSquare +
					"=" + move.appear[0].p.toUpperCase();
			}
			else //no capture
			{
				notation = finalSquare;
				if (move.appear.length > 0 && piece != move.appear[0].p) //promotion
					notation += "=" + move.appear[0].p.toUpperCase();
			}
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

const VariantRules = CheckeredRules;
