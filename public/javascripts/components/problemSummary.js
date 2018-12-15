// Show a problem summary on variant page
Vue.component('my-problem-summary', {
	props: ['prob'],
	template: `
		<div class="problem col-sm-12">
			<div class="diagram">
				{{ getDiagram(prob.fen) }}
			</div>
			<div class="problem-instructions">
				{{ prob.instructions.substr(0,32) }}
			</div>
			<div class="problem-time">
				{{ prob.added }}
			</div>
		</div>
	`,
})
