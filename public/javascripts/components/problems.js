Vue.component('my-problems', {
	data: function () {
		return {
			problems: [], //oldest first
			curIdx: 0, //index in problems array
			stage: "nothing", //or "preview" after new problem is filled
			newProblem: {
				fen: "",
				instructions: "",
				solution: "",
			},
		};
	},
	template: `
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<div id="problemControls" class="button-group">
				<button :aria-label='translate("Load previous problem")' class="tooltip"
						@click="showPreviousProblem()">
					<i class="material-icons">skip_previous</i>
				</button>
				<button :aria-label='translate("Add a problem")' class="tooltip"
						@click="showNewproblemModal">
					{{ translate("New") }}
				</button>
				<button :aria-label='translate("Load next problem")' class="tooltip"
						@click="showNextProblem()">
					<i class="material-icons">skip_next</i>
				</button>
			</div>
		


			if (this.mode == "problem")
			{
				// Show problem instructions
				elementArray.push(
					h('div',
						{
							attrs: { id: "instructions-div" },
							"class": {
								"clearer": true,
								"section-content": true,
							},
						},
						[
							h('p',
								{
									attrs: { id: "problem-instructions" },
									domProps: { innerHTML: this.problem.instructions }
								}
							)
						]
					)
				);
			}


			// TODO ici :: instrus + diag interactif + solution
			my-board + pilotage via movesList + VariantRules !
			
			<my-problem-preview v-show="stage=='preview'"
				v-for="(p,idx) in problems"
				v-bind:prob="p" v-bind:preview="false" v-bind:key="idx">
			</my-problem-summary>
			if (this.mode == "problem")
			{
				// Show problem solution (on click)
				elementArray.push(
					h('div',
						{
							attrs: { id: "solution-div" },
							"class": { "section-content": true },
						},
						[
							h('h3',
								{
									"class": { clickable: true },
									domProps: { innerHTML: translations["Show solution"] },
									on: { click: this.toggleShowSolution },
								}
							),
							h('p',
								{
									attrs: { id: "problem-solution" },
									domProps: { innerHTML: this.problem.solution }
								}
							)
						]
					)
				);
			}
			
			<input type="checkbox" id="modal-newproblem" class="modal">
			<div role="dialog" aria-labelledby="newProblemTxt">
				<div v-show="stage=='nothing'" class="card newproblem-form">
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
				<div v-show="stage=='preview'" class="card newproblem-preview">
					<label for="modal-newproblem" class="modal-close"></label>
					<my-problem-preview v-bind:prob="newProblem"></my-problem-summary>
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
		},
	},
	created: function() {
		// Analyse URL: if a single problem required, show it. Otherwise,
		// TODO: fetch most recent problems from server
	},
	methods: {
		translate: function(text) {
			return translations[text];
		},
		// TODO: obsolete:
//		// Propagate "show problem" event to parent component (my-variant)
//		bubbleUp: function(problem) {
//			this.$emit('show-problem', JSON.stringify(problem));
//		},
		toggleShowSolution: function() {
			let problemSolution = document.getElementById("problem-solution");
			problemSolution.style.display =
				!problemSolution.style.display || problemSolution.style.display == "none"
					? "block"
					: "none";
		},
		showPreviousProblem: function() {
			if (this.curIdx == 0)
				this.fetchProblems("backward");
			else
				this.curIdx--;
		},
		showNextProblem: function() {
			if (this.curIdx == this.problems.length - 1)
				this.fetchProblems("forward");
			else
				this.curIdx++;
		},
		// TODO: modal "no more problems"
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
			ajax("/problems/" + variant.name, "GET", { //TODO: use variant._id ?
				direction: direction,
				last_dt: last_dt,
			}, response => {
				if (response.problems.length > 0)
				{
					this.problems = response.problems
						.sort((p1,p2) => { return p1.added - p2.added; });
					this.curIdx = response.problems.length - 1;
				}
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
			ajax("/problems/" + variant.name, "POST", { //TODO: with variant._id ?
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

// TODO:
// possibilité de supprimer / éditer si peer ID reconnu comme celui du probleme (champ "uploader")
// --> côté serveur on vérifie un certain "secret"
// --> filtre possible "mes problèmes"
