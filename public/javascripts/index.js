new Vue({
	el: "#indexPage",
	data: {
		counts: {},
		curPrefix: "",
		conn: null,
	},
	computed: {
		sortedCounts: function () {
			const variantsCounts = variantArray.map( v => {
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
	},
	mounted: function() {
		// Handle key stroke
		document.onkeydown = event => {
			// Is it Back or Esc? If yes, apply action on current word
			if (event.keyCode == 8) //Back
			{
				event.preventDefault();
				this.curPrefix = this.curPrefix.slice(0,-1);
			}
			else if (event.keyCode == 27) //Esc
			{
				event.preventDefault();
				this.curPrefix = "";
			}
			// Is it alphanumeric? If yes, stack it
			else if (_.range(48,58).includes(event.keyCode)
				|| _.range(65,91).includes(event.keyCode)
				|| _.range(97,123).includes(event.keyCode))
			{
				let newChar = String.fromCharCode(event.keyCode);
				this.curPrefix += this.curPrefix.length==0
					? newChar.toUpperCase()
					: newChar.toLowerCase();
			}
			// ...ignore everything else
		};
		// Show welcome dialog box if "first visit"
		const visited = getCookie("visited");
		if (!visited || visited !== "1")
			document.getElementById("modal-b4welcome").checked = true;
	},
	methods: {
		showWelcomeMsg: function() {
			document.getElementById("modal-b4welcome").checked = false;
			document.getElementById("modal-welcome").checked = true;
		},
	},
});
