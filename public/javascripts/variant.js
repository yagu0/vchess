new Vue({
	el: "#variantPage",
	data: { display: "" }, //do not show anything...
	// TODO: listen event "show problem", avec le probleme stringifié en arg
	// Alors: display=game, mode=friend, newGame(fen, turn, ...),
	//   et set Instructions+Soluce
	methods: {
		toggleDisplay: function(elt) {
			if (this.display == elt)
				this.display = ""; //hide
			else
				this.display = elt; //show
		},
	},
});
