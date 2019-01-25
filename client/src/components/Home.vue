<template>
  <div class="hello">




//Index: rename into Home
				.row(v-show="display=='variants'")
					.col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
						label(for="prefixFilter") Type first letters...
						input#prefixFilter(v-model="curPrefix")
					my-variant-summary(v-for="(v,idx) in sortedCounts"





    <h1>{{ msg }}</h1>
    <p>
      For a guide and recipes on how to configure / customize this project,<br>
      check out the
      <a href="https://cli.vuejs.org" target="_blank" rel="noopener">vue-cli documentation</a>.
    </p>
    <h3>Installed CLI Plugins</h3>
    <ul>
      <li><a href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-eslint" target="_blank" rel="noopener">eslint</a></li>
    </ul>
    <h3>Essential Links</h3>
    <ul>
      <li><a href="https://vuejs.org" target="_blank" rel="noopener">Core Docs</a></li>
      <li><a href="https://forum.vuejs.org" target="_blank" rel="noopener">Forum</a></li>
      <li><a href="https://chat.vuejs.org" target="_blank" rel="noopener">Community Chat</a></li>
      <li><a href="https://twitter.com/vuejs" target="_blank" rel="noopener">Twitter</a></li>
      <li><a href="https://news.vuejs.org" target="_blank" rel="noopener">News</a></li>
    </ul>
    <h3>Ecosystem</h3>
    <ul>
      <li><a href="https://router.vuejs.org" target="_blank" rel="noopener">vue-router</a></li>
      <li><a href="https://vuex.vuejs.org" target="_blank" rel="noopener">vuex</a></li>
      <li><a href="https://github.com/vuejs/vue-devtools#vue-devtools" target="_blank" rel="noopener">vue-devtools</a></li>
      <li><a href="https://vue-loader.vuejs.org" target="_blank" rel="noopener">vue-loader</a></li>
      <li><a href="https://github.com/vuejs/awesome-vue" target="_blank" rel="noopener">awesome-vue</a></li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "HelloWorld",
  props: {
    msg: String
  },
//	created: function() {
//		alert("test");
//	},
	methods: {
		
	},
};
</script>








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
		this.setDisplay();
		window.onhashchange = this.setDisplay;
		
		const url = socketUrl;
		const sid = getRandString();
		this.conn = new WebSocket(url + "/?sid=" + sid + "&page=index");
		const socketMessageListener = msg => {
			const data = JSON.parse(msg.data);
			if (data.code == "counts")
				this.counts = data.counts;
			else if (data.code == "increase")
				this.counts[data.vid]++;
			else if (data.code == "decrease")
				this.counts[data.vid]--;
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
	methods: {
		setDisplay: function() {
			if (!location.hash)
				location.hash = "#variants"; //default
			this.display = location.hash.substr(1);
		},

	},
});








<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
