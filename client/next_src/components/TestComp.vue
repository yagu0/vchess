<template>
  <div class="test">
    <h3>Ecosystem</h3>
		<p>Test comp</p>
	</div>
</template>

<script>
export default {
  name: "HelloWorld",
  props: {
    vname: String
  },
	created: async function() {
		//console.log("@variants/" + this.vname + ".js");
		// En fait "V" est une variable globale, donc juste "V = vModule.V;"
		const vModule = await import("../variants/" + this.vname + ".js");
		const V = vModule.V;
		var instance = new V();
		instance.show();
		//import("/src/variants/" + this.vname + ".js")
		//	.then((V) => {
		//		console.log(V);
		//	});
		//console.log(this.$variants);

		// TODO: components which need to access user.name and user.id should
		// import a module with a function to get this from localStorage (or anonymous)
	},
	methods: {
		//...
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
