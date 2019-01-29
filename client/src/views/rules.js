// Load rules on variant page
Vue.component('my-rules', {
	props: ["settings"],
	data: function() {
		return {
			content: "",
			display: "rules",
			mode: "computer",
			subMode: "", //'auto' for game CPU vs CPU
			gameInProgress: false,
			mycolor: "w",
			allowMovelist: true,
			fen: "",
		};
	},
	template: `
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<div class="button-group">
				<button @click="display='rules'">
					Read the rules
				</button>
				<button v-show="!gameInProgress" @click="watchComputerGame">
					Observe a sample game
				</button>
				<button v-show="!gameInProgress" @click="playAgainstComputer">
					Beat the computer!
				</button>
				<button v-show="gameInProgress" @click="stopGame">
					Stop game
				</button>
			</div>
			<div v-show="display=='rules'" v-html="content" class="section-content"></div>
			<my-game v-show="display=='computer'" :mycolor="mycolor" :settings="settings"
				:allow-movelist="allowMovelist" :mode="mode" :sub-mode="subMode" :fen="fen"
				@computer-think="gameInProgress=false" @game-over="stopGame">
			</my-game>
		</div>
	`,
	mounted: function() {
		// AJAX request to get rules content (plain text, HTML)
		ajax("/rules/" + variant.name, "GET", response => {
			let replaceByDiag = (match, p1, p2) => {
				const args = this.parseFen(p2);
				return getDiagram(args);
			};
			this.content = response.replace(/(fen:)([^:]*):/g, replaceByDiag);
		});
	},
	methods: {
		parseFen(fen) {
			const fenParts = fen.split(" ");
			return {
				position: fenParts[0],
				marks: fenParts[1],
				orientation: fenParts[2],
				shadow: fenParts[3],
			};
		},
		startGame: function() {
			if (this.gameInProgress)
				return;
			this.gameInProgress = true;
			this.mode = "computer";
			this.display = "computer";
			this.fen = V.GenRandInitFen();
		},
		stopGame: function() {
			this.gameInProgress = false;
			this.mode = "analyze";
		},
		playAgainstComputer: function() {
			this.subMode = "";
			this.startGame();
		},
		watchComputerGame: function() {
			this.subMode = "auto";
			this.startGame();
		},
	},
})
