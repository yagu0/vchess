// Javascript for index page: mostly counters updating
new Vue({
	el: "#VueElement",
	data: {
		counts: {},
		curPrefix: "",
		conn: null,
		display: "variants",
	},
	computed: {
		sortedCounts: function () {
			const capitalizedPrefix = this.curPrefix.replace(/^\w/, c => c.toUpperCase());
			const variantsCounts = variantArray
			.filter( v => {
				return v.name.startsWith(capitalizedPrefix);
			})
			.map( v => {
				return {
					name: v.name,
					desc: v.description,
					count: this.counts[v.name] || 0,
				};
			});
			return variantsCounts.sort((a,b) => {
				if (a.count != b.count)
					return b.count - a.count;
				// Else, alphabetic ordering
				return a.name.localeCompare(b.name);
			});
		},
	},
	created: function() {
		const url = socketUrl;
		const sid = getRandString();
		this.conn = new WebSocket(url + "/?sid=" + sid + "&page=index");
		const socketMessageListener = msg => {
			const data = JSON.parse(msg.data);
			if (data.code == "counts")
				this.counts = data.counts;
			else if (data.code == "increase")
				this.counts[data.vname]++;
			else if (data.code == "decrease")
				this.counts[data.vname]--;
		};
		const socketCloseListener = () => {
			this.conn = new WebSocket(url + "/?sid=" + sid + "&page=index");
			this.conn.addEventListener('message', socketMessageListener);
			this.conn.addEventListener('close', socketCloseListener);
		};
		this.conn.onmessage = socketMessageListener;
		this.conn.onclose = socketCloseListener;

		// TODO: AJAX call get corr games (all variants)
		// si dernier lastMove sur serveur n'est pas le mien et nextColor == moi, alors background orange
		// ==> background orange si à moi de jouer par corr (sur main index)
		// (helper: static fonction "GetNextCol()" dans base_rules.js)
	},
});
