class UltimaRules extends ChessRules
{
	static getPpath(b)
	{
		if (b[1] == "m") //'m' for Immobilizer (I is too similar to 1)
			return "Ultima/" + b;
		return b; //usual piece
	}

	initVariables(fen)
	{
		this.kingPos = {'w':[-1,-1], 'b':[-1,-1]};
		const fenParts = fen.split(" ");
		const position = fenParts[0].split("/");
		for (let i=0; i<position.length; i++)
		{
			let k = 0;
			for (let j=0; j<position[i].length; j++)
			{
				switch (position[i].charAt(j))
				{
					case 'k':
						this.kingPos['b'] = [i,k];
						break;
					case 'K':
						this.kingPos['w'] = [i,k];
						break;
					default:
						let num = parseInt(position[i].charAt(j));
						if (!isNaN(num))
							k += (num-1);
				}
				k++;
			}
		}
		this.epSquares = []; //no en-passant here
	}

	setFlags(fen)
	{
		// TODO: for compatibility?
		this.castleFlags = {"w":[false,false], "b":[false,false]};
	}

	static get IMMOBILIZER() { return 'm'; }
	// Although other pieces keep their names here for coding simplicity,
	// keep in mind that:
	//  - a "rook" is a coordinator, capturing by coordinating with the king
	//  - a "knight" is a long-leaper, capturing as in draughts
	//  - a "bishop" is a chameleon, capturing as its prey
	//  - a "queen" is a withdrawer, capturing by moving away from pieces

	getPotentialMovesFrom([x,y])
	{
		// Pre-check: is thing on this square immobilized?
		// In this case add potential suicide as a move "taking the immobilizer"
		const piece = this.getPiece(x,y);
		const color = this.getColor(x,y);
		const oppCol = this.getOppCol(color);
		const V = VariantRules;
		const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		const [sizeX,sizeY] = V.size;
		for (let step of adjacentSteps)
		{
			const [i,j] = [x+step[0],y+step[1]];
			if (i>=0 && i<sizeX && j>=0 && j<sizeY && this.board[i][j] != V.EMPTY
				&& this.getColor(i,j) == oppCol)
			{
				const oppPiece = this.getPiece(i,j);
				if (oppPiece == V.IMMOBILIZER
					|| (oppPiece == V.BISHOP && piece == V.IMMOBILIZER))
				{
					return [ new Move({
						appear: [],
						vanish: [new PiPo({x:x,y:y,p:piece,c:color})],
						start: {x:x,y:y},
						end: {x:i,y:j}
					}) ];
				}
			}
		}
		switch (this.getPiece(x,y))
		{
			case VariantRules.IMMOBILIZER:
				return this.getPotentialImmobilizerMoves([x,y]);
			default:
				return super.getPotentialMovesFrom([x,y]);
		}
	}

