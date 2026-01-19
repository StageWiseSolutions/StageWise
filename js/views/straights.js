/**
 * Straights Assignments View
 */

const StraightsView = {
    /**
     * Initialize straights view
     */
    init() {
        this.bindEvents();
        this.render();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const addBtn = document.getElementById('add-straights-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // Filters
        document.getElementById('straights-team-filter')?.addEventListener('change', () => this.render());
        document.getElementById('straights-status-filter')?.addEventListener('change', () => this.render());
    },

    /**
     * Render straights view
     */
    render() {
        // Populate team filter
        Components.populateTeamSelect('straights-team-filter', true);

        const teamFilter = document.getElementById('straights-team-filter')?.value || '';
        const statusFilter = document.getElementById('straights-status-filter')?.value || '';

        let assignments = [...DataStore.straighsAssignments];

        // Apply filters
        if (teamFilter) {
            assignments = assignments.filter(s => s.TeamID === teamFilter);
        }

        const today = new Date().toISOString().split('T')[0];

        if (statusFilter) {
            assignments = assignments.filter(s => {
                if (statusFilter === 'upcoming') return s.WeekStartDate > today;
                if (statusFilter === 'current') return s.WeekStartDate <= today && s.WeekEndDate >= today;
                if (statusFilter === 'past') return s.WeekEndDate < today;
                return true;
            });
        }

        // Sort by date (upcoming first)
        assignments.sort((a, b) => new Date(a.WeekStartDate) - new Date(b.WeekStartDate));

        const tbody = document.getElementById('straights-table-body');

        if (assignments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8">${Components.emptyState('No straights assignments found', 'fa-building')}</td></tr>`;
            return;
        }

        tbody.innerHTML = assignments.map(assignment => {
            const person = DataStore.getPerson(assignment.PersonID);
            const team = DataStore.getTeam(assignment.TeamID);

            // Determine status
            let status, statusClass;
            if (assignment.WeekEndDate < today) {
                status = 'Completed';
                statusClass = 'badge-secondary';
            } else if (assignment.WeekStartDate <= today && assignment.WeekEndDate >= today) {
                status = 'Active';
                statusClass = 'badge-success';
            } else {
                status = 'Upcoming';
                statusClass = 'badge-info';
            }

            const hours = `${Utils.formatTime(assignment.DailyStartTime)} - ${Utils.formatTime(assignment.DailyEndTime)}`;

            return `
                <tr>
                    <td>
                        <strong>${person?.FirstName} ${person?.LastName}</strong>
                        <br><small>${person?.EmployeeNumber}</small>
                    </td>
                    <td><span class="team-badge" style="background-color: ${team?.Color}">${team?.TeamName}</span></td>
                    <td>${Utils.formatDate(assignment.WeekStartDate)}</td>
                    <td>${Utils.formatDate(assignment.WeekEndDate)}</td>
                    <td>${assignment.Location || '-'}</td>
                    <td>${hours}</td>
                    <td><span class="badge ${statusClass}">${status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-icon" title="Edit" onclick="StraightsView.editStraights('${assignment.ID}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-icon btn-danger" title="Delete" onclick="StraightsView.deleteStraights('${assignment.ID}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Show add/edit modal
     */
    showAddModal(assignmentId = null) {
        const assignment = assignmentId ? DataStore.straighsAssignments.find(s => s.ID === assignmentId) : null;
        const isEdit = !!assignment;

        // Default to next Monday if adding new
        let defaultStart = '';
        let defaultEnd = '';

        if (!isEdit) {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
            const nextMonday = Utils.addDays(today, daysUntilMonday);
            const nextFriday = Utils.addDays(nextMonday, 4);
            defaultStart = nextMonday.toISOString().split('T')[0];
            defaultEnd = nextFriday.toISOString().split('T')[0];
        }

        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit' : 'Add'} Straights Assignment</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="straights-form">
                        <div class="form-group">
                            <label for="PersonID">Person <span class="required">*</span></label>
                            <select name="PersonID" id="PersonID" class="form-control" required ${isEdit ? 'disabled' : ''}>
                                <option value="">Select Person</option>
                            </select>
                        </div>

                        <div class="form-row">
                            ${Components.formField({ type: 'date', name: 'WeekStartDate', label: 'Week Start (Monday)', value: assignment?.WeekStartDate || defaultStart, required: true })}
                            ${Components.formField({ type: 'date', name: 'WeekEndDate', label: 'Week End (Friday)', value: assignment?.WeekEndDate || defaultEnd, required: true })}
                        </div>

                        ${Components.formField({ name: 'Location', label: 'Location', value: assignment?.Location || '', required: true, placeholder: 'e.g., Training Center, Main Office' })}

                        <div class="form-row">
                            <div class="form-group">
                                <label for="DailyStartTime">Daily Start Time</label>
                                <input type="time" name="DailyStartTime" id="DailyStartTime" class="form-control"
                                    value="${assignment?.DailyStartTime ? assignment.DailyStartTime.substring(0,2) + ':' + assignment.DailyStartTime.substring(2) : '07:00'}">
                            </div>
                            <div class="form-group">
                                <label for="DailyEndTime">Daily End Time</label>
                                <input type="time" name="DailyEndTime" id="DailyEndTime" class="form-control"
                                    value="${assignment?.DailyEndTime ? assignment.DailyEndTime.substring(0,2) + ':' + assignment.DailyEndTime.substring(2) : '15:00'}">
                            </div>
                        </div>

                        ${Components.formField({ type: 'textarea', name: 'Notes', label: 'Notes', value: assignment?.Notes || '' })}

                        <input type="hidden" name="ID" value="${assignment?.ID || ''}">
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="StraightsView.saveStraights(${isEdit})">
                        <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Add'} Assignment
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);

        // Populate personnel select
        Components.populatePersonnelSelect('PersonID', true, p => p.Status === 'Active');

        // Set selected value if editing
        if (isEdit) {
            document.getElementById('PersonID').value = assignment.PersonID;
        }
    },

    /**
     * Edit straights assignment
     */
    editStraights(assignmentId) {
        this.showAddModal(assignmentId);
    },

    /**
     * Save straights assignment
     */
    saveStraights(isEdit) {
        const form = document.getElementById('straights-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const person = DataStore.getPerson(formData.get('PersonID'));

        const data = {
            ID: formData.get('ID') || Utils.generateId('SA'),
            PersonID: formData.get('PersonID'),
            TeamID: person?.TeamID || '',
            WeekStartDate: formData.get('WeekStartDate'),
            WeekEndDate: formData.get('WeekEndDate'),
            Location: formData.get('Location'),
            DailyStartTime: formData.get('DailyStartTime').replace(':', ''),
            DailyEndTime: formData.get('DailyEndTime').replace(':', ''),
            Notes: formData.get('Notes')
        };

        // Validate dates
        const start = new Date(data.WeekStartDate);
        const end = new Date(data.WeekEndDate);

        if (start.getDay() !== 1) {
            Components.toast('Start date must be a Monday', 'error');
            return;
        }

        if (end.getDay() !== 5) {
            Components.toast('End date must be a Friday', 'error');
            return;
        }

        if (end < start) {
            Components.toast('End date must be after start date', 'error');
            return;
        }

        if (isEdit) {
            const index = DataStore.straighsAssignments.findIndex(s => s.ID === data.ID);
            if (index !== -1) {
                DataStore.straighsAssignments[index] = data;
            }
        } else {
            // Check for overlapping assignments
            const overlap = DataStore.straighsAssignments.some(s =>
                s.PersonID === data.PersonID &&
                s.ID !== data.ID &&
                !(s.WeekEndDate < data.WeekStartDate || s.WeekStartDate > data.WeekEndDate)
            );

            if (overlap) {
                Components.toast('This person already has a straights assignment during this period', 'error');
                return;
            }

            DataStore.straighsAssignments.push(data);
        }

        DataStore.saveToCache();
        Components.closeModal();
        this.render();
        Components.toast(`Straights assignment ${isEdit ? 'updated' : 'added'} successfully`, 'success');
    },

    /**
     * Delete straights assignment
     */
    async deleteStraights(assignmentId) {
        const assignment = DataStore.straighsAssignments.find(s => s.ID === assignmentId);
        if (!assignment) return;

        const person = DataStore.getPerson(assignment.PersonID);

        const confirmed = await Components.confirm(
            `Are you sure you want to delete the straights assignment for ${person?.FirstName} ${person?.LastName}?`,
            { title: 'Delete Straights Assignment', danger: true, confirmText: 'Delete' }
        );

        if (confirmed) {
            DataStore.straighsAssignments = DataStore.straighsAssignments.filter(s => s.ID !== assignmentId);
            DataStore.saveToCache();
            this.render();
            Components.toast('Straights assignment deleted', 'success');
        }
    }
};

// Make globally available
window.StraightsView = StraightsView;
