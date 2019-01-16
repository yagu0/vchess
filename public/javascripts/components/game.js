// Game logic on a variant page: 3 modes, analyze, computer or human
// TODO: envoyer juste "light move", sans FEN ni notation ...etc
// TODO: if I'm an observer and player(s) disconnect/reconnect, how to find me ?
//			onClick :: ask full game to remote player, and register as an observer in game
//			(use gameId to communicate)
//			on landing on game :: if gameId not found locally, check remotely
//			==> il manque un param dans game : "remoteId"
Vue.component('my-game', {
	// gameId: to find the game in storage (assumption: it exists)
	// fen: to start from a FEN without identifiers (analyze mode)
	// subMode: "auto" (game comp vs comp) or "corr" (correspondance game),
	// or "examine" (after human game: TODO)
	props: ["conn","gameId","fen","mode","subMode","allowChat","allowMovelist",
		"queryHash","settings"],
	data: function() {
		return {
			// Web worker to play computer moves without freezing interface:
			compWorker: new Worker('/javascripts/playCompMove.js'),
			timeStart: undefined, //time when computer starts thinking
			vr: null, //VariantRules object, describing the game state + rules
			endgameMessage: "",
			orientation: "w",
			lockCompThink: false, //used to avoid some ghost moves
			myname: user.name, //may be anonymous (thus no name)
			opponents: {}, //filled later (potentially 2 or 3 opponents)
			drawOfferSent: false, //did I just ask for draw?
			people: {}, //observers
			score: "*", //'*' means 'unfinished'
			// userColor: given by gameId, or fen in problems mode (if no game Id)...
			mycolor: "w",
			fenStart: "",
			moves: [], //TODO: initialize if gameId is defined...
			cursor: -1, //index of the move just played
			lastMove: null,
		};
	},
	watch: {
		fen: function(newFen) {
			// (Security) No effect if a computer move is in progress:
			if (this.mode == "computer" && this.lockCompThink)
				return this.$emit("computer-think");
			this.newGameFromFen(newFen);
		},
		gameId: function() {
			this.loadGame();
		},
		queryHash: function(newQhash) {
			// New query hash = "id=42"; get 42 as gameId
			this.gameId = parseInt(newQhash.substr(2));
			this.loadGame();
		},
	},
	computed: {
		showChat: function() {
			return this.allowChat && this.mode=='human' && this.score != '*';
		},
		showMoves: function() {
			return true;
			return this.allowMovelist && window.innerWidth >= 768;
		},
		showFen: function() {
			return variant.name != "Dark" || this.score != "*";
		},
	},
	// Modal end of game, and then sub-components
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
			<my-chat v-if="showChat" :conn="conn" :myname="myname"
				:opponents="opponents" :people="people">
			</my-chat>
			<my-board v-bind:vr="vr" :last-move="lastMove" :mode="mode"
				:orientation="orientation" :user-color="mycolor" :settings="settings"
				@play-move="play">
			</my-board>
			<div class="button-group">
				<button @click="() => play()">Play</button>
				<button @click="() => undo()">Undo</button>
				<button @click="flip">Flip</button>
				<button @click="gotoBegin">GotoBegin</button>
				<button @click="gotoEnd">GotoEnd</button>
			</div>
			<div v-if="mode=='human'" class="button-group">
				<button @click="offerDraw">Draw</button>
				<button @click="abortGame">Abort</button>
				<button @click="resign">Resign</button>
			</div>
			<div v-if="mode=='human' && subMode=='corr'">
				<textarea v-show="score=='*' && vr.turn==mycolor" v-model="corrMsg">
				</textarea>
				<div v-show="cursor>=0">
					{{ moves[cursor].message }}
				</div>
			</div>
			<div v-if="showFen && !!vr" id="fen-div" class="section-content">
				<p id="fen-string" class="text-center">
					{{ vr.getFen() }}
				</p>
			</div>
			<div id="pgn-div" class="section-content">
				<a id="download" href="#">
				</a>
				<div class="button-group">
					<button id="downloadBtn" @click="download">
						{{ translate("Download PGN") }}
					</button>
					<button>Import game</button>
				</div>
			</div>
			<my-move-list v-if="showMoves" :moves="moves" :cursor="cursor" @goto-move="gotoMove">
			</my-move-list>
		</div>
	`,
	created: function() {
		if (!!this.gameId)
			this.loadGame();
		else if (!!this.fen)
		{
			this.vr = new VariantRules(this.fen);
			this.fenStart = this.fen;
		}
		// TODO: also handle "draw accepted" (use opponents array?)
		// --> must give this info also when sending lastState...
		// and, if all players agree then OK draw (end game ...etc)
		const socketMessageListener = msg => {
			const data = JSON.parse(msg.data);
			let L = undefined;
			switch (data.code)
			{
				case "newmove": //..he played!
					this.play(data.move, variant.name!="Dark" ? "animate" : null);
					break;
				case "pong": //received if we sent a ping (game still alive on our side)
					if (this.gameId != data.gameId)
						break; //games IDs don't match: definitely over...
					this.oppConnected = true;
					// Send our "last state" informations to opponent(s)
					L = this.vr.moves.length;
					Object.keys(this.opponents).forEach(oid => {
						this.conn.send(JSON.stringify({
							code: "lastate",
							oppid: oid,
							gameId: this.gameId,
							lastMove: (L>0?this.vr.moves[L-1]:undefined),
							movesCount: L,
						}));
					});
					break;
				// TODO: refactor this, because at 3 or 4 players we may have missed 2 or 3 moves (not just one)
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
							oppid: this.opponent.id,
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
					if (this.mode=="human")
					{
						const online = (data.code == "connect");
						// If this is an opponent ?
						if (!!this.opponents[data.id])
							this.opponents[data.id].online = online;
						else
						{
							// Or an observer ?
							if (!online)
								delete this.people[data.id];
							else
								this.people[data.id] = data.name;
						}
					}
					break;
			}
		};
		const socketCloseListener = () => {
			this.conn.addEventListener('message', socketMessageListener);
			this.conn.addEventListener('close', socketCloseListener);
		};
		if (!!this.conn)
		{
			this.conn.onmessage = socketMessageListener;
			this.conn.onclose = socketCloseListener;
		}
		// Computer moves web worker logic: (TODO: also for observers in HH games ?)
		this.compWorker.postMessage(["scripts",variant.name]);
		this.compWorker.onmessage = e => {
			this.lockCompThink = true; //to avoid some ghost moves
			let compMove = e.data;
			if (!Array.isArray(compMove))
				compMove = [compMove]; //to deal with MarseilleRules
			// Small delay for the bot to appear "more human"
			const delay = Math.max(500-(Date.now()-this.timeStart), 0);
			setTimeout(() => {
				const animate = variant.name != "Dark";
				this.play(compMove[0], animate);
				if (compMove.length == 2)
					setTimeout( () => { this.play(compMove[1], animate); }, 750);
				else //250 == length of animation (TODO: should be a constant somewhere)
					setTimeout( () => this.lockCompThink = false, 250);
			}, delay);
		}
	},
	// dans variant.js (plutôt room.js) conn gère aussi les challenges
	// et les chats dans chat.js. Puis en webRTC, repenser tout ça.
	methods: {
		offerDraw: function() {
			if (!confirm("Offer draw?"))
				return;
			// Stay in "draw offer sent" state until next move is played
			this.drawOfferSent = true;
			if (this.subMode == "corr")
			{
				// TODO: set drawOffer on in game (how ?)
			}
			else //live game
			{
				this.opponents.forEach(o => {
					if (!!o.online)
					{
						try {
							this.conn.send(JSON.stringify({code: "draw", oppid: o.id}));
						} catch (INVALID_STATE_ERR) {
							return;
						}
					}
				});
			}
		},
		// + conn handling: "draw" message ==> agree for draw (if we have "drawOffered" at true)
		receiveDrawOffer: function() {
			//if (...)
			// TODO: ignore if preventDrawOffer is set; otherwise show modal box with option "prevent future offers"
			// if accept: send message "draw"
		},
		abortGame: function() {
			if (!confirm("Abort the game?"))
				return;
			//+ bouton "abort" avec score == "?" + demander confirmation pour toutes ces actions,
			//send message: "gameOver" avec score "?"
		},
		resign: function(e) {
			if (!confirm("Resign the game?"))
				return;
			if (this.mode == "human" && this.oppConnected(this.oppid))
			{
				try {
					this.conn.send(JSON.stringify({code: "resign", oppid: this.oppid}));
				} catch (INVALID_STATE_ERR) {
					return;
				}
			}
			this.endGame(this.mycolor=="w"?"0-1":"1-0");
		},
		translate: translate,
		newGameFromFen: function(fen) {
			this.vr = new VariantRules(fen);
			this.moves = [];
			this.cursor = -1;
			this.fenStart = newFen;
			this.score = "*";
			if (this.mode == "analyze")
			{
				this.mycolor = V.ParseFen(newFen).turn;
				this.orientation = this.mycolor;
			}
			else if (this.mode == "computer") //only other alternative (HH with gameId)
			{
				this.mycolor = (Math.random() < 0.5 ? "w" : "b");
				this.orientation = this.mycolor;
				this.compWorker.postMessage(["init",newFen]);
				if (this.mycolor != "w" || this.subMode == "auto")
					this.playComputerMove();
			}
		},
		loadGame: function() {
			// TODO: ask game to remote peer if this.remoteId is set
			// (or just if game not found locally)
			// NOTE: if it's a corr game, ask it from server
			const game = getGameFromStorage(this.gameId);
			this.opponent.id = game.oppid; //opponent ID in case of running HH game
			this.opponent.name = game.oppname; //maye be blank (if anonymous)
			this.score = game.score;
			this.mycolor = game.mycolor;
			this.fenStart = game.fenStart;
			this.moves = game.moves;
			this.cursor = game.moves.length-1;
			this.lastMove = (game.moves.length > 0 ? game.moves[this.cursor] : null);
		},
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
			const content = this.getPgn();
			// Prepare and trigger download link
			let downloadAnchor = document.getElementById("download");
			downloadAnchor.setAttribute("download", "game.pgn");
			downloadAnchor.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
			downloadAnchor.click();
		},
		getPgn: function() {
			let pgn = "";
			pgn += '[Site "vchess.club"]\n';
			const opponent = (this.mode=="human" ? "Anonymous" : "Computer");
			pgn += '[Variant "' + variant.name + '"]\n';
			pgn += '[Date "' + getDate(new Date()) + '"]\n';
			const whiteName = ["human","computer"].includes(this.mode)
				? (this.mycolor=='w'?'Myself':opponent)
				: "analyze";
			const blackName = ["human","computer"].includes(this.mode)
				? (this.mycolor=='b'?'Myself':opponent)
				: "analyze";
			pgn += '[White "' + whiteName + '"]\n';
			pgn += '[Black "' + blackName + '"]\n';
			pgn += '[Fen "' + this.fenStart + '"]\n';
			pgn += '[Result "' + this.score + '"]\n\n';
			let counter = 1;
			let i = 0;
			while (i < this.moves.length)
			{
				pgn += (counter++) + ".";
				for (let color of ["w","b"])
				{
					let move = "";
					while (i < this.moves.length && this.moves[i].color == color)
						move += this.moves[i++].notation[0] + ",";
					move = move.slice(0,-1); //remove last comma
					pgn += move + (i < this.moves.length-1 ? " " : "");
				}
			}
			return pgn + "\n";
		},
		showScoreMsg: function(score) {
			this.setEndgameMessage(score);
			let modalBox = document.getElementById("modal-eog");
			modalBox.checked = true;
			setTimeout(() => { modalBox.checked = false; }, 2000);
		},
		endGame: function(score) {
			this.score = score;
			this.showScoreMsg(score);
			if (this.mode == "human")
				localStorage["score"] = score;
			this.$emit("game-over");
		},
		oppConnected: function(uid) {
			return this.opponents.any(o => o.id == uidi && o.online);
		},
		playComputerMove: function() {
			this.timeStart = Date.now();
			this.compWorker.postMessage(["askmove"]);
		},
		animateMove: function(move) {
			let startSquare = document.getElementById(getSquareId(move.start));
			let endSquare = document.getElementById(getSquareId(move.end));
			let rectStart = startSquare.getBoundingClientRect();
			let rectEnd = endSquare.getBoundingClientRect();
			let translation = {x:rectEnd.x-rectStart.x, y:rectEnd.y-rectStart.y};
			let movingPiece =
				document.querySelector("#" + getSquareId(move.start) + " > img.piece");
			// HACK for animation (with positive translate, image slides "under background")
			// Possible improvement: just alter squares on the piece's way...
			squares = document.getElementsByClassName("board");
			for (let i=0; i<squares.length; i++)
			{
				let square = squares.item(i);
				if (square.id != getSquareId(move.start))
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
			let navigate = !move;
			// Forbid playing outside analyze mode when cursor isn't at moves.length-1
			// (except if we receive opponent's move, human or computer)
			if (!navigate && this.mode != "analyze" && !programmatic
				&& this.cursor < this.moves.length-1)
			{
				return;
			}
			if (navigate)
			{
				if (this.cursor == this.moves.length-1)
					return; //no more moves
				move = this.moves[this.cursor+1];
			}
			if (!!programmatic) //computer or (remote) human opponent
			{
				if (this.cursor < this.moves.length-1)
					this.gotoEnd(); //required to play the move
				return this.animateMove(move);
			}
			// Not programmatic, or animation is over
			if (this.mode == "human" && this.subMode == "corr" && this.mycolor == this.vr.turn)
			{
				// TODO: show confirm box "validate move ?"
			}
			if (!move.notation)
				move.notation = this.vr.getNotation(move);
			if (!move.color)
				move.color = this.vr.turn;
			this.vr.play(move);
			this.cursor++;
			this.lastMove = move;
			if (!move.fen)
				move.fen = this.vr.getFen();
			if (this.settings.sound == 2)
				new Audio("/sounds/move.mp3").play().catch(err => {});
			if (this.mode == "human")
			{
				updateStorage(move); //after our moves and opponent moves
				if (this.vr.turn == this.mycolor)
					this.conn.send(JSON.stringify({code:"newmove", move:move, oppid:this.oppid}));
			}
			else if (this.mode == "computer")
			{
				// Send the move to web worker (including his own moves)
				this.compWorker.postMessage(["newmove",move]);
			}
			if (!navigate && (this.score == "*" || this.mode == "analyze"))
			{
				// Stack move on movesList at current cursor
				if (this.cursor == this.moves.length)
					this.moves.push(move);
				else
					this.moves = this.moves.slice(0,this.cursor-1).concat([move]);
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
			}
			// subTurn condition for Marseille (and Avalanche) rules
			else if ((this.mode == "computer" && (!this.vr.subTurn || this.vr.subTurn <= 1))
				&& (this.subMode == "auto" || this.vr.turn != this.mycolor))
			{
				this.playComputerMove();
			}
			// https://vuejs.org/v2/guide/list.html#Caveats (also for undo)
			if (navigate)
				this.$children[0].$forceUpdate(); //TODO!?
		},
		undo: function(move) {
			let navigate = !move;
			if (navigate)
			{
				if (this.cursor < 0)
					return; //no more moves
				move = this.moves[this.cursor];
			}
			this.vr.undo(move);
			this.cursor--;
			this.lastMove = (this.cursor >= 0 ? this.moves[this.cursor] : undefined);
			if (this.settings.sound == 2)
				new Audio("/sounds/undo.mp3").play().catch(err => {});
			this.incheck = this.vr.getCheckSquares(this.vr.turn);
			if (navigate)
				this.$children[0].$forceUpdate(); //TODO!?
			else if (this.mode == "analyze") //TODO: can this happen?
				this.moves.pop();
		},
		gotoMove: function(index) {
			this.vr = new VariantRules(this.moves[index].fen);
			this.cursor = index;
			this.lastMove = this.moves[index];
		},
		gotoBegin: function() {
			this.vr = new VariantRules(this.fenStart);
			this.cursor = -1;
			this.lastMove = null;
		},
		gotoEnd: function() {
			this.gotoMove(this.moves.length-1);
		},
		flip: function() {
			this.orientation = V.GetNextCol(this.orientation);
		},
	},
})
