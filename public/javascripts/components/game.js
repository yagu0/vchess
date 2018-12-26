// Game logic on a variant page
Vue.component('my-game', {
	props: ["problem"],
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
			mode: "idle", //human, friend, problem, computer or idle (if not playing)
			myid: "", //our ID, always set
			oppid: "", //opponent ID in case of HH game
			gameId: "", //useful if opponent started other human games after we disconnected
			myname: localStorage["username"] || "anonymous",
			oppName: "anonymous", //opponent name, revealed after a game (if provided)
			chats: [], //chat messages after human game
			oppConnected: false,
			seek: false,
			fenStart: "",
			incheck: [],
			pgnTxt: "",
			hints: (!localStorage["hints"] ? true : localStorage["hints"] === "1"),
			bcolor: localStorage["bcolor"] || "lichess", //lichess, chesscom or chesstempo
			// sound level: 0 = no sound, 1 = sound only on newgame, 2 = always
			sound: parseInt(localStorage["sound"] || "2"),
			// Web worker to play computer moves without freezing interface:
			compWorker: new Worker('/javascripts/playCompMove.js'),
			timeStart: undefined, //time when computer starts thinking
		};
	},
	watch: {
		problem: function(p) {
			// 'problem' prop changed: update board state
			this.newGame("problem", p.fen, V.ParseFen(p.fen).turn);
		},
	},
	render(h) {
		const [sizeX,sizeY] = [V.size.x,V.size.y];
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
				attrs: { "aria-label": translations['New live game'] },
				'class': {
					"tooltip": true,
					"play": true,
					"seek": this.seek,
					"playing": this.mode == "human",
				},
			},
			[h('i', { 'class': { "material-icons": true } }, "accessibility")])
		);
		if (["idle","computer","friend"].includes(this.mode)
			|| (this.mode == "human" && this.score != "*"))
		{
			actionArray.push(
				h('button',
				{
					on: { click: this.clickComputerGame },
					attrs: { "aria-label": translations['New game versus computer'] },
					'class': {
						"tooltip":true,
						"play": true,
						"playing": this.mode == "computer",
						"spaceleft": true,
					},
				},
				[h('i', { 'class': { "material-icons": true } }, "computer")])
			);
		}
		if (variant != "Dark" && (["idle","friend"].includes(this.mode)
			|| (["computer","human"].includes(this.mode) && this.score != "*")))
		{
			actionArray.push(
				h('button',
				{
					on: { click: this.clickFriendGame },
					attrs: { "aria-label": translations['Analysis mode'] },
					'class': {
						"tooltip":true,
						"play": true,
						"playing": this.mode == "friend",
						"spaceleft": true,
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
			const settingsStyle = !!settingsBtnElt
				? window.getComputedStyle(settingsBtnElt)
				: {width:"46px", height:"26px"};
			const [indicWidth,indicHeight] = //[44,24];
			[
				// NOTE: -2 for border
				parseFloat(settingsStyle.width.slice(0,-2)) - 2,
				parseFloat(settingsStyle.height.slice(0,-2)) - 2
			];
			let aboveBoardElts = [];
			if (this.mode == "human")
			{
				const connectedIndic = h(
					'div',
					{
						"class": {
							"indic-left": true,
							"connected": this.oppConnected,
							"disconnected": !this.oppConnected,
						},
						style: {
							"width": indicWidth + "px",
							"height": indicHeight + "px",
						},
					}
				);
				aboveBoardElts.push(connectedIndic);
			}
			if (this.mode == "human" && this.score != "*")
			{
				const chatButton = h(
					'button',
					{
						on: { click: this.startChat },
						attrs: {
							"aria-label": translations['Start chat'],
							"id": "chatBtn",
						},
						'class': {
							"tooltip": true,
							"play": true,
							"above-board": true,
							"indic-left": true,
						},
					},
					[h('i', { 'class': { "material-icons": true } }, "chat")]
				);
				aboveBoardElts.push(chatButton);
			}
			if (["human","computer","friend"].includes(this.mode))
			{
				const clearButton = h(
					'button',
					{
						on: { click: this.clearCurrentGame },
						attrs: {
							"aria-label": translations['Clear current game'],
							"id": "clearBtn",
						},
						'class': {
							"tooltip": true,
							"play": true,
							"above-board": true,
							"indic-left": true,
						},
					},
					[h('i', { 'class': { "material-icons": true } }, "clear")]
				);
				aboveBoardElts.push(clearButton);
			}
			const turnIndic = h(
				'div',
				{
					"class": {
						"indic-right": true,
						"white-turn": this.vr.turn=="w",
						"black-turn": this.vr.turn=="b",
					},
					style: {
						"width": indicWidth + "px",
						"height": indicHeight + "px",
					},
				}
			);
			aboveBoardElts.push(turnIndic);
			const settingsBtn = h(
				'button',
				{
					on: { click: this.showSettings },
					attrs: {
						"aria-label": translations['Settings'],
						"id": "settingsBtn",
					},
					'class': {
						"tooltip": true,
						"play": true,
						"above-board": true,
						"indic-right": true,
					},
				},
				[h('i', { 'class': { "material-icons": true } }, "settings")]
			);
			aboveBoardElts.push(settingsBtn);
			elementArray.push(
				h('div',
					{ "class": { "aboveboard-wrapper": true } },
					aboveBoardElts
				)
			);
			if (this.mode == "problem")
			{
				// Show problem instructions
				elementArray.push(
					h('div',
						{
							attrs: { id: "instructions-div" },
							"class": {
								"clearer": true,
								"section-content": true,
							},
						},
						[
							h('p',
								{
									attrs: { id: "problem-instructions" },
									domProps: { innerHTML: this.problem.instructions }
								}
							)
						]
					)
				);
			}
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
			const showLight = this.hints && variant!="Dark" &&
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
							if (this.vr.board[ci][cj] != VariantRules.EMPTY && (variant!="Dark"
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
										'in-shadow': variant=="Dark" && this.score=="*"
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
			if (["human","computer"].includes(this.mode))
			{
				if (this.score == "*")
				{
					actionArray.push(
						h('button',
							{
								on: { click: this.resign },
								attrs: { "aria-label": translations['Resign'] },
								'class': {
									"tooltip":true,
									"play": true,
									"spaceleft": true,
								},
							},
							[h('i', { 'class': { "material-icons": true } }, "flag")])
					);
				}
				else
				{
					// A game finished, and another is not started yet: allow navigation
					actionArray = actionArray.concat([
						h('button',
							{
								on: { click: e => this.undo() },
								attrs: { "aria-label": translations['Undo'] },
								"class": {
									"play": true,
									"big-spaceleft": true,
								},
							},
							[h('i', { 'class': { "material-icons": true } }, "fast_rewind")]),
						h('button',
							{
								on: { click: e => this.play() },
								attrs: { "aria-label": translations['Play'] },
								"class": {
									"play": true,
									"spaceleft": true,
								},
							},
							[h('i', { 'class': { "material-icons": true } }, "fast_forward")]),
						]
					);
				}
			}
			if (["friend","problem"].includes(this.mode))
			{
				actionArray = actionArray.concat(
				[
					h('button',
						{
							on: { click: this.undoInGame },
							attrs: { "aria-label": translations['Undo'] },
							"class": {
								"play": true,
								"big-spaceleft": true,
							},
						},
						[h('i', { 'class': { "material-icons": true } }, "undo")]
					),
					h('button',
						{
							on: { click: () => { this.mycolor = this.vr.getOppCol(this.mycolor) } },
							attrs: { "aria-label": translations['Flip board'] },
							"class": {
								"play": true,
								"spaceleft": true,
							},
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
						'class': {'board':true, ['board'+sizeY+'-reserve']:true},
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
						'class': {'board':true, ['board'+sizeY+'-reserve']:true},
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
			const modalEog = [
				h('input',
					{
						attrs: { "id": "modal-eog", type: "checkbox" },
						"class": { "modal": true },
					}),
				h('div',
					{
						attrs: { "role": "dialog", "aria-labelledby": "eogMessage" },
					},
					[
						h('div',
							{
								"class": {
									"card": true,
									"smallpad": true,
									"small-modal": true,
									"text-center": true,
								},
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
										attrs: { "id": "eogMessage" },
										"class": { "section": true },
										domProps: { innerHTML: this.endgameMessage },
									}
								)
							]
						)
					]
				)
			];
			elementArray = elementArray.concat(modalEog);
		}
		const modalFenEdit = [
			h('input',
				{
					attrs: { "id": "modal-fenedit", type: "checkbox" },
					"class": { "modal": true },
				}),
			h('div',
				{
					attrs: { "role": "dialog", "aria-labelledby": "titleFenedit" },
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
									attrs: { "id": "titleFenedit" },
									"class": { "section": true },
									domProps: { innerHTML: translations["Game state (FEN):"] },
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
									domProps: { innerHTML: translations["Ok"] },
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
									domProps: { innerHTML: translations["Random"] },
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
					attrs: { "role": "dialog", "aria-labelledby": "settingsTitle" },
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
									attrs: { "id": "settingsTitle" },
									"class": { "section": true },
									domProps: { innerHTML: translations["Preferences"] },
								}
							),
							h('fieldset',
							  { },
								[
									h('label',
										{
											attrs: { for: "nameSetter" },
											domProps: { innerHTML: translations["My name is..."] },
										},
									),
									h('input',
										{
											attrs: {
												"id": "nameSetter",
												type: "text",
												value: this.myname,
											},
											on: { "change": this.setMyname },
										}
									),
								]
							),
							h('fieldset',
							  { },
								[
									h('label',
										{
											attrs: { for: "setHints" },
											domProps: { innerHTML: translations["Show hints?"] },
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
											attrs: { for: "selectColor" },
											domProps: { innerHTML: translations["Board colors"] },
										},
									),
									h("select",
										{
											attrs: { "id": "selectColor" },
											on: { "change": this.setBoardColor },
										},
										[
											h("option",
												{
													domProps: {
														"value": "lichess",
														innerHTML: translations["brown"]
													},
													attrs: { "selected": this.color=="lichess" },
												}
											),
											h("option",
												{
													domProps: {
														"value": "chesscom",
														innerHTML: translations["green"]
													},
													attrs: { "selected": this.color=="chesscom" },
												}
											),
											h("option",
												{
													domProps: {
														"value": "chesstempo",
														innerHTML: translations["blue"]
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
											attrs: { for: "selectSound" },
											domProps: { innerHTML: translations["Play sounds?"] },
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
														innerHTML: translations["None"]
													},
													attrs: { "selected": this.sound==0 },
												}
											),
											h("option",
												{
													domProps: {
														"value": "1",
														innerHTML: translations["New game"]
													},
													attrs: { "selected": this.sound==1 },
												}
											),
											h("option",
												{
													domProps: {
														"value": "2",
														innerHTML: translations["All"]
													},
													attrs: { "selected": this.sound==2 },
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
		let chatEltsArray =
		[
			h('label',
				{
					attrs: { "id": "close-chat", "for": "modal-chat" },
					"class": { "modal-close": true },
				}
			),
			h('h3',
				{
					attrs: { "id": "titleChat" },
					"class": { "section": true },
					domProps: { innerHTML: translations["Chat with "] + this.oppName },
				}
			)
		];
		for (let chat of this.chats)
		{
			chatEltsArray.push(
				h('p',
					{
						"class": {
							"my-chatmsg": chat.author==this.myid,
							"opp-chatmsg": chat.author==this.oppid,
						},
						domProps: { innerHTML: chat.msg }
					}
				)
			);
		}
		chatEltsArray = chatEltsArray.concat([
			h('input',
				{
					attrs: {
						"id": "input-chat",
						type: "text",
						placeholder: translations["Type here"],
					},
					on: { keyup: this.trySendChat }, //if key is 'enter'
				}
			),
			h('button',
				{
					attrs: { id: "sendChatBtn"},
					on: { click: this.sendChat },
					domProps: { innerHTML: translations["Send"] },
				}
			)
		]);
		const modalChat = [
			h('input',
				{
					attrs: { "id": "modal-chat", type: "checkbox" },
					"class": { "modal": true },
				}),
			h('div',
				{
					attrs: { "role": "dialog", "aria-labelledby": "titleChat" },
				},
				[
					h('div',
						{
							"class": { "card": true, "smallpad": true },
						},
						chatEltsArray
					)
				]
			)
		];
		elementArray = elementArray.concat(modalChat);
		const actions = h('div',
			{
				attrs: { "id": "actions" },
				'class': { 'text-center': true },
			},
			actionArray
		);
		elementArray.push(actions);
		if (this.score != "*" && this.pgnTxt.length > 0)
		{
			elementArray.push(
				h('div',
					{
						attrs: { id: "pgn-div" },
						"class": { "section-content": true },
					},
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
								domProps: { innerHTML: this.pgnTxt }
							}
						),
						h('button',
							{
								attrs: { "id": "downloadBtn" },
								on: { click: this.download },
								domProps: { innerHTML: translations["Download game"] },
							}
						),
					]
				)
			);
		}
		else if (this.mode != "idle")
		{
			if (this.mode == "problem")
			{
				// Show problem solution (on click)
				elementArray.push(
					h('div',
						{
							attrs: { id: "solution-div" },
							"class": { "section-content": true },
						},
						[
							h('h3',
								{
									"class": { clickable: true },
									domProps: { innerHTML: translations["Show solution"] },
									on: { click: this.toggleShowSolution },
								}
							),
							h('p',
								{
									attrs: { id: "problem-solution" },
									domProps: { innerHTML: this.problem.solution }
								}
							)
						]
					)
				);
			}
			if (variant != "Dark" || this.score!="*")
			{
				// Show current FEN
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
			}
		}
		return h(
			'div',
			{
				'class': {
					"col-sm-12":true,
					"col-md-10":true,
					"col-md-offset-1":true,
					"col-lg-8":true,
					"col-lg-offset-2":true,
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
	computed: {
		endgameMessage: function() {
			let eogMessage = "Unfinished";
			switch (this.score)
			{
				case "1-0":
					eogMessage = translations["White win"];
					break;
				case "0-1":
					eogMessage = translations["Black win"];
					break;
				case "1/2":
					eogMessage = translations["Draw"];
					break;
			}
			return eogMessage;
		},
	},
	created: function() {
		const url = socketUrl;
		const humanContinuation = (localStorage.getItem("variant") === variant);
		const computerContinuation = (localStorage.getItem("comp-variant") === variant);
		const friendContinuation = (localStorage.getItem("anlz-variant") === variant);
		this.myid = (humanContinuation ? localStorage.getItem("myid") : getRandString());
		this.conn = new WebSocket(url + "/?sid=" + this.myid + "&page=" + variant);
		const socketOpenListener = () => {
			if (humanContinuation) //game VS human has priority
				this.continueGame("human");
			else if (computerContinuation)
				this.continueGame("computer");
			else if (friendContinuation)
				this.continueGame("friend");
		};
		const socketMessageListener = msg => {
			const data = JSON.parse(msg.data);
			const L = (!!this.vr ? this.vr.moves.length : 0);
			switch (data.code)
			{
				case "oppname":
					// Receive opponent's name
					this.oppName = data.name;
					break;
				case "newchat":
					// Receive new chat
					this.chats.push({msg:data.msg, author:this.oppid});
					break;
				case "duplicate":
					// We opened another tab on the same game
					this.mode = "idle";
					this.vr = null;
					alert(translations[
						"Already playing a game in this variant on another tab!"]);
					break;
				case "newgame": //opponent found
					// oppid: opponent socket ID
					this.newGame("human", data.fen, data.color, data.oppid);
					break;
				case "newmove": //..he played!
					this.play(data.move, (variant!="Dark" ? "animate" : null));
					break;
				case "pong": //received if we sent a ping (game still alive on our side)
					if (this.gameId != data.gameId)
						break; //games IDs don't match: definitely over...
					this.oppConnected = true;
					// Send our "last state" informations to opponent
					this.conn.send(JSON.stringify({
						code: "lastate",
						oppid: this.oppid,
						gameId: this.gameId,
						lastMove: (L>0?this.vr.moves[L-1]:undefined),
						movesCount: L,
					}));
					break;
				case "lastate": //got opponent infos about last move
					if (this.gameId != data.gameId)
						break; //games IDs don't match: nothing we can do...
					// OK, opponent still in game (which might be over)
					if (this.mode != "human")
					{
						// We finished the game (any result possible)
						this.conn.send(JSON.stringify({
							code: "lastate",
							oppid: data.oppid,
							gameId: this.gameId,
							score: this.score,
						}));
					}
					else if (!!data.score) //opponent finished the game
						this.endGame(data.score);
					else if (data.movesCount < L)
					{
						// We must tell last move to opponent
						this.conn.send(JSON.stringify({
							code: "lastate",
							oppid: this.oppid,
							lastMove: this.vr.moves[L-1],
							movesCount: L,
						}));
					}
					else if (data.movesCount > L) //just got last move from him
						this.play(data.lastMove, "animate");
					break;
				case "resign": //..you won!
					this.endGame(this.mycolor=="w"?"1-0":"0-1");
					break;
				// TODO: also use (dis)connect info to count online players?
				case "connect":
				case "disconnect":
					if (this.mode=="human" && this.oppid == data.id)
						this.oppConnected = (data.code == "connect");
					if (this.oppConnected && this.score != "*")
					{
						// Send our name to the opponent, in case of he hasn't it
						this.conn.send(JSON.stringify({
							code:"myname", name:this.myname, oppid: this.oppid}));
					}
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
			if (["human","computer"].includes(this.mode) &&
				!!this.vr && this.vr.moves.length > 0 && [37,39].includes(event.keyCode))
			{
				event.preventDefault();
				if (event.keyCode == 37) //Back
					this.undo();
				else //Forward (39)
					this.play();
			}
		};
		// Computer moves web worker logic:
		this.compWorker.postMessage(["scripts",variant]);
		const self = this;
		this.compWorker.onmessage = function(e) {
			let compMove = e.data;
			if (!compMove)
				return; //may happen if MarseilleRules and subTurn==2 (TODO: a bit ugly...)
			if (!Array.isArray(compMove))
				compMove = [compMove]; //to deal with MarseilleRules
			// TODO: imperfect attempt to avoid ghost move:
			compMove.forEach(m => { m.computer = true; });
			// (first move) HACK: small delay to avoid selecting elements
			// before they appear on page:
			const delay = Math.max(500-(Date.now()-self.timeStart), 0);
			setTimeout(() => {
				const animate = (variant!="Dark" ? "animate" : null);
				if (self.mode == "computer") //warning: mode could have changed!
					self.play(compMove[0], animate);
				if (compMove.length == 2)
					setTimeout( () => {
						if (self.mode == "computer")
							self.play(compMove[1], animate);
					}, 750);
			}, delay);
		}
	},
	methods: {
		setMyname: function(e) {
			this.myname = e.target.value;
			localStorage["username"] = this.myname;
		},
		trySendChat: function(e) {
			if (e.keyCode == 13) //'enter' key
				this.sendChat();
		},
		sendChat: function() {
			let chatInput = document.getElementById("input-chat");
			const chatTxt = chatInput.value;
			chatInput.value = "";
			this.chats.push({msg:chatTxt, author:this.myid});
			this.conn.send(JSON.stringify({
				code:"newchat", oppid: this.oppid, msg: chatTxt}));
		},
		toggleShowSolution: function() {
			let problemSolution = document.getElementById("problem-solution");
			problemSolution.style.display =
				!problemSolution.style.display || problemSolution.style.display == "none"
					? "block"
					: "none";
		},
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
		showScoreMsg: function() {
			let modalBox = document.getElementById("modal-eog");
			modalBox.checked = true;
			setTimeout(() => { modalBox.checked = false; }, 2000);
		},
		endGame: function(score) {
			this.score = score;
			if (["human","computer"].includes(this.mode))
			{
				const prefix = (this.mode=="computer" ? "comp-" : "");
				localStorage.setItem(prefix+"score", score);
			}
			this.showScoreMsg();
			// Variants may have special PGN structure (so next function isn't defined here)
			this.pgnTxt = this.vr.getPGN(this.mycolor, this.score, this.fenStart, this.mode);
			if (this.mode == "human" && this.oppConnected)
			{
				// Send our nickname to opponent
				this.conn.send(JSON.stringify({
					code:"myname", name:this.myname, oppid:this.oppid}));
			}
			this.cursor = this.vr.moves.length; //to navigate in finished game
		},
		getStoragePrefix: function(mode) {
			let prefix = "";
			if (mode == "computer")
				prefix = "comp-";
			else if (mode == "friend")
				prefix = "anlz-";
			return prefix;
		},
		setStorage: function() {
			if (this.mode=="human")
			{
				localStorage.setItem("myid", this.myid);
				localStorage.setItem("oppid", this.oppid);
				localStorage.setItem("gameId", this.gameId);
			}
			const prefix = this.getStoragePrefix(this.mode);
			localStorage.setItem(prefix+"variant", variant);
			localStorage.setItem(prefix+"mycolor", this.mycolor);
			localStorage.setItem(prefix+"fenStart", this.fenStart);
			localStorage.setItem(prefix+"moves", JSON.stringify(this.vr.moves));
			localStorage.setItem(prefix+"fen", this.vr.getFen());
			localStorage.setItem(prefix+"score", "*");
		},
		updateStorage: function() {
			const prefix = this.getStoragePrefix(this.mode);
			localStorage.setItem(prefix+"moves", JSON.stringify(this.vr.moves));
			localStorage.setItem(prefix+"fen", this.vr.getFen());
			if (this.score != "*")
				localStorage.setItem(prefix+"score", this.score);
		},
		// "computer mode" clearing is done through the menu
		clearStorage: function() {
			if (this.mode == "human")
			{
				delete localStorage["myid"];
				delete localStorage["oppid"];
				delete localStorage["gameId"];
			}
			const prefix = this.getStoragePrefix(this.mode);
			delete localStorage[prefix+"variant"];
			delete localStorage[prefix+"mycolor"];
			delete localStorage[prefix+"fenStart"];
			delete localStorage[prefix+"moves"];
			delete localStorage[prefix+"fen"];
			delete localStorage[prefix+"score"];
		},
		// HACK because mini-css tooltips are persistent after click...
		// NOTE: seems to work only in chrome/chromium. TODO...
		getRidOfTooltip: function(elt) {
			elt.style.visibility = "hidden";
			setTimeout(() => { elt.style.visibility="visible"; }, 100);
		},
		startChat: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			document.getElementById("modal-chat").checked = true;
		},
		clearCurrentGame: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			this.clearStorage();
			location.reload(); //to see clearing effects
		},
		showSettings: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			document.getElementById("modal-settings").checked = true;
		},
		toggleHints: function() {
			this.hints = !this.hints;
			localStorage["hints"] = (this.hints ? "1" : "0");
		},
		setBoardColor: function(e) {
			this.bcolor = e.target.options[e.target.selectedIndex].value;
			localStorage["bcolor"] = this.bcolor;
		},
		setSound: function(e) {
			this.sound = parseInt(e.target.options[e.target.selectedIndex].value);
			localStorage["sound"] = this.sound;
		},
		clickGameSeek: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			if (this.mode == "human")
				return; //no newgame while playing
			if (this.seek)
			{
				this.conn.send(JSON.stringify({code:"cancelnewgame"}));
				this.seek = false;
			}
			else
				this.newGame("human");
		},
		clickComputerGame: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			if (this.mode == "computer" && this.score == "*"
				&& this.vr.turn != this.mycolor)
			{
				// Wait for computer reply first (avoid potential "ghost move" bug)
				return;
			}
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
		newGame: function(mode, fenInit, color, oppId) {
			const fen = fenInit || VariantRules.GenRandInitFen();
			console.log(fen); //DEBUG
			if (mode=="human" && !oppId)
			{
				const storageVariant = localStorage.getItem("variant");
				if (!!storageVariant && storageVariant !== variant
					&& localStorage["score"] == "*")
				{
					return alert(translations["Finish your "] +
						storageVariant + translations[" game first!"]);
				}
				// Send game request and wait..
				try {
					this.conn.send(JSON.stringify({code:"newgame", fen:fen}));
				} catch (INVALID_STATE_ERR) {
					return; //nothing achieved
				}
				this.seek = true;
				let modalBox = document.getElementById("modal-newgame");
				modalBox.checked = true;
				setTimeout(() => { modalBox.checked = false; }, 2000);
				return;
			}
			const prefix = this.getStoragePrefix(mode);
			if (mode == "computer")
			{
				const storageVariant = localStorage.getItem(prefix+"variant");
				if (!!storageVariant)
				{
					const score = localStorage.getItem(prefix+"score");
					if (storageVariant !== variant && score == "*")
					{
						if (!confirm(storageVariant +
							translations[": unfinished computer game will be erased"]))
						{
							return;
						}
					}
				}
			}
			else if (mode == "friend")
			{
				const storageVariant = localStorage.getItem(prefix+"variant");
				if (!!storageVariant)
				{
					const score = localStorage.getItem(prefix+"score");
					if (storageVariant !== variant && score == "*")
					{
						if (!confirm(storageVariant +
							translations[": current analysis will be erased"]))
						{
							return;
						}
					}
				}
			}
			this.vr = new VariantRules(fen, []);
			this.score = "*";
			this.pgnTxt = ""; //redundant with this.score = "*", but cleaner
			this.mode = mode;
			this.incheck = [];
			this.fenStart = V.ParseFen(fen).position; //this is enough
			if (mode != "problem")
				this.setStorage(); //store game state in case of interruptions
			if (mode=="human")
			{
				// Opponent found!
				this.gameId = getRandString();
				this.oppid = oppId;
				this.oppConnected = true;
				this.mycolor = color;
				this.seek = false;
				if (this.sound >= 1)
					new Audio("/sounds/newgame.mp3").play().catch(err => {});
				document.getElementById("modal-newgame").checked = false;
			}
			else if (mode == "computer")
			{
				this.compWorker.postMessage(["init",this.vr.getFen()]);
				this.mycolor = (Math.random() < 0.5 ? 'w' : 'b');
				if (this.mycolor != this.vr.turn)
					this.playComputerMove();
			}
			else if (mode == "friend")
				this.mycolor = "w"; //convention...
			//else: problem solving: nothing more to do
		},
		continueGame: function(mode) {
			this.mode = mode;
			this.oppid = (mode=="human" ? localStorage.getItem("oppid") : undefined);
			const prefix = this.getStoragePrefix(mode);
			this.mycolor = localStorage.getItem(prefix+"mycolor");
			const moves = JSON.parse(localStorage.getItem(prefix+"moves"));
			const fen = localStorage.getItem(prefix+"fen");
			const score = localStorage.getItem(prefix+"score"); //set in "endGame()"
			this.fenStart = localStorage.getItem(prefix+"fenStart");
			this.vr = new VariantRules(fen, moves);
			this.incheck = this.vr.getCheckSquares(this.vr.turn);
			if (mode == "human")
			{
				this.gameId = localStorage.getItem("gameId");
				// Send ping to server (answer pong if opponent is connected)
				this.conn.send(JSON.stringify({
					code:"ping",oppid:this.oppid,gameId:this.gameId}));
			}
			else if (mode == "computer")
			{
				this.compWorker.postMessage(["init",fen]);
				if (score == "*" && this.mycolor != this.vr.turn)
					this.playComputerMove();
			}
			//else: nothing special to do in friend mode
			if (score != "*")
			{
				// Small delay required when continuation run faster than drawing page
				setTimeout(() => this.endGame(score), 100);
			}
		},
		playComputerMove: function() {
			this.timeStart = Date.now();
			this.compWorker.postMessage(["askmove"]);
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
				const startSquare = this.getSquareFromId(e.target.parentNode.id);
				this.possibleMoves = [];
				if (this.score == "*")
				{
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
		play: function(move, programmatic) {
			if (!move)
			{
				// Navigate after game is over
				if (this.cursor >= this.vr.moves.length)
					return; //already at the end
				move = this.vr.moves[this.cursor++];
			}
			if (!!programmatic) //computer or human opponent
				return this.animateMove(move);
			// Not programmatic, or animation is over
			if (this.mode == "human" && this.vr.turn == this.mycolor)
				this.conn.send(JSON.stringify({code:"newmove", move:move, oppid:this.oppid}));
			if (this.score == "*")
			{
				// Emergency check, if human game started "at the same time"
				// TODO: robustify this...
				if (this.mode == "human" && !!move.computer)
					return;
				this.vr.play(move, "ingame");
				// Is opponent in check?
				this.incheck = this.vr.getCheckSquares(this.vr.turn);
				if (this.sound == 2)
					new Audio("/sounds/move.mp3").play().catch(err => {});
				if (this.mode == "computer")
				{
					// Send the move to web worker (TODO: including his own moves?!)
					this.compWorker.postMessage(["newmove",move]);
				}
				const eog = this.vr.checkGameOver();
				if (eog != "*")
				{
					if (["human","computer"].includes(this.mode))
						this.endGame(eog);
					else
					{
						// Just show score on screen (allow undo)
						this.score = eog;
						this.showScoreMsg();
					}
				}
			}
			else
			{
				VariantRules.PlayOnBoard(this.vr.board, move);
				this.$forceUpdate(); //TODO: ?!
			}
			if (["human","computer","friend"].includes(this.mode))
				this.updateStorage(); //after our moves and opponent moves
			if (this.mode == "computer" && this.vr.turn != this.mycolor && this.score == "*")
				this.playComputerMove();
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
			{
				this.vr.undo(lm);
				if (this.sound == 2)
					new Audio("/sounds/undo.mp3").play().catch(err => {});
				this.incheck = this.vr.getCheckSquares(this.vr.turn);
			}
		},
	},
})
