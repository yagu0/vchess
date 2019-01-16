// TODO: main playing hall, chat + online players + current challenges + button "new game"
/*
input#modal-newgame.modal(type="checkbox")
div(role="dialog" aria-labelledby="newGameTxt")
	.card.smallpad.small-modal
		label#close-newgame.modal-close(for="modal-newgame")
		h3#newGameTxt= translations["New game"]
		p= translations["Waiting for opponent..."]
*/
// TODO: my-challenge-list, gérant clicks sur challenges, affichage, réception/émission des infos sur challenges ; de même, my-player-list
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
// TODO: au moins l'échange des coups en P2P ?
Vue.component('my-room', {
	props: ["conn","settings"],
	data: {
		something: "", //TODO
	},
	// Modal new game, and then sub-components
	template: `
		<div>
			<input id="modalNewgame" type="checkbox" class"="modal"/>
			<div role="dialog" aria-labelledby="titleFenedit">
				<div class="card smallpad">
					<label id="closeNewgame" for="modalNewgame" class="modal-close">
					</label>
					<h3 id="titleFenedit" class="section">
						{{ translate("Game state (FEN):") }}
					</h3>
					<input id="input-fen" type="text"/>
					<p>TODO: cadence, adversaire (pre-filled if click on name)</p>
					<p>Note: leave FEN blank for random</p>
					<button @click="newGame">Launch game</button>
				</div>
			</div>
			<my-chat :conn="conn" :myname="myname" :people="people"></my-chat>
			<my-challenge-list :conn="conn"></my-challenge-list>
			<my-player-list :conn="conn"></my-player-list>
			<my-game-list :conn="conn" ........... my-local-game-list opposed to my-remote-ame-list ?! ...bof></my-game-list>
			onClick :: ask full game to remote player, and register as an observer in game
			(use gameId to communicate)
			on landing on game :: if gameId not found locally, check remotely
			==> il manque un param dans game : "remoteId"
		</div>
	`,
	created: function() {
		const socketMessageListener = msg => {
			const data = JSON.parse(msg.data);
			switch (data.code)
			{
				case "newgame": //challenge accepted
					// oppid: opponent socket ID (or DB id if registered)
					this.newGame("human", data.fen, data.color, data.oppid, data.gameid);
					break;
			}
		};
		const socketCloseListener = () => {
			this.conn.addEventListener('message', socketMessageListener);
			this.conn.addEventListener('close', socketCloseListener);
		};
		this.conn.onmessage = socketMessageListener;
		this.conn.onclose = socketCloseListener;
	},
	methods: {
		clickGameSeek: function(e) {
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
			this.setStorage(); //store game state in case of interruptions
		},
		continueGame: function() {
			this.oppid = localStorage.getItem("oppid");
			this.mycolor = localStorage.getItem("mycolor");
			const moves = JSON.parse(localStorage.getItem("moves"));
			const fen = localStorage.getItem("fen");
			const score = localStorage.getItem("score"); //always "*" ?!
			this.fenStart = localStorage.getItem("fenStart");
			this.vr = new VariantRules(fen);
			this.incheck = this.vr.getCheckSquares(this.vr.turn);
			this.gameId = localStorage.getItem("gameId");
			// Send ping to server (answer pong if opponent is connected)
			this.conn.send(JSON.stringify({
				code:"ping",oppid:this.oppid,gameId:this.gameId}));
		},
	},
});
