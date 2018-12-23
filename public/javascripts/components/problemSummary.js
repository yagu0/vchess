// Show a problem summary on variant page or new problem preview
Vue.component('my-problem-summary', {
	props: ['prob','preview'],
	template: `
		<div class="row problem">
			<div class="col-sm-12 col-md-6 diagram"
				v-html="getDiagram(prob.fen)">
			</div>
			<div class="col-sm-12 col-md-6">
				<p v-html="prob.instructions"></p>
				<p v-if="preview" v-html="prob.solution"></p>
				<p v-else class="problem-time">{{ timestamp2date(prob.added) }}</p>
				<button v-if="!preview" @click="showProblem()">{{ translate("Solve") }}</button>
			</div>
		</div>
	`,
	methods: {
		translate: function(text) {
			return translations[text];
		},
		getDiagram: function(fen) {
			const fenParsed = V.ParseFen(fen);
			return getDiagram({
				position: fenParsed.position,
				turn: fenParsed.turn,
				// No need for flags here
			});
		},
		timestamp2date(ts) {
			return getDate(new Date(ts));
		},
		// Propagate "show problem" event to parent component (my-problems)
		showProblem: function() {
			this.$emit('show-problem');
		},
	},
})
