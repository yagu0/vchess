class CheckeredRules extends ChessRules
{
	// Path to pieces
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

	initVariables(fen)
	{
		super.initVariables(fen);
		// Decode last non-capturing checkered move (if any)
		// TODO: since now we store moves list, this can disappear
		const cmove = fen.split(" ")[4];
		if (cmove != "-")
		{
			const piece = cmove.charAt(0);
			const startEnd = cmove.substr(1).split(";");
			const start = startEnd[0].split(",");
			const end = startEnd[1].split(",");
			this.moves.push(new Move({
				appear: [ new PiPo({c:"c", p:piece, x:end[0], y:end[1]}) ],
				vanish: [ new PiPo({c:"c", p:piece, x:start[0], y:start[1]}) ]
			}));
		}
	}

	static GetFlags(fen)
	{
		let flags = [
			ChessRules.GetFlags(fen), //castle
			{
				"w": new Array(8), //pawns can move 2 squares
				"b": new Array(8)
			}
		];
		const fenFlags = fen.split(" ")[1].substr(4); //skip first 4 digits, for castle
		for (let c of ['w','b'])
		{
			for (let i=0; i<8; i++)
				flags[1][c][i] = (fenFlags.charAt((c=='w'?0:8)+i) == '1');
		}
		return flags;
	}

	// can color1 take color2?
	canTake(color1, color2)
	{
		// Checkered aren't captured
		return color1 != color2 && color2 != 'c' && (color1 != 'c' || color2 != this.turn);
	}

	// Build regular move(s) from its initial and destination squares; tr: transformation
	getBasicMove(sx, sy, ex, ey, tr)
	{
		if (this.board[ex][ey] == VariantRules.EMPTY)
		{
			// No capture, standard move construction
			return [super.getBasicMove(sx,sy,ex,ey,tr)];
		}
		let moves = []; //captures: generally 2 choices, unless 'tr' is specified or piece==king
		const startPiece = this.getPiece(sx,sy);
		const endPiece = this.getPiece(ex,ey);
		const startColor = this.getColor(sx,sy);
		const endColor = this.getColor(ex,ey);
		for (let piece of !!tr ? [tr] :
			(startPiece==VariantRules.KING ? VariantRules.KING : _.uniq([startPiece,endPiece])))
		{
			var mv = new Move({
				appear: [
					new PiPo({
						x: ex,
						y: ey,
						c: startPiece==VariantRules.KING ? startColor : 'c',
						p: piece
					})
				],
				vanish: [
					new PiPo({
						x: sx,
						y: sy,
						c: startColor,
						p: startPiece
					}),
					new PiPo({
						x: ex,
						y: ey,
						c: endColor,
						p: endPiece
					})
				]
			});
			moves.push(mv);
		}
		return moves;
	}

	// Generic method to find possible moves of non-pawn pieces ("sliding or jumping")
	getSlideNJumpMoves(x, y, color, steps, oneStep)
	{
		var moves = [];
		let [sizeX,sizeY] = VariantRules.size;
		outerLoop:
		for (var loop=0; loop<steps.length; loop++)
		{
			var step = steps[loop];
			var i = x + step[0];
			var j = y + step[1];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY
				&& this.board[i][j] == VariantRules.EMPTY)
			{
				moves.push(this.getBasicMove(x, y, i, j)[0]); //no capture
				if (oneStep !== undefined)
					continue outerLoop;
				i += step[0];
				j += step[1];
			}
			if (i>=0 && i<8 && j>=0 && j<8 && this.canTake(color, this.getColor(i,j)))
				moves = moves.concat(this.getBasicMove(x, y, i, j));
		}
		return moves;
	}

	// What are the pawn moves from square x,y considering color "color" ?
	getPotentialPawnMoves(x, y, color)
	{
		var moves = [];
		var V = VariantRules;
		let [sizeX,sizeY] = VariantRules.size;
		const c = (color == 'c' ? this.turn : color);
		const shift = (c == "w" ? -1 : 1);
		let startRank = (c == "w" ? sizeY-2 : 1);
		let lastRank = (c == "w" ? 0 : sizeY-1);

		if (x+shift >= 0 && x+shift < sizeX && x+shift != lastRank)
		{
			// Normal moves
			if (this.board[x+shift][y] == V.EMPTY)
			{
				moves.push(this.getBasicMove(x, y, x+shift, y)[0]);
				if (x==startRank && this.board[x+2*shift][y] == V.EMPTY && this.flags[1][c][y])
				{
					// Two squares jump
					moves.push(this.getBasicMove(x, y, x+2*shift, y)[0]);
				}
			}
			// Captures
			if (y>0 && this.canTake(this.getColor(x,y), this.getColor(x+shift,y-1))
				&& this.board[x+shift][y-1] != V.EMPTY)
			{
				moves = moves.concat(this.getBasicMove(x, y, x+shift, y-1));
			}
			if (y<sizeY-1 && this.canTake(this.getColor(x,y), this.getColor(x+shift,y+1))
				&& this.board[x+shift][y+1] != V.EMPTY)
			{
				moves = moves.concat(this.getBasicMove(x, y, x+shift, y+1));
			}
		}

		if (x+shift == lastRank)
		{
			// Promotion
			let promotionPieces = [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN];
			promotionPieces.forEach(p => {
				// Normal move
				if (this.board[x+shift][y] == V.EMPTY)
					moves.push(this.getBasicMove(x, y, x+shift, y, p)[0]);
				// Captures
				if (y>0 && this.canTake(this.getColor(x,y), this.getColor(x+shift,y-1))
					&& this.board[x+shift][y-1] != V.EMPTY)
				{
					moves = moves.concat(this.getBasicMove(x, y, x+shift, y-1, p));
				}
				if (y<sizeY-1 && this.canTake(this.getColor(x,y), this.getColor(x+shift,y+1))
					&& this.board[x+shift][y+1] != V.EMPTY)
				{
					moves = moves.concat(this.getBasicMove(x, y, x+shift, y+1, p));
				}
			});
		}

		// En passant
		const Lep = this.epSquares.length;
		const epSquare = Lep>0 ? this.epSquares[Lep-1] : undefined;
		if (!!epSquare && epSquare.x == x+shift && Math.abs(epSquare.y - y) == 1)
		{
			let epStep = epSquare.y - y;
			var enpassantMove = this.getBasicMove(x, y, x+shift, y+epStep)[0];
			enpassantMove.vanish.push({
				x: x,
				y: y+epStep,
				p: 'p',
				c: this.getColor(x,y+epStep)
			});
			enpassantMove.appear[0].c = 'c';
			moves.push(enpassantMove);
		}

		return moves;
	}

	getCastleMoves(x,y,c)
	{
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
			if (!this.flags[0][c][castleSide])
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
			moves.push( new Move({
				appear: [
					new PiPo({x:x,y:finalSquares[castleSide][0],p:V.KING,c:c}),
					new PiPo({x:x,y:finalSquares[castleSide][1],p:V.ROOK,c:c})],
				vanish: [
					new PiPo({x:x,y:y,p:V.KING,c:c}),
					new PiPo({x:x,y:rookPos,p:V.ROOK,c:c})],
				end: Math.abs(y - rookPos) <= 2
					? {x:x, y:rookPos}
					: {x:x, y:y + 2 * (castleSide==0 ? -1 : 1)}
			}) );
		}

		return moves;
	}

	canIplay(color, sq)
	{
		return ((color=='w' && this.movesCount%2==0) || color=='c'
				|| (color=='b' && this.movesCount%2==1))
			&& [color,'c'].includes(this.getColor(sq[0], sq[1]));
	}

	// Does m2 un-do m1 ? (to disallow undoing checkered moves)
	oppositeMoves(m1, m2)
	{
		return m1.appear.length == 1 && m2.appear.length == 1
			&& m1.vanish.length == 1 && m2.vanish.length == 1
//			&& _.isEqual(m1.appear[0], m2.vanish[0]) //fails in HH case
//			&& _.isEqual(m1.vanish[0], m2.appear[0]);
			&& m1.start.x == m2.end.x && m1.end.x == m2.start.x
			&& m1.start.y == m2.end.y && m1.end.y == m2.start.y
			&& m1.appear[0].c == m2.vanish[0].c && m1.appear[0].p == m2.vanish[0].p
			&& m1.vanish[0].c == m2.appear[0].c && m1.vanish[0].p == m2.appear[0].p;
	}

	filterValid(moves)
	{
		if (moves.length == 0)
			return [];
		let color = this.getColor( moves[0].start.x, moves[0].start.y );
		return moves.filter(m => {
			const L = this.moves.length;
			if (L > 0 && this.oppositeMoves(this.moves[L-1], m))
				return false;
			return !this.underCheck(m, color);
		});
	}

  isAttackedByPawn([x,y], c)
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
    return false;
  }

	underCheck(move, c)
	{
		const color = c == 'c' ? this.turn : c;
		this.play(move);
		let res = this.isAttacked(this.kingPos[color], this.getOppCol(color))
			|| this.isAttacked(this.kingPos[color], 'c'); //TODO: quite inefficient...
		this.undo(move);
		return res;
	}

	getCheckSquares(move, c)
	{
		this.play(move);
		const kingAttacked = this.isAttacked(this.kingPos[c], this.getOppCol(c))
			|| this.isAttacked(this.kingPos[c], 'c');
		let res = kingAttacked
			? [ JSON.parse(JSON.stringify(this.kingPos[c])) ] //need to duplicate!
			: [ ];
		this.undo(move);
		return res;
	}

	updateVariables(move)
	{
		const piece = this.getPiece(move.start.x,move.start.y);
		const c = this.getColor(move.start.x,move.start.y);

		if (c != 'c') //checkered not concerned by castle flags
		{
			const firstRank = (c == "w" ? 7 : 0);
			// Update king position + flags
			if (piece == VariantRules.KING && move.appear.length > 0)
			{
				this.kingPos[c][0] = move.appear[0].x;
				this.kingPos[c][1] = move.appear[0].y;
				this.flags[0][c] = [false,false];
				return;
			}
			const oppCol = this.getOppCol(c);
			const oppFirstRank = 7 - firstRank;
			if (move.start.x == firstRank //our rook moves?
				&& this.INIT_COL_ROOK[c].includes(move.start.y))
			{
				const flagIdx = move.start.y == this.INIT_COL_ROOK[c][0] ? 0 : 1;
				this.flags[0][c][flagIdx] = false;
			}
			else if (move.end.x == oppFirstRank //we took opponent rook?
				&& this.INIT_COL_ROOK[c].includes(move.end.y))
			{
				const flagIdx = move.end.y == this.INIT_COL_ROOK[oppCol][0] ? 0 : 1;
				this.flags[0][oppCol][flagIdx] = false;
			}
		}

		// Does it turn off a 2-squares pawn flag?
		const secondRank = [1,6];
		if (secondRank.includes(move.start.x) && move.vanish[0].p == VariantRules.PAWN)
			this.flags[1][move.start.x==6 ? "w" : "b"][move.start.y] = false;
	}

	play(move, ingame)
	{
		super.play(move, ingame);
		if (!ingame)
			this.moves.push(move); //needed for turn indication for checkered pieces
	}

	undo(move)
	{
		super.undo(move);
		this.moves.pop();
	}

	checkGameEnd(color)
	{
		if (!this.isAttacked(this.kingPos[color], this.getOppCol(color))
			&& !this.isAttacked(this.kingPos[color], 'c'))
		{
			return "1/2";
		}
		// OK, checkmate
		return color == "w" ? "0-1" : "1-0";
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
		let fen = ChessRules.GenRandInitFen();
		return fen.replace(/ - 0$/, "1111111111111111 - 0 -");
	}

	getFen()
	{
		let fen = super.getFen() + " ";
		const L = this.moves.length;
		if (L > 0 && this.moves[L-1].vanish.length==1 && this.moves[L-1].appear[0].c=="c")
		{
			// Ok, un-cancellable checkered move
			fen += this.moves[L-1].appear[0].p
				+ this.moves[L-1].start.x + "," + this.moves[L-1].start.y + ";"
				+ this.moves[L-1].end.x + "," + this.moves[L-1].end.y;
		}
		else fen += "-";
		return fen;
	}

	getFlagsFen()
	{
		let fen = "";
		// Add castling flags
		for (let c of ['w','b'])
		{
			for (let i=0; i<2; i++)
				fen += this.flags[0][c][i] ? '1' : '0';
		}
		// Add pawns flags
		for (let c of ['w','b'])
		{
			for (let i=0; i<8; i++)
				fen += this.flags[1][c][i] ? '1' : '0';
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
