// TODO: envoyer juste "light move", sans FEN ni notation ...etc
// TODO: also "observers" prop, we should send moves to them too (in a web worker ? webRTC ?)

// Game logic on a variant page: 3 modes, analyze, computer or human
Vue.component('my-game', {
	// gameId: to find the game in storage (assumption: it exists)
	props: ["gameId","fen","mode","allowChat","allowMovelist"],
	data: function() {
		return {
			// if oppid == "computer" then mode = "computer" (otherwise human)
			myid: "", //our ID, always set
			//this.myid = localStorage.getItem("myid")
			oppid: "", //opponent ID in case of HH game
			score: "*", //'*' means 'unfinished'
			mycolor: "w",
			conn: null, //socket connection (et WebRTC connection ?!)
			oppConnected: false, //TODO?
			pgnTxt: "",
			// sound level: 0 = no sound, 1 = sound only on newgame, 2 = always
			sound: parseInt(localStorage["sound"] || "2"),
			// Web worker to play computer moves without freezing interface:
			compWorker: new Worker('/javascripts/playCompMove.js'),
			timeStart: undefined, //time when computer starts thinking
			vr: null, //VariantRules object, describing the game state + rules
		};
	},
	watch: {
		fen: function(newFen) {
			this.vr = new VariantRules(newFen);
		},
	},
	computed: {
		showChat: function() {
			return this.allowChat && this.mode=='human' && this.score != '*';
		},
		showMoves: function() {
			return this.allowMovelist && window.innerWidth >= 768;
		},
		showFen: function() {
			return variant.name != "Dark" || this.score != "*";
		},
	},
	// Modal end of game, and then sub-components
	// TODO: provide chat parameters (connection, players ID...)
	// and alwo moveList parameters (just moves ?)
	// TODO: connection + turn indicators en haut à droite (superposé au menu)
	// TODO: controls: abort, clear, resign, draw (avec confirm box)
	// et si partie terminée : (mode analyse) just clear, back / play
	// + flip button toujours disponible
	// gotoMove : vr = new VariantRules(fen stocké dans le coup [TODO])
	template: `
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<input id="modal-eog" type="checkbox" class="modal"/>
			<div role="dialog" aria-labelledby="eogMessage">
				<div class="card smallpad small-modal text-center">
					<label for="modal-eog" class="modal-close">
					</label>
					<h3 id="eogMessage" class="section">
						{{ endgameMessage }}
					</h3>
				</div>
			</div>
			<my-chat v-if="showChat">
			</my-chat>
			<my-board v-bind:vr="vr">
			</my-board>
			<div v-show="showFen" id="fen-div" class="section-content">
				<p id="fen-string" class="text-center">
					{{ vr.getFen() }}
				</p>
			</div>
			<div id="pgn-div" class="section-content">
				<a id="download" href: "#">
				</a>
				<button id="downloadBtn" @click="download">
					{{ translations["Download PGN"] }}
				</button>
			</div>
			<my-move-list v-if="showMoves">
			</my-move-list>
		</div>
	`,
	created: function() {
		const url = socketUrl;
		this.conn = new WebSocket(url + "/?sid=" + this.myid + "&page=" + variant._id);
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
			this.conn.addEventListener('message', socketMessageListener);
			this.conn.addEventListener('close', socketCloseListener);
		};
		this.conn.onmessage = socketMessageListener;
		this.conn.onclose = socketCloseListener;

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
	//TODO: conn pourrait être une prop, donnée depuis variant.js
	//dans variant.js (plutôt room.js) conn gère aussi les challenges
	// Puis en webRTC, repenser tout ça.
	methods: {
		setEndgameMessage: function(score) {
			let eogMessage = "Undefined";
			switch (score)
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
				case "?":
					eogMessage = "Unfinished";
					break;
			}
			this.endgameMessage = eogMessage;
		},
		download: function() {
			// Variants may have special PGN structure (so next function isn't defined here)
			// TODO: get fenStart from local game (using gameid)
			const content = V.GetPGN(this.moves, this.mycolor, this.score, fenStart, this.mode);
			// Prepare and trigger download link
			let downloadAnchor = document.getElementById("download");
			downloadAnchor.setAttribute("download", "game.pgn");
			downloadAnchor.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
			downloadAnchor.click();
		},
		showScoreMsg: function(score) {
			this.setEndgameMessage(score);
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
			this.showScoreMsg(score);
			if (this.mode == "human" && this.oppConnected)
			{
				// Send our nickname to opponent
				this.conn.send(JSON.stringify({
					code:"myname", name:this.myname, oppid:this.oppid}));
			}
			// TODO: what about cursor ?
			//this.cursor = this.vr.moves.length; //to navigate in finished game
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
				this.play(move); //TODO: plutôt envoyer message "please play"
			}, 250);
		},
		play: function(move, programmatic) {
			if (!!programmatic) //computer or human opponent
				return this.animateMove(move);
			// Not programmatic, or animation is over
			if (!move.notation)
				move.notation = this.vr.getNotation(move);
			this.vr.play(move);
			if (!move.fen)
				move.fen = this.vr.getFen();
			if (this.sound == 2)
				new Audio("/sounds/move.mp3").play().catch(err => {});
			if (this.mode == "human")
			{
				updateStorage(move); //after our moves and opponent moves
				if (this.vr.turn == this.userColor)
					this.conn.send(JSON.stringify({code:"newmove", move:move, oppid:this.oppid}));
			}
			else if (this.mode == "computer")
			{
				// Send the move to web worker (including his own moves)
				this.compWorker.postMessage(["newmove",move]);
			}
			if (this.score == "*" || this.mode == "analyze")
			{
				// Stack move on movesList
				this.moves.push(move);
			}
			// Is opponent in check?
			this.incheck = this.vr.getCheckSquares(this.vr.turn);
			const score = this.vr.getCurrentScore();
			if (score != "*")
			{
				if (["human","computer"].includes(this.mode))
					this.endGame(score);
				else //just show score on screen (allow undo)
					this.showScoreMsg(score);
				// TODO: notify end of game (give score)
			}
			else if (this.mode == "computer" && this.vr.turn != this.userColor)
				this.playComputerMove();
		},
		undo: function(move) {
			this.vr.undo(move);
			if (this.sound == 2)
				new Audio("/sounds/undo.mp3").play().catch(err => {});
			this.incheck = this.vr.getCheckSquares(this.vr.turn);
			if (this.mode == "analyze")
				this.moves.pop();
		},
	},
})
// cursor + ........
//TODO: confirm dialog with "opponent offers draw", avec possible bouton "prevent future offers" + bouton "proposer nulle"
//+ bouton "abort" avec score == "?" + demander confirmation pour toutes ces actions,
//comme sur lichess
//
//TODO: quand partie terminée (ci-dessus) passer partie dans indexedDB
