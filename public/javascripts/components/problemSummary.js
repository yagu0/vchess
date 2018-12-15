// Show a problem summary on variant page
Vue.component('my-problem-summary', {
	props: ['prob'],
	template: `
		<div class="problem col-sm-12" @click="showProblem()">
			<div class="diagram" v-html="getDiagram(prob.fen)"></div>
			<div class="problem-instructions" v-html="prob.instructions.substr(0,32)"></div>
			<div class="problem-time">{{ timestamp2datetime(prob.added) }}</div>
		</div>
	`,
	methods: {
		getDiagram: function(fen) {
			const fenParts = fen.split(" ");
			return getDiagram({
				position: fenParts[0],
				// No need for flags here
				turn: fenParts[2],
			});
		},
		timestamp2datetime(ts) {
			// TODO
			return ts;
		},
		showProblem: function() {
			alert("show problem");
			//..........
			//TODO: send event with object prob.fen, prob.instructions, prob.solution
			//Event should propagate to game, which set mode=="problem" + other variables
			//click on a problem ==> land on variant page with mode==friend, FEN prefilled... ok
			// click on problem ==> masque problems, affiche game tab, launch new game Friend with
			//   FEN + turn + flags + rappel instructions / solution on click sous l'échiquier
		},
	},
})
