<template>
  <div class="test">
    <TestComp :vname="variant.name"/>
  </div>
</template>

<script>
// @ is an alias to /src
import TestComp from "@/components/TestComp.vue";

export default {
  name: "test",
  components: {
    TestComp,
  },
	data: function() {
		return {
			variant: {name: "Atomic", id: 3},
		};
	}
};
</script>
