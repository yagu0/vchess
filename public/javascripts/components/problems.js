Vue.component('my-problems', {
	data: function () {
		return {
			problems: problemArray, //initial value
			newProblem: {
				fen: "",
				instructions: "",
				solution: "",
				stage: "nothing", //or "preview" after new problem is filled
			},
		};
	},
	template: `
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<div id="problemControls" class="button-group">
				<button :aria-label='translate("Load previous problems")' class="tooltip"
						@click="fetchProblems('backward')">
					<i class="material-icons">skip_previous</i>
				</button>
				<button :aria-label='translate("Add a problem")' class="tooltip"
						@click="showNewproblemModal">
					{{ translate("New") }}
				</button>
				<button :aria-label='translate("Load next problems")' class="tooltip"
						@click="fetchProblems('forward')">
					<i class="material-icons">skip_next</i>
				</button>
			</div>
			<my-problem-summary v-on:show-problem="bubbleUp(p)"
				v-for="(p,idx) in sortedProblems"
				v-bind:prob="p" v-bind:preview="false" v-bind:key="idx">
			</my-problem-summary>
			<input type="checkbox" id="modal-newproblem" class="modal">
			<div role="dialog" aria-labelledby="newProblemTxt">
				<div v-show="newProblem.stage=='nothing'" class="card newproblem-form">
					<label for="modal-newproblem" class="modal-close"></label>
					<h3 id="newProblemTxt">{{ translate("Add a problem") }}</h3>
					<form @submit.prevent="previewNewProblem">
						<fieldset>
							<label for="newpbFen">FEN</label>
							<input id="newpbFen" type="text" v-model="newProblem.fen"
								:placeholder='translate("Full FEN description")'/>
						</fieldset>
						<fieldset>
							<p class="emphasis">{{ translate("Safe HTML tags allowed") }}</p>
							<label for="newpbInstructions">{{ translate("Instructions") }}</label>
							<textarea id="newpbInstructions" v-model="newProblem.instructions"
								:placeholder='translate("Describe the problem goal")'></textarea>
							<label for="newpbSolution">{{ translate("Solution") }}</label>
							<textarea id="newpbSolution" v-model="newProblem.solution"
								:placeholder='translate("How to solve the problem?")'></textarea>
							<button class="center-btn">{{ translate("Preview") }}</button>
						</fieldset>
					</form>
				</div>
				<div v-show="newProblem.stage=='preview'" class="card newproblem-preview">
					<label for="modal-newproblem" class="modal-close"></label>
					<my-problem-summary v-bind:prob="newProblem" v-bind:preview="true">
					</my-problem-summary>
					<div class="button-group">
						<button @click="newProblem.stage='nothing'">{{ translate("Cancel") }}</button>
						<button @click="sendNewProblem()">{{ translate("Send") }}</button>
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
	},
	methods: {
		translate: function(text) {
			return translations[text];
		},
		// Propagate "show problem" event to parent component (my-variant)
		bubbleUp: function(problem) {
			this.$emit('show-problem', JSON.stringify(problem));
		},
		fetchProblems: function(direction) {
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
				return alert(translations["Bad FEN description"]);
			if (this.newProblem.instructions.trim().length == 0)
				return alert(translations["Empty instructions"]);
			if (this.newProblem.solution.trim().length == 0)
				return alert(translations["Empty solution"]);
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
