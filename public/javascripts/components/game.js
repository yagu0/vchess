// TODO: use indexedDB instead of localStorage? (more flexible: allow several games)
Vue.component('my-game', {
	data: function() {
		return {
			vr: null, //object to check moves, store them, FEN..
			mycolor: "w",
			possibleMoves: [], //filled after each valid click/dragstart
			choices: [], //promotion pieces, or checkered captures... (contain possible pieces)
			start: {}, //pixels coordinates + id of starting square (click or drag)
			selectedPiece: null, //moving piece (or clicked piece)
			conn: null, //socket messages
			score: "*", //'*' means 'unfinished'
			mode: "idle", //human, computer or idle (when not playing)
			oppid: "", //opponent ID in case of HH game
			oppConnected: false,
			seek: false,
			fenStart: "",
			incheck: [],
			expert: document.cookie.length>0 ? document.cookie.substr(-1)=="1" : false,
		};
	},
	render(h) {
		let [sizeX,sizeY] = VariantRules.size;
		// Precompute hints squares to facilitate rendering
		let hintSquares = doubleArray(sizeX, sizeY, false);
		this.possibleMoves.forEach(m => { hintSquares[m.end.x][m.end.y] = true; });
		// Also precompute in-check squares
		let incheckSq = doubleArray(sizeX, sizeY, false);
		this.incheck.forEach(sq => { incheckSq[sq[0]][sq[1]] = true; });
		let elementArray = [];
		const playingHuman = (this.mode == "human");
		const playingComp = (this.mode == "computer");
		let actionArray = [
			h('button',
				{
					on: { click: this.clickGameSeek },
					attrs: { "aria-label": 'New game VS human' },
					'class': {
						"tooltip": true,
						"bottom": true, //display below
						"seek": this.seek,
						"playing": playingHuman,
					},
				},
				[h('i', { 'class': { "material-icons": true } }, "accessibility")]),
			h('button',
				{
					on: { click: this.clickComputerGame },
					attrs: { "aria-label": 'New game VS computer' },
					'class': {
						"tooltip":true,
						"bottom": true,
						"playing": playingComp,
					},
				},
				[h('i', { 'class': { "material-icons": true } }, "computer")])
		];
		if (!!this.vr)
		{
			const square00 = document.getElementById("sq-0-0");
			const squareWidth = !!square00
				? parseFloat(window.getComputedStyle(square00).width.slice(0,-2))
				: 0;
			const indicWidth = (squareWidth>0 ? squareWidth/2 : 20);
			if (this.mode == "human")
			{
				let connectedIndic = h(
					'div',
					{
						"class": {
							"topindicator": true,
							"indic-left": true,
							"connected": this.oppConnected,
							"disconnected": !this.oppConnected,
						},
						style: {
							"width": indicWidth + "px",
							"height": indicWidth + "px",
						},
					}
				);
				elementArray.push(connectedIndic);
			}
			let turnIndic = h(
				'div',
				{
					"class": {
						"topindicator": true,
						"indic-right": true,
						"white-turn": this.vr.turn=="w",
						"black-turn": this.vr.turn=="b",
					},
					style: {
						"width": indicWidth + "px",
						"height": indicWidth + "px",
					},
				}
			);
			elementArray.push(turnIndic);
			let expertSwitch = h(
				'button',
				{
					on: { click: this.toggleExpertMode },
					attrs: { "aria-label": 'Toggle expert mode' },
					'class': {
						"tooltip":true,
						"topindicator": true,
						"indic-right": true,
						"expert-switch": true,
						"expert-mode": this.expert,
					},
				},
				[h('i', { 'class': { "material-icons": true } }, "remove_red_eye")]
			);
			elementArray.push(expertSwitch);
			let choices = h('div',
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
							'class': { 'board': true },
							style: {
								'width': (100/this.choices.length) + "%",
								'padding-bottom': (100/this.choices.length) + "%",
							},
						},
						[h('img',
							{
								attrs: { "src": '/images/pieces/' + VariantRules.getPpath(m.appear[0].c+m.appear[0].p) + '.svg' },
								'class': { 'choice-piece': true, 'board': true },
								on: { "click": e => { this.play(m); this.choices=[]; } },
							})
						]
					);
				})
			);
			// Create board element (+ reserves if needed by variant or mode)
			let gameDiv = h('div',
				{
					'class': { 'game': true },
				},
				[_.range(sizeX).map(i => {
					let ci = this.mycolor=='w' ? i : sizeX-i-1;
					return h(
						'div',
						{
							'class': {
								'row': true,
							},
							style: { 'opacity': this.choices.length>0?"0.5":"1" },
						},
						_.range(sizeY).map(j => {
							let cj = this.mycolor=='w' ? j : sizeY-j-1;
							let elems = [];
							if (this.vr.board[ci][cj] != VariantRules.EMPTY)
							{
								elems.push(
									h(
										'img',
										{
											'class': {
												'piece': true,
												'ghost': !!this.selectedPiece && this.selectedPiece.parentNode.id == "sq-"+ci+"-"+cj,
											},
											attrs: {
												src: "/images/pieces/" + VariantRules.getPpath(this.vr.board[ci][cj]) + ".svg",
											},
										}
									)
								);
							}
							if (!this.expert && hintSquares[ci][cj])
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
							const lm = this.vr.lastMove;
							const highlight = !!lm && _.isMatch(lm.end, {x:ci,y:cj});
							return h(
								'div',
								{
									'class': {
										'board': true,
										'light-square': (i+j)%2==0 && (this.expert || !highlight),
										'dark-square': (i+j)%2==1 && (this.expert || !highlight),
										'highlight': !this.expert && highlight,
										'incheck': !this.expert && incheckSq[ci][cj],
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
			actionArray.push(
				h('button',
					{
						on: { click: this.resign },
						attrs: { "aria-label": 'Resign' },
						'class': {
							"tooltip":true,
							"bottom": true,
						},
					},
					[h('i', { 'class': { "material-icons": true } }, "flag")])
			);
			elementArray.push(gameDiv);
	//			if (!!vr.reserve)
	//			{
	//				let reserve = h('div',
	//					{'class':{'game':true}}, [
	//						h('div',
	//							{ 'class': { 'row': true }},
	//							[
	//								h('div',
	//									{'class':{'board':true}},
	//									[h('img',{'class':{"piece":true},attrs:{"src":"/images/pieces/wb.svg"}})]
	//								)
	//							]
	//						)
	//					],
	//				);
	//				elementArray.push(reserve);
	//			}
			const eogMessage = this.getEndgameMessage(this.score);
			const modalEog = [
				h('input',
					{
						attrs: { "id": "modal-eog", type: "checkbox" },
						"class": { "modal": true },
					}),
				h('div',
					{
						attrs: { "role": "dialog", "aria-labelledby": "dialog-title" },
					},
					[
						h('div',
							{
								"class": { "card": true, "smallpad": true },
							},
							[
								h('label',
									{
										attrs: { "for": "modal-eog" },
										"class": { "modal-close": true },
									}
								),
								h('h3',
									{
										"class": { "section": true },
										domProps: { innerHTML: eogMessage },
									}
								)
							]
						)
					]
				)
			];
			elementArray = elementArray.concat(modalEog);
		}
		const modalNewgame = [
			h('input',
				{
					attrs: { "id": "modal-newgame", type: "checkbox" },
					"class": { "modal": true },
				}),
			h('div',
				{
					attrs: { "role": "dialog", "aria-labelledby": "dialog-title" },
				},
				[
					h('div',
						{
							"class": { "card": true, "smallpad": true },
						},
						[
							h('label',
								{
									attrs: { "id": "close-newgame", "for": "modal-newgame" },
									"class": { "modal-close": true },
								}
							),
							h('h3',
								{
									"class": { "section": true },
									domProps: { innerHTML: "New game" },
								}
							),
							h('p',
								{
									"class": { "section": true },
									domProps: { innerHTML: "Waiting for opponent..." },
								}
							)
						]
					)
				]
			)
		];
		elementArray = elementArray.concat(modalNewgame);
		const actions = h('div',
			{
				attrs: { "id": "actions" },
				'class': { 'text-center': true },
			},
			actionArray
		);
		elementArray.push(actions);
		if (this.score != "*")
		{
			elementArray.push(
				h('div',
					{ attrs: { id: "pgn-div" } },
					[
						h('a',
							{
								attrs: {
									id: "download",
									href: "#",
								}
							}
						),
						h('p',
							{
								attrs: { id: "pgn-game" },
								on: { click: this.download },
								domProps: {
									innerHTML: this.vr.getPGN(this.mycolor, this.score, this.fenStart, this.mode)
								}
							}
						)
					]
				)
			);
		}
		return h(
			'div',
			{
				'class': {
					"col-sm-12":true,
					"col-md-8":true,
					"col-md-offset-2":true,
					"col-lg-6":true,
					"col-lg-offset-3":true,
				},
				// NOTE: click = mousedown + mouseup --> what about smartphone?!
				on: {
					mousedown: this.mousedown,
					mousemove: this.mousemove,
					mouseup: this.mouseup,
					touchdown: this.mousedown,
					touchmove: this.mousemove,
					touchup: this.mouseup,
				},
			},
			elementArray
		);
	},
	created: function() {
		const url = socketUrl;
		const continuation = (localStorage.getItem("variant") === variant);
		this.myid = continuation
			? localStorage.getItem("myid")
			// random enough (TODO: function)
			: (Date.now().toString(36) + Math.random().toString(36).substr(2, 7)).toUpperCase();
		this.conn = new WebSocket(url + "/?sid=" + this.myid + "&page=" + variant);
		const socketOpenListener = () => {
			if (continuation)
			{
				const fen = localStorage.getItem("fen");
				const mycolor = localStorage.getItem("mycolor");
				const oppid = localStorage.getItem("oppid");
				const moves = JSON.parse(localStorage.getItem("moves"));
				this.newGame("human", fen, mycolor, oppid, moves, true);
				// Send ping to server (answer pong if opponent is connected)
				this.conn.send(JSON.stringify({code:"ping",oppid:this.oppid}));
			}
			else if (localStorage.getItem("newgame") === variant)
			{
				// New game request has been cancelled on disconnect
				this.seek = true;
				this.newGame("human", undefined, undefined, undefined, undefined, "reconnect");
			}
		};
		const socketMessageListener = msg => {
			const data = JSON.parse(msg.data);
			console.log("Receive message: " + data.code);
			switch (data.code)
			{
				case "newgame": //opponent found
					this.newGame("human", data.fen, data.color, data.oppid); //oppid: opponent socket ID
					break;
				case "newmove": //..he played!
					this.play(data.move, "animate");
					break;
				case "pong": //received if we sent a ping (game still alive on our side)
					this.oppConnected = true;
					const L = this.vr.moves.length;
					// Send our "last state" informations to opponent
					this.conn.send(JSON.stringify({
						code:"lastate",
						oppid:this.oppid,
						lastMove:L>0?this.vr.moves[L-1]:undefined,
						movesCount:L,
					}));
					break;
				case "lastate": //got opponent infos about last move (we might have resigned)
					if (this.mode!="human" || this.oppid!=data.oppid)
					{
						// OK, we resigned
						this.conn.send(JSON.stringify({
							code:"lastate",
							oppid:this.oppid,
							lastMove:undefined,
							movesCount:-1,
						}));
					}
					else if (data.movesCount < 0)
					{
						// OK, he resigned
						this.endGame(this.mycolor=="w"?"1-0":"0-1");
					}
					else if (data.movesCount < this.vr.moves.length)
					{
						// We must tell last move to opponent
						const L = this.vr.moves.length;
						this.conn.send(JSON.stringify({
							code:"lastate",
							oppid:this.oppid,
							lastMove:this.vr.moves[L-1],
							movesCount:L,
						}));
					}
					else if (data.movesCount > this.vr.moves.length) //just got last move from him
						this.play(data.lastMove, "animate");
					break;
				case "resign": //..you won!
					this.endGame(this.mycolor=="w"?"1-0":"0-1");
					break;
				// TODO: also use (dis)connect info to count online players?
				case "connect":
				case "disconnect":
					if (this.mode == "human" && this.oppid == data.id)
						this.oppConnected = (data.code == "connect");
					break;
			}
		};
		const socketCloseListener = () => {
			this.conn = new WebSocket(url + "/?sid=" + this.myid + "&page=" + variant);
			this.conn.addEventListener('open', socketOpenListener);
			this.conn.addEventListener('message', socketMessageListener);
			this.conn.addEventListener('close', socketCloseListener);
		};
		this.conn.onopen = socketOpenListener;
		this.conn.onmessage = socketMessageListener;
		this.conn.onclose = socketCloseListener;
	},
	methods: {
		download: function() {
			let content = document.getElementById("pgn-game").innerHTML;
			content = content.replace(/<br>/g, "\n");
			// Prepare and trigger download link
			let downloadAnchor = document.getElementById("download");
			downloadAnchor.setAttribute("download", "game.pgn");
			downloadAnchor.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
			downloadAnchor.click();
		},
		endGame: function(score) {
			this.score = score;
			let modalBox = document.getElementById("modal-eog");
			modalBox.checked = true;
			setTimeout(() => { modalBox.checked = false; }, 2000);
			if (this.mode == "human")
				this.clearStorage();
			this.mode = "idle";
			this.oppid = "";
		},
		getEndgameMessage: function(score) {
			let eogMessage = "Unfinished";
			switch (this.score)
			{
				case "1-0":
					eogMessage = "White win";
					break;
				case "0-1":
					eogMessage = "Black win";
					break;
				case "1/2":
					eogMessage = "Draw";
					break;
			}
			return eogMessage;
		},
		toggleExpertMode: function() {
			this.expert = !this.expert;
			document.cookie = "expert=" + (this.expert ? "1" : "0");
		},
		resign: function() {
			if (this.mode == "human" && this.oppConnected)
			{
				try {
					this.conn.send(JSON.stringify({code: "resign", oppid: this.oppid}));
				} catch (INVALID_STATE_ERR) {
					return; //socket is not ready (and not yet reconnected)
				}
			}
			this.endGame(this.mycolor=="w"?"0-1":"1-0");
		},
		setStorage: function() {
			localStorage.setItem("myid", this.myid);
			localStorage.setItem("variant", variant);
			localStorage.setItem("mycolor", this.mycolor);
			localStorage.setItem("oppid", this.oppid);
			localStorage.setItem("fenStart", this.fenStart);
			localStorage.setItem("moves", JSON.stringify(this.vr.moves));
			localStorage.setItem("fen", this.vr.getFen());
		},
		updateStorage: function() {
			localStorage.setItem("moves", JSON.stringify(this.vr.moves));
			localStorage.setItem("fen", this.vr.getFen());
		},
		clearStorage: function() {
			delete localStorage["variant"];
			delete localStorage["myid"];
			delete localStorage["mycolor"];
			delete localStorage["oppid"];
			delete localStorage["fenStart"];
			delete localStorage["fen"];
			delete localStorage["moves"];
		},
		clickGameSeek: function() {
			if (this.mode == "human")
				return; //no newgame while playing
			if (this.seek)
			{
				delete localStorage["newgame"]; //cancel game seek
				this.seek = false;
			}
			else
				this.newGame("human");
		},
		clickComputerGame: function() {
			if (this.mode == "human")
				return; //no newgame while playing
			this.newGame("computer");
		},
		newGame: function(mode, fenInit, color, oppId, moves, continuation) {
			const fen = fenInit || VariantRules.GenRandInitFen();
			console.log(fen); //DEBUG
			this.score = "*";
			if (mode=="human" && !oppId)
			{
				const storageVariant = localStorage.getItem("variant");
				if (!!storageVariant && storageVariant !== variant)
				{
					alert("Finish your " + storageVariant + " game first!");
					return;
				}
				// Send game request and wait..
				localStorage["newgame"] = variant;
				this.seek = true;
				this.clearStorage(); //in case of
				try {
					this.conn.send(JSON.stringify({code:"newgame", fen:fen}));
				} catch (INVALID_STATE_ERR) {
					return; //nothing achieved
				}
				if (continuation !== "reconnect") //TODO: bad HACK...
				{
					let modalBox = document.getElementById("modal-newgame");
					modalBox.checked = true;
					setTimeout(() => { modalBox.checked = false; }, 2000);
				}
				return;
			}
			this.vr = new VariantRules(fen, moves || []);
			this.mode = mode;
			this.incheck = []; //in case of
			this.fenStart = continuation
				? localStorage.getItem("fenStart")
				: fen.split(" ")[0]; //Only the position matters
			if (mode=="human")
			{
				// Opponent found!
				if (!continuation)
				{
					// Not playing sound on game continuation:
					new Audio("/sounds/newgame.mp3").play().then(() => {}).catch(err => {});
					document.getElementById("modal-newgame").checked = false;
				}
				this.oppid = oppId;
				this.oppConnected = true;
				this.mycolor = color;
				this.seek = false;
				if (!!moves && moves.length > 0) //imply continuation
				{
					const oppCol = this.vr.turn;
					const lastMove = moves[moves.length-1];
					this.vr.undo(lastMove);
					this.incheck = this.vr.getCheckSquares(lastMove, oppCol);
					this.vr.play(lastMove, "ingame");
				}
				delete localStorage["newgame"];
				this.setStorage(); //in case of interruptions
			}
			else //against computer
			{
				this.mycolor = Math.random() < 0.5 ? 'w' : 'b';
				if (this.mycolor == 'b')
					setTimeout(this.playComputerMove, 500);
			}
		},
		playComputerMove: function() {
			const compColor = this.mycolor=='w' ? 'b' : 'w';
			const compMove = this.vr.getComputerMove(compColor);
			// HACK: avoid selecting elements before they appear on page:
			setTimeout(() => this.play(compMove, "animate"), 500);
		},
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
				let startSquare = this.getSquareFromId(e.target.parentNode.id);
				this.possibleMoves = this.vr.canIplay(this.mycolor,startSquare)
					? this.vr.getPossibleMovesFrom(startSquare)
					: [];
				e.target.parentNode.appendChild(this.selectedPiece);
			}
		},
		mousemove: function(e) {
			if (!this.selectedPiece)
				return;
			e = e || window.event;
			// If there is an active element, move it around
			if (!!this.selectedPiece)
			{
				this.selectedPiece.style.left = (e.clientX-this.start.x) + "px";
				this.selectedPiece.style.top = (e.clientY-this.start.y) + "px";
			}
		},
		mouseup: function(e) {
			if (!this.selectedPiece)
				return;
			e = e || window.event;
			// Read drop target (or parentElement, parentNode... if type == "img")
			this.selectedPiece.style.zIndex = -3000; //HACK to find square from final coordinates
			let landing = document.elementFromPoint(e.clientX, e.clientY);
			this.selectedPiece.style.zIndex = 3000;
			while (landing.tagName == "IMG") //classList.contains(piece) fails because of mark/highlight
				landing = landing.parentNode;
			if (this.start.id == landing.id) //a click: selectedPiece and possibleMoves already filled
				return;
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
			let movingPiece = document.querySelector("#" + this.getSquareId(move.start) + " > img.piece");
			// HACK for animation (otherwise with positive translate, image slides "under background"...)
			// Possible improvement: just alter squares on the piece's way...
			squares = document.getElementsByClassName("board");
			for (let i=0; i<squares.length; i++)
			{
				let square = squares.item(i);
				if (square.id != this.getSquareId(move.start))
					square.style.zIndex = "-1";
			}
			movingPiece.style.transform = "translate(" + translation.x + "px," + translation.y + "px)";
			movingPiece.style.transitionDuration = "0.2s";
			movingPiece.style.zIndex = "3000";
			setTimeout( () => {
				for (let i=0; i<squares.length; i++)
					squares.item(i).style.zIndex = "auto";
				movingPiece.style = {}; //required e.g. for 0-0 with KR swap
				this.play(move);
			}, 200);
		},
		play: function(move, programmatic) {
			if (!!programmatic) //computer or human opponent
			{
				this.animateMove(move);
				return;
			}
			const oppCol = this.vr.getOppCol(this.vr.turn);
			this.incheck = this.vr.getCheckSquares(move, oppCol); //is opponent in check?
			// Not programmatic, or animation is over
			if (this.mode == "human" && this.vr.turn == this.mycolor)
				this.conn.send(JSON.stringify({code:"newmove", move:move, oppid:this.oppid}));
			new Audio("/sounds/chessmove1.mp3").play().then(() => {}).catch(err => {});
			this.vr.play(move, "ingame");
			if (this.mode == "human")
				this.updateStorage(); //after our moves and opponent moves
			const eog = this.vr.checkGameOver(this.vr.turn);
			if (eog != "*")
				this.endGame(eog);
			else if (this.mode == "computer" && this.vr.turn != this.mycolor)
				setTimeout(this.playComputerMove, 500);
		},
	},
})
