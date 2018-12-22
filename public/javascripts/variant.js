new Vue({
	el: "#variantPage",
	data: {
		display: "play", //default: play!
		problem: undefined, //current problem in view
	},
	created: function() {
		const url = window.location.href;
		const hashPos = url.indexOf("#");
		console.log(hashPos + " " + url);
		if (hashPos >= 0)
			this.setDisplay(url.substr(hashPos+1));
	},
	methods: {
		showProblem: function(problemTxt) {
			this.problem = JSON.parse(problemTxt);
			this.display = "play";
		},
		setDisplay: function(elt) {
			this.display = elt;
			let menuToggle = document.getElementById("drawer-control");
			if (!!menuToggle)
				menuToggle.checked = false;
		},
	},
});
