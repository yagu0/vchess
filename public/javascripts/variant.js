new Vue({
	el: "#variantPage",
	data: {
		display: "game", //default: play!
		problem: undefined, //current problem in view
	},
	created: function() {
		const url = window.location.href;
		const hashPos = url.indexOf("#");
		if (hashPos >= 0)
			this.setDisplay(url.substr(hashPos+1));
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
