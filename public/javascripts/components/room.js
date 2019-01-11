// TODO: main playing hall, chat + online players + current challenges + button "new game"
/*
input#modal-newgame.modal(type="checkbox")
div(role="dialog" aria-labelledby="newGameTxt")
	.card.smallpad.small-modal
		label#close-newgame.modal-close(for="modal-newgame")
		h3#newGameTxt= translations["New game"]
		p= translations["Waiting for opponent..."]
*/

// TODO: si on est en train de jouer une partie, le notifier aux nouveaux connectés

/*
Players + challenges : == "room" home of variant (surligner si nouveau défi perso et pas affichage courant)
joueurs en ligne (dte),
Nouvelle partie + défis en temps réel + parties en cours (milieu, tabs),
chat général (gauche, activé ou non (bool global storage)).
(cadences base + incrément, corr == incr >= 1jour ou base >= 7j)
--> correspondance: stocker sur serveur lastMove + peerId + color + movesCount + gameId + variant + timeleft
quand je poste un lastMove corr, supprimer mon ancien lastMove le cas échéant (tlm l'a eu)
fin de partie corr: garder maxi nbPlayers lastMove sur serveur, pendant 7 jours (arbitraire)
*/
				case "newgame": //opponent found
					// oppid: opponent socket ID
					this.newGame("human", data.fen, data.color, data.oppid, data.gameid);
					break;

		// TODO: elsewhere, probably (new game button)
		clickGameSeek: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			if (this.mode == "human" && this.score == "*")
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
		// In main hall :
		newGame: function(mode, fenInit, color, oppId, gameId) {
			const fen = fenInit || VariantRules.GenRandInitFen();
			console.log(fen); //DEBUG
			if (mode=="human" && !oppId)
			{
				const storageVariant = localStorage.getItem("variant");
				if (!!storageVariant && storageVariant !== variant.name
					&& localStorage["score"] == "*")
				{
					return alert(translations["Finish your "] +
						storageVariant + translations[" game first!"]);
				}
				// Send game request and wait..
				try {
					this.conn.send(JSON.stringify({code:"newgame", fen:fen, gameid: getRandString() }));
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
					if (storageVariant !== variant.name && score == "*")
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
					if (storageVariant !== variant.name && score == "*")
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
			if (mode=="human")
			{
				// Opponent found!
				this.gameId = gameId;
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
			if (mode != "problem")
				this.setStorage(); //store game state in case of interruptions
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
		
	
	// TODO: option du bouton "new game"
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
