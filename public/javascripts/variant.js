new Vue({
	el: "#VueElement",
	data: {
		display: "undefined", //default to main hall; see "created()" function
		gameid: "undefined", //...yet
	
		conn: null,

		// TEMPORARY: DEBUG
		mode: "analyze",
		orientation: "w",
		userColor: "w",
	},
	created: function() {
		// TODO: navigation becomes a little more complex
		const url = window.location.href;
		const hashPos = url.indexOf("#");
		const page = (hashPos >= 0 ? url.substr(hashPos+1) : "room");
		this.setDisplay(page);

		this.conn = new WebSocket(url + "/?sid=" + this.myid + "&page=" + variant._id);
		const socketCloseListener = () => {
			this.conn = new WebSocket(url + "/?sid=" + this.myid + "&page=" + variant._id);
		}
		this.conn.onclose = socketCloseListener;

		this.vr = new VariantRules( V.GenRandInitFen() );
	},
	methods: {
		setDisplay: function(elt) {
			this.display = elt;
			// Close menu on small screens:
			let menuToggle = document.getElementById("drawer-control");
			if (!!menuToggle)
				menuToggle.checked = false;
		},

		// TEMPORARY: DEBUG (duplicate code)
		play: function(move) {
			// Not programmatic, or animation is over
			if (!move.notation)
				move.notation = this.vr.getNotation(move);
			this.vr.play(move);
			if (!move.fen)
				move.fen = this.vr.getFen();
			if (this.sound == 2)
				new Audio("/sounds/move.mp3").play().catch(err => {});
			// Is opponent in check?
			this.incheck = this.vr.getCheckSquares(this.vr.turn);
			const score = this.vr.getCurrentScore();
		},
		undo: function(move) {
			this.vr.undo(move);
			if (this.sound == 2)
				new Audio("/sounds/undo.mp3").play().catch(err => {});
			this.incheck = this.vr.getCheckSquares(this.vr.turn);
		},
	},
});
		
//const continuation = (localStorage.getItem("variant") === variant.name);
//			if (continuation) //game VS human has priority
//				this.continueGame("human");

// TODO:
// si quand on arrive il y a une continuation "humaine" : display="game" et retour à la partie !
