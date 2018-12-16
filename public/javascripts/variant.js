new Vue({
	el: "#variantPage",
	data: {
		display: "", //do not show anything...
		problem: undefined, //current problem in view
	},
	methods: {
		toggleDisplay: function(elt) {
			if (this.display == elt)
				this.display = ""; //hide
			else
				this.display = elt; //show
		},
		showProblem: function(problemTxt) {
			this.problem = JSON.parse(problemTxt);
			this.display = "game";
		},
	},
});
