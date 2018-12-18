new Vue({
	el: "#variantPage",
	data: {
		display: getCookie("display-"+variant,""), //default: do not show anything...
		problem: undefined, //current problem in view
	},
	methods: {
		toggleDisplay: function(elt) {
			if (this.display == elt)
			{
				this.display = ""; //hide
				setCookie("display-"+variant, "");
			}
			else
			{
				this.display = elt; //show
				setCookie("display-"+variant, elt);
			}
		},
		showProblem: function(problemTxt) {
			this.problem = JSON.parse(problemTxt);
			this.display = "game";
		},
	},
});
