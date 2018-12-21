new Vue({
	el: "#variantPage",
	data: {
		display: "game", //default: play!
		problem: undefined, //current problem in view
	},
	methods: {
		toggleDisplay: function(elt) {
			this.display = elt; //show
		},
		showProblem: function(problemTxt) {
			this.problem = JSON.parse(problemTxt);
			this.display = "game";
		},
	},
});
