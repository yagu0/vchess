Vue.component('my-problems', {
	data: function () {
		return {
			userId: user.id,
			problems: [], //oldest first
			myProblems: [], //same, but only mine
			display: "list", //or "myList"
			curIdx: -1, //index in (current) problems array
			showSolution: false,
			// New problem (to upload), or existing problem to edit:
			modalProb: {
				id: 0, //defined if it's an edit
				fen: "",
				instructions: "",
				solution: "",
				preview: false,
			},
		};
	},
	// TODO: problem edit, just fill modalProb + adjust AJAX call
	// problem delete: just AJAX call + confirm
	template: `
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<div id="problemControls" class="button-group">
				<button :aria-label='translate("Previous problem(s)")' class="tooltip" @click="showNext('backward')">
					<i class="material-icons">skip_previous</i>
				</button>
				<button :aria-label='translate("Add a problem")' class="tooltip" onClick="doClick('modal-newproblem')">
					{{ translate("New") }}
				</button>
				<button :aria-label='translate("Next problem(s)")' class="tooltip" @click="showNext('forward')">
					<i class="material-icons">skip_next</i>
				</button>
			</div>
			<div id="mainBoard" v-show="curIdx>=0">
				<div id="instructions-div" class="section-content">
					<p id="problem-instructions">{{ curProb.instructions }}</p>
				</div>
				<my-board :fen="curProb.fen"></my-board>
				<div id="solution-div" class="section-content">
					<h3 class="clickable" @click="showSolution = !showSolution">
						{{ translations["Show solution"] }}
					</h3>
					<p id="problem-solution" v-show="showSolution">{{ curProb.solution }}</p>
					<div class="button-group" v-show="curProb.uid==userId">
						<button>Edit</button>
						<button>Delete</button>
					</div>
				</div>
			</div>
			<button v-if="!!userId" @click="toggleListDisplay()">My problems (only)</button>
			<my-problem-summary v-show="curIdx<0"
				v-for="(p,idx) in sortedProblems" @click="setCurIdx(idx)"
				v-bind:prob="p" v-bind:preview="false" v-bind:key="p.id">
			</my-problem-summary>
			<input type="checkbox" id="modal-newproblem" class="modal">
			<div role="dialog" aria-labelledby="modalProblemTxt">
				<div v-show="!modalProb.preview" class="card newproblem-form">
					<label for="modal-newproblem" class="modal-close"></label>
					<h3 id="modalProblemTxt">{{ translate("Add a problem") }}</h3>
					<form @submit.prevent="previewNewProblem()">
						<fieldset>
							<label for="newpbFen">FEN</label>
							<input id="newpbFen" type="text" v-model="modalProb.fen"
								:placeholder='translate("Full FEN description")'/>
						</fieldset>
						<fieldset>
							<p class="emphasis">{{ translate("Safe HTML tags allowed") }}</p>
							<label for="newpbInstructions">{{ translate("Instructions") }}</label>
							<textarea id="newpbInstructions" v-model="modalProb.instructions"
								:placeholder='translate("Describe the problem goal")'></textarea>
							<label for="newpbSolution">{{ translate("Solution") }}</label>
							<textarea id="newpbSolution" v-model="modalProb.solution"
								:placeholder='translate("How to solve the problem?")'></textarea>
							<button class="center-btn">{{ translate("Preview") }}</button>
						</fieldset>
					</form>
				</div>
				<div v-show="modalProb.preview" class="card newproblem-preview">
					<label for="modal-newproblem" class="modal-close"></label>
					<my-problem-summary v-bind:prob="modalProb" v-bind:preview="true"></my-problem-summary>
					<div class="button-group">
						<button @click="modalProb.preview=false">{{ translate("Cancel") }}</button>
						<button @click="sendNewProblem()">{{ translate("Send") }}</button>
					</div>
				</div>
			</div>
		</div>
	`,
	computed: {
		sortedProblems: function() {
			// Newest problem first
			return this.curProblems.sort((a,b) => a.added - b.added);
		},
		curProb: function() {
			switch (this.display)
			{
				case "list":
					return this.problems[this.curIdx];
				case "myList":
					return this.myProblems[this.curIdx];
			}
		},
	},
	created: function() {
		if (location.hash.length > 0)
		{
			this.getOneProblem(location.hash.slice(1));
			this.curIdx = 0; //TODO: a bit more subtle, depending if it's my problem or not (set display)
		}
		else
		{
			// Fetch most recent problems from server
			this.fetchProblems("backward"); //TODO: backward in time from the future. Second argument?
		}
	},
	methods: {
		setCurIndex: function(idx) {
			this.curIdx = idx;
			location.hash = "#" + idx;
		},
		translate: function(text) {
			return translations[text];
		},
		curProblems: function() {
			switch (this.display)
			{
				case "list":
					return this.problems;
				case "myList":
					return this.myProblems;
			}
		},
		// TODO: dans tous les cas si on n'affiche qu'un seul problème,
		// le curseur ne doit se déplacer que d'une unité.
		showNext: function(direction) {
			if (this.curIdx < 0)
				this.fetchProblems(direction);
			let curProbs = this.curProblems();
			if ((this.curIdx > 0 && direction=="backward")
				|| (this.curIdx < curProbs.length-1 && direction=="forward"))
			{
				this.setCurIdx(this.curIdx + (direction=="forward" ? 1 : -1));
			}
			else //at boundary
			{
				const curSize = curProbs.length;
				this.fetchProblems(direction);
				if (curProbs.length
			}
			else
				this.setCurIndex(--this.curIdx);
			
			
			if (this.curIdx == this.problems.length - 1)
				this.fetchProblems("forward");
			else
				this.curIdx++;
			location.hash = this.curIdx;
		},
		toggleListDisplay: function() {
			this.display = (this.display == "list" ? "myList" : "list");
		},
		// TODO: modal "there are no more problems"
		fetchProblems: function(direction) {
			const problems = if ... this.problems ... ou this.myProblems;
			if (this.problems.length == 0)
				return; //what could we do?! -------> ask problems older than MAX_NUMBER + backward
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
					this.setCurIndex(response.problems.length - 1);
				}
			});
		},
		previewNewProblem: function() {
			if (!V.IsGoodFen(this.newProblem.fen))
				return alert(translations["Bad FEN description"]);
			if (this.newProblem.instructions.trim().length == 0)
				return alert(translations["Empty instructions"]);
			if (this.newProblem.solution.trim().length == 0)
				return alert(translations["Empty solution"]);
			this.modalProb.preview = true;
		},
		// TODO: adjust for update too
		sendNewProblem: function() {
			// Send it to the server and close modal
			ajax("/problems/" + variant.name, "POST", { //TODO: with variant._id ?
				fen: this.newProblem.fen,
				instructions: this.newProblem.instructions,
				solution: this.newProblem.solution,
			}, response => {
				this.modalProb.added = Date.now();
				this.curProblems().push(JSON.parse(JSON.stringify(this.modalProb)));
				document.getElementById("modal-newproblem").checked = false;
				this.modalProb.preview = false;
			});
		},
		// TODO: AJAX for problem deletion
	},
})
