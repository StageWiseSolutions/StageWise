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
     * Show pattern assignment modal for a team
     */
    assignPattern(teamId) {
        const team = DataStore.getTeam(teamId);
        if (!team) return;

        // Build pattern options
        const patternOptions = [
            { value: '', label: 'None (No automatic schedule)' },
            ...DataStore.rotationPatterns.map(p => ({
                value: p.PatternID,
                label: `${p.PatternName} (${p.CycleDays} day cycle)`
            }))
        ];

        const content = `
            <div class="modal-content">
                <div class="modal-header" style="border-bottom-color: ${team.Color}">
                    <h3>
                        <span class="team-color-dot" style="background-color: ${team.Color}"></span>
                        Assign Rotation Pattern: ${team.TeamName}
                    </h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="team-pattern-form">
                        <input type="hidden" name="TeamID" value="${teamId}">

                        ${Components.formField({
                            type: 'select',
                            name: 'PatternID',
                            label: 'Rotation Pattern',
                            value: team.PatternID || '',
                            options: patternOptions
                        })}

                        ${Components.formField({
                            type: 'date',
                            name: 'PatternStartDate',
                            label: 'Pattern Start Date',
                            value: team.PatternStartDate || '',
                            help: 'The reference date when Day 1 of the pattern cycle begins'
                        })}

                        ${Components.formField({
                            type: 'number',
                            name: 'PatternOffset',
                            label: 'Pattern Offset (Days)',
                            value: team.PatternOffset || '0',
                            help: 'Number of days to offset this team within the pattern cycle. Use this to stagger teams through the rotation.'
                        })}
                    </form>

                    <div class="pattern-preview" id="team-pattern-preview">
                        <h4>Pattern Preview</h4>
                        <div id="team-pattern-preview-content">
                            <p class="text-muted">Select a pattern and start date, then click Preview to see the schedule</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="TeamsView.previewTeamPattern()">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="TeamsView.saveTeamPattern()">
                        <i class="fas fa-save"></i> Save Pattern
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);
    },

    /**
     * Preview team pattern
     */
    previewTeamPattern() {
        const form = document.getElementById('team-pattern-form');
        const patternId = form.querySelector('[name="PatternID"]').value;
        const startDate = form.querySelector('[name="PatternStartDate"]').value;
        const offset = parseInt(form.querySelector('[name="PatternOffset"]').value) || 0;

        const previewContent = document.getElementById('team-pattern-preview-content');

        if (!patternId || !startDate) {
            previewContent.innerHTML = '<p class="text-muted">Select a pattern and start date to see preview</p>';
            return;
        }

        const pattern = DataStore.rotationPatterns.find(p => p.PatternID === patternId);
        if (!pattern) {
            previewContent.innerHTML = '<p class="text-danger">Pattern not found</p>';
            return;
        }

        const patternArray = pattern.Pattern.split(',');
        const cycleDays = parseInt(pattern.CycleDays) || patternArray.length;
        const patternStartDate = new Date(startDate);

        // Generate 14 days preview
        let html = '<div class="pattern-preview-days">';
        const today = new Date();

        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);

            // Calculate days since pattern start
            const daysSinceStart = Math.floor((date - patternStartDate) / (1000 * 60 * 60 * 24));
            const adjustedDay = daysSinceStart + offset;
            const patternIndex = ((adjustedDay % cycleDays) + cycleDays) % cycleDays;
            const shiftCode = patternArray[patternIndex] || 'O';

            const shiftType = shiftCode === 'D' ? 'Day' : (shiftCode === 'N' ? 'Night' : 'Off');
            const shiftClass = shiftCode === 'D' ? 'shift-day' : (shiftCode === 'N' ? 'shift-night' : 'shift-off');

            const isToday = date.toDateString() === today.toDateString();

            html += `
                <div class="preview-day ${isToday ? 'today' : ''}">
                    <div class="preview-date">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div class="preview-shift ${shiftClass}">${shiftType}</div>
                </div>
            `;
        }
        html += '</div>';

        html += `<p class="text-muted"><small>Pattern: ${pattern.PatternName} (${cycleDays} day cycle) - Offset: ${offset} days</small></p>`;

        previewContent.innerHTML = html;
    },

    /**
     * Save team pattern assignment
     */
    saveTeamPattern() {
        const form = document.getElementById('team-pattern-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const index = DataStore.teams.findIndex(t => t.TeamID === data.TeamID);
        if (index === -1) {
            Components.toast('Team not found', 'error');
            return;
        }

        // Update team with pattern info
        DataStore.teams[index] = {
            ...DataStore.teams[index],
            PatternID: data.PatternID || '',
            PatternStartDate: data.PatternStartDate || '',
            PatternOffset: data.PatternOffset || '0'
        };

        DataStore.saveToCache();
        Components.closeModal();
        this.render();
        Components.toast('Pattern assignment saved successfully', 'success');
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
            // Add default values for new team
            data.Active = 'TRUE';
            data.PatternID = '';
            data.PatternStartDate = '';
            data.PatternOffset = '0';
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
