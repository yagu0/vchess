			hints: (!localStorage["hints"] ? true : localStorage["hints"] === "1"),
			bcolor: localStorage["bcolor"] || "lichess", //lichess, chesscom or chesstempo
			possibleMoves: [], //filled after each valid click/dragstart
			choices: [], //promotion pieces, or checkered captures... (as moves)
			selectedPiece: null, //moving piece (or clicked piece)
			incheck: [],
			start: {}, //pixels coordinates + id of starting square (click or drag)
			vr: null, //object to check moves, store them, FEN..
	orientation: "w", //useful if click on "flip board"	
	

// TODO: watch for property change "fen"
// send event after each move, to notify what was played
	
	const [sizeX,sizeY] = [V.size.x,V.size.y];
		// Precompute hints squares to facilitate rendering
		let hintSquares = doubleArray(sizeX, sizeY, false);
		this.possibleMoves.forEach(m => { hintSquares[m.end.x][m.end.y] = true; });
		// Also precompute in-check squares
		let incheckSq = doubleArray(sizeX, sizeY, false);
		this.incheck.forEach(sq => { incheckSq[sq[0]][sq[1]] = true; });
			const choices = h('div',
				{
					attrs: { "id": "choices" },
					'class': { 'row': true },
					style: {
						"display": this.choices.length>0?"block":"none",
						"top": "-" + ((sizeY/2)*squareWidth+squareWidth/2) + "px",
						"width": (this.choices.length * squareWidth) + "px",
						"height": squareWidth + "px",
					},
				},
				this.choices.map( m => { //a "choice" is a move
					return h('div',
						{
							'class': {
								'board': true,
								['board'+sizeY]: true,
							},
							style: {
								'width': (100/this.choices.length) + "%",
								'padding-bottom': (100/this.choices.length) + "%",
							},
						},
						[h('img',
							{
								attrs: { "src": '/images/pieces/' +
									VariantRules.getPpath(m.appear[0].c+m.appear[0].p) + '.svg' },
								'class': { 'choice-piece': true },
								on: {
									"click": e => { this.play(m); this.choices=[]; },
									// NOTE: add 'touchstart' event to fix a problem on smartphones
									"touchstart": e => { this.play(m); this.choices=[]; },
								},
							})
						]
					);
				})
			);
			// Create board element (+ reserves if needed by variant or mode)
			const lm = this.vr.lastMove;
			const showLight = this.hints && variant.name!="Dark" &&
				(this.mode != "idle" ||
					(this.vr.moves.length > 0 && this.cursor==this.vr.moves.length));
			const gameDiv = h('div',
				{
					'class': {
						'game': true,
						'clearer': true,
					},
				},
				[_.range(sizeX).map(i => {
					let ci = (this.mycolor=='w' ? i : sizeX-i-1);
					return h(
						'div',
						{
							'class': {
								'row': true,
							},
							style: { 'opacity': this.choices.length>0?"0.5":"1" },
						},
						_.range(sizeY).map(j => {
							let cj = (this.mycolor=='w' ? j : sizeY-j-1);
							let elems = [];
							if (this.vr.board[ci][cj] != VariantRules.EMPTY && (variant.name!="Dark"
								|| this.score!="*" || this.vr.enlightened[this.mycolor][ci][cj]))
							{
								elems.push(
									h(
										'img',
										{
											'class': {
												'piece': true,
												'ghost': !!this.selectedPiece
													&& this.selectedPiece.parentNode.id == "sq-"+ci+"-"+cj,
											},
											attrs: {
												src: "/images/pieces/" +
													VariantRules.getPpath(this.vr.board[ci][cj]) + ".svg",
											},
										}
									)
								);
							}
							if (this.hints && hintSquares[ci][cj])
							{
								elems.push(
									h(
										'img',
										{
											'class': {
												'mark-square': true,
											},
											attrs: {
												src: "/images/mark.svg",
											},
										}
									)
								);
							}
							return h(
								'div',
								{
									'class': {
										'board': true,
										['board'+sizeY]: true,
										'light-square': (i+j)%2==0,
										'dark-square': (i+j)%2==1,
										[this.bcolor]: true,
										'in-shadow': variant.name=="Dark" && this.score=="*"
											&& !this.vr.enlightened[this.mycolor][ci][cj],
										'highlight': showLight && !!lm && _.isMatch(lm.end, {x:ci,y:cj}),
										'incheck': showLight && incheckSq[ci][cj],
									},
									attrs: {
										id: this.getSquareId({x:ci,y:cj}),
									},
								},
								elems
							);
						})
					);
				}), choices]
			);
			if (!!this.vr.reserve)
			{
				const shiftIdx = (this.mycolor=="w" ? 0 : 1);
				let myReservePiecesArray = [];
				for (let i=0; i<VariantRules.RESERVE_PIECES.length; i++)
				{
					myReservePiecesArray.push(h('div',
					{
						'class': {'board':true, ['board'+sizeY]:true},
						attrs: { id: this.getSquareId({x:sizeX+shiftIdx,y:i}) }
					},
					[
						h('img',
						{
							'class': {"piece":true, "reserve":true},
							attrs: {
								"src": "/images/pieces/" +
									this.vr.getReservePpath(this.mycolor,i) + ".svg",
							}
						}),
						h('sup',
							{"class": { "reserve-count": true } },
							[ this.vr.reserve[this.mycolor][VariantRules.RESERVE_PIECES[i]] ]
						)
					]));
				}
				let oppReservePiecesArray = [];
				const oppCol = this.vr.getOppCol(this.mycolor);
				for (let i=0; i<VariantRules.RESERVE_PIECES.length; i++)
				{
					oppReservePiecesArray.push(h('div',
					{
						'class': {'board':true, ['board'+sizeY]:true},
						attrs: { id: this.getSquareId({x:sizeX+(1-shiftIdx),y:i}) }
					},
					[
						h('img',
						{
							'class': {"piece":true, "reserve":true},
							attrs: {
								"src": "/images/pieces/" +
									this.vr.getReservePpath(oppCol,i) + ".svg",
							}
						}),
						h('sup',
							{"class": { "reserve-count": true } },
							[ this.vr.reserve[oppCol][VariantRules.RESERVE_PIECES[i]] ]
						)
					]));
				}
				let reserves = h('div',
					{
						'class':{
							'game': true,
							"reserve-div": true,
						},
					},
					[
						h('div',
							{
								'class': {
									'row': true,
									"reserve-row-1": true,
								},
							},
							myReservePiecesArray
						),
						h('div',
							{ 'class': { 'row': true }},
							oppReservePiecesArray
						)
					]
				);
				elementArray.push(reserves);
			}
				// Show current FEN (just below board, lower right corner)
