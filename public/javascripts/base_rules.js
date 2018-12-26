// (Orthodox) Chess rules are defined in ChessRules class.
// Variants generally inherit from it, and modify some parts.

class PiPo //Piece+Position
{
	// o: {piece[p], color[c], posX[x], posY[y]}
	constructor(o)
	{
		this.p = o.p;
		this.c = o.c;
		this.x = o.x;
		this.y = o.y;
	}
}

// TODO: for animation, moves should contains "moving" and "fading" maybe...
class Move
{
	// o: {appear, vanish, [start,] [end,]}
	// appear,vanish = arrays of PiPo
	// start,end = coordinates to apply to trigger move visually (think castle)
	constructor(o)
	{
		this.appear = o.appear;
		this.vanish = o.vanish;
		this.start = !!o.start ? o.start : {x:o.vanish[0].x, y:o.vanish[0].y};
		this.end = !!o.end ? o.end : {x:o.appear[0].x, y:o.appear[0].y};
	}
}

// NOTE: x coords = top to bottom; y = left to right (from white player perspective)
class ChessRules
{
	//////////////
	// MISC UTILS

	static get HasFlags() { return true; } //some variants don't have flags

	static get HasEnpassant() { return true; } //some variants don't have ep.

	// Path to pieces
	static getPpath(b)
	{
		return b; //usual pieces in pieces/ folder
	}

	// Turn "wb" into "B" (for FEN)
	static board2fen(b)
	{
		return b[0]=='w' ? b[1].toUpperCase() : b[1];
	}

	// Turn "p" into "bp" (for board)
	static fen2board(f)
	{
		return f.charCodeAt()<=90 ? "w"+f.toLowerCase() : "b"+f;
	}

	// Check if FEN describe a position
	static IsGoodFen(fen)
	{
		const fenParsed = V.ParseFen(fen);
		// 1) Check position
		if (!V.IsGoodPosition(fenParsed.position))
			return false;
		// 2) Check turn
		if (!fenParsed.turn || !V.IsGoodTurn(fenParsed.turn))
			return false;
		// 3) Check flags
		if (V.HasFlags && (!fenParsed.flags || !V.IsGoodFlags(fenParsed.flags)))
			return false;
		// 4) Check enpassant
		if (V.HasEnpassant &&
			(!fenParsed.enpassant || !V.IsGoodEnpassant(fenParsed.enpassant)))
		{
			return false;
		}
		return true;
	}

	// Is position part of the FEN a priori correct?
	static IsGoodPosition(position)
	{
		if (position.length == 0)
			return false;
		const rows = position.split("/");
		if (rows.length != V.size.x)
			return false;
		for (let row of rows)
		{
			let sumElts = 0;
			for (let i=0; i<row.length; i++)
			{
				if (V.PIECES.includes(row[i].toLowerCase()))
					sumElts++;
				else
				{
					const num = parseInt(row[i]);
					if (isNaN(num))
						return false;
					sumElts += num;
				}
			}
			if (sumElts != V.size.y)
				return false;
		}
		return true;
	}

	// For FEN checking
	static IsGoodTurn(turn)
	{
		return ["w","b"].includes(turn);
	}

	// For FEN checking
	static IsGoodFlags(flags)
	{
		return !!flags.match(/^[01]{4,4}$/);
	}

	static IsGoodEnpassant(enpassant)
	{
		if (enpassant != "-")
		{
			const ep = V.SquareToCoords(fenParsed.enpassant);
			if (isNaN(ep.x) || !V.OnBoard(ep))
				return false;
		}
		return true;
	}

	// 3 --> d (column number to letter)
	static CoordToColumn(colnum)
	{
		return String.fromCharCode(97 + colnum);
	}

	// d --> 3 (column letter to number)
	static ColumnToCoord(colnum)
	{
		return String.fromCharCode(97 + colnum);
	}

	// a4 --> {x:3,y:0}
	static SquareToCoords(sq)
	{
		return {
			// NOTE: column is always one char => max 26 columns
			// row is counted from black side => subtraction
			x: V.size.x - parseInt(sq.substr(1)),
			y: sq[0].charCodeAt() - 97
		};
	}

	// {x:0,y:4} --> e8
	static CoordsToSquare(coords)
	{
		return V.CoordToColumn(coords.y) + (V.size.x - coords.x);
	}

	// Aggregates flags into one object
	aggregateFlags()
	{
		return this.castleFlags;
	}

	// Reverse operation
	disaggregateFlags(flags)
	{
		this.castleFlags = flags;
	}

