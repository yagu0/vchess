new Vue({
	el: "#variantPage",
	data: {
		display: "game", //default: play!
		problem: undefined, //current problem in view
	},
	methods: {
		showProblem: function(problemTxt) {
			this.problem = JSON.parse(problemTxt);
			this.display = "game";
		},
		setDisplay: function(elt) {
			this.display = elt;
			document.getElementById("drawer-control").checked = false;
		},
	},
});
