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

	/////////////////
	// INITIALIZATION

	// fen = "position flags epSquare movesCount"
	constructor(fen, moves)
	{
		this.moves = moves;
		// Use fen string to initialize variables, flags and board
		this.initVariables(fen);
		this.flags = VariantRules.GetFlags(fen);
		this.board = VariantRules.GetBoard(fen);
	}

	initVariables(fen)
	{
		this.INIT_COL_KING = {'w':-1, 'b':-1};
		this.INIT_COL_ROOK = {'w':[-1,-1], 'b':[-1,-1]};
		this.kingPos = {'w':[-1,-1], 'b':[-1,-1]}; //respective squares of white and black king
		const fenParts = fen.split(" ");
		const position = fenParts[0].split("/");
		for (let i=0; i<position.length; i++)
		{
			let j = 0;
			while (j < position[i].length)
			{
				switch (position[i].charAt(j))
				{
					case 'k':
						this.kingPos['b'] = [i,j];
						this.INIT_COL_KING['b'] = j;
						break;
					case 'K':
						this.kingPos['w'] = [i,j];
						this.INIT_COL_KING['w'] = j;
						break;
					case 'r':
						if (this.INIT_COL_ROOK['b'][0] < 0)
							this.INIT_COL_ROOK['b'][0] = j;
						else
							this.INIT_COL_ROOK['b'][1] = j;
						break;
					case 'R':
						if (this.INIT_COL_ROOK['w'][0] < 0)
							this.INIT_COL_ROOK['w'][0] = j;
						else
							this.INIT_COL_ROOK['w'][1] = j;
						break;
					default:
						let num = parseInt(position[i].charAt(j));
						if (!isNaN(num))
							j += (num-1);
				}
				j++;
			}
		}
		let epSq = undefined;
		if (fenParts[2] != "-")
		{
			const digits = fenParts[2].split(","); //3,2 ...
			epSq = { x:Number.parseInt(digits[0]), y:Number.parseInt(digits[1]) };
		}
		this.epSquares = [ epSq ];
		this.movesCount = Number.parseInt(fenParts[3]);
	}

	// Turn diagram fen into double array ["wb","wp","bk",...]
	static GetBoard(fen)
	{
		let rows = fen.split(" ")[0].split("/");
		let [sizeX,sizeY] = VariantRules.size;
		let board = doubleArray(sizeX, sizeY, "");
		for (let i=0; i<rows.length; i++)
		{
			let j = 0;
			for (let indexInRow = 0; indexInRow < rows[i].length; indexInRow++)
			{
				let character = rows[i][indexInRow];
				let num = parseInt(character);
				if (!isNaN(num))
					j += num; //just shift j
				else //something at position i,j
					board[i][j++] = VariantRules.fen2board(character);
			}
		}
		return board;
	}

	// Overridable: flags can change a lot
	static GetFlags(fen)
	{
		// white a-castle, h-castle, black a-castle, h-castle
		let flags = {'w': new Array(2), 'b': new Array(2)};
		let fenFlags = fen.split(" ")[1]; //flags right after position
		for (let i=0; i<4; i++)
			flags[i < 2 ? 'w' : 'b'][i%2] = (fenFlags.charAt(i) == '1');
		return flags;
	}

	///////////////////
	// GETTERS, SETTERS

	// Simple useful getters
	static get size() { return [8,8]; }
	// Two next functions return 'undefined' if called on empty square
	getColor(i,j) { return this.board[i][j].charAt(0); }
	getPiece(i,j) { return this.board[i][j].charAt(1); }

	// Color
	getOppCol(color) { return color=="w" ? "b" : "w"; }

	get lastMove() {
		const L = this.moves.length;
		return L>0 ? this.moves[L-1] : null;
	}
	get turn() {
		return this.movesCount%2==0 ? 'w' : 'b';
	}

	// Pieces codes
	static get PAWN() { return 'p'; }
	static get ROOK() { return 'r'; }
	static get KNIGHT() { return 'n'; }
	static get BISHOP() { return 'b'; }
	static get QUEEN() { return 'q'; }
	static get KING() { return 'k'; }

	// Empty square
	static get EMPTY() { return ''; }

	// Some pieces movements
	static get steps() {
		return {
			'r': [ [-1,0],[1,0],[0,-1],[0,1] ],
			'n': [ [-1,-2],[-1,2],[1,-2],[1,2],[-2,-1],[-2,1],[2,-1],[2,1] ],
			'b': [ [-1,-1],[-1,1],[1,-1],[1,1] ],
			'q': [ [-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1] ]
		};
	}

	// En-passant square, if any
	getEpSquare(move)
	{
		const [sx,sy,ex] = [move.start.x,move.start.y,move.end.x];
		if (this.getPiece(sx,sy) == VariantRules.PAWN && Math.abs(sx - ex) == 2)
		{
			return {
				x: (sx + ex)/2,
				y: sy
			};
		}
		return undefined; //default
	}

	// can color1 take color2?
	canTake(color1, color2)
	{
		return color1 != color2;
	}

	///////////////////
	// MOVES GENERATION

	// All possible moves from selected square (assumption: color is OK)
	getPotentialMovesFrom([x,y])
	{
		let c = this.getColor(x,y);
		// Fill possible moves according to piece type
		switch (this.getPiece(x,y))
		{
			case VariantRules.PAWN:
				return this.getPotentialPawnMoves(x,y,c);
			case VariantRules.ROOK:
				return this.getPotentialRookMoves(x,y,c);
			case VariantRules.KNIGHT:
				return this.getPotentialKnightMoves(x,y,c);
			case VariantRules.BISHOP:
				return this.getPotentialBishopMoves(x,y,c);
			case VariantRules.QUEEN:
				return this.getPotentialQueenMoves(x,y,c);
			case VariantRules.KING:
				return this.getPotentialKingMoves(x,y,c);
		}
	}

	// Build a regular move from its initial and destination squares; tr: transformation
	getBasicMove(sx, sy, ex, ey, tr)
	{
		var mv = new Move({
			appear: [
				new PiPo({
					x: ex,
					y: ey,
					c: this.getColor(sx,sy),
					p: !!tr ? tr : this.getPiece(sx,sy)
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
		return mv;
	}

	// Generic method to find possible moves of non-pawn pieces ("sliding or jumping")
	getSlideNJumpMoves(x, y, color, steps, oneStep)
	{
		var moves = [];
		let [sizeX,sizeY] = VariantRules.size;
		outerLoop:
		for (let step of steps)
		{
			var i = x + step[0];
			var j = y + step[1];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY
				&& this.board[i][j] == VariantRules.EMPTY)
			{
				moves.push(this.getBasicMove(x, y, i, j));
				if (oneStep !== undefined)
					continue outerLoop;
				i += step[0];
				j += step[1];
			}
			if (i>=0 && i<8 && j>=0 && j<8 && this.canTake(color, this.getColor(i,j)))
				moves.push(this.getBasicMove(x, y, i, j));
		}
		return moves;
	}

	// What are the pawn moves from square x,y considering color "color" ?
	getPotentialPawnMoves(x, y, color)
	{
		var moves = [];
		var V = VariantRules;
		let [sizeX,sizeY] = VariantRules.size;
		let shift = (color == "w" ? -1 : 1);
		let startRank = (color == "w" ? sizeY-2 : 1);
		let lastRank = (color == "w" ? 0 : sizeY-1);

		if (x+shift >= 0 && x+shift < sizeX && x+shift != lastRank)
		{
			// Normal moves
			if (this.board[x+shift][y] == V.EMPTY)
			{
				moves.push(this.getBasicMove(x, y, x+shift, y));
				if (x==startRank && this.board[x+2*shift][y] == V.EMPTY)
				{
					// Two squares jump
					moves.push(this.getBasicMove(x, y, x+2*shift, y));
				}
			}
			// Captures
			if (y>0 && this.canTake(this.getColor(x,y), this.getColor(x+shift,y-1))
				&& this.board[x+shift][y-1] != V.EMPTY)
			{
				moves.push(this.getBasicMove(x, y, x+shift, y-1));
			}
			if (y<sizeY-1 && this.canTake(this.getColor(x,y), this.getColor(x+shift,y+1))
				&& this.board[x+shift][y+1] != V.EMPTY)
			{
				moves.push(this.getBasicMove(x, y, x+shift, y+1));
			}
		}

		if (x+shift == lastRank)
		{
			// Promotion
			let promotionPieces = [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN];
			promotionPieces.forEach(p => {
				// Normal move
				if (this.board[x+shift][y] == V.EMPTY)
					moves.push(this.getBasicMove(x, y, x+shift, y, p));
				// Captures
				if (y>0 && this.canTake(this.getColor(x,y), this.getColor(x+shift,y-1))
					&& this.board[x+shift][y-1] != V.EMPTY)
				{
					moves.push(this.getBasicMove(x, y, x+shift, y-1, p));
				}
				if (y<sizeY-1 && this.canTake(this.getColor(x,y), this.getColor(x+shift,y+1))
					&& this.board[x+shift][y+1] != V.EMPTY)
				{
					moves.push(this.getBasicMove(x, y, x+shift, y+1, p));
				}
			});
		}

		// En passant
		const Lep = this.epSquares.length;
		const epSquare = Lep>0 ? this.epSquares[Lep-1] : undefined;
		if (!!epSquare && epSquare.x == x+shift && Math.abs(epSquare.y - y) == 1)
		{
			let epStep = epSquare.y - y;
			var enpassantMove = this.getBasicMove(x, y, x+shift, y+epStep);
			enpassantMove.vanish.push({
				x: x,
				y: y+epStep,
				p: 'p',
				c: this.getColor(x,y+epStep)
			});
			moves.push(enpassantMove);
		}

		return moves;
	}

	// What are the rook moves from square x,y ?
	getPotentialRookMoves(x, y, color)
	{
		return this.getSlideNJumpMoves(
			x, y, color, VariantRules.steps[VariantRules.ROOK]);
	}

	// What are the knight moves from square x,y ?
	getPotentialKnightMoves(x, y, color)
	{
		return this.getSlideNJumpMoves(
			x, y, color, VariantRules.steps[VariantRules.KNIGHT], "oneStep");
	}

	// What are the bishop moves from square x,y ?
	getPotentialBishopMoves(x, y, color)
	{
		return this.getSlideNJumpMoves(
			x, y, color, VariantRules.steps[VariantRules.BISHOP]);
	}

	// What are the queen moves from square x,y ?
	getPotentialQueenMoves(x, y, color)
	{
		return this.getSlideNJumpMoves(
			x, y, color, VariantRules.steps[VariantRules.QUEEN]);
	}

	// What are the king moves from square x,y ?
	getPotentialKingMoves(x, y, c)
	{
		// Initialize with normal moves
		var moves = this.getSlideNJumpMoves(x, y, c,
			VariantRules.steps[VariantRules.QUEEN], "oneStep");

		return moves.concat(this.getCastleMoves(x,y,c));
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

	///////////////////
	// MOVES VALIDATION

	canIplay(color, sq)
	{
		return ((color=='w' && this.movesCount%2==0)
				|| (color=='b' && this.movesCount%2==1))
			&& this.getColor(sq[0], sq[1]) == color;
	}

	getPossibleMovesFrom(sq)
	{
		// Assuming color is right (already checked)
		return this.filterValid( this.getPotentialMovesFrom(sq) );
	}

	// TODO: once a promotion is filtered, the others results are same: useless computations
	filterValid(moves)
	{
		if (moves.length == 0)
			return [];
		let color = this.getColor( moves[0].start.x, moves[0].start.y );
		return moves.filter(m => {
			return !this.underCheck(m, color);
		});
	}

	// Search for all valid moves considering current turn (for engine and game end)
	getAllValidMoves(color)
	{
		const oppCol = this.getOppCol(color);
		var potentialMoves = [];
		let [sizeX,sizeY] = VariantRules.size;
		for (var i=0; i<sizeX; i++)
		{
			for (var j=0; j<sizeY; j++)
			{
				// Next condition ... != oppCol is a little HACK to work with checkered variant
				if (this.board[i][j] != VariantRules.EMPTY && this.getColor(i,j) != oppCol)
					Array.prototype.push.apply(potentialMoves, this.getPotentialMovesFrom([i,j]));
			}
		}
		// NOTE: prefer lazy undercheck tests, letting the king being taken?
		// No: if happen on last 1/2 move, could lead to forbidden moves, wrong evals
		return this.filterValid(potentialMoves);
	}
	
	// Stop at the first move found
	atLeastOneMove(color)
	{
		const oppCol = this.getOppCol(color);
		let [sizeX,sizeY] = VariantRules.size;
		for (var i=0; i<sizeX; i++)
		{
			for (var j=0; j<sizeY; j++)
			{
				if (this.board[i][j] != VariantRules.EMPTY && this.getColor(i,j) != oppCol)
				{
					const moves = this.getPotentialMovesFrom([i,j]);
					if (moves.length > 0)
					{
						for (let i=0; i<moves.length; i++)
						{
							if (this.filterValid([moves[i]]).length > 0)
								return true;
						}
					}
				}
			}
		}
		return false;
	}

	// Check if pieces of color 'color' are attacking square x,y
	isAttacked(sq, color)
	{
		return (this.isAttackedByPawn(sq, color)
			|| this.isAttackedByRook(sq, color)
			|| this.isAttackedByKnight(sq, color)
			|| this.isAttackedByBishop(sq, color)
			|| this.isAttackedByQueen(sq, color)
			|| this.isAttackedByKing(sq, color));
	}

	// Is square x,y attacked by pawns of color c ?
	isAttackedByPawn([x,y], c)
	{
		let pawnShift = (c=="w" ? 1 : -1);
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

	// Is square x,y attacked by rooks of color c ?
	isAttackedByRook(sq, color)
	{
		return this.isAttackedBySlideNJump(sq, color,
			VariantRules.ROOK, VariantRules.steps[VariantRules.ROOK]);
	}

	// Is square x,y attacked by knights of color c ?
	isAttackedByKnight(sq, color)
	{
		return this.isAttackedBySlideNJump(sq, color,
			VariantRules.KNIGHT, VariantRules.steps[VariantRules.KNIGHT], "oneStep");
	}

	// Is square x,y attacked by bishops of color c ?
	isAttackedByBishop(sq, color)
	{
		return this.isAttackedBySlideNJump(sq, color,
			VariantRules.BISHOP, VariantRules.steps[VariantRules.BISHOP]);
	}

	// Is square x,y attacked by queens of color c ?
	isAttackedByQueen(sq, color)
	{
		return this.isAttackedBySlideNJump(sq, color,
			VariantRules.QUEEN, VariantRules.steps[VariantRules.QUEEN]);
	}

	// Is square x,y attacked by king of color c ?
	isAttackedByKing(sq, color)
	{
		return this.isAttackedBySlideNJump(sq, color,
			VariantRules.KING, VariantRules.steps[VariantRules.QUEEN], "oneStep");
	}

	// Generic method for non-pawn pieces ("sliding or jumping"): is x,y attacked by piece != color ?
	isAttackedBySlideNJump([x,y], c,piece,steps,oneStep)
	{
		for (let step of steps)
		{
			let rx = x+step[0], ry = y+step[1];
			while (rx>=0 && rx<8 && ry>=0 && ry<8 && this.board[rx][ry] == VariantRules.EMPTY
				&& !oneStep)
			{
				rx += step[0];
				ry += step[1];
			}
			if (rx>=0 && rx<8 && ry>=0 && ry<8 && this.board[rx][ry] != VariantRules.EMPTY
				&& this.getPiece(rx,ry) == piece && this.getColor(rx,ry) == c)
			{
				return true;
			}
		}
		return false;
	}

	underCheck(move, c)
	{
		this.play(move);
		let res = this.isAttacked(this.kingPos[c], this.getOppCol(c));
		this.undo(move);
		return res;
	}

	// Apply a move on board
	static PlayOnBoard(board, move)
	{
		for (let psq of move.vanish)
			board[psq.x][psq.y] = VariantRules.EMPTY;
		for (let psq of move.appear)
			board[psq.x][psq.y] = psq.c + psq.p;
	}
	// Un-apply the played move
	static UndoOnBoard(board, move)
	{
		for (let psq of move.appear)
			board[psq.x][psq.y] = VariantRules.EMPTY;
		for (let psq of move.vanish)
			board[psq.x][psq.y] = psq.c + psq.p;
	}

	// Before move is played:
	updateVariables(move)
	{
		const piece = this.getPiece(move.start.x,move.start.y);
		const c = this.getColor(move.start.x,move.start.y);
		const firstRank = (c == "w" ? 7 : 0);

		// Update king position + flags
		if (piece == VariantRules.KING && move.appear.length > 0)
		{
			this.kingPos[c][0] = move.appear[0].x;
			this.kingPos[c][1] = move.appear[0].y;
			this.flags[c] = [false,false];
			return;
		}
		const oppCol = this.getOppCol(c);
		const oppFirstRank = 7 - firstRank;
		if (move.start.x == firstRank //our rook moves?
			&& this.INIT_COL_ROOK[c].includes(move.start.y))
		{
			const flagIdx = move.start.y == this.INIT_COL_ROOK[c][0] ? 0 : 1;
			this.flags[c][flagIdx] = false;
		}
		else if (move.end.x == oppFirstRank //we took opponent rook?
			&& this.INIT_COL_ROOK[c].includes(move.end.y))
		{
			const flagIdx = move.end.y == this.INIT_COL_ROOK[oppCol][0] ? 0 : 1;
			this.flags[oppCol][flagIdx] = false;
		}
	}

	play(move, ingame)
	{
		// Save flags (for undo)
		move.flags = JSON.stringify(this.flags); //TODO: less costly
		this.updateVariables(move);

		if (!!ingame)
		{
			move.notation = this.getNotation(move);
			this.moves.push(move);
		}

		this.epSquares.push( this.getEpSquare(move) );
		VariantRules.PlayOnBoard(this.board, move);
		this.movesCount++;
	}

	undo(move, ingame)
	{
		VariantRules.UndoOnBoard(this.board, move);
		this.epSquares.pop();
		this.movesCount--;

		if (!!ingame)
			this.moves.pop();

		// Update king position, and reset stored/computed flags
		const c = this.getColor(move.start.x,move.start.y);
		if (this.getPiece(move.start.x,move.start.y) == VariantRules.KING)
			this.kingPos[c] = [move.start.x, move.start.y];

		this.flags = JSON.parse(move.flags);
	}

	//////////////
	// END OF GAME

	checkGameOver(color)
	{
		// Check for 3 repetitions
		if (this.moves.length >= 8)
		{
			// NOTE: crude detection, only moves repetition
			const L = this.moves.length;
			if (_.isEqual(this.moves[L-1], this.moves[L-5]) &&
				_.isEqual(this.moves[L-2], this.moves[L-6]) &&
				_.isEqual(this.moves[L-3], this.moves[L-7]) &&
				_.isEqual(this.moves[L-4], this.moves[L-8]))
			{
				return "1/2 (repetition)";
			}
		}

		if (this.atLeastOneMove(color))
		{
			// game not over
			return "*";
		}

		// Game over
		return this.checkGameEnd(color);
	}

	// Useful stand-alone for engine
	checkGameEnd(color)
	{
		// No valid move: stalemate or checkmate?
		if (!this.isAttacked(this.kingPos[color], this.getOppCol(color)))
			return "1/2";
		// OK, checkmate
		return color == "w" ? "0-1" : "1-0";
	}

	////////
	//ENGINE

	// Pieces values
	static get VALUES() {
		return {
			'p': 1,
			'r': 5,
			'n': 3,
			'b': 3,
			'q': 9,
			'k': 1000
		};
	}

	// Assumption: at least one legal move
	getComputerMove(color)
	{
		const oppCol = this.getOppCol(color);

		// Rank moves using a min-max at depth 2
		let moves1 = this.getAllValidMoves(color);

		for (let i=0; i<moves1.length; i++)
		{
			moves1[i].eval = (color=="w" ? -1 : 1) * 1000; //very low, I'm checkmated
			let eval2 = (color=="w" ? 1 : -1) * 1000; //initialized with very high (checkmate) value
			this.play(moves1[i]);
			// Second half-move:
			let moves2 = this.getAllValidMoves(oppCol);
			// If no possible moves AND underCheck, eval2 is correct.
			// If !underCheck, eval2 is 0 (stalemate).
			if (moves2.length == 0 && this.checkGameEnd(oppCol) == "1/2")
				eval2 = 0;
			for (let j=0; j<moves2.length; j++)
			{
				this.play(moves2[j]);
				let evalPos = this.evalPosition();
				if ((color == "w" && evalPos < eval2) || (color=="b" && evalPos > eval2))
					eval2 = evalPos;
				this.undo(moves2[j]);
			}
			if ((color=="w" && eval2 > moves1[i].eval) || (color=="b" && eval2 < moves1[i].eval))
				moves1[i].eval = eval2;
			this.undo(moves1[i]);
		}
		moves1.sort( (a,b) => { return (color=="w" ? 1 : -1) * (b.eval - a.eval); });

		// TODO: show current analyzed move for depth 3, allow stopping eval (return moves1[0])
		for (let i=0; i<moves1.length; i++)
		{
			this.play(moves1[i]);
			// 0.1 * oldEval : heuristic to avoid some bad moves (not all...)
			moves1[i].eval = 0.1*moves1[i].eval + this.alphabeta(oppCol, color, 2, -1000, 1000);
			this.undo(moves1[i]);
		}
		moves1.sort( (a,b) => { return (color=="w" ? 1 : -1) * (b.eval - a.eval); });

		let candidates = [0]; //indices of candidates moves
		for (let j=1; j<moves1.length && moves1[j].eval == moves1[0].eval; j++)
			candidates.push(j);

		//console.log(moves1.map(m => { return [this.getNotation(m), m.eval]; }));
		return moves1[_.sample(candidates, 1)];
	}

	alphabeta(color, oppCol, depth, alpha, beta)
  {
		const moves = this.getAllValidMoves(color);
		if (moves.length == 0)
		{
			switch (this.checkGameEnd(color))
			{
				case "1/2": return 0;
				default: return color=="w" ? -1000 : 1000;
			}
		}
		if (depth == 0)
      return this.evalPosition();
    let v = color=="w" ? -1000 : 1000;
		if (color == "w")
		{
			for (let i=0; i<moves.length; i++)
      {
				this.play(moves[i]);
				v = Math.max(v, this.alphabeta(oppCol, color, depth-1, alpha, beta));
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
				v = Math.min(v, this.alphabeta(oppCol, color, depth-1, alpha, beta));
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
		const [sizeX,sizeY] = VariantRules.size;
		let evaluation = 0;
		//Just count material for now
		for (let i=0; i<sizeX; i++)
		{
			for (let j=0; j<sizeY; j++)
			{
				if (this.board[i][j] != VariantRules.EMPTY)
				{
					const sign = this.getColor(i,j) == "w" ? 1 : -1;
					evaluation += sign * VariantRules.VALUES[this.getPiece(i,j)];
				}
			}
		}
		return evaluation;
	}

	////////////
	// FEN utils

	// Overridable..
	static GenRandInitFen()
	{
		let pieces = [new Array(8), new Array(8)];
		// Shuffle pieces on first and last rank
		for (let c = 0; c <= 1; c++)
		{
			let positions = _.range(8);

			// Get random squares for bishops
			let randIndex = 2 * _.random(3);
			let bishop1Pos = positions[randIndex];
			// The second bishop must be on a square of different color
			let randIndex_tmp = 2 * _.random(3) + 1;
			let bishop2Pos = positions[randIndex_tmp];
			// Remove chosen squares
			positions.splice(Math.max(randIndex,randIndex_tmp), 1);
			positions.splice(Math.min(randIndex,randIndex_tmp), 1);

			// Get random squares for knights
			randIndex = _.random(5);
			let knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);
			randIndex = _.random(4);
			let knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Get random square for queen
			randIndex = _.random(3);
			let queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Rooks and king positions are now fixed, because of the ordering rook-king-rook
			let rook1Pos = positions[0];
			let kingPos = positions[1];
			let rook2Pos = positions[2];

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
		let fen = pieces[0].join("") +
			"/pppppppp/8/8/8/8/PPPPPPPP/" +
			pieces[1].join("").toUpperCase() +
			" 1111 - 0"; //flags + enPassant + movesCount
		return fen;
	}

	// Return current fen according to pieces+colors state
	getFen()
	{
		const L = this.epSquares.length;
		const epSq = this.epSquares[L-1]===undefined
			? "-"
			: this.epSquares[L-1].x+","+this.epSquares[L-1].y;
		return this.getBaseFen() + " " + this.getFlagsFen()
			+ " " + epSq + " " + this.movesCount;
	}

	getBaseFen()
	{
		let fen = "";
		let [sizeX,sizeY] = VariantRules.size;
		for (let i=0; i<sizeX; i++)
		{
			let emptyCount = 0;
			for (let j=0; j<sizeY; j++)
			{
				if (this.board[i][j] == VariantRules.EMPTY)
					emptyCount++;
				else
				{
					if (emptyCount > 0)
					{
						// Add empty squares in-between
						fen += emptyCount;
						emptyCount = 0;
					}
					fen += VariantRules.board2fen(this.board[i][j]);
				}
			}
			if (emptyCount > 0)
			{
				// "Flush remainder"
				fen += emptyCount;
			}
			if (i < sizeX - 1)
				fen += "/"; //separate rows
		}
		return fen;
	}

	// Overridable..
	getFlagsFen()
	{
		let fen = "";
		// Add castling flags
		for (let i of ['w','b'])
		{
			for (let j=0; j<2; j++)
				fen += this.flags[i][j] ? '1' : '0';
		}
		return fen;
	}

	// Context: just before move is played, turn hasn't changed
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
				notation = startColumn + "x" + finalSquare;
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
			return piece.toUpperCase() + (move.vanish.length > 1 ? "x" : "") + finalSquare;
		}
	}

	// The score is already computed when calling this function
	getPGN(mycolor, score, fenStart)
	{
		let pgn = "";
		pgn += '[Site "vchess.club"]<br>';
		const d = new Date();
		pgn += '[Date "' + d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate() + '"]<br>';
		pgn += '[White "' + (mycolor=='w'?'Myself':'Anonymous') + '"]<br>';
		pgn += '[Black "' + (mycolor=='b'?'Myself':'Anonymous') + '"]<br>';
		pgn += '[Fen "' + fenStart + '"]<br>';
		pgn += '[Result "' + score + '"]<br><br>';

		for (let i=0; i<this.moves.length; i++)
		{
			if (i % 2 == 0)
				pgn += ((i/2)+1) + ".";
			pgn += this.moves[i].notation + " ";
		}

		pgn += score;
		return pgn;
	}
}
