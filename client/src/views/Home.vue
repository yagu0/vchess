<template lang="pug">
div
	.col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
		label(for="prefixFilter") Type first letters...
		input#prefixFilter(v-model="curPrefix")
	.variant.col-sm-12.col-md-5.col-lg-4(
		v-for="(v,idx) in sortedCounts"
		:class="{'col-md-offset-1': idx%2==0, 'col-lg-offset-2': idx%2==0}"
	)
		a(:href="v.name")
			h4.boxtitle.text-center {{ v.name }}
			span.count-players / {{ v.count }}
			p.description.text-center {{ $tr(v.desc) }}
</template>

<script>
export default {
  name: "home",
  data: function() {
    return {
      counts: {},
		  curPrefix: "",
    };
	},
	computed: {
		sortedCounts: function () {
			const capitalizedPrefix = this.curPrefix.replace(/^\w/, c => c.toUpperCase());
			const variantsCounts = this.$variants
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
			this.$conn.addEventListener('message', socketMessageListener);
			this.$conn.addEventListener('close', socketCloseListener);
		};
		this.$conn.onmessage = socketMessageListener;
		this.$conn.onclose = socketCloseListener;
		// TODO: AJAX call get corr games (all variants)
		// si dernier lastMove sur serveur n'est pas le mien et nextColor == moi, alors background orange
		// ==> background orange si à moi de jouer par corr (sur main index)
		// (helper: static fonction "GetNextCol()" dans base_rules.js)
	},
};
</script>

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
