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
					<p id="problem-instructions">
						{{ curProb.instructions }}
					</p>
				</div>
				<my-board :fen="curProb.fen"></my-board>
				<div id="solution-div" class="section-content">
					<h3 class="clickable" @click="showSolution = !showSolution">
						{{ translations["Show solution"] }}
					</h3>
					<p id="problem-solution" v-show="showSolution">
						{{ curProb.solution }}
					</p>
				</div>
			</div>
			<button v-if="!!userId" @click="toggleListDisplay()">
				<span>My problems (only)</span>
			</button>
			<my-problem-summary v-show="curIdx<0"
				v-for="(p,idx) in sortedProblems" @click="setCurIdx(idx)"
				v-bind:prob="p" v-bind:userid="userId" v-bind:key="p.id">
			</my-problem-summary>
			<input type="checkbox" id="modal-newproblem" class="modal"/>
			<div role="dialog" aria-labelledby="modalProblemTxt">
				<div v-show="!modalProb.preview" class="card newproblem-form">
					<label for="modal-newproblem" class="modal-close">
					</label>
					<h3 id="modalProblemTxt">
						{{ translate("Add a problem") }}
					</h3>
					<form @submit.prevent="previewProblem()">
						<fieldset>
							<label for="newpbFen">FEN</label>
							<input id="newpbFen" type="text" v-model="modalProb.fen"
								:placeholder='translate("Full FEN description")'/>
						</fieldset>
						<fieldset>
							<p class="emphasis">
								{{ translate("Safe HTML tags allowed") }}
							</p>
							<label for="newpbInstructions">
								{{ translate("Instructions") }}
							</label>
							<textarea id="newpbInstructions" v-model="modalProb.instructions"
								:placeholder='translate("Describe the problem goal")'>
							</textarea>
							<label for="newpbSolution">
								{{ translate("Solution") }}
							</label>
							<textarea id="newpbSolution" v-model="modalProb.solution"
								:placeholder='translate("How to solve the problem?")'>
							</textarea>
							<button class="center-btn">
								{{ translate("Preview") }}
							</button>
						</fieldset>
					</form>
				</div>
				<div v-show="modalProb.preview" class="card newproblem-preview">
					<label for="modal-newproblem" class="modal-close">
					</label>
					<my-problem-summary v-bind:prob="modalProb" v-bind:userid="userId">
					</my-problem-summary>
					<div class="button-group">
						<button @click="modalProb.preview=false">
							{{ translate("Cancel") }}
						</button>
						<button @click="sendProblem()">
							{{ translate("Send") }}
						</button>
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
			this.getOneProblem(location.hash.slice(1)); //callback?
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
		// TODO?: get 50 from server but only show 10 at a time (for example)
		showNext: function(direction) {
			if (this.curIdx < 0)
				return this.fetchProblems(direction);
			// Show next problem (older or newer):
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
				const newSize = curProbs.length;
				if (curSize == newSize) //no problems found
					return;
				switch (direction)
				{
					case "forward":
						this.setCurIdx(this.curIdx+1);
						break;
					case "backward":
						this.setCurIdx(newSize - curSize + this.curIdx-1);
						break;
				}
			}
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
		previewProblem: function() {
			if (!V.IsGoodFen(this.newProblem.fen))
				return alert(translations["Bad FEN description"]);
			if (this.newProblem.instructions.trim().length == 0)
				return alert(translations["Empty instructions"]);
			if (this.newProblem.solution.trim().length == 0)
				return alert(translations["Empty solution"]);
			this.modalProb.preview = true;
		},
		sendProblem: function() {
			// Send it to the server and close modal
			ajax(
				"/problems/" + variant.name, //TODO: with variant.id ?
				(this.modalProb.id > 0 ? "PUT" : "POST"),
				this.modalProb,
				response => {
					document.getElementById("modal-newproblem").checked = false;
					if (this.modalProb.id == 0)
					{
						this.modalProb.added = Date.now();
						this.modalProb.preview = false;
						this.curProblems().push(JSON.parse(JSON.stringify(this.modalProb)));
					}
					else
						this.modalProb.id = 0;
				}
			);
		},
		// TODO: catch signal edit or delete ; on edit: modify modalProb and show modal
		deleteProblem: function(pid) {
			// TODO: AJAX call
			// TODO: delete problem in curProblems() list
		},
	},
})
