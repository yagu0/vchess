// Load rules on variant page
Vue.component('my-rules', {
	props: ["settings"],
	data: function() {
		return {
			content: "",
			display: "rules",
			mode: "computer",
			mycolor: "w",
			allowMovelist: true,
			fen: "",
		};
	},
	
	// TODO: third button "see a sample game" (comp VS comp)
	
	template: `
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<div class="button-group">
				<button @click="display='rules'">
					Read the rules
				</button>
				<button @click="startComputerGame()">
					Beat the computer!
				</button>
			</div>
			<div v-show="display=='rules'" v-html="content" class="section-content"></div>
			<my-game v-show="display=='computer'" :mycolor="mycolor" :settings="settings"
				:allow-movelist="allowMovelist" :mode="mode" :fen="fen">
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
		startComputerGame: function() {
			this.fen = V.GenRandInitFen();
			this.display = "computer";
		},
	},
})
