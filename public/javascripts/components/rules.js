// Load rules on variant page
Vue.component('my-rules', {
	data: function() {
		return { content: "" };
	},
	template: `<div v-html="content" class="section-content"></div>`,
	mounted: function() {
		// AJAX request to get rules content (plain text, HTML)
		ajax("/rules/" + variant, "GET", response => {
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
			};
		},
	},
})
