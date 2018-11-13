const url = socketUrl;
// random enough (TODO: function)
const sid = (Date.now().toString(36) + Math.random().toString(36).substr(2, 7)).toUpperCase();
const conn = new WebSocket(url + "/?sid=" + sid + "&page=index");

conn.onmessage = msg => {
	const data = JSON.parse(msg.data);
	if (data.code == "counts")
		//V.counts = data.counts;
		Vue.set(V, "counts", data.counts);
	else if (data.code == "increase")
		V.counts[data.vname]++;
	else if (data.code == "decrease")
		V.counts[data.vname]--;
}

let V = new Vue({
	el: "#indexPage",
	data: {
		counts: {},
		curPrefix: "",
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
	},
});
