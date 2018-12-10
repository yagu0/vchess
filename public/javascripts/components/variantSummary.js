// Show a variant summary on index
Vue.component('my-variant-summary', {
	props: ['vobj'],
	template: `
		<div class="variant col-sm-12" :id="vobj.name">
			<a :href="url">
				<h4 class="boxtitle text-center">
					{{ vobj.name }}
					<span class="count-players">
						/ {{ vobj.count }}
					</span>
				</h4>
				<p class="description text-center">
					{{ vobj.desc }}
				</p>
			</a>
		</div>
	`,
	computed: {
		url: function() {
			return "/" + this.vobj.name;
		},
	},
})
