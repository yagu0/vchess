// Show a variant summary on index
Vue.component('my-variant-summary', {
	props: ['vobj','index'],
	template: `
		<div class="variant col-sm-12 col-md-5 col-lg-4" :id="vobj.name"
			:class="{'col-md-offset-1': index%2==0, 'col-lg-offset-2': index%2==0}">
			<a :href="url">
				<h4 class="boxtitle text-center">
					{{ vobj.name }}
					<span class="count-players">
						/ {{ vobj.count }}
					</span>
				</h4>
				<p class="description text-center">
					{{ translate(vobj.desc) }}
				</p>
			</a>
		</div>
	`,
	computed: {
		url: function() {
			return "/" + this.vobj.name;
		},
	},
	methods: {
		translate: function(text) {
			return translations[text];
		},
	},
})