// (if mode != Dark ...)
				elementArray.push(
					h('div',
						{
							attrs: { id: "fen-div" },
							"class": { "section-content": true },
						},
						[
							h('p',
								{
									attrs: { id: "fen-string" },
									domProps: { innerHTML: this.vr.getBaseFen() },
									"class": { "text-center": true },
								}
							)
						]
					)
				);
				on: {
					mousedown: this.mousedown,
					mousemove: this.mousemove,
					mouseup: this.mouseup,
					touchstart: this.mousedown,
					touchmove: this.mousemove,
					touchend: this.mouseup,
				},


		// TODO: "chessground-like" component
		// Get the identifier of a HTML table cell from its numeric coordinates o.x,o.y.
		getSquareId: function(o) {
			// NOTE: a separator is required to allow any size of board
			return  "sq-" + o.x + "-" + o.y;
		},
		// Inverse function
		getSquareFromId: function(id) {
			let idParts = id.split('-');
			return [parseInt(idParts[1]), parseInt(idParts[2])];
		},
		mousedown: function(e) {
			e = e || window.event;
			let ingame = false;
			let elem = e.target;
			while (!ingame && elem !== null)
			{
				if (elem.classList.contains("game"))
				{
					ingame = true;
					break;
				}
				elem = elem.parentElement;
			}
			if (!ingame) //let default behavior (click on button...)
				return;
			e.preventDefault(); //disable native drag & drop
			if (!this.selectedPiece && e.target.classList.contains("piece"))
			{
				// Next few lines to center the piece on mouse cursor
				let rect = e.target.parentNode.getBoundingClientRect();
				this.start = {
					x: rect.x + rect.width/2,
					y: rect.y + rect.width/2,
					id: e.target.parentNode.id
				};
				this.selectedPiece = e.target.cloneNode();
				this.selectedPiece.style.position = "absolute";
				this.selectedPiece.style.top = 0;
				this.selectedPiece.style.display = "inline-block";
				this.selectedPiece.style.zIndex = 3000;
				const startSquare = this.getSquareFromId(e.target.parentNode.id);
				this.possibleMoves = [];
				if (this.score == "*")
				{

// TODO: essentially adapt this (all other things do not change much)
// if inside a real game, mycolor should be provided ? (simplest way)

					const color = ["friend","problem"].includes(this.mode)
						? this.vr.turn
						: this.mycolor;
					if (this.vr.canIplay(color,startSquare))
						this.possibleMoves = this.vr.getPossibleMovesFrom(startSquare);
				}
				// Next line add moving piece just after current image
				// (required for Crazyhouse reserve)
				e.target.parentNode.insertBefore(this.selectedPiece, e.target.nextSibling);
			}
		},
		mousemove: function(e) {
			if (!this.selectedPiece)
				return;
			e = e || window.event;
			// If there is an active element, move it around
			if (!!this.selectedPiece)
			{
				const [offsetX,offsetY] = !!e.clientX
					? [e.clientX,e.clientY] //desktop browser
					: [e.changedTouches[0].pageX, e.changedTouches[0].pageY]; //smartphone
				this.selectedPiece.style.left = (offsetX-this.start.x) + "px";
				this.selectedPiece.style.top = (offsetY-this.start.y) + "px";
			}
		},
		mouseup: function(e) {
			if (!this.selectedPiece)
				return;
			e = e || window.event;
			// Read drop target (or parentElement, parentNode... if type == "img")
			this.selectedPiece.style.zIndex = -3000; //HACK to find square from final coords
			const [offsetX,offsetY] = !!e.clientX
				? [e.clientX,e.clientY]
				: [e.changedTouches[0].pageX, e.changedTouches[0].pageY];
			let landing = document.elementFromPoint(offsetX, offsetY);
			this.selectedPiece.style.zIndex = 3000;
			// Next condition: classList.contains(piece) fails because of marks
			while (landing.tagName == "IMG")
				landing = landing.parentNode;
			if (this.start.id == landing.id)
			{
				// A click: selectedPiece and possibleMoves are already filled
				return;
			}
			// OK: process move attempt
			let endSquare = this.getSquareFromId(landing.id);
			let moves = this.findMatchingMoves(endSquare);
			this.possibleMoves = [];
			if (moves.length > 1)
				this.choices = moves;
			else if (moves.length==1)
				this.play(moves[0]);
			// Else: impossible move
			this.selectedPiece.parentNode.removeChild(this.selectedPiece);
			delete this.selectedPiece;
			this.selectedPiece = null;
		},
		findMatchingMoves: function(endSquare) {
			// Run through moves list and return the matching set (if promotions...)
			let moves = [];
			this.possibleMoves.forEach(function(m) {
				if (endSquare[0] == m.end.x && endSquare[1] == m.end.y)
					moves.push(m);
			});
			return moves;
		},
		animateMove: function(move) {
			let startSquare = document.getElementById(this.getSquareId(move.start));
			let endSquare = document.getElementById(this.getSquareId(move.end));
			let rectStart = startSquare.getBoundingClientRect();
			let rectEnd = endSquare.getBoundingClientRect();
			let translation = {x:rectEnd.x-rectStart.x, y:rectEnd.y-rectStart.y};
			let movingPiece =
				document.querySelector("#" + this.getSquareId(move.start) + " > img.piece");
			// HACK for animation (with positive translate, image slides "under background")
			// Possible improvement: just alter squares on the piece's way...
			squares = document.getElementsByClassName("board");
			for (let i=0; i<squares.length; i++)
			{
				let square = squares.item(i);
				if (square.id != this.getSquareId(move.start))
					square.style.zIndex = "-1";
			}
			movingPiece.style.transform = "translate(" + translation.x + "px," +
				translation.y + "px)";
			movingPiece.style.transitionDuration = "0.2s";
			movingPiece.style.zIndex = "3000";
			setTimeout( () => {
				for (let i=0; i<squares.length; i++)
					squares.item(i).style.zIndex = "auto";
				movingPiece.style = {}; //required e.g. for 0-0 with KR swap
				this.play(move);
			}, 250);
		},
