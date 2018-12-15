Vue.component('my-problems', {
	data: function () {
		return {
			problems: problemArray //initial value
		};
	},
	template: `
		<div>
			<button>Previous</button>
			<button>Next</button>
			<button @click="showNewproblemModal">New</button>
			<my-problem-summary
				v-for="(p,idx) in sortedProblems",
				v-bind:prob="p",
				v-bind:key="idx",
				@click="showProblem(p)"
			</my-problem-summary>
			<input type="checkbox" id="modal-newproblem" class="modal">
			<div role="dialog" aria-labelledby="newProblemTxt">
				<div class="card newproblem">
					<label for="modal-newproblem" class="modal-close"></label>
					<h3 id="newProblemTxt">Add problem</h3>
					<form @submit.prevent="postNewProblem">
						<fieldset>
							<label for="newpbFen">Fen</label>
							<input type="text" id="newpbFen" placeholder="Position [+ flags [+ turn]]"/>
						</fieldset>
						<fieldset>
							<p class="emphasis">
								Allowed HTML tags:
								&lt;p&gt;,&lt;br&gt;,&lt,ul&gt;,&lt;ol&gt;,&lt;li&gt;
							</p>
							<label for="newpbInstructions">Instructions</label>
							<textarea id="newpbInstructions" placeholder="Explain the problem here"/>
							<label for="newpbSolution">Solution</label>
							<textarea id="newpbSolution" placeholder="How to solve the problem?"/>
							<button class="center-btn">Send</button>
						</fieldset>
						<p class="mistake-newproblem">
							Note: if you made a mistake, please let me know at
							<a :href="mailErrProblem">contact@vchess.club</a>
						</p>
					</form>
				</div>
			</div>
		</div>
	`,
	computed: {
		sortedProblems: function() {
			// Newest problem first
			return problems.sort((p1,p2) => { return p2.added - p1.added; });
		},
		mailErrProblem: function() {
			return "mailto:contact@vchess.club?subject=[" + variant + " problems] error";
		},
	},
	methods: {
		fetchProblems: function(direction) {
			// TODO: ajax call return list of max 10 problems
			// Do not do anything if no older problems (and store this result in cache!)
			// TODO: ajax call return list of max 10 problems
			// Do not do anything if no newer problems
		},
		showProblem: function(prob) {
			//TODO: send event with object prob.fen, prob.instructions, prob.solution
			//Event should propagate to game, which set mode=="problem" + other variables
			//click on a problem ==> land on variant page with mode==friend, FEN prefilled... ok
			// click on problem ==> masque problems, affiche game tab, launch new game Friend with
			//   FEN + turn + flags + rappel instructions / solution on click sous l'échiquier
		},
		showNewproblemModal: function() {
			document.getElementById("modal-newproblem").checked = true;
		},
		postNewProblem: function() {
			const fen = document.getElementById("newpbFen").value;
			const instructions = document.getElementById("newpbInstructions").value;
			const solution = document.getElementById("newpbSolution").value;
			
		},
	},
})
