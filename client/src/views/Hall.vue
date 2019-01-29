<template>
  <div class="home">
    <Home msg="Welcome to Your Vue.js Apppp"/>
  </div>
</template>

<script>
// @ is an alias to /src
import HelloWorld from "@/components/HelloWorld.vue";

export default {
  name: "home",
  components: {
    HelloWorld,
  }
};
</script>

// main playing hall: chat + online players + current challenges + button "new game"
// TODO: my-challenge-list, gérant clicks sur challenges, affichage, réception/émission des infos sur challenges ; de même, my-player-list
// TODO: si on est en train de jouer une partie, le notifier aux nouveaux connectés
/*
TODO: surligner si nouveau défi perso et pas affichage courant
(cadences base + incrément, corr == incr >= 1jour ou base >= 7j)
--> correspondance: stocker sur serveur lastMove + uid + color + movesCount + gameId + variant + timeleft
fin de partie corr: supprimer partie du serveur au bout de 7 jours (arbitraire)
main time should be positive (no 0+2 & cie...)
*/
// TODO: au moins l'échange des coups en P2P ?
// TODO: objet game, objet challenge ? et player ?
Vue.component('my-room', {
	props: ["conn","settings"],
	data: function () {
		return {
			gdisplay: "live",
			user: user,
			liveGames: [],
			corrGames: [],
			players: [], //online players
			challenges: [], //live challenges
			people: [], //people who connect to this room (or disconnect)
		};
	},
	// Modal new game, and then sub-components
	template: `
		<div>
			<input id="modalNewgame" type="checkbox" class="modal"/>
			<div role="dialog" aria-labelledby="titleFenedit">
				<div class="card smallpad">
					<label id="closeNewgame" for="modalNewgame" class="modal-close">
					</label>
					<h3 id="titleFenedit" class="section">
						{{ translate("Game state (FEN):") }}
					</h3>
					<input id="input-fen" type="text"/>
					<p>TODO: cadence, adversaire (pre-filled if click on name)</p>
					<p>cadence 2m+12s ou 7d+1d (m,s ou d,d) --> main, increment</p>
					<p>Note: leave FEN blank for random; FEN only for targeted challenge</p>
					<button @click="newGame">Launch game</button>
				</div>
			</div>
			<div>
				<my-chat :conn="conn" :myname="user.name" :people="people"></my-chat>
				<my-challenge-list :challenges="challenges" @click-challenge="clickChallenge">
				</my-challenge-list>
			</div>
			<button onClick="doClick('modalNewgame')">New game</button>
			<div>
				<div style="border:1px solid black">
					<h3>Online players</h3>
					<div v-for="p in players" @click="challenge(p)">
						{{ p.name }}
					</div>
				</div>
				<div class="button-group">
					<button @click="gdisplay='live'">Live games</button>
					<button @click="gdisplay='corr'">Correspondance games</button>
				</div>
				<my-game-list v-show="gdisplay=='live'" :games="liveGames"
					@show-game="showGame">
				</my-game-list>
				<my-game-list v-show="gdisplay=='corr'" :games="corrGames"
					@show-game="showGame">
				</my-game-list>
			</div>
		</div>
	`,
	created: function() {
		// TODO: ask server for current corr games (all but mines: names, ID, time control)
		const socketMessageListener = msg => {
			const data = JSON.parse(msg.data);
			switch (data.code)
			{
				case "newgame":
					// TODO: new game just started: data contain all informations
					// (id, players, time control, fenStart ...)
					break;
				// TODO: also receive live games summaries (update)
				// (just players names, time control, and ID + player ID)
				case "acceptchallenge":
					// oppid: opponent socket ID (or DB id if registered)
					if (true) //TODO: if challenge is full
						this.newGame(data.challenge, data.user); //user.id et user.name
					break;
				case "withdrawchallenge":
					// TODO
					break;
				case "cancelchallenge":
					// TODO
					break;
				// TODO: distinguish these (dis)connect events from their analogs in game.js
				case "connect":
					this.players.push({name:data.name, id:data.uid});
					break;
				case "disconnect":
					const pIdx = this.players.findIndex(p => p.id == data.uid);
					this.players.splice(pIdx);
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
		translate: translate,
		showGame: function(game) {
			let hash = "#game?id=" + game.id;
			if (!!game.uid)
				hash += "&uid=" + game.uid;
			location.hash = hash;
		},
		challenge: function(player) {
			this.conn.send(JSON.stringify({code:"sendchallenge", oppid:p.id,
				user:{name:user.name,id:user.id}}));
		},
		clickChallenge: function(challenge) {
			const index = this.challenges.findIndex(c => c.id == challenge.id);
			const toIdx = challenge.to.findIndex(p => p.id == user.id);
			const me = {name:user.name,id:user.id};
			if (toIdx >= 0)
			{
				// It's a multiplayer challenge I accepted: withdraw
				this.conn.send(JSON.stringify({code:"withdrawchallenge",
					cid:challenge.id, user:me}));
				this.challenges.to.splice(toIdx, 1);
			}
			else if (challenge.from.id == user.id) //it's my challenge: cancel it
			{
				this.conn.send(JSON.stringify({code:"cancelchallenge", cid:challenge.id}));
				this.challenges.splice(index, 1);
			}
			else //accept a challenge
			{
				this.conn.send(JSON.stringify({code:"acceptchallenge",
					cid:challenge.id, user:me}));
				this.challenges[index].to.push(me);
			}
		},
		// user: last person to accept the challenge
		newGame: function(chall, user) {
			const fen = chall.fen || V.GenRandInitFen();
			const game = {}; //TODO: fen, players, time ...
			//setStorage(game); //TODO
			game.players.forEach(p => {
				this.conn.send(
					JSON.stringify({code:"newgame", oppid:p.id, game:game}));
			});
			if (this.settings.sound >= 1)
				new Audio("/sounds/newgame.mp3").play().catch(err => {});
		},
	},
});
