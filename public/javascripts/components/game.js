// Game logic on a variant page
Vue.component('my-game', {
	data: function() {
		return {
			vr: null, //object to check moves, store them, FEN..
			mycolor: "w",
			possibleMoves: [], //filled after each valid click/dragstart
			choices: [], //promotion pieces, or checkered captures... (as moves)
			start: {}, //pixels coordinates + id of starting square (click or drag)
			selectedPiece: null, //moving piece (or clicked piece)
			conn: null, //socket connection
			score: "*", //'*' means 'unfinished'
			mode: "idle", //human, friend, computer or idle (when not playing)
			oppid: "", //opponent ID in case of HH game
			oppConnected: false,
			seek: false,
			fenStart: "",
			incheck: [],
			pgnTxt: "",
			hints: (getCookie("hints") === "1" ? true : false),
			color: getCookie("color", "lichess"), //lichess, chesscom or chesstempo
			// sound level: 0 = no sound, 1 = sound only on newgame, 2 = always
			sound: getCookie("sound", "2"),
		};
	},
	render(h) {
		const [sizeX,sizeY] = VariantRules.size;
		const smallScreen = (screen.width <= 420);
		// Precompute hints squares to facilitate rendering
		let hintSquares = doubleArray(sizeX, sizeY, false);
		this.possibleMoves.forEach(m => { hintSquares[m.end.x][m.end.y] = true; });
		// Also precompute in-check squares
		let incheckSq = doubleArray(sizeX, sizeY, false);
		this.incheck.forEach(sq => { incheckSq[sq[0]][sq[1]] = true; });
		let elementArray = [];
		let actionArray = [];
		actionArray.push(
			h('button',
			{
				on: { click: this.clickGameSeek },
				attrs: { "aria-label": 'New online game' },
				'class': {
					"tooltip": true,
					"bottom": true, //display below
					"seek": this.seek,
					"playing": this.mode == "human",
					"small": smallScreen,
				},
			},
			[h('i', { 'class': { "material-icons": true } }, "accessibility")])
		);
		if (["idle","computer"].includes(this.mode))
		{
			actionArray.push(
				h('button',
				{
					on: { click: this.clickComputerGame },
					attrs: { "aria-label": 'New game VS computer' },
					'class': {
						"tooltip":true,
						"bottom": true,
						"playing": this.mode == "computer",
						"small": smallScreen,
					},
				},
				[h('i', { 'class': { "material-icons": true } }, "computer")])
			);
		}
		if (["idle","friend"].includes(this.mode))
		{
			actionArray.push(
				h('button',
				{
					on: { click: this.clickFriendGame },
					attrs: { "aria-label": 'New IRL game' },
					'class': {
						"tooltip":true,
						"bottom": true,
						"playing": this.mode == "friend",
						"small": smallScreen,
					},
				},
				[h('i', { 'class': { "material-icons": true } }, "people")])
			);
		}
		if (!!this.vr)
		{
			const square00 = document.getElementById("sq-0-0");
			const squareWidth = !!square00
				? parseFloat(window.getComputedStyle(square00).width.slice(0,-2))
				: 0;
			const settingsBtnElt = document.getElementById("settingsBtn");
			const indicWidth = !!settingsBtnElt //-2 for border:
				? parseFloat(window.getComputedStyle(settingsBtnElt).height.slice(0,-2)) - 2
				: 37; //TODO: always 37?
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
			let settingsBtn = h(
				'button',
				{
					on: { click: this.showSettings },
					attrs: {
						"aria-label": 'Settings',
						"id": "settingsBtn",
					},
					'class': {
						"tooltip": true,
						"topindicator": true,
						"indic-right": true,
						"settings-btn": true,
					},
				},
				[h('i', { 'class': { "material-icons": true } }, "settings")]
			);
			elementArray.push(settingsBtn);
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
							const lm = this.vr.lastMove;
							const showLight = this.hints &&
								(this.mode!="idle" || this.cursor==this.vr.moves.length);
							return h(
								'div',
								{
									'class': {
										'board': true,
										['board'+sizeY]: true,
										'light-square': (i+j)%2==0,
										'dark-square': (i+j)%2==1,
										[this.color]: true,
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
			if (this.mode != "idle")
			{
				actionArray.push(
					h('button',
						{
							on: { click: this.resign },
							attrs: { "aria-label": 'Resign' },
							'class': {
								"tooltip":true,
								"bottom": true,
								"small": smallScreen,
							},
						},
						[h('i', { 'class': { "material-icons": true } }, "flag")])
				);
			}
			else if (this.vr.moves.length > 0)
			{
				// A game finished, and another is not started yet: allow navigation
				actionArray = actionArray.concat([
					h('button',
						{
							on: { click: e => this.undo() },
							attrs: { "aria-label": 'Undo' },
							"class": {
								"small": smallScreen,
								"marginleft": true,
							},
						},
						[h('i', { 'class': { "material-icons": true } }, "fast_rewind")]),
					h('button',
						{
							on: { click: e => this.play() },
							attrs: { "aria-label": 'Play' },
							"class": { "small": smallScreen },
						},
						[h('i', { 'class': { "material-icons": true } }, "fast_forward")]),
					]
				);
			}
			if (this.mode == "friend")
			{
				actionArray = actionArray.concat(
				[
					h('button',
						{
							on: { click: this.undoInGame },
							attrs: { "aria-label": 'Undo' },
							"class": {
								"small": smallScreen,
								"marginleft": true,
							},
						},
						[h('i', { 'class': { "material-icons": true } }, "undo")]
					),
					h('button',
						{
							on: { click: () => { this.mycolor = this.vr.getOppCol(this.mycolor) } },
							attrs: { "aria-label": 'Flip' },
							"class": { "small": smallScreen },
						},
						[h('i', { 'class': { "material-icons": true } }, "cached")]
					),
				]);
			}
			elementArray.push(gameDiv);
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
							'class': {"piece":true},
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
							'class': {"piece":true},
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
			const eogMessage = this.getEndgameMessage(this.score);
			const modalEog = [
				h('input',
					{
						attrs: { "id": "modal-eog", type: "checkbox" },
						"class": { "modal": true },
					}),
				h('div',
					{
						attrs: { "role": "dialog", "aria-labelledby": "modal-eog" },
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
		// NOTE: this modal could be in Pug view (no usage of Vue functions or variables)
		const modalNewgame = [
			h('input',
				{
					attrs: { "id": "modal-newgame", type: "checkbox" },
					"class": { "modal": true },
				}),
			h('div',
				{
					attrs: { "role": "dialog", "aria-labelledby": "modal-newgame" },
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
		const modalFenEdit = [
			h('input',
				{
					attrs: { "id": "modal-fenedit", type: "checkbox" },
					"class": { "modal": true },
				}),
			h('div',
				{
					attrs: { "role": "dialog", "aria-labelledby": "modal-fenedit" },
				},
				[
					h('div',
						{
							"class": { "card": true, "smallpad": true },
						},
						[
							h('label',
								{
									attrs: { "id": "close-fenedit", "for": "modal-fenedit" },
									"class": { "modal-close": true },
								}
							),
							h('h3',
								{
									"class": { "section": true },
									domProps: { innerHTML: "Position + flags (FEN):" },
								}
							),
							h('input',
								{
									attrs: {
										"id": "input-fen",
										type: "text",
										value: VariantRules.GenRandInitFen(),
									},
								}
							),
							h('button',
								{
									on: { click:
										() => {
											const fen = document.getElementById("input-fen").value;
											document.getElementById("modal-fenedit").checked = false;
											this.newGame("friend", fen);
										}
									},
									domProps: { innerHTML: "Ok" },
								}
							),
							h('button',
								{
									on: { click:
										() => {
											document.getElementById("input-fen").value =
												VariantRules.GenRandInitFen();
										}
									},
									domProps: { innerHTML: "Random" },
								}
							),
						]
					)
				]
			)
		];
		elementArray = elementArray.concat(modalFenEdit);
		const modalSettings = [
			h('input',
				{
					attrs: { "id": "modal-settings", type: "checkbox" },
					"class": { "modal": true },
				}),
			h('div',
				{
					attrs: { "role": "dialog", "aria-labelledby": "modal-settings" },
				},
				[
					h('div',
						{
							"class": { "card": true, "smallpad": true },
						},
						[
							h('label',
								{
									attrs: { "id": "close-settings", "for": "modal-settings" },
									"class": { "modal-close": true },
								}
							),
							h('h3',
								{
									"class": { "section": true },
									domProps: { innerHTML: "Preferences" },
								}
							),
							h('fieldset',
							  { },
								[
									//h('legend', { domProps: { innerHTML: "Show " } }),
									h('label',
										{
											attrs: {
												for: "setHints",
											},
											domProps: { innerHTML: "Show hints?" },
										},
									),
									h('input',
										{
											attrs: {
												"id": "setHints",
												type: "checkbox",
												checked: this.hints,
											},
											on: { "change": this.toggleHints },
										}
									),
								]
							),
							h('fieldset',
								{ },
								[
									h('label',
										{
											attrs: {
												for: "selectColor",
											},
											domProps: { innerHTML: "Board colors" },
										},
									),
									h("select",
										{
											attrs: { "id": "selectColor" },
											on: { "change": this.setColor },
										},
										[
											h("option",
												{
													domProps: {
														"value": "lichess",
														innerHTML: "lichess"
													},
													attrs: { "selected": this.color=="lichess" },
												}
											),
											h("option",
												{
													domProps: {
														"value": "chesscom",
														innerHTML: "chess.com"
													},
													attrs: { "selected": this.color=="chesscom" },
												}
											),
											h("option",
												{
													domProps: {
														"value": "chesstempo",
														innerHTML: "chesstempo"
													},
													attrs: { "selected": this.color=="chesstempo" },
												}
											),
										],
									),
								]
							),
							h('fieldset',
								{ },
								[
									h('label',
										{
											attrs: {
												for: "selectSound",
											},
											domProps: { innerHTML: "Sound level" },
										},
									),
									h("select",
										{
											attrs: { "id": "selectSound" },
											on: { "change": this.setSound },
										},
										[
											h("option",
												{
													domProps: {
														"value": "0",
														innerHTML: "No sound"
													},
												}
											),
											h("option",
												{
													domProps: {
														"value": "1",
														innerHTML: "Newgame sound"
													},
												}
											),
											h("option",
												{
													domProps: {
														"value": "2",
														innerHTML: "All sounds"
													},
												}
											),
										],
									),
								]
							),
						]
					)
				]
			)
		];
		elementArray = elementArray.concat(modalSettings);
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
								domProps: { innerHTML: this.pgnTxt }
							}
						)
					]
				)
			);
		}
		else if (this.mode != "idle")
		{
			// Show current FEN
			elementArray.push(
				h('div',
					{ attrs: { id: "fen-div" } },
					[
						h('p',
							{
								attrs: { id: "fen-string" },
								domProps: { innerHTML: this.vr.getFen() }
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
				// NOTE: click = mousedown + mouseup
				on: {
					mousedown: this.mousedown,
					mousemove: this.mousemove,
					mouseup: this.mouseup,
					touchstart: this.mousedown,
					touchmove: this.mousemove,
					touchend: this.mouseup,
				},
			},
			elementArray
		);
	},
	created: function() {
		const url = socketUrl;
		const continuation = (localStorage.getItem("variant") === variant);
		this.myid = continuation ? localStorage.getItem("myid") : getRandString();
		if (!continuation)
		{
			// HACK: play a small silent sound to allow "new game" sound later
			// if tab not focused (TODO: does it really work ?!)
			new Audio("/sounds/silent.mp3").play().then(() => {}).catch(err => {});
		}
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
				this.newGame("human", undefined, undefined, undefined, undefined, "reconnect");
			}
		};
		const socketMessageListener = msg => {
			const data = JSON.parse(msg.data);
			switch (data.code)
			{
				case "newgame": //opponent found
					// oppid: opponent socket ID
					this.newGame("human", data.fen, data.color, data.oppid);
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
		// Listen to keyboard left/right to navigate in game
		document.onkeydown = event => {
			if (this.mode == "idle" && !!this.vr && this.vr.moves.length > 0
				&& [37,39].includes(event.keyCode))
			{
				event.preventDefault();
				if (event.keyCode == 37) //Back
					this.undo();
				else //Forward (39)
					this.play();
			}
		};
	},
	methods: {
		download: function() {
			let content = document.getElementById("pgn-game").innerHTML;
			content = content.replace(/<br>/g, "\n");
			// Prepare and trigger download link
			let downloadAnchor = document.getElementById("download");
			downloadAnchor.setAttribute("download", "game.pgn");
			downloadAnchor.href = "data:text/plain;charset=utf-8," +
				encodeURIComponent(content);
			downloadAnchor.click();
		},
		endGame: function(score) {
			this.score = score;
			let modalBox = document.getElementById("modal-eog");
			modalBox.checked = true;
			// Variants may have special PGN structure (so next function isn't defined here)
			this.pgnTxt = this.vr.getPGN(this.mycolor, this.score, this.fenStart, this.mode);
			setTimeout(() => { modalBox.checked = false; }, 2000);
			if (this.mode == "human")
				this.clearStorage();
			this.mode = "idle";
			this.cursor = this.vr.moves.length; //to navigate in finished game
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
		// HACK because mini-css tooltips are persistent after click...
		getRidOfTooltip: function(elt) {
			elt.style.visibility = "hidden";
			setTimeout(() => { elt.style.visibility="visible"; }, 100);
		},
		showSettings: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			document.getElementById("modal-settings").checked = true;
		},
		toggleHints: function() {
			this.hints = !this.hints;
			setCookie("hints", this.hints ? "1" : "0");
		},
		// TODO:
		setColor: function() {
			alert("Change");
		},
		setSound: function() {
			alert("Change");
		},
		clickGameSeek: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			if (this.mode == "human")
				return; //no newgame while playing
			if (this.seek)
			{
				this.conn.send(JSON.stringify({code:"cancelnewgame"}));
				delete localStorage["newgame"]; //cancel game seek
				this.seek = false;
			}
			else
				this.newGame("human");
		},
		clickComputerGame: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			if (this.mode == "human")
				return; //no newgame while playing
			this.newGame("computer");
		},
		clickFriendGame: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			document.getElementById("modal-fenedit").checked = true;
		},
		resign: function(e) {
			this.getRidOfTooltip(e.currentTarget);
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
		newGame: function(mode, fenInit, color, oppId, moves, continuation) {
			const fen = fenInit || VariantRules.GenRandInitFen();
			console.log(fen); //DEBUG
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
			this.score = "*";
			this.pgnTxt = ""; //redundant with this.score = "*", but cleaner
			this.mode = mode;
			this.incheck = []; //in case of
			this.fenStart = (continuation ? localStorage.getItem("fenStart") : fen);
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
					const lastMove = moves[moves.length-1];
					this.vr.undo(lastMove);
					this.incheck = this.vr.getCheckSquares(lastMove);
					this.vr.play(lastMove, "ingame");
				}
				delete localStorage["newgame"];
				this.setStorage(); //in case of interruptions
			}
			else if (mode == "computer")
			{
				this.mycolor = Math.random() < 0.5 ? 'w' : 'b';
				if (this.mycolor == 'b')
					setTimeout(this.playComputerMove, 500);
			}
			//else: against a (IRL) friend: nothing more to do
		},
		playComputerMove: function() {
			const timeStart = Date.now();
			const compMove = this.vr.getComputerMove();
			// (first move) HACK: avoid selecting elements before they appear on page:
			const delay = Math.max(500-(Date.now()-timeStart), 0);
			setTimeout(() => this.play(compMove, "animate"), delay);
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
				let startSquare = this.getSquareFromId(e.target.parentNode.id);
				const iCanPlay = this.mode!="idle"
					&& (this.mode=="friend" || this.vr.canIplay(this.mycolor,startSquare));
				this.possibleMoves = iCanPlay ? this.vr.getPossibleMovesFrom(startSquare) : [];
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
			}, 200);
		},
		play: function(move, programmatic) {
			if (!move)
			{
				// Navigate after game is over
				if (this.cursor >= this.vr.moves.length)
					return; //already at the end
				move = this.vr.moves[this.cursor++];
			}
			if (!!programmatic) //computer or human opponent
			{
				this.animateMove(move);
				return;
			}
			// Not programmatic, or animation is over
			if (this.mode == "human" && this.vr.turn == this.mycolor)
				this.conn.send(JSON.stringify({code:"newmove", move:move, oppid:this.oppid}));
			new Audio("/sounds/chessmove1.mp3").play().then(() => {}).catch(err => {});
			if (this.mode != "idle")
			{
				this.incheck = this.vr.getCheckSquares(move); //is opponent in check?
				this.vr.play(move, "ingame");
			}
			else
			{
				VariantRules.PlayOnBoard(this.vr.board, move);
				this.$forceUpdate(); //TODO: ?!
			}
			if (this.mode == "human")
				this.updateStorage(); //after our moves and opponent moves
			if (this.mode != "idle")
			{
				const eog = this.vr.checkGameOver();
				if (eog != "*")
					this.endGame(eog);
			}
			if (this.mode == "computer" && this.vr.turn != this.mycolor)
				setTimeout(this.playComputerMove, 500);
		},
		undo: function() {
			// Navigate after game is over
			if (this.cursor == 0)
				return; //already at the beginning
			if (this.cursor == this.vr.moves.length)
				this.incheck = []; //in case of...
			const move = this.vr.moves[--this.cursor];
			VariantRules.UndoOnBoard(this.vr.board, move);
			this.$forceUpdate(); //TODO: ?!
		},
		undoInGame: function() {
			const lm = this.vr.lastMove;
			if (!!lm)
				this.vr.undo(lm);
		},
	},
})
