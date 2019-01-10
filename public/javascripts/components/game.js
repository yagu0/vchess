// Game logic on a variant page
Vue.component('my-game', {
	props: ["gameId"], //to find the game in storage (assumption: it exists)
	data: function() {
		return {
			
			// TODO: merge next variables into "game"
			// if oppid == "computer" then mode = "computer" (otherwise human)
			myid: "", //our ID, always set
		//this.myid = localStorage.getItem("myid")
			oppid: "", //opponent ID in case of HH game
			score: "*", //'*' means 'unfinished'
			mycolor: "w",
			fromChallenge: false, //if true, show chat during game
			
			conn: null, //socket connection
			oppConnected: false,
			seek: false,
			fenStart: "",
			pgnTxt: "",
			// sound level: 0 = no sound, 1 = sound only on newgame, 2 = always
			sound: parseInt(localStorage["sound"] || "2"),
			// Web worker to play computer moves without freezing interface:
			compWorker: new Worker('/javascripts/playCompMove.js'),
			timeStart: undefined, //time when computer starts thinking
		};
	},
	computed: {
		mode: function() {
			return (this.game.oppid == "computer" ? "computer" ? "human");
		},
		showChat: function() {
			return this.mode=='human' &&
				(this.game.score != '*' || this.game.fromChallenge);
		},
		showMoves: function() {
			return window.innerWidth >= 768;
		},
	},
	// Modal end of game, and then sub-components
	template: `
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<input id="modal-eog" type="checkbox" class="modal"/>
			<div role="dialog" aria-labelledby="eogMessage">
				<div class="card smallpad small-modal text-center">
					<label for="modal-eog" class="modal-close"></label>
					<h3 id="eogMessage" class="section">{{ endgameMessage }}</h3>
				</div>
			</div>

			<my-chat v-if="showChat"></my-chat>
			//TODO: connection + turn indicators en haut à droite (superposé au menu)
			<my-board></my-board>
			// TODO: controls: abort, clear, resign, draw (avec confirm box)
			// et si partie terminée : (mode analyse) just clear, back / play
			// + flip button toujours disponible
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
			
			<div id="pgn-div" class="section-content">
				<a id="download" href: "#"></a>
				<button id="downloadBtn" @click="download">
					{{ translations["Download PGN"] }}
				</button>
			
			<my-move-list v-if="showMoves"></my-move-list>
		</div>
	`,
	computed: {
		endgameMessage: function() {
			let eogMessage = "Unfinished";
			switch (this.game.score)
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
		this.conn = new WebSocket(url + "/?sid=" + this.myid + "&page=" + variant._id);
//		const socketOpenListener = () => {
//		};

// TODO: after game, archive in indexedDB

		// TODO: this events listener is central. Refactor ? How ?
		const socketMessageListener = msg => {
			const data = JSON.parse(msg.data);
			let L = undefined;
			switch (data.code)
			{
				case "newmove": //..he played!
					this.play(data.move, (variant.name!="Dark" ? "animate" : null));
					break;
				case "pong": //received if we sent a ping (game still alive on our side)
					if (this.gameId != data.gameId)
						break; //games IDs don't match: definitely over...
					this.oppConnected = true;
					// Send our "last state" informations to opponent
					L = this.vr.moves.length;
					this.conn.send(JSON.stringify({
						code: "lastate",
						oppid: this.oppid,
						gameId: this.gameId,
						lastMove: (L>0?this.vr.moves[L-1]:undefined),
						movesCount: L,
					}));
					break;
				case "lastate": //got opponent infos about last move
					L = this.vr.moves.length;
					if (this.gameId != data.gameId)
						break; //games IDs don't match: nothing we can do...
					// OK, opponent still in game (which might be over)
					if (this.score != "*")
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
							gameId: this.gameId,
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
			this.conn = new WebSocket(url + "/?sid=" + this.myid + "&page=" + variant._id);
			//this.conn.addEventListener('open', socketOpenListener);
			this.conn.addEventListener('message', socketMessageListener);
			this.conn.addEventListener('close', socketCloseListener);
		};
		//this.conn.onopen = socketOpenListener;
		this.conn.onmessage = socketMessageListener;
		this.conn.onclose = socketCloseListener;
		
		
		// Listen to keyboard left/right to navigate in game
		// TODO: also mouse wheel !
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


		// Computer moves web worker logic: (TODO: also for observers in HH games)
		this.compWorker.postMessage(["scripts",variant.name]);
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
				const animate = (variant.name!="Dark" ? "animate" : null);
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
		download: function() {
			// Variants may have special PGN structure (so next function isn't defined here)
			const content = V.GetPGN(this.moves, this.mycolor, this.score, this.fenStart, this.mode);
			// Prepare and trigger download link
			let downloadAnchor = document.getElementById("download");
			downloadAnchor.setAttribute("download", "game.pgn");
			downloadAnchor.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
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
			if (this.mode == "human" && this.oppConnected)
			{
				// Send our nickname to opponent
				this.conn.send(JSON.stringify({
					code:"myname", name:this.myname, oppid:this.oppid}));
			}
			this.cursor = this.vr.moves.length; //to navigate in finished game
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
		playComputerMove: function() {
			this.timeStart = Date.now();
			this.compWorker.postMessage(["askmove"]);
		},
		// OK, these last functions can stay here (?!)
	},
})

//// TODO: keep moves list here
//get lastMove()
//	{
//		const L = this.moves.length;
//		return (L>0 ? this.moves[L-1] : null);
//	}
//
//// here too:
//			move.notation = this.getNotation(move);
//TODO: confirm dialog with "opponent offers draw", avec possible bouton "prevent future offers" + bouton "proposer nulle"
//+ bouton "abort" avec score == "?" + demander confirmation pour toutes ces actions,
//comme sur lichess
			
// send move from here:
//if (this.mode == "human" && this.vr.turn == this.mycolor)
			//this.conn.send(JSON.stringify({code:"newmove", move:move, oppid:this.oppid}));
			// TODO: play move, and stack it on this.moves (if a move was provided; otherwise just navigate)
			
//			if (["human","computer","friend"].includes(this.mode))
//				this.updateStorage(); //after our moves and opponent moves
//			if (this.mode == "computer" && this.vr.turn != this.mycolor && this.score == "*")
//				this.playComputerMove();
//			if (this.mode == "computer")
//			{
//				// Send the move to web worker (TODO: including his own moves?!)
//				this.compWorker.postMessage(["newmove",move]);
//			}
//				if (["human","computer"].includes(this.mode))
//					this.endGame(eog);
//				else
//				{
//					// Just show score on screen (allow undo)
//					this.score = eog;
//					this.showScoreMsg();
//				}