	// En-passant square, if any
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
		const [sx,sy,ex] = [move.start.x,move.start.y,move.end.x];
		if (this.getPiece(sx,sy) == V.PAWN && Math.abs(sx - ex) == 2)
		{
			return {
				x: (sx + ex)/2,
				y: sy
			};
		}
		return undefined; //default
	}

	// Can thing on square1 take thing on square2
	canTake([x1,y1], [x2,y2])
	{
		return this.getColor(x1,y1) !== this.getColor(x2,y2);
	}

	// Is (x,y) on the chessboard?
	static OnBoard(x,y)
	{
		return (x>=0 && x<V.size.x && y>=0 && y<V.size.y);
	}

	// Used in interface: 'side' arg == player color
	canIplay(side, [x,y])
	{
		return (this.turn == side && this.getColor(x,y) == side);
	}

	// On which squares is color under check ? (for interface)
	getCheckSquares(color)
	{
		return this.isAttacked(this.kingPos[color], [this.getOppCol(color)])
			? [JSON.parse(JSON.stringify(this.kingPos[color]))] //need to duplicate!
			: [];
	}

	/////////////
	// FEN UTILS

	// Setup the initial random (assymetric) position
	static GenRandInitFen()
	{
		let pieces = { "w": new Array(8), "b": new Array(8) };
		// Shuffle pieces on first and last rank
		for (let c of ["w","b"])
		{
			let positions = _.range(8);

			// Get random squares for bishops
			let randIndex = 2 * _.random(3);
			const bishop1Pos = positions[randIndex];
			// The second bishop must be on a square of different color
			let randIndex_tmp = 2 * _.random(3) + 1;
			const bishop2Pos = positions[randIndex_tmp];
			// Remove chosen squares
			positions.splice(Math.max(randIndex,randIndex_tmp), 1);
			positions.splice(Math.min(randIndex,randIndex_tmp), 1);

			// Get random squares for knights
			randIndex = _.random(5);
			const knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);
			randIndex = _.random(4);
			const knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Get random square for queen
			randIndex = _.random(3);
			const queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Rooks and king positions are now fixed,
			// because of the ordering rook-king-rook
			const rook1Pos = positions[0];
			const kingPos = positions[1];
			const rook2Pos = positions[2];

			// Finally put the shuffled pieces in the board array
			pieces[c][rook1Pos] = 'r';
			pieces[c][knight1Pos] = 'n';
			pieces[c][bishop1Pos] = 'b';
			pieces[c][queenPos] = 'q';
			pieces[c][kingPos] = 'k';
			pieces[c][bishop2Pos] = 'b';
			pieces[c][knight2Pos] = 'n';
			pieces[c][rook2Pos] = 'r';
		}
		return pieces["b"].join("") +
			"/pppppppp/8/8/8/8/PPPPPPPP/" +
			pieces["w"].join("").toUpperCase() +
			" w 1111 -"; //add turn + flags + enpassant
	}

	// "Parse" FEN: just return untransformed string data
	static ParseFen(fen)
	{
		const fenParts = fen.split(" ");
		let res =
		{
			position: fenParts[0],
			turn: fenParts[1],
		};
		let nextIdx = 2;
		if (V.HasFlags)
			Object.assign(res, {flags: fenParts[nextIdx++]});
		if (V.HasEnpassant)
			Object.assign(res, {enpassant: fenParts[nextIdx]});
		return res;
	}

	// Return current fen (game state)
	getFen()
	{
		return this.getBaseFen() + " " + this.getTurnFen() +
			(V.HasFlags ? (" " + this.getFlagsFen()) : "") +
			(V.HasEnpassant ? (" " + this.getEnpassantFen()) : "");
	}

	// Position part of the FEN string
	getBaseFen()
	{
		let position = "";
		for (let i=0; i<V.size.x; i++)
		{
			let emptyCount = 0;
			for (let j=0; j<V.size.y; j++)
			{
				if (this.board[i][j] == V.EMPTY)
					emptyCount++;
				else
				{
					if (emptyCount > 0)
					{
						// Add empty squares in-between
						position += emptyCount;
						emptyCount = 0;
					}
					position += V.board2fen(this.board[i][j]);
				}
			}
			if (emptyCount > 0)
			{
				// "Flush remainder"
				position += emptyCount;
			}
			if (i < V.size.x - 1)
				position += "/"; //separate rows
		}
		return position;
	}

	getTurnFen()
	{
		return this.turn;
	}

	// Flags part of the FEN string
	getFlagsFen()
	{
		let flags = "";
		// Add castling flags
		for (let i of ['w','b'])
		{
			for (let j=0; j<2; j++)
				flags += (this.castleFlags[i][j] ? '1' : '0');
		}
		return flags;
	}

	// Enpassant part of the FEN string
	getEnpassantFen()
	{
		const L = this.epSquares.length;
		if (!this.epSquares[L-1])
			return "-"; //no en-passant
		return V.CoordsToSquare(this.epSquares[L-1]);
	}

	// Turn position fen into double array ["wb","wp","bk",...]
	static GetBoard(position)
	{
		const rows = position.split("/");
		let board = doubleArray(V.size.x, V.size.y, "");
		for (let i=0; i<rows.length; i++)
		{
			let j = 0;
			for (let indexInRow = 0; indexInRow < rows[i].length; indexInRow++)
			{
				const character = rows[i][indexInRow];
				const num = parseInt(character);
				if (!isNaN(num))
					j += num; //just shift j
				else //something at position i,j
					board[i][j++] = V.fen2board(character);
			}
		}
		return board;
	}

	// Extract (relevant) flags from fen
	setFlags(fenflags)
	{
		// white a-castle, h-castle, black a-castle, h-castle
		this.castleFlags = {'w': [true,true], 'b': [true,true]};
		if (!fenflags)
			return;
		for (let i=0; i<4; i++)
			this.castleFlags[i < 2 ? 'w' : 'b'][i%2] = (fenflags.charAt(i) == '1');
	}

	//////////////////
	// INITIALIZATION

	// Fen string fully describes the game state
	constructor(fen, moves)
	{
		this.moves = moves;
		const fenParsed = V.ParseFen(fen);
		this.board = V.GetBoard(fenParsed.position);
		this.turn = fenParsed.turn[0]; //[0] to work with MarseilleRules
		this.setOtherVariables(fen);
	}

	// Scan board for kings and rooks positions
	scanKingsRooks(fen)
	{
		this.INIT_COL_KING = {'w':-1, 'b':-1};
		this.INIT_COL_ROOK = {'w':[-1,-1], 'b':[-1,-1]};
		this.kingPos = {'w':[-1,-1], 'b':[-1,-1]}; //squares of white and black king
		const fenRows = V.ParseFen(fen).position.split("/");
		for (let i=0; i<fenRows.length; i++)
		{
			let k = 0; //column index on board
			for (let j=0; j<fenRows[i].length; j++)
			{
				switch (fenRows[i].charAt(j))
				{
					case 'k':
						this.kingPos['b'] = [i,k];
						this.INIT_COL_KING['b'] = k;
						break;
					case 'K':
						this.kingPos['w'] = [i,k];
						this.INIT_COL_KING['w'] = k;
						break;
					case 'r':
						if (this.INIT_COL_ROOK['b'][0] < 0)
							this.INIT_COL_ROOK['b'][0] = k;
						else
							this.INIT_COL_ROOK['b'][1] = k;
						break;
					case 'R':
						if (this.INIT_COL_ROOK['w'][0] < 0)
							this.INIT_COL_ROOK['w'][0] = k;
						else
							this.INIT_COL_ROOK['w'][1] = k;
						break;
					default:
						const num = parseInt(fenRows[i].charAt(j));
						if (!isNaN(num))
							k += (num-1);
				}
				k++;
			}
		}
	}

	// Some additional variables from FEN (variant dependant)
	setOtherVariables(fen)
	{
		// Set flags and enpassant:
		const parsedFen = V.ParseFen(fen);
		if (V.HasFlags)
			this.setFlags(parsedFen.flags);
		if (V.HasEnpassant)
		{
			const epSq = parsedFen.enpassant != "-"
				? V.SquareToCoords(parsedFen.enpassant)
				: undefined;
			this.epSquares = [ epSq ];
		}
		// Search for king and rooks positions:
		this.scanKingsRooks(fen);
	}

	/////////////////////
	// GETTERS & SETTERS

	static get size()
	{
		return {x:8, y:8};
	}

	// Color of thing on suqare (i,j). 'undefined' if square is empty
	getColor(i,j)
	{
		return this.board[i][j].charAt(0);
	}

	// Piece type on square (i,j). 'undefined' if square is empty
	getPiece(i,j)
	{
		return this.board[i][j].charAt(1);
	}

	// Get opponent color
	getOppCol(color)
	{
		return (color=="w" ? "b" : "w");
	}

	get lastMove()
	{
		const L = this.moves.length;
		return (L>0 ? this.moves[L-1] : null);
	}

	// Pieces codes (for a clearer code)
	static get PAWN() { return 'p'; }
	static get ROOK() { return 'r'; }
	static get KNIGHT() { return 'n'; }
	static get BISHOP() { return 'b'; }
	static get QUEEN() { return 'q'; }
	static get KING() { return 'k'; }

	// For FEN checking:
	static get PIECES()
	{
		return [V.PAWN,V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN,V.KING];
	}

	// Empty square
	static get EMPTY() { return ""; }

	// Some pieces movements
	static get steps()
	{
		return {
			'r': [ [-1,0],[1,0],[0,-1],[0,1] ],
			'n': [ [-1,-2],[-1,2],[1,-2],[1,2],[-2,-1],[-2,1],[2,-1],[2,1] ],
			'b': [ [-1,-1],[-1,1],[1,-1],[1,1] ],
		};
	}

	////////////////////
	// MOVES GENERATION

	// All possible moves from selected square (assumption: color is OK)
	getPotentialMovesFrom([x,y])
	{
		switch (this.getPiece(x,y))
		{
			case V.PAWN:
				return this.getPotentialPawnMoves([x,y]);
			case V.ROOK:
				return this.getPotentialRookMoves([x,y]);
			case V.KNIGHT:
				return this.getPotentialKnightMoves([x,y]);
			case V.BISHOP:
				return this.getPotentialBishopMoves([x,y]);
			case V.QUEEN:
				return this.getPotentialQueenMoves([x,y]);
			case V.KING:
				return this.getPotentialKingMoves([x,y]);
		}
	}

	// Build a regular move from its initial and destination squares.
	// tr: transformation
	getBasicMove([sx,sy], [ex,ey], tr)
	{
		let mv = new Move({
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

		// The opponent piece disappears if we take it
		if (this.board[ex][ey] != V.EMPTY)
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
		return mv;
	}

	// Generic method to find possible moves of non-pawn pieces:
	// "sliding or jumping"
	getSlideNJumpMoves([x,y], steps, oneStep)
	{
		const color = this.getColor(x,y);
		let moves = [];
		outerLoop:
		for (let step of steps)
		{
			let i = x + step[0];
			let j = y + step[1];
			while (V.OnBoard(i,j) && this.board[i][j] == V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [i,j]));
				if (oneStep !== undefined)
					continue outerLoop;
				i += step[0];
				j += step[1];
			}
			if (V.OnBoard(i,j) && this.canTake([x,y], [i,j]))
				moves.push(this.getBasicMove([x,y], [i,j]));
		}
		return moves;
	}

	// What are the pawn moves from square x,y ?
	getPotentialPawnMoves([x,y])
	{
		const color = this.turn;
		let moves = [];
		const [sizeX,sizeY] = [V.size.x,V.size.y];
		const shiftX = (color == "w" ? -1 : 1);
		const firstRank = (color == 'w' ? sizeX-1 : 0);
		const startRank = (color == "w" ? sizeX-2 : 1);
		const lastRank = (color == "w" ? 0 : sizeX-1);
		const pawnColor = this.getColor(x,y); //can be different for checkered

		if (x+shiftX >= 0 && x+shiftX < sizeX) //TODO: always true
		{
			const finalPieces = x + shiftX == lastRank
				? [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN]
				: [V.PAWN]
			// One square forward
			if (this.board[x+shiftX][y] == V.EMPTY)
			{
				for (let piece of finalPieces)
				{
					moves.push(this.getBasicMove([x,y], [x+shiftX,y],
						{c:pawnColor,p:piece}));
				}
				// Next condition because pawns on 1st rank can generally jump
				if ([startRank,firstRank].includes(x)
					&& this.board[x+2*shiftX][y] == V.EMPTY)
				{
					// Two squares jump
					moves.push(this.getBasicMove([x,y], [x+2*shiftX,y]));
				}
			}
			// Captures
			for (let shiftY of [-1,1])
			{
				if (y + shiftY >= 0 && y + shiftY < sizeY
					&& this.board[x+shiftX][y+shiftY] != V.EMPTY
					&& this.canTake([x,y], [x+shiftX,y+shiftY]))
				{
					for (let piece of finalPieces)
					{
						moves.push(this.getBasicMove([x,y], [x+shiftX,y+shiftY],
							{c:pawnColor,p:piece}));
					}
				}
			}
		}

		if (V.HasEnpassant)
		{
			// En passant
			const Lep = this.epSquares.length;
			const epSquare = this.epSquares[Lep-1]; //always at least one element
			if (!!epSquare && epSquare.x == x+shiftX && Math.abs(epSquare.y - y) == 1)
			{
				let enpassantMove = this.getBasicMove([x,y], [epSquare.x,epSquare.y]);
				enpassantMove.vanish.push({
					x: x,
					y: epSquare.y,
					p: 'p',
					c: this.getColor(x,epSquare.y)
				});
				moves.push(enpassantMove);
			}
		}

		return moves;
	}

	// What are the rook moves from square x,y ?
	getPotentialRookMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]);
	}

	// What are the knight moves from square x,y ?
	getPotentialKnightMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep");
	}

	// What are the bishop moves from square x,y ?
	getPotentialBishopMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]);
	}

	// What are the queen moves from square x,y ?
	getPotentialQueenMoves(sq)
	{
		return this.getSlideNJumpMoves(sq,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]));
	}

	// What are the king moves from square x,y ?
	getPotentialKingMoves(sq)
	{
		// Initialize with normal moves
		let moves = this.getSlideNJumpMoves(sq,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
		return moves.concat(this.getCastleMoves(sq));
	}

	getCastleMoves([x,y])
	{
		const c = this.getColor(x,y);
		if (x != (c=="w" ? V.size.x-1 : 0) || y != this.INIT_COL_KING[c])
			return []; //x isn't first rank, or king has moved (shortcut)

		// Castling ?
		const oppCol = this.getOppCol(c);
		let moves = [];
		let i = 0;
		const finalSquares = [ [2,3], [V.size.y-2,V.size.y-3] ]; //king, then rook
		castlingCheck:
		for (let castleSide=0; castleSide < 2; castleSide++) //large, then small
		{
			if (!this.castleFlags[c][castleSide])
				continue;
			// If this code is reached, rooks and king are on initial position

			// Nothing on the path of the king ?
			// (And no checks; OK also if y==finalSquare)
			let step = finalSquares[castleSide][0] < y ? -1 : 1;
			for (i=y; i!=finalSquares[castleSide][0]; i+=step)
			{
				if (this.isAttacked([x,i], [oppCol]) || (this.board[x][i] != V.EMPTY &&
					// NOTE: next check is enough, because of chessboard constraints
					(this.getColor(x,i) != c
						|| ![V.KING,V.ROOK].includes(this.getPiece(x,i)))))
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

	////////////////////
	// MOVES VALIDATION

	// For the interface: possible moves for the current turn from square sq
	getPossibleMovesFrom(sq)
	{
		return this.filterValid( this.getPotentialMovesFrom(sq) );
	}

	// TODO: promotions (into R,B,N,Q) should be filtered only once
	filterValid(moves)
	{
		if (moves.length == 0)
			return [];
		const color = this.turn;
		return moves.filter(m => {
			this.play(m);
			const res = !this.underCheck(color);
			this.undo(m);
			return res;
		});
	}

	// Search for all valid moves considering current turn
	// (for engine and game end)
	getAllValidMoves()
	{
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		let potentialMoves = [];
		for (let i=0; i<V.size.x; i++)
		{
			for (let j=0; j<V.size.y; j++)
			{
				// Next condition "!= oppCol" to work with checkered variant
				if (this.board[i][j] != V.EMPTY && this.getColor(i,j) != oppCol)
				{
					Array.prototype.push.apply(potentialMoves,
						this.getPotentialMovesFrom([i,j]));
				}
			}
		}
		return this.filterValid(potentialMoves);
	}

	// Stop at the first move found
	atLeastOneMove()
	{
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		for (let i=0; i<V.size.x; i++)
		{
			for (let j=0; j<V.size.y; j++)
			{
				if (this.board[i][j] != V.EMPTY && this.getColor(i,j) != oppCol)
				{
					const moves = this.getPotentialMovesFrom([i,j]);
					if (moves.length > 0)
					{
						for (let k=0; k<moves.length; k++)
						{
							if (this.filterValid([moves[k]]).length > 0)
								return true;
						}
					}
				}
			}
		}
		return false;
	}

	// Check if pieces of color in 'colors' are attacking (king) on square x,y
	isAttacked(sq, colors)
	{
		return (this.isAttackedByPawn(sq, colors)
			|| this.isAttackedByRook(sq, colors)
			|| this.isAttackedByKnight(sq, colors)
			|| this.isAttackedByBishop(sq, colors)
			|| this.isAttackedByQueen(sq, colors)
			|| this.isAttackedByKing(sq, colors));
	}

	// Is square x,y attacked by 'colors' pawns ?
	isAttackedByPawn([x,y], colors)
	{
		for (let c of colors)
		{
			let pawnShift = (c=="w" ? 1 : -1);
			if (x+pawnShift>=0 && x+pawnShift<V.size.x)
			{
				for (let i of [-1,1])
				{
					if (y+i>=0 && y+i<V.size.y && this.getPiece(x+pawnShift,y+i)==V.PAWN
						&& this.getColor(x+pawnShift,y+i)==c)
					{
						return true;
					}
				}
			}
		}
		return false;
	}

	// Is square x,y attacked by 'colors' rooks ?
	isAttackedByRook(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors, V.ROOK, V.steps[V.ROOK]);
	}

	// Is square x,y attacked by 'colors' knights ?
	isAttackedByKnight(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors,
			V.KNIGHT, V.steps[V.KNIGHT], "oneStep");
	}

	// Is square x,y attacked by 'colors' bishops ?
	isAttackedByBishop(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors, V.BISHOP, V.steps[V.BISHOP]);
	}

	// Is square x,y attacked by 'colors' queens ?
	isAttackedByQueen(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors, V.QUEEN,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]));
	}

	// Is square x,y attacked by 'colors' king(s) ?
	isAttackedByKing(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors, V.KING,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	// Generic method for non-pawn pieces ("sliding or jumping"):
	// is x,y attacked by a piece of color in array 'colors' ?
	isAttackedBySlideNJump([x,y], colors, piece, steps, oneStep)
	{
		for (let step of steps)
		{
			let rx = x+step[0], ry = y+step[1];
			while (V.OnBoard(rx,ry) && this.board[rx][ry] == V.EMPTY && !oneStep)
			{
				rx += step[0];
				ry += step[1];
			}
			if (V.OnBoard(rx,ry) && this.getPiece(rx,ry) === piece
				&& colors.includes(this.getColor(rx,ry)))
			{
				return true;
			}
		}
		return false;
	}

	// Is color under check after his move ?
	underCheck(color)
	{
		return this.isAttacked(this.kingPos[color], [this.getOppCol(color)]);
	}

	/////////////////
	// MOVES PLAYING

	// Apply a move on board
	static PlayOnBoard(board, move)
	{
		for (let psq of move.vanish)
			board[psq.x][psq.y] = V.EMPTY;
		for (let psq of move.appear)
			board[psq.x][psq.y] = psq.c + psq.p;
	}
	// Un-apply the played move
	static UndoOnBoard(board, move)
	{
		for (let psq of move.appear)
			board[psq.x][psq.y] = V.EMPTY;
		for (let psq of move.vanish)
			board[psq.x][psq.y] = psq.c + psq.p;
	}

	// After move is played, update variables + flags
	updateVariables(move)
	{
		const piece = move.vanish[0].p;
		let c = move.vanish[0].c;
		if (c == "c") //if (!["w","b"].includes(c))
		{
			// 'c = move.vanish[0].c' doesn't work for Checkered
			c = this.getOppCol(this.turn);
		}
		const firstRank = (c == "w" ? V.size.x-1 : 0);

		// Update king position + flags
		if (piece == V.KING && move.appear.length > 0)
		{
			this.kingPos[c][0] = move.appear[0].x;
			this.kingPos[c][1] = move.appear[0].y;
			this.castleFlags[c] = [false,false];
			return;
		}
		const oppCol = this.getOppCol(c);
		const oppFirstRank = (V.size.x-1) - firstRank;
		if (move.start.x == firstRank //our rook moves?
			&& this.INIT_COL_ROOK[c].includes(move.start.y))
		{
			const flagIdx = (move.start.y == this.INIT_COL_ROOK[c][0] ? 0 : 1);
			this.castleFlags[c][flagIdx] = false;
		}
		else if (move.end.x == oppFirstRank //we took opponent rook?
			&& this.INIT_COL_ROOK[oppCol].includes(move.end.y))
		{
			const flagIdx = (move.end.y == this.INIT_COL_ROOK[oppCol][0] ? 0 : 1);
			this.castleFlags[oppCol][flagIdx] = false;
		}
	}

	// After move is undo-ed *and flags resetted*, un-update other variables
	// TODO: more symmetry, by storing flags increment in move (?!)
	unupdateVariables(move)
	{
		// (Potentially) Reset king position
		const c = this.getColor(move.start.x,move.start.y);
		if (this.getPiece(move.start.x,move.start.y) == V.KING)
			this.kingPos[c] = [move.start.x, move.start.y];
	}

	play(move, ingame)
	{
		// DEBUG:
//		if (!this.states) this.states = [];
//		if (!ingame) this.states.push(this.getFen());

		if (!!ingame)
			move.notation = [this.getNotation(move), this.getLongNotation(move)];

		if (V.HasFlags)
			move.flags = JSON.stringify(this.aggregateFlags()); //save flags (for undo)
		if (V.HasEnpassant)
			this.epSquares.push( this.getEpSquare(move) );
		V.PlayOnBoard(this.board, move);
		this.turn = this.getOppCol(this.turn);
		this.moves.push(move);
		this.updateVariables(move);

		if (!!ingame)
		{
			// Hash of current game state *after move*, to detect repetitions
			move.hash = hex_md5(this.getFen());
		}
	}

	undo(move)
	{
		if (V.HasEnpassant)
			this.epSquares.pop();
		if (V.HasFlags)
			this.disaggregateFlags(JSON.parse(move.flags));
		V.UndoOnBoard(this.board, move);
		this.turn = this.getOppCol(this.turn);
		this.moves.pop();
		this.unupdateVariables(move);

		// DEBUG:
//		if (this.getFen() != this.states[this.states.length-1])
//			debugger;
//		this.states.pop();
	}

	///////////////
	// END OF GAME

	// Check for 3 repetitions (position + flags + turn)
	checkRepetition()
	{
		if (!this.hashStates)
			this.hashStates = {};
		const startIndex =
			Object.values(this.hashStates).reduce((a,b) => { return a+b; }, 0)
		// Update this.hashStates with last move (or all moves if continuation)
		// NOTE: redundant storage, but faster and moderate size
		for (let i=startIndex; i<this.moves.length; i++)
		{
			const move = this.moves[i];
			if (!this.hashStates[move.hash])
				this.hashStates[move.hash] = 1;
			else
				this.hashStates[move.hash]++;
		}
		return Object.values(this.hashStates).some(elt => { return (elt >= 3); });
	}

	// Is game over ? And if yes, what is the score ?
	checkGameOver()
	{
		if (this.checkRepetition())
			return "1/2";

		if (this.atLeastOneMove()) // game not over
			return "*";

		// Game over
		return this.checkGameEnd();
	}

	// No moves are possible: compute score
	checkGameEnd()
	{
		const color = this.turn;
		// No valid move: stalemate or checkmate?
		if (!this.isAttacked(this.kingPos[color], [this.getOppCol(color)]))
			return "1/2";
		// OK, checkmate
		return (color == "w" ? "0-1" : "1-0");
	}

	///////////////
	// ENGINE PLAY

	// Pieces values
	static get VALUES()
	{
		return {
			'p': 1,
			'r': 5,
			'n': 3,
			'b': 3,
			'q': 9,
			'k': 1000
		};
	}

	// "Checkmate" (unreachable eval)
	static get INFINITY() { return 9999; }

	// At this value or above, the game is over
	static get THRESHOLD_MATE() { return V.INFINITY; }

	// Search depth: 2 for high branching factor, 4 for small (Loser chess, eg.)
	static get SEARCH_DEPTH() { return 3; }

	// Assumption: at least one legal move
	// NOTE: works also for extinction chess because depth is 3...
	getComputerMove()
	{
		const maxeval = V.INFINITY;
		const color = this.turn;
		// Some variants may show a bigger moves list to the human (Switching),
		// thus the argument "computer" below (which is generally ignored)
		let moves1 = this.getAllValidMoves("computer");

		// Can I mate in 1 ? (for Magnetic & Extinction)
		for (let i of _.shuffle(_.range(moves1.length)))
		{
			this.play(moves1[i]);
			let finish = (Math.abs(this.evalPosition()) >= V.THRESHOLD_MATE);
			if (!finish && !this.atLeastOneMove())
			{
				// Test mate (for other variants)
				const score = this.checkGameEnd();
				if (score != "1/2")
					finish = true;
			}
			this.undo(moves1[i]);
			if (finish)
				return moves1[i];
		}

		// Rank moves using a min-max at depth 2
		for (let i=0; i<moves1.length; i++)
		{
			// Initial self evaluation is very low: "I'm checkmated"
			moves1[i].eval = (color=="w" ? -1 : 1) * maxeval;
			this.play(moves1[i]);
			let eval2 = undefined;
			if (this.atLeastOneMove())
			{
				// Initial enemy evaluation is very low too, for him
				eval2 = (color=="w" ? 1 : -1) * maxeval;
				// Second half-move:
				let moves2 = this.getAllValidMoves("computer");
				for (let j=0; j<moves2.length; j++)
				{
					this.play(moves2[j]);
					let evalPos = undefined;
					if (this.atLeastOneMove())
						evalPos = this.evalPosition()
					else
					{
						// Working with scores is more accurate (necessary for Loser variant)
						const score = this.checkGameEnd();
						evalPos = (score=="1/2" ? 0 : (score=="1-0" ? 1 : -1) * maxeval);
					}
					if ((color == "w" && evalPos < eval2)
						|| (color=="b" && evalPos > eval2))
					{
						eval2 = evalPos;
					}
					this.undo(moves2[j]);
				}
			}
			else
			{
				const score = this.checkGameEnd();
				eval2 = (score=="1/2" ? 0 : (score=="1-0" ? 1 : -1) * maxeval);
			}
			if ((color=="w" && eval2 > moves1[i].eval)
				|| (color=="b" && eval2 < moves1[i].eval))
			{
				moves1[i].eval = eval2;
			}
			this.undo(moves1[i]);
		}
		moves1.sort( (a,b) => { return (color=="w" ? 1 : -1) * (b.eval - a.eval); });

		let candidates = [0]; //indices of candidates moves
		for (let j=1; j<moves1.length && moves1[j].eval == moves1[0].eval; j++)
			candidates.push(j);
		let currentBest = moves1[_.sample(candidates, 1)];

		// From here, depth >= 3: may take a while, so we control time
		const timeStart = Date.now();

		// Skip depth 3+ if we found a checkmate (or if we are checkmated in 1...)
		if (V.SEARCH_DEPTH >= 3 && Math.abs(moves1[0].eval) < V.THRESHOLD_MATE)
		{
			for (let i=0; i<moves1.length; i++)
			{
				if (Date.now()-timeStart >= 5000) //more than 5 seconds
					return currentBest; //depth 2 at least
				this.play(moves1[i]);
				// 0.1 * oldEval : heuristic to avoid some bad moves (not all...)
				moves1[i].eval = 0.1*moves1[i].eval +
					this.alphabeta(V.SEARCH_DEPTH-1, -maxeval, maxeval);
				this.undo(moves1[i]);
			}
			moves1.sort( (a,b) => {
				return (color=="w" ? 1 : -1) * (b.eval - a.eval); });
		}
		else
			return currentBest;
		//console.log(moves1.map(m => { return [this.getNotation(m), m.eval]; }));

		candidates = [0];
		for (let j=1; j<moves1.length && moves1[j].eval == moves1[0].eval; j++)
			candidates.push(j);
		return moves1[_.sample(candidates, 1)];
	}

	alphabeta(depth, alpha, beta)
  {
		const maxeval = V.INFINITY;
		const color = this.turn;
		if (!this.atLeastOneMove())
		{
			switch (this.checkGameEnd())
			{
				case "1/2":
					return 0;
				default:
					const score = this.checkGameEnd();
					return (score=="1/2" ? 0 : (score=="1-0" ? 1 : -1) * maxeval);
			}
		}
		if (depth == 0)
      return this.evalPosition();
		const moves = this.getAllValidMoves("computer");
    let v = color=="w" ? -maxeval : maxeval;
		if (color == "w")
		{
			for (let i=0; i<moves.length; i++)
      {
				this.play(moves[i]);
				v = Math.max(v, this.alphabeta(depth-1, alpha, beta));
				this.undo(moves[i]);
				alpha = Math.max(alpha, v);
				if (alpha >= beta)
					break; //beta cutoff
			}
		}
		else //color=="b"
		{
			for (let i=0; i<moves.length; i++)
			{
				this.play(moves[i]);
				v = Math.min(v, this.alphabeta(depth-1, alpha, beta));
				this.undo(moves[i]);
				beta = Math.min(beta, v);
				if (alpha >= beta)
					break; //alpha cutoff
			}
		}
		return v;
	}

	evalPosition()
	{
		let evaluation = 0;
		// Just count material for now
		for (let i=0; i<V.size.x; i++)
		{
			for (let j=0; j<V.size.y; j++)
			{
				if (this.board[i][j] != V.EMPTY)
				{
					const sign = this.getColor(i,j) == "w" ? 1 : -1;
					evaluation += sign * V.VALUES[this.getPiece(i,j)];
				}
			}
		}
		return evaluation;
	}

	/////////////////////////
	// MOVES + GAME NOTATION
	/////////////////////////

	// Context: just before move is played, turn hasn't changed
	getNotation(move)
	{
		if (move.appear.length == 2 && move.appear[0].p == V.KING) //castle
			return (move.end.y < move.start.y ? "0-0-0" : "0-0");

		// Translate final square
		const finalSquare = V.CoordsToSquare(move.end);

		const piece = this.getPiece(move.start.x, move.start.y);
		if (piece == V.PAWN)
		{
			// Pawn move
			let notation = "";
			if (move.vanish.length > move.appear.length)
			{
				// Capture
				const startColumn = V.CoordToColumn(move.start.y);
				notation = startColumn + "x" + finalSquare;
			}
			else //no capture
				notation = finalSquare;
			if (move.appear.length > 0 && move.appear[0].p != V.PAWN) //promotion
				notation += "=" + move.appear[0].p.toUpperCase();
			return notation;
		}

		else
		{
			// Piece movement
			return piece.toUpperCase() +
				(move.vanish.length > move.appear.length ? "x" : "") + finalSquare;
		}
	}

	// Complete the usual notation, may be required for de-ambiguification
	getLongNotation(move)
	{
		// Not encoding move. But short+long is enough
		return V.CoordsToSquare(move.start) + V.CoordsToSquare(move.end);
	}

	// The score is already computed when calling this function
	getPGN(mycolor, score, fenStart, mode)
	{
		let pgn = "";
		pgn += '[Site "vchess.club"]<br>';
		const opponent = mode=="human" ? "Anonymous" : "Computer";
		pgn += '[Variant "' + variant + '"]<br>';
		pgn += '[Date "' + getDate(new Date()) + '"]<br>';
		pgn += '[White "' + (mycolor=='w'?'Myself':opponent) + '"]<br>';
		pgn += '[Black "' + (mycolor=='b'?'Myself':opponent) + '"]<br>';
		pgn += '[FenStart "' + fenStart + '"]<br>';
		pgn += '[Fen "' + this.getFen() + '"]<br>';
		pgn += '[Result "' + score + '"]<br><br>';

		// Standard PGN
		for (let i=0; i<this.moves.length; i++)
		{
			if (i % 2 == 0)
				pgn += ((i/2)+1) + ".";
			pgn += this.moves[i].notation[0] + " ";
		}
		pgn += "<br><br>";

		// "Complete moves" PGN (helping in ambiguous cases)
		for (let i=0; i<this.moves.length; i++)
		{
			if (i % 2 == 0)
				pgn += ((i/2)+1) + ".";
			pgn += this.moves[i].notation[1] + " ";
		}

		return pgn;
	}
}
