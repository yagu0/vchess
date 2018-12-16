Vue.component('my-problems', {
	data: function () {
		return {
			problems: problemArray //initial value
		};
	},
	template: `
		<div>
			<button @click="fetchProblems('backward')">Previous</button>
			<button @click="fetchProblems('forward')">Next</button>
			<button @click="showNewproblemModal">New</button>
			<my-problem-summary v-on:show-problem="bubbleUp(p)"
				v-for="(p,idx) in sortedProblems" v-bind:prob="p" v-bind:key="idx">
			</my-problem-summary>
			<input type="checkbox" id="modal-newproblem" class="modal">
			<div role="dialog" aria-labelledby="newProblemTxt">
				<div class="card newproblem">
					<label for="modal-newproblem" class="modal-close"></label>
					<h3 id="newProblemTxt">Add problem</h3>
					<form @submit.prevent="postNewProblem">
						<fieldset>
							<label for="newpbFen">Fen</label>
							<input type="text" id="newpbFen"
								placeholder="Position [+ flags [+ turn]]"/>
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
			return this.problems.sort((p1,p2) => { return p2.added - p1.added; });
		},
		mailErrProblem: function() {
			return "mailto:contact@vchess.club?subject=[" + variant + " problems] error";
		},
	},
	methods: {
		// Propagate "show problem" event to parent component (my-variant)
		bubbleUp: function(problem) {
			this.$emit('show-problem', JSON.stringify(problem));
		},
		fetchProblems: function(direction) {
			return; //TODO: re-activate after server side is implemented (see routes/all.js)
			if (this.problems.length == 0)
				return; //what could we do?!
			// Search for newest date (or oldest)
			let last_dt = this.problems[0].added;
			for (let i=0; i<this.problems.length; i++)
			{
				if ((direction == "forward" && this.problems[i].added > last_dt) ||
					(direction == "backward" && this.problems[i].added < last_dt))
				{
					last_dt = this.problems[i].added;
				}
			}
			ajax("/problems/" + variant, "GET", {
				direction: direction,
				last_dt: last_dt,
			}, response => {
				if (response.problems.length > 0)
					this.problems = response.problems;
			});
		},
		showNewproblemModal: function() {
			document.getElementById("modal-newproblem").checked = true;
		},
		postNewProblem: function() {
			const fen = document.getElementById("newpbFen").value;
			if (!V.IsGoodFen(fen))
				return alert("Bad FEN string");
			const instructions = document.getElementById("newpbInstructions").value;
			const solution = document.getElementById("newpbSolution").value;
			ajax("/problems/" + variant, "POST", {
				fen: fen,
				instructions: instructions,
				solution: solution,
			}, response => {
				document.getElementById("modal-newproblem").checked = false;
			});
		},
	},
})
