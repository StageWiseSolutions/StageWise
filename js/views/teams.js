/**
 * Teams View
 */

const TeamsView = {
    /**
     * Initialize teams view
     */
    init() {
        this.bindEvents();
        this.render();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const addBtn = document.getElementById('add-team-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }
    },

    /**
     * Render teams view
     */
    render() {
        const container = document.getElementById('teams-grid');

        if (DataStore.teams.length === 0) {
            container.innerHTML = Components.emptyState('No teams found', 'fa-users', {
                label: 'Add Team',
                handler: 'TeamsView.showAddModal()'
            });
            return;
        }

        container.innerHTML = DataStore.teams.map(team => Components.teamCard(team)).join('');
    },

    /**
     * View team members
     */
    viewTeam(teamId) {
        const team = DataStore.getTeam(teamId);
        if (!team) return;

        const personnel = DataStore.getPersonnelByTeam(teamId);

        const content = `
            <div class="modal-content modal-lg">
                <div class="modal-header" style="border-bottom-color: ${team.Color}">
                    <h3>
                        <span class="team-color-dot" style="background-color: ${team.Color}"></span>
                        ${team.TeamName} Members
                    </h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${personnel.length === 0 ? '<p class="no-data">No personnel assigned to this team</p>' : ''}
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Position</th>
                                <th>Status</th>
                                <th>Training</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${personnel.map(person => {
                                const position = DataStore.getPosition(person.PositionID);
                                const compliance = DataStore.getPersonTrainingCompliance(person.PersonID);
                                return `
                                    <tr>
                                        <td>
                                            <strong>${person.FirstName} ${person.LastName}</strong>
                                            <br><small>${person.EmployeeNumber}</small>
                                        </td>
                                        <td>${position?.Title || person.PositionID}</td>
                                        <td>${Components.statusBadge(person.Status)}</td>
                                        <td>${Components.trainingStatusCell(compliance)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Close</button>
                </div>
            </div>
        `;

        Components.openModal(content, { size: 'modal-lg' });
    },

    /**
     * Show add/edit modal
     */
    showAddModal(teamId = null) {
        const team = teamId ? DataStore.getTeam(teamId) : null;
        const isEdit = !!team;

        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit' : 'Add'} Team</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="team-form">
                        ${Components.formField({ name: 'TeamID', label: 'Team ID', value: team?.TeamID, required: true, disabled: isEdit })}
                        ${Components.formField({ name: 'TeamName', label: 'Team Name', value: team?.TeamName, required: true })}
                        ${Components.formField({ type: 'textarea', name: 'Description', label: 'Description', value: team?.Description })}
                        <div class="form-group">
                            <label for="Color">Team Color</label>
                            <input type="color" name="Color" id="Color" value="${team?.Color || '#4285f4'}" class="form-control-color">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="TeamsView.saveTeam(${isEdit})">
                        <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Add'} Team
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);
    },

    /**
     * Edit team
     */
    editTeam(teamId) {
        this.showAddModal(teamId);
    },

    /**
     * Save team
     */
    saveTeam(isEdit) {
        const form = document.getElementById('team-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (isEdit) {
            const index = DataStore.teams.findIndex(t => t.TeamID === data.TeamID);
            if (index !== -1) {
                DataStore.teams[index] = { ...DataStore.teams[index], ...data };
            }
        } else {
            // Check for duplicate ID
            if (DataStore.teams.some(t => t.TeamID === data.TeamID)) {
                Components.toast('Team ID already exists', 'error');
                return;
            }
            DataStore.teams.push(data);
        }

        DataStore.saveToCache();
        Components.closeModal();
        this.render();
        Components.toast(`Team ${isEdit ? 'updated' : 'added'} successfully`, 'success');
    }
};

// Make globally available
window.TeamsView = TeamsView;
