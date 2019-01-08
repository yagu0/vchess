// Preview a problem on variant page
Vue.component('my-problem-preview', {
	props: ['prob'],
	template: `
		<div class="row problem">
			<div class="col-sm-12 col-md-6 diagram"
				v-html="getDiagram(prob.fen)">
			</div>
			<div class="col-sm-12 col-md-6">
				<p v-html="prob.instructions"></p>
				<p v-html="prob.solution"></p>
			</div>
		</div>
	`,
	methods: {
		getDiagram: function(fen) {
			const fenParsed = V.ParseFen(fen);
			return getDiagram({
				position: fenParsed.position,
				turn: fenParsed.turn,
				// No need for flags here
			});
		},
	},
})
