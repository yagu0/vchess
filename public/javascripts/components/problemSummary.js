// Show a problem summary on variant page
Vue.component('my-problem-summary', {
	props: ['prob'],
	template: `
		<div class="problem col-sm-12" @click="showProblem()">
			<div class="diagram" v-html="getDiagram(prob.fen)"></div>
			<div class="problem-instructions" v-html="prob.instructions.substr(0,32)"></div>
			<div class="problem-time">{{ timestamp2date(prob.added) }}</div>
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
		timestamp2date(ts) {
			return getDate(new Date(ts));
		},
		// Propagate "show problem" event to parent component (my-problems)
		showProblem: function() {
			this.$emit('show-problem');
		},
	},
})
