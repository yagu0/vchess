Vue.component("my-correspondance", {
	data: function() {
		return {
			userId: user.id,
			games: [],
			challenges: [],
			willPlay: [], //IDs of challenges in which I decide to play (>= 3 players)
			newgameInfo: {
				fen: "",
				vid: 0,
				nbPlayers: 0,
				players: ["","",""],
				mainTime: 0,
				increment: 0,
			},
		};
	},
	template: `
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<input id="modalNewgame" type="checkbox" class="modal"/>
			<div role="dialog" aria-labelledby="titleFenedit">
				<div class="card smallpad">
					<label id="closeNewgame" for="modalNewgame" class="modal-close">
					</label>
					<fieldset>
						<label for="selectVariant">{{ translate("Variant") }}</label>
						<select id="selectVariant" v-model="newgameInfo.vid">
							<option v-for="v in variants" :value="v.id">{{ v.name }}</option>
						</select>
					</fieldset>
					<fieldset>
						<label for="selectNbPlayers">{{ translate("Number of players") }}</label>
						<select id="selectNbPlayers" v-model="newgameInfo.nbPlayers">
							<option v-show="possibleNbplayers(2)" value="2">2</option>
							<option v-show="possibleNbplayers(3)" value="3">3</option>
							<option v-show="possibleNbplayers(4)" value="4">4</option>
						</select>
					</fieldset>
					<fieldset>
						<label for="timeControl">Time control (in days)</label>
						<div id="timeControl">
							<input type="number" v-model="newgameInfo.mainTime" placeholder="Main time"/>
							<input type="number" v-model="newgameInfo.increment" placeholder="Increment"/>
						</div>
					</fieldset>
					<fieldset>
						<label for="selectPlayers">{{ translate("Play with?") }}</label>
						<div id="selectPlayers">
							<input type="text" v-model="newgameInfo.players[0]"/>
							<input v-show="newgameInfo.nbPlayers>=3" type="text"
								v-model="newgameInfo.players[1]"/>
							<input v-show="newgameInfo.nbPlayers==4" type="text"
								v-model="newgameInfo.players[2]"/>
						</div>
					</fieldset>
					<fieldset>
						<label for="inputFen">{{ translate("FEN (ignored if players fields are blank)") }}</label>
						<input id="inputFen" type="text" v-model="newgameInfo.fen"/>
					</fieldset>
					<button @click="newGame">Launch game</button>
				</div>
			</div>
			<p v-if="!userId">Correspondance play is reserved to registered users</p>
			<div v-if="!!userId">
				<my-challenge-list :challenges="challenges" @click-challenge="clickChallenge">
				</my-challenge-list>
				<button onClick="doClick('modalNewgame')">New game</button>
				<my-game-list :games="games" @show-game="showGame">
				</my-game-list>
			</div>
		</div>
	`,
	computed: {
		// TODO: this is very artificial...
		variants: function() {
			return variantArray;
		},
	},
	created: function() {
		// use user.id to load challenges + games from server
	},
	methods: {
		translate: translate,
		clickChallenge: function() {
			// TODO: accepter un challenge peut lancer une partie, il
			// faut alors supprimer challenge + creer partie + la retourner et l'ajouter ici
			// autres actions:
			// supprime mon défi
			// accepte un défi
			// annule l'acceptation d'un défi (si >= 3 joueurs)
			//
			// si pas le mien et FEN speciale :: (charger code variante et)
			// montrer diagramme + couleur (orienté)
		},
		showGame: function(g) {
			// Redirect to /variant#game?id=...
			location.href="/variant#game?id=" + g.id;
		},
		newGame: function() {
			// NOTE: side-effect = set FEN
			// TODO: (to avoid any cheating option) separate the GenRandInitFen() functions
			// in separate files, load on server and generate FEN on server.
			const error = checkChallenge(this.newgameInfo);
			if (!!error)
				return alert(error);
			// Possible (server) error if filled player does not exist
			ajax(
				"/challenges/" + this.newgameInfo.vid,
				"POST",
				this.newgameInfo,
				response => {
					this.challenges.push(response.challenge);
				}
			);
		},
		possibleNbplayers: function(nbp) {
			if (this.newgameInfo.vid == 0)
				return false;
			const idxInVariants = variantArray.findIndex(v => v.id == this.newgameInfo.vid);
			return NbPlayers[variantArray[idxInVariants].name].includes(nbp);
		},
	},
});