	getSlideNJumpMoves([x,y], steps, oneStep)
	{
		const color = this.getColor(x,y);
		const piece = this.getPiece(x,y);
		let moves = [];
		const [sizeX,sizeY] = VariantRules.size;
		outerLoop:
		for (let step of steps)
		{
			let i = x + step[0];
			let j = y + step[1];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY
				&& this.board[i][j] == VariantRules.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [i,j]));
				if (oneStep !== undefined)
					continue outerLoop;
				i += step[0];
				j += step[1];
			}
			// Only king can take on occupied square:
			if (piece==VariantRules.KING && i>=0 && i<sizeX && j>=0
				&& j<sizeY && this.canTake([x,y], [i,j]))
			{
				moves.push(this.getBasicMove([x,y], [i,j]));
			}
		}
		return moves;
	}

	// Modify capturing moves among listed pawn moves
	addPawnCaptures(moves, byChameleon)
	{
		const steps = VariantRules.steps[VariantRules.ROOK];
		const [sizeX,sizeY] = VariantRules.size;
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		moves.forEach(m => {
			if (!!byChameleon && m.start.x!=m.end.x && m.start.y!=m.end.y)
				return; //chameleon not moving as pawn
			// Try capturing in every direction
			for (let step of steps)
			{
				const sq2 = [m.end.x+2*step[0],m.end.y+2*step[1]];
				if (sq2[0]>=0 && sq2[0]<sizeX && sq2[1]>=0 && sq2[1]<sizeY
					&& this.board[sq2[0]][sq2[1]] != VariantRules.EMPTY
					&& this.getColor(sq2[0],sq2[1]) == color)
				{
					// Potential capture
					const sq1 = [m.end.x+step[0],m.end.y+step[1]];
					if (this.board[sq1[0]][sq1[1]] != VariantRules.EMPTY
						&& this.getColor(sq1[0],sq1[1]) == oppCol)
					{
						const piece1 = this.getPiece(sq1[0],sq1[1]);
						if (!byChameleon || piece1 == VariantRules.PAWN)
						{
							m.vanish.push(new PiPo({
								x:sq1[0],
								y:sq1[1],
								c:oppCol,
								p:piece1
							}));
						}
					}
				}
			}
		});
	}

	// "Pincher"
	getPotentialPawnMoves([x,y])
	{
		let moves = super.getPotentialRookMoves([x,y]);
		this.addPawnCaptures(moves);
		return moves;
	}

	addRookCaptures(moves, byChameleon)
	{
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		const kp = this.kingPos[color];
		moves.forEach(m => {
			// Check piece-king rectangle (if any) corners for enemy pieces
			if (m.end.x == kp[0] || m.end.y == kp[1])
				return; //"flat rectangle"
			const corner1 = [Math.max(m.end.x,kp[0]), Math.min(m.end.y,kp[1])];
			const corner2 = [Math.min(m.end.x,kp[0]), Math.max(m.end.y,kp[1])];
			for (let [i,j] of [corner1,corner2])
			{
				if (this.board[i][j] != VariantRules.EMPTY && this.getColor(i,j) == oppCol)
				{
					const piece = this.getPiece(i,j);
					if (!byChameleon || piece == VariantRules.ROOK)
					{
						m.vanish.push( new PiPo({
							x:i,
							y:j,
							p:piece,
							c:oppCol
						}) );
					}
				}
			}
		});
	}

	// Coordinator
	getPotentialRookMoves(sq)
	{
		let moves = super.getPotentialQueenMoves(sq);
		this.addRookCaptures(moves);
		return moves;
	}

	// Long-leaper
	getKnightCaptures(startSquare, byChameleon)
	{
		// Look in every direction for captures
		const V = VariantRules;
		const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		const [sizeX,sizeY] = V.size;
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		let moves = [];
		const [x,y] = [startSquare[0],startSquare[1]];
		const piece = this.getPiece(x,y); //might be a chameleon!
		outerLoop:
		for (let step of steps)
		{
			let [i,j] = [x+step[0], y+step[1]];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY && this.board[i][j]==V.EMPTY)
			{
				i += step[0];
				j += step[1];
			}
			if (i<0 || i>=sizeX || j<0 || j>=sizeY || this.getColor(i,j)==color
				|| (!!byChameleon && this.getPiece(i,j)!=V.KNIGHT))
			{
				continue;
			}
			// last(thing), cur(thing) : stop if "cur" is our color, or beyond board limits,
			// or if "last" isn't empty and cur neither. Otherwise, if cur is empty then
			// add move until cur square; if cur is occupied then stop if !!byChameleon and
			// the square not occupied by a leaper.
			let last = [i,j];
			let cur = [i+step[0],j+step[1]];
			let vanished = [ new PiPo({x:x,y:y,c:color,p:piece}) ];
			while (cur[0]>=0 && cur[0]<sizeX && cur[1]>=0 && cur[1]<sizeY)
			{
				if (this.board[last[0]][last[1]] != V.EMPTY)
				{
					const oppPiece = this.getPiece(last[0],last[1]);
					if (!!byChameleon && oppPiece != V.KNIGHT)
						continue outerLoop;
					// Something to eat:
					vanished.push( new PiPo({x:last[0],y:last[1],c:oppCol,p:oppPiece}) );
				}
				if (this.board[cur[0]][cur[1]] != V.EMPTY)
				{
					if (this.getColor(cur[0],cur[1]) == color
						|| this.board[last[0]][last[1]] != V.EMPTY) //TODO: redundant test
					{
						continue outerLoop;
					}
				}
				else
				{
					moves.push(new Move({
						appear: [ new PiPo({x:cur[0],y:cur[1],c:color,p:piece}) ],
						vanish: JSON.parse(JSON.stringify(vanished)), //TODO: required?
						start: {x:x,y:y},
						end: {x:cur[0],y:cur[1]}
					}));
				}
				last = [last[0]+step[0],last[1]+step[1]];
				cur = [cur[0]+step[0],cur[1]+step[1]];
			}
		}
		return moves;
	}

	// Long-leaper
	getPotentialKnightMoves(sq)
	{
		return super.getPotentialQueenMoves(sq).concat(this.getKnightCaptures(sq));
	}

	getPotentialBishopMoves(sq)
	{
		let moves = super.getPotentialQueenMoves(sq)
			.concat(this.getKnightCaptures(sq,"asChameleon"));
		// NOTE: no "addKingCaptures" because the king isn't captured
		this.addPawnCaptures(moves, "asChameleon");
		this.addRookCaptures(moves, "asChameleon");
		this.addQueenCaptures(moves, "asChameleon");
		// Post-processing: merge similar moves, concatenating vanish arrays
		let mergedMoves = {};
		const [sizeX,sizeY] = VariantRules.size;
		moves.forEach(m => {
			const key = m.end.x + sizeX * m.end.y;
			if (!mergedMoves[key])
				mergedMoves[key] = m;
			else
			{
				for (let i=1; i<m.vanish.length; i++)
					mergedMoves[key].vanish.push(m.vanish[i]);
			}
		});
		// Finally return an array
		moves = [];
		Object.keys(mergedMoves).forEach(k => { moves.push(mergedMoves[k]); });
		return moves;
	}

	// Withdrawer
	addQueenCaptures(moves, byChameleon)
	{
		if (moves.length == 0)
			return;
		const [x,y] = [moves[0].start.x,moves[0].start.y];
		const V = VariantRules;
		const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		let capturingDirections = [];
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		const [sizeX,sizeY] = V.size;
		adjacentSteps.forEach(step => {
			const [i,j] = [x+step[0],y+step[1]];
			if (i>=0 && i<sizeX && j>=0 && j<sizeY
				&& this.board[i][j] != V.EMPTY && this.getColor(i,j) == oppCol
				&& (!byChameleon || this.getPiece(i,j) == V.QUEEN))
			{
				capturingDirections.push(step);
			}
		});
		moves.forEach(m => {
			const step = [
				m.end.x!=x ? (m.end.x-x)/Math.abs(m.end.x-x) : 0,
				m.end.y!=y ? (m.end.y-y)/Math.abs(m.end.y-y) : 0
			];
			// NOTE: includes() and even _.isEqual() functions fail...
			// TODO: this test should be done only once per direction
			if (capturingDirections.some(dir =>
				{ return (dir[0]==-step[0] && dir[1]==-step[1]); }))
			{
				const [i,j] = [x-step[0],y-step[1]];
				m.vanish.push(new PiPo({
					x:i,
					y:j,
					p:this.getPiece(i,j),
					c:oppCol
				}));
			}
		});
	}

	getPotentialQueenMoves(sq)
	{
		let moves = super.getPotentialQueenMoves(sq);
		this.addQueenCaptures(moves);
		return moves;
	}

	getPotentialImmobilizerMoves(sq)
	{
		// Immobilizer doesn't capture
		return super.getPotentialQueenMoves(sq);
	}

	getPotentialKingMoves(sq)
	{
		const V = VariantRules;
		return this.getSlideNJumpMoves(sq,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	// isAttacked() is OK because the immobilizer doesn't take

	isAttackedByPawn([x,y], colors)
	{
		// Square (x,y) must be surrounded by two enemy pieces,
		// and one of them at least should be a pawn.
		const dirs = [ [1,0],[0,1],[1,1],[-1,1] ];
		const [sizeX,sizeY] = VariantRules.size;
		for (let dir of dirs)
		{
			const [i1,j1] = [x-dir[0],y-dir[1]]; //"before"
			const [i2,j2] = [x+dir[0],y+dir[1]]; //"after"
			if (i1>=0 && i1<sizeX && i2>=0 && i2<sizeX
				&& j1>=0 && j1<sizeY && j2>=0 && j2<sizeY
				&& this.board[i1][j1]!=VariantRules.EMPTY
				&& this.board[i2][j2]!=VariantRules.EMPTY
				&& colors.includes(this.getColor(i1,j1))
				&& colors.includes(this.getColor(i2,j2))
				&& [this.getPiece(i1,j1),this.getPiece(i2,j2)].includes(VariantRules.PAWN))
			{
				return true;
			}
		}
		return false;
	}

	isAttackedByRook([x,y], colors)
	{
		const [sizeX,sizeY] = VariantRules.size;
		// King must be on same column and a rook on same row (or reverse)
		if (x == this.kingPos[colors[0]][0]) //using colors[0], only element in this case
		{
			// Look for enemy rook on this column
			for (let i=0; i<sizeY; i++)
			{
				if (this.board[x][i] != VariantRules.EMPTY
					&& colors.includes(this.getColor(x,i))
					&& this.getPiece(x,i) == VariantRules.ROOK)
				{
					return true;
				}
			}
		}
		else if (y == this.kingPos[colors[0]][1])
		{
			// Look for enemy rook on this row
			for (let i=0; i<sizeX; i++)
			{
				if (this.board[i][y] != VariantRules.EMPTY
					&& colors.includes(this.getColor(i,y))
					&& this.getPiece(i,y) == VariantRules.ROOK)
				{
					return true;
				}
			}
		}
		return false;
	}

	isAttackedByKnight([x,y], colors)
	{
		// Square (x,y) must be on same line as a knight,
		// and there must be empty square(s) behind.
		const V = VariantRules;
		const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		const [sizeX,sizeY] = V.size;
		for (let step of steps)
		{
			const [i0,j0] = [x+step[0],y+step[1]];
			if (i0>=0 && i0<sizeX && j0>=0 && j0<sizeY && this.board[i0][j0] == V.EMPTY)
			{
				// Try in opposite direction:
				let [i,j] = [x-step[0],y-step[1]];
				while (i>=0 && i<sizeX && j>=0 && j<sizeY && this.board[i][j] == V.EMPTY)
				{
					i -= step[0];
					j -= step[1];
				}
				if (i>=0 && i<sizeX && j>=0 && j<sizeY && colors.includes(this.getColor(i,j))
					&& this.getPiece(i,j) == V.KNIGHT)
				{
					return true;
				}
			}
		}
		return false;
	}

	isAttackedByBishop([x,y], colors)
	{
		// We cheat a little here: since this function is used exclusively for king,
		// it's enough to check the immediate surrounding of the square.
		const V = VariantRules;
		const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		const [sizeX,sizeY] = V.size;
		for (let step of adjacentSteps)
		{
			const [i,j] = [x+step[0],y+step[1]];
			if (i>=0 && i<sizeX && j>=0 && j<sizeY && this.board[i][j]!=V.EMPTY
				&& colors.includes(this.getColor(i,j)) && this.getPiece(i,j) == V.BISHOP)
			{
				return true;
			}
		}
		return false;
	}

	isAttackedByQueen([x,y], colors)
	{
		// Square (x,y) must be adjacent to a queen, and the queen must have
		// some free space in the opposite direction from (x,y)
		const V = VariantRules;
		const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		const [sizeX,sizeY] = V.size;
		for (let step of adjacentSteps)
		{
			const sq2 = [x+2*step[0],y+2*step[1]];
			if (sq2[0]>=0 && sq2[0]<sizeX && sq2[1]>=0 && sq2[1]<sizeY
				&& this.board[sq2[0]][sq2[1]] == V.EMPTY)
			{
				const sq1 = [x+step[0],y+step[1]];
				if (this.board[sq1[0]][sq1[1]] != V.EMPTY
					&& colors.includes(this.getColor(sq1[0],sq1[1]))
					&& this.getPiece(sq1[0],sq1[1]) == V.QUEEN)
				{
					return true;
				}
			}
		}
		return false;
	}

	updateVariables(move)
	{
		// Just update king position
		const piece = this.getPiece(move.start.x,move.start.y);
		const c = this.getColor(move.start.x,move.start.y);
		if (piece == VariantRules.KING && move.appear.length > 0)
		{
			this.kingPos[c][0] = move.appear[0].x;
			this.kingPos[c][1] = move.appear[0].y;
		}
	}

	checkGameEnd()
	{
		// No valid move: game is lost (stalemate is a win)
		return this.turn == "w" ? "0-1" : "1-0";
	}

	static get VALUES() { //TODO: totally experimental!
		return {
			'p': 1,
			'r': 2,
			'n': 5,
			'b': 3,
			'q': 3,
			'm': 5,
			'k': 1000
		};
	}

	static get SEARCH_DEPTH() { return 2; } //TODO?

	static GenRandInitFen()
	{
		let pieces = { "w": new Array(8), "b": new Array(8) };
		// Shuffle pieces on first and last rank
		for (let c of ["w","b"])
		{
			let positions = _.range(8);
			// Get random squares for every piece, totally freely

			let randIndex = _.random(7);
			const bishop1Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(6);
			const bishop2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(5);
			const knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(4);
			const knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(3);
			const queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(2);
			const kingPos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(1);
			const rookPos = positions[randIndex];
			positions.splice(randIndex, 1);
			const immobilizerPos = positions[0];

			pieces[c][bishop1Pos] = 'b';
			pieces[c][bishop2Pos] = 'b';
			pieces[c][knight1Pos] = 'n';
			pieces[c][knight2Pos] = 'n';
			pieces[c][queenPos] = 'q';
			pieces[c][kingPos] = 'k';
			pieces[c][rookPos] = 'r';
			pieces[c][immobilizerPos] = 'm';
		}
		return pieces["b"].join("") +
			"/pppppppp/8/8/8/8/PPPPPPPP/" +
			pieces["w"].join("").toUpperCase() +
			" 0000"; //TODO: flags?!
	}

	getFlagsFen()
	{
		return "0000"; //TODO: or "-" ?
	}

	getNotation(move)
	{
		if (move.appear.length == 0)
		{
			const startSquare =
				String.fromCharCode(97 + move.start.y) + (VariantRules.size[0]-move.start.x);
			return "^" + startSquare; //suicide
		}
		return super.getNotation(move);
	}
}
