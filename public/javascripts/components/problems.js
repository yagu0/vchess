Vue.component('my-problems', {
	data: function () {
		return {
			problems: problemArray, //initial value
			newProblem: {
				fen: V.GenRandInitFen(),
				instructions: "",
				solution: "",
				stage: "nothing", //or "preview" after new problem is filled
			},
		};
	},
	template: `
		<div>
			<button @click="fetchProblems('backward')">Previous</button>
			<button @click="fetchProblems('forward')">Next</button>
			<button @click="showNewproblemModal">New</button>
			<my-problem-summary v-on:show-problem="bubbleUp(p)"
				v-for="(p,idx) in sortedProblems"
				v-bind:prob="p" v-bind:preview="false" v-bind:key="idx">
			</my-problem-summary>
			<input type="checkbox" id="modal-newproblem" class="modal">
			<div role="dialog" aria-labelledby="newProblemTxt">
				<div v-show="newProblem.stage=='nothing'" class="card newproblem-form">
					<label for="modal-newproblem" class="modal-close"></label>
					<h3 id="newProblemTxt">Add problem</h3>
					<form @submit.prevent="previewNewProblem">
						<fieldset>
							<label for="newpbFen">Fen</label>
							<input id="newpbFen" type="text" v-model="newProblem.fen"/>
						</fieldset>
						<fieldset>
							<p class="emphasis">Safe HTML tags allowed</p>
							<label for="newpbInstructions">Instructions</label>
							<textarea id="newpbInstructions" v-model="newProblem.instructions"
								placeholder="Explain the problem here"></textarea>
							<label for="newpbSolution">Solution</label>
							<textarea id="newpbSolution" v-model="newProblem.solution"
								placeholder="How to solve the problem?"></textarea>
							<button class="center-btn">Preview</button>
						</fieldset>
					</form>
				</div>
				<div v-show="newProblem.stage=='preview'" class="card newproblem-preview">
					<label for="modal-newproblem" class="modal-close"></label>
					<my-problem-summary v-bind:prob="newProblem" v-bind:preview="true">
					</my-problem-summary>
					<div class="col-sm-12 col-md-6 col-lg-3 col-lg-offset-3 topspace">
						<button @click="sendNewProblem()">Send</button>
						<button @click="newProblem.stage='nothing'">Cancel</button>
					</div>
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
		previewNewProblem: function() {
			if (!V.IsGoodFen(this.newProblem.fen))
				return alert("Bad FEN string");
			this.newProblem.stage = "preview";
		},
		sendNewProblem: function() {
			// Send it to the server and close modal
			ajax("/problems/" + variant, "POST", {
				fen: this.newProblem.fen,
				instructions: this.newProblem.instructions,
				solution: this.newProblem.solution,
			}, response => {
				this.newProblem.added = Date.now();
				this.problems.push(JSON.parse(JSON.stringify(this.newProblem)));
				document.getElementById("modal-newproblem").checked = false;
				this.newProblem.stage = "nothing";
			});
		},
	},
})
