Vue.component('my-problems', {
	props: ["queryHash","settings"],
	data: function () {
		return {
			userId: user.id,
			problems: [], //oldest first
			myProblems: [], //same, but only mine
			singletons: [], //requested problems (using #num)
			display: "others", //or "mine"
			curProb: null, //(reference to) current displayed problem (if any)
			showSolution: false,
			pbNum: 0, //to navigate directly to some problem
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
			<div id="mainBoard" v-show="!!curProb">
				<div id="instructions-div" class="section-content">
					<p id="problem-instructions">
						{{ curProb.instructions }}
					</p>
				</div>
				<my-game :fen="curProb.fen" :mode="analyze" :allowMovelist="true" :settings="settings">
				</my-board>
				<div id="solution-div" class="section-content">
					<h3 class="clickable" @click="showSolution = !showSolution">
						{{ translations["Show solution"] }}
					</h3>
					<p id="problem-solution" v-show="showSolution">
						{{ curProb.solution }}
					</p>
				</div>
				<button @click="displayList()">
					<span>Back to list display</span>
				</button>
			</div>
			<div>
				<input type="text" placeholder="Type problem number" v-model="pbNum"/>
				<button @click="showProblem()">
					<span>Show problem</span>
				</button>
			</div>
			<button v-if="!!userId" @click="toggleListDisplay()">
				<span>My problems (only)</span>
			</button>
			<my-problem-summary v-show="!curProb"
				v-on:edit-problem="editProblem(p)" v-on:delete-problem="deleteProblem(p.id)"
				v-for="p in curProblems" @click="curProb=p"
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
			<input id="modalNomore" type="checkbox" class="modal"/>
			<div role="dialog" aria-labelledby="nomoreMessage">
				<div class="card smallpad small-modal text-center">
					<label for="modalNomore" class="modal-close"></label>
					<h3 id="nomoreMessage" class="section">
						{{ nomoreMessage }}
					</h3>
				</div>
			</div>
		</div>
	`,
	watch: {
		queryHash: function(newQhash) {
			if (!!newQhash)
			{
				// New query hash = "id=42"; get 42 as problem ID
				const pid = parseInt(newQhash.substr(2));
				this.showProblem(pid);
			}
			else
				this.curProb = null; //(back to) list display
		},
	},
	created: function() {
		if (!!this.queryHash)
		{
			const pid = parseInt(this.queryHash.substr(2));
			this.showProblem(pid);
		}
		else
			this.firstFetch();
	},
	methods: {
		firstFetch: function() {
			// Fetch most recent problems from server, for both lists
			this.fetchProblems("others", "bacwkard");
			this.fetchProblems("mine", "bacwkard");
			this.listsInitialized = true;
		},
		showProblem: function(num) {
			const pid = num || this.pbNum;
			location.hash = "#" + pid;
			const pIdx = this.singletons.findIndex(p => p.id == pid);
			if (pIdx >= 0)
				curProb = this.singletons[pIdx];
			else
			{
				// Cannot find problem in current set; get from server, and add to singletons.
				ajax(
					"/problems/" + variant.name + "/" + pid, //TODO: use variant._id ?
					"GET",
					response => {
						if (!!response.problem)
						{
							this.singletons.push(response.problem);
							this.curProb = response.problem;
						}
						else
							this.noMoreProblems("Sorry, problem " + pid + " does not exist");
					}
				);
			}
		},
		translate: function(text) {
			return translations[text];
		},
		curProblems: function() {
			switch (this.display)
			{
				case "others":
					return this.problems;
				case "mine":
					return this.myProblems;
			}
		},
		// TODO?: get 50 from server but only show 10 at a time (for example)
		showNext: function(direction) {
			if (!this.curProb)
				return this.fetchProblems(this.display, direction);
			// Show next problem (older or newer):
			let curProbs = this.curProblems();
			// Try to find a neighbour problem in the direction, among current set
			const neighbor = this.findClosestNeighbor(this.curProb, curProbs, direction);
			if (!!neighbor)
			{
				this.curProb = neighbor;
				return;
			}
			// Boundary case: nothing in current set, need to fetch from server
			const curSize = curProbs.length;
			this.fetchProblems(this.display, direction);
			const newSize = curProbs.length;
			if (curSize == newSize) //no problems found
				return this.noMoreProblems("No more problems in this direction");
			// Ok, found something:
			this.curProb = this.findClosestNeighbor(this.curProb, curProbs, direction);
		},
		findClosestNeighbor: function(problem, probList, direction) {
			let neighbor = undefined;
			let smallestDistance = Number.MAX_SAFE_INTEGER;
			for (let prob of probList)
			{
				const delta = Math.abs(prob.id - problem.id);
				if (delta < smallestDistance &&
					((direction == "backward" && prob.id < problem.id)
					|| (direction == "forward" && prob.id > problem.id)))
				{
					neighbor = prob;
					smallestDistance = delta;
				}
			}
			return neighbor;
		},
		noMoreProblems: function(message) {
			this.nomoreMessage = message;
			let modalNomore = document.getElementById("modalNomore");
			modalNomore.checked = true;
			setTimeout(() => modalNomore.checked = false, 2000);
		},
		displayList: function() {
			this.curProb = null;
			location.hash = "";
			// Fetch problems if first call (if #num, and then lists)
			if (!this.listsInitialized)
				this.firstFetch();
		},
		toggleListDisplay: function() {
			this.display = (this.display == "others" ? "mine" : "others");
		},
		fetchProblems: function(type, direction) {
			let problems = (type == "others" ? this.problems : this.myProblems);
			let last_dt = (direction=="forward" ? 0 : Number.MAX_SAFE_INTEGER);
			if (this.problems.length > 0)
			{
				// Search for newest date (or oldest)
				last_dt = problems[0].added;
				for (let i=1; i<problems.length; i++)
				{
					if ((direction == "forward" && this.problems[i].added > last_dt) ||
						(direction == "backward" && this.problems[i].added < last_dt))
					{
						last_dt = this.problems[i].added;
					}
				}
			}
			ajax(
				"/problems/" + variant.id,
				"GET",
				{
					type: type,
					direction: direction,
					last_dt: last_dt,
				},
				response => {
					if (response.problems.length > 0)
					{
						Array.prototype.push.apply(problems,
							response.problems.sort((p1,p2) => { return p1.added - p2.added; }));
						// If one list is empty but not the other, show the non-empty
						const otherArray = (type == "mine" ? this.problems : this.myProblems);
						if (problems.length > 0 && otherArray.length == 0)
							this.display = type;
					}
				}
			);
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
		editProblem: function(prob) {
			this.modalProb = prob;
			document.getElementById("modal-newproblem").checked = true;
		},
		deleteProblem: function(pid) {
			ajax(
				"/problems/" + variant.id + "/" + pid,
				"DELETE",
				response => {
					// Delete problem from the list on client side
					let problems = this.curProblems();
					const pIdx = problems.findIndex(p => p.id == pid);
					problems.splice(pIdx, 1);
				}
			);
		},
		sendProblem: function() {
			// Send it to the server and close modal
			ajax(
				"/problems/" + variant.id,
				(this.modalProb.id > 0 ? "PUT" : "POST"),
				this.modalProb,
				response => {
					document.getElementById("modal-newproblem").checked = false;
					if (this.modalProb.id == 0)
					{
						this.modalProb.added = Date.now();
						this.modalProb.preview = false;
						this.myProblems.push(JSON.parse(JSON.stringify(this.modalProb)));
					}
					else
						this.modalProb.id = 0;
				}
			);
		},
	},
})
