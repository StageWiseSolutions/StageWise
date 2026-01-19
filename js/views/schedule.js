/**
 * Schedule Views (Calendar, Team Schedule, Who's Working, Rotation Patterns)
 */

const ScheduleView = {
    currentMonth: new Date(),
    currentWeek: new Date(),

    /**
     * Initialize schedule views
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Calendar navigation
        document.getElementById('cal-prev-month')?.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('cal-next-month')?.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.renderCalendar();
        });

        document.getElementById('cal-today')?.addEventListener('click', () => {
            this.currentMonth = new Date();
            this.renderCalendar();
        });

        // Calendar team filter
        document.getElementById('calendar-team-filter')?.addEventListener('change', () => {
            this.renderCalendar();
        });

        // Week navigation
        document.getElementById('week-prev')?.addEventListener('click', () => {
            this.currentWeek = Utils.addDays(this.currentWeek, -7);
            this.renderTeamSchedule();
        });

        document.getElementById('week-next')?.addEventListener('click', () => {
            this.currentWeek = Utils.addDays(this.currentWeek, 7);
            this.renderTeamSchedule();
        });

        document.getElementById('week-current')?.addEventListener('click', () => {
            this.currentWeek = new Date();
            this.renderTeamSchedule();
        });

        // Team schedule filter
        document.getElementById('team-schedule-filter')?.addEventListener('change', () => {
            this.renderTeamSchedule();
        });

        // Who's working date
        document.getElementById('whos-working-date')?.addEventListener('change', () => {
            this.renderWhosWorking();
        });

        document.getElementById('whos-working-shift')?.addEventListener('change', () => {
            this.renderWhosWorking();
        });

        // Add pattern button
        document.getElementById('add-pattern-btn')?.addEventListener('click', () => {
            this.showAddPatternModal();
        });

        // Generate schedule button
        document.getElementById('generate-schedule-btn')?.addEventListener('click', () => {
            this.showGenerateScheduleModal();
        });
    },

    /**
     * Render calendar view
     */
    renderCalendar() {
        // Populate team filter
        Components.populateTeamSelect('calendar-team-filter', true);

        const teamFilter = document.getElementById('calendar-team-filter')?.value || '';

        // Update month label
        const monthLabel = document.getElementById('cal-current-month');
        monthLabel.textContent = this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Get calendar grid
        const grid = document.getElementById('calendar-grid');

        // Calculate calendar dates
        const firstDay = Utils.getMonthStart(this.currentMonth);
        const lastDay = Utils.getMonthEnd(this.currentMonth);
        const startDate = Utils.getWeekStart(firstDay);
        const endDate = Utils.getWeekEnd(lastDay);

        let html = '';
        let currentDate = new Date(startDate);
        const today = new Date().toISOString().split('T')[0];

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const isCurrentMonth = currentDate.getMonth() === this.currentMonth.getMonth();
            const isToday = dateStr === today;

            // Get schedule for this day
            let schedule = DataStore.getScheduleForDate(dateStr);
            if (teamFilter) {
                schedule = schedule.filter(s => s.TeamID === teamFilter);
            }

            // Count by shift type
            const dayCount = schedule.filter(s => s.ShiftType === 'Day').length;
            const nightCount = schedule.filter(s => s.ShiftType === 'Night').length;

            // Check for straights
            const straights = DataStore.straighsAssignments.filter(s =>
                s.WeekStartDate <= dateStr && s.WeekEndDate >= dateStr &&
                (!teamFilter || s.TeamID === teamFilter)
            );

            html += `
                <div class="calendar-day ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}"
                     data-date="${dateStr}"
                     onclick="ScheduleView.showDayDetail('${dateStr}')">
                    <div class="calendar-day-number">${currentDate.getDate()}</div>
                    <div class="calendar-day-content">
                        ${dayCount > 0 ? `<div class="shift-indicator shift-day">${dayCount} Day</div>` : ''}
                        ${nightCount > 0 ? `<div class="shift-indicator shift-night">${nightCount} Night</div>` : ''}
                        ${straights.length > 0 ? `<div class="shift-indicator shift-straights">${straights.length} Str</div>` : ''}
                    </div>
                </div>
            `;

            currentDate = Utils.addDays(currentDate, 1);
        }

        grid.innerHTML = html;
    },

    /**
     * Show day detail modal
     */
    showDayDetail(dateStr) {
        const schedule = DataStore.getScheduleForDate(dateStr);
        const straights = DataStore.straighsAssignments.filter(s =>
            s.WeekStartDate <= dateStr && s.WeekEndDate >= dateStr
        );

        // Group by shift type
        const byShift = Utils.groupBy(schedule, 'ShiftType');

        const content = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>Schedule for ${Utils.formatDate(dateStr, 'long')}</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="day-detail-grid">
                        <div class="shift-section">
                            <h4 class="shift-day"><i class="fas fa-sun"></i> Day Shift</h4>
                            ${(byShift['Day'] || []).length > 0 ?
                                `<ul class="shift-list">${(byShift['Day'] || []).map(s => {
                                    const person = DataStore.getPerson(s.PersonID);
                                    const team = DataStore.getTeam(s.TeamID);
                                    return `<li>
                                        <span class="person-name">${person?.FirstName} ${person?.LastName}</span>
                                        <span class="team-badge" style="background-color: ${team?.Color}">${team?.TeamName}</span>
                                    </li>`;
                                }).join('')}</ul>`
                                : '<p class="no-data">No one scheduled</p>'
                            }
                        </div>

                        <div class="shift-section">
                            <h4 class="shift-night"><i class="fas fa-moon"></i> Night Shift</h4>
                            ${(byShift['Night'] || []).length > 0 ?
                                `<ul class="shift-list">${(byShift['Night'] || []).map(s => {
                                    const person = DataStore.getPerson(s.PersonID);
                                    const team = DataStore.getTeam(s.TeamID);
                                    return `<li>
                                        <span class="person-name">${person?.FirstName} ${person?.LastName}</span>
                                        <span class="team-badge" style="background-color: ${team?.Color}">${team?.TeamName}</span>
                                    </li>`;
                                }).join('')}</ul>`
                                : '<p class="no-data">No one scheduled</p>'
                            }
                        </div>

                        <div class="shift-section">
                            <h4 class="shift-straights"><i class="fas fa-building"></i> Straights</h4>
                            ${straights.length > 0 ?
                                `<ul class="shift-list">${straights.map(s => {
                                    const person = DataStore.getPerson(s.PersonID);
                                    return `<li>
                                        <span class="person-name">${person?.FirstName} ${person?.LastName}</span>
                                        <span class="location">${s.Location}</span>
                                    </li>`;
                                }).join('')}</ul>`
                                : '<p class="no-data">No one on straights</p>'
                            }
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Close</button>
                </div>
            </div>
        `;

        Components.openModal(content, { size: 'modal-lg' });
    },

    /**
     * Render team schedule (weekly view)
     */
    renderTeamSchedule() {
        // Populate team filter
        Components.populateTeamSelect('team-schedule-filter', true);

        const teamFilter = document.getElementById('team-schedule-filter')?.value || '';
        const weekStart = Utils.getWeekStart(this.currentWeek);
        const weekEnd = Utils.getWeekEnd(this.currentWeek);

        // Update week label
        document.getElementById('week-label').textContent =
            `Week of ${Utils.formatDate(weekStart, 'short')}`;

        // Get days of the week
        const days = [];
        let currentDay = new Date(weekStart);
        for (let i = 0; i < 7; i++) {
            days.push(new Date(currentDay));
            currentDay = Utils.addDays(currentDay, 1);
        }

        // Build header
        const header = document.getElementById('team-schedule-header');
        header.innerHTML = `
            <tr>
                <th class="sticky-col">Name</th>
                <th>Team</th>
                ${days.map(d => `
                    <th class="${Utils.isToday(d) ? 'today' : ''}">
                        ${d.toLocaleDateString('en-US', { weekday: 'short' })}<br>
                        <small>${d.getMonth() + 1}/${d.getDate()}</small>
                    </th>
                `).join('')}
            </tr>
        `;

        // Get personnel
        let personnel = DataStore.personnel.filter(p => p.Status === 'Active');
        if (teamFilter) {
            personnel = personnel.filter(p => p.TeamID === teamFilter);
        }

        // Sort by team then name
        personnel.sort((a, b) => {
            if (a.TeamID !== b.TeamID) return a.TeamID.localeCompare(b.TeamID);
            return `${a.LastName} ${a.FirstName}`.localeCompare(`${b.LastName} ${b.FirstName}`);
        });

        // Build body
        const body = document.getElementById('team-schedule-body');

        if (personnel.length === 0) {
            body.innerHTML = `<tr><td colspan="${days.length + 2}">${Components.emptyState('No personnel found', 'fa-users')}</td></tr>`;
            return;
        }

        body.innerHTML = personnel.map(person => {
            const team = DataStore.getTeam(person.TeamID);
            const schedule = DataStore.getScheduleForPerson(
                person.PersonID,
                weekStart.toISOString().split('T')[0],
                weekEnd.toISOString().split('T')[0]
            );

            return `
                <tr>
                    <td class="sticky-col"><strong>${person.LastName}, ${person.FirstName}</strong></td>
                    <td><span class="team-badge-sm" style="background-color: ${team?.Color}">${team?.TeamName}</span></td>
                    ${days.map(d => {
                        const dateStr = d.toISOString().split('T')[0];
                        const daySchedule = schedule.find(s => s.Date === dateStr);

                        // Check for straights override
                        const straights = DataStore.straighsAssignments.find(s =>
                            s.PersonID === person.PersonID &&
                            s.WeekStartDate <= dateStr &&
                            s.WeekEndDate >= dateStr
                        );

                        if (straights) {
                            return `<td class="${Utils.isToday(d) ? 'today' : ''}">${Components.shiftCell('Straights', straights.DailyStartTime)}</td>`;
                        }

                        const shiftType = daySchedule?.ShiftType || 'Off';
                        const startTime = daySchedule?.StartTime || '';

                        return `<td class="${Utils.isToday(d) ? 'today' : ''}">${Components.shiftCell(shiftType, startTime)}</td>`;
                    }).join('')}
                </tr>
            `;
        }).join('');
    },

    /**
     * Render who's working view
     */
    renderWhosWorking() {
        const dateInput = document.getElementById('whos-working-date');
        const shiftFilter = document.getElementById('whos-working-shift')?.value || '';

        // Set default date to today
        if (!dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        const date = dateInput.value;
        let working = DataStore.getWhosWorking(date, shiftFilter || null);

        const container = document.getElementById('whos-working-grid');

        if (working.length === 0) {
            container.innerHTML = Components.emptyState('No one working', 'fa-user-clock');
            return;
        }

        // Group by team
        const byTeam = Utils.groupBy(working, 'TeamID');

        container.innerHTML = Object.entries(byTeam).map(([teamId, members]) => {
            const team = DataStore.getTeam(teamId);

            return `
                <div class="whos-working-team" style="border-left-color: ${team?.Color}">
                    <h3>
                        <span class="team-color-dot" style="background-color: ${team?.Color}"></span>
                        ${team?.TeamName}
                        <span class="badge badge-secondary">${members.length}</span>
                    </h3>
                    <div class="working-members">
                        ${members.map(m => {
                            const position = DataStore.getPosition(m.person?.PositionID);
                            return `
                                <div class="working-member">
                                    <div class="member-info">
                                        <strong>${m.person?.FirstName} ${m.person?.LastName}</strong>
                                        <small>${position?.Title || ''}</small>
                                    </div>
                                    <div class="member-shift">
                                        ${Components.shiftCell(m.ShiftType, m.StartTime)}
                                        ${m.Location ? `<small>${m.Location}</small>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render rotation patterns
     */
    renderRotationPatterns() {
        const container = document.getElementById('patterns-list');

        if (DataStore.rotationPatterns.length === 0) {
            container.innerHTML = Components.emptyState('No rotation patterns defined', 'fa-rotate', {
                label: 'Add Pattern',
                handler: 'ScheduleView.showAddPatternModal()'
            });
            return;
        }

        container.innerHTML = DataStore.rotationPatterns.map(pattern => {
            const patternArray = pattern.Pattern.split(',');

            return `
                <div class="pattern-card ${pattern.IsActive === 'TRUE' ? 'active' : ''}">
                    <div class="pattern-header">
                        <div>
                            <h3>${Utils.escapeHtml(pattern.Name)}</h3>
                            <p class="pattern-description">${Utils.escapeHtml(pattern.Description || '')}</p>
                        </div>
                        <div class="pattern-meta">
                            <span class="badge badge-info">${pattern.CycleDays} day cycle</span>
                            ${pattern.IsActive === 'TRUE' ? '<span class="badge badge-success">Active</span>' : ''}
                        </div>
                    </div>
                    <div class="pattern-preview">
                        <div class="pattern-days">
                            ${patternArray.map((day, i) => {
                                const shiftClass = day === 'D' ? 'shift-day' : (day === 'N' ? 'shift-night' : 'shift-off');
                                return `<div class="pattern-day ${shiftClass}" title="Day ${i + 1}">${day}</div>`;
                            }).join('')}
                        </div>
                    </div>
                    <div class="pattern-actions">
                        <button class="btn btn-sm btn-secondary" onclick="ScheduleView.editPattern('${pattern.PatternID}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        ${pattern.IsActive !== 'TRUE' ?
                            `<button class="btn btn-sm btn-success" onclick="ScheduleView.activatePattern('${pattern.PatternID}')">
                                <i class="fas fa-check"></i> Set Active
                            </button>` : ''
                        }
                        <button class="btn btn-sm btn-danger" onclick="ScheduleView.deletePattern('${pattern.PatternID}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Show add/edit pattern modal
     */
    showAddPatternModal(patternId = null) {
        const pattern = patternId ? DataStore.rotationPatterns.find(p => p.PatternID === patternId) : null;
        const isEdit = !!pattern;

        const content = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit' : 'Add'} Rotation Pattern</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="pattern-form">
                        <div class="form-row">
                            ${Components.formField({ name: 'PatternID', label: 'Pattern ID', value: pattern?.PatternID, required: true, disabled: isEdit })}
                            ${Components.formField({ name: 'Name', label: 'Pattern Name', value: pattern?.Name, required: true })}
                        </div>
                        ${Components.formField({ type: 'textarea', name: 'Description', label: 'Description', value: pattern?.Description })}
                        ${Components.formField({ type: 'number', name: 'CycleDays', label: 'Cycle Length (Days)', value: pattern?.CycleDays || '28', required: true })}

                        <div class="form-group">
                            <label>Pattern Definition</label>
                            <p class="help-text">Enter the pattern using D (Day), N (Night), O (Off) separated by commas.</p>
                            <textarea name="Pattern" id="Pattern" class="form-control pattern-input" rows="4" required
                                placeholder="D,D,D,D,O,O,O,N,N,N,N,O,O,O,D,D,D,O,O,O,O,N,N,N,O,O,O,O">${pattern?.Pattern || ''}</textarea>
                        </div>

                        <div class="pattern-preview-edit" id="pattern-preview-edit">
                            <!-- Preview generated by JS -->
                        </div>

                        <div class="form-group">
                            <label class="checkbox-item">
                                <input type="checkbox" name="IsActive" value="TRUE" ${pattern?.IsActive === 'TRUE' ? 'checked' : ''}>
                                <span>Set as active pattern</span>
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="ScheduleView.savePattern(${isEdit})">
                        <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Add'} Pattern
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content, { size: 'modal-lg' });

        // Add preview listener
        const patternInput = document.getElementById('Pattern');
        patternInput.addEventListener('input', () => this.updatePatternPreview());
        this.updatePatternPreview();
    },

    /**
     * Update pattern preview in modal
     */
    updatePatternPreview() {
        const input = document.getElementById('Pattern');
        const preview = document.getElementById('pattern-preview-edit');

        const patternArray = input.value.split(',').map(s => s.trim().toUpperCase());
        const valid = patternArray.every(d => ['D', 'N', 'O'].includes(d));

        if (!valid || patternArray.length === 0) {
            preview.innerHTML = '<p class="text-danger">Invalid pattern. Use D, N, or O separated by commas.</p>';
            return;
        }

        preview.innerHTML = `
            <div class="pattern-days">
                ${patternArray.map((day, i) => {
                    const shiftClass = day === 'D' ? 'shift-day' : (day === 'N' ? 'shift-night' : 'shift-off');
                    return `<div class="pattern-day ${shiftClass}" title="Day ${i + 1}">${day}</div>`;
                }).join('')}
            </div>
            <small>${patternArray.length} days in pattern</small>
        `;
    },

    /**
     * Edit pattern
     */
    editPattern(patternId) {
        this.showAddPatternModal(patternId);
    },

    /**
     * Save pattern
     */
    savePattern(isEdit) {
        const form = document.getElementById('pattern-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const data = {
            PatternID: formData.get('PatternID'),
            Name: formData.get('Name'),
            Description: formData.get('Description'),
            CycleDays: formData.get('CycleDays'),
            Pattern: formData.get('Pattern').split(',').map(s => s.trim().toUpperCase()).join(','),
            IsActive: formData.get('IsActive') || 'FALSE'
        };

        // Validate pattern
        const patternArray = data.Pattern.split(',');
        if (!patternArray.every(d => ['D', 'N', 'O'].includes(d))) {
            Components.toast('Invalid pattern. Use D, N, or O separated by commas.', 'error');
            return;
        }

        if (parseInt(data.CycleDays) !== patternArray.length) {
            Components.toast(`Cycle days (${data.CycleDays}) must match pattern length (${patternArray.length})`, 'error');
            return;
        }

        // If setting as active, deactivate others
        if (data.IsActive === 'TRUE') {
            DataStore.rotationPatterns.forEach(p => p.IsActive = 'FALSE');
        }

        if (isEdit) {
            const index = DataStore.rotationPatterns.findIndex(p => p.PatternID === data.PatternID);
            if (index !== -1) {
                DataStore.rotationPatterns[index] = data;
            }
        } else {
            if (DataStore.rotationPatterns.some(p => p.PatternID === data.PatternID)) {
                Components.toast('Pattern ID already exists', 'error');
                return;
            }
            DataStore.rotationPatterns.push(data);
        }

        DataStore.saveToCache();
        Components.closeModal();
        this.renderRotationPatterns();
        Components.toast(`Pattern ${isEdit ? 'updated' : 'added'} successfully`, 'success');
    },

    /**
     * Activate pattern
     */
    activatePattern(patternId) {
        DataStore.rotationPatterns.forEach(p => p.IsActive = p.PatternID === patternId ? 'TRUE' : 'FALSE');
        DataStore.saveToCache();
        this.renderRotationPatterns();
        Components.toast('Pattern activated', 'success');
    },

    /**
     * Delete pattern
     */
    async deletePattern(patternId) {
        const pattern = DataStore.rotationPatterns.find(p => p.PatternID === patternId);
        if (!pattern) return;

        const confirmed = await Components.confirm(
            `Are you sure you want to delete the "${pattern.Name}" pattern?`,
            { title: 'Delete Pattern', danger: true, confirmText: 'Delete' }
        );

        if (confirmed) {
            DataStore.rotationPatterns = DataStore.rotationPatterns.filter(p => p.PatternID !== patternId);
            DataStore.saveToCache();
            this.renderRotationPatterns();
            Components.toast('Pattern deleted', 'success');
        }
    },

    /**
     * Show generate schedule modal
     */
    showGenerateScheduleModal() {
        const activePattern = DataStore.rotationPatterns.find(p => p.IsActive === 'TRUE');

        if (!activePattern) {
            Components.toast('Please set an active rotation pattern first', 'error');
            return;
        }

        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Generate Schedule</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Generate schedule using: <strong>${activePattern.Name}</strong></p>

                    <form id="generate-schedule-form">
                        ${Components.formField({ type: 'date', name: 'StartDate', label: 'Start Date', value: new Date().toISOString().split('T')[0], required: true })}
                        ${Components.formField({ type: 'number', name: 'Days', label: 'Number of Days', value: '90', required: true })}
                        ${Components.formField({ type: 'date', name: 'PatternStartDate', label: 'Pattern Reference Date', value: '2024-01-01', required: true })}

                        <div class="form-group">
                            <label class="checkbox-item">
                                <input type="checkbox" name="OverwriteExisting" value="true">
                                <span>Overwrite existing schedule entries</span>
                            </label>
                        </div>
                    </form>

                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        This will generate schedule entries for all active personnel based on their team assignments.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="ScheduleView.generateSchedule()">
                        <i class="fas fa-calendar-plus"></i> Generate Schedule
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);
    },

    /**
     * Generate schedule
     */
    generateSchedule() {
        const form = document.getElementById('generate-schedule-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const startDate = new Date(formData.get('StartDate'));
        const days = parseInt(formData.get('Days'));
        const patternStartDate = new Date(formData.get('PatternStartDate'));
        const overwrite = formData.get('OverwriteExisting') === 'true';

        const activePattern = DataStore.rotationPatterns.find(p => p.IsActive === 'TRUE');
        if (!activePattern) {
            Components.toast('No active pattern found', 'error');
            return;
        }

        Components.showLoading('Generating schedule...');

        // Get active personnel
        const personnel = DataStore.personnel.filter(p => p.Status === 'Active');
        const newSchedule = [];

        personnel.forEach(person => {
            const teamIndex = parseInt(person.TeamID.replace('T', '')) - 1;
            const offset = Utils.getTeamPatternOffset(teamIndex, 5, parseInt(activePattern.CycleDays));

            for (let day = 0; day < days; day++) {
                const date = Utils.addDays(startDate, day);
                const dateStr = date.toISOString().split('T')[0];

                // Check if entry exists
                const existingIndex = DataStore.shiftSchedule.findIndex(
                    s => s.PersonID === person.PersonID && s.Date === dateStr
                );

                if (existingIndex !== -1 && !overwrite) {
                    continue; // Skip existing entry
                }

                const shiftType = Utils.getShiftFromPattern(date, patternStartDate, activePattern.Pattern, offset);

                let startTime = '';
                let endTime = '';

                if (shiftType === 'Day') {
                    startTime = CONFIG.SHIFTS.DAY.START.replace(':', '');
                    endTime = CONFIG.SHIFTS.DAY.END.replace(':', '');
                } else if (shiftType === 'Night') {
                    startTime = CONFIG.SHIFTS.NIGHT.START.replace(':', '');
                    endTime = CONFIG.SHIFTS.NIGHT.END.replace(':', '');
                }

                const entry = {
                    ID: Utils.generateId('SS'),
                    PersonID: person.PersonID,
                    TeamID: person.TeamID,
                    Date: dateStr,
                    ShiftType: shiftType,
                    StartTime: startTime,
                    EndTime: endTime,
                    Location: 'Main Plant',
                    IsOverride: 'FALSE',
                    Notes: ''
                };

                if (existingIndex !== -1) {
                    DataStore.shiftSchedule[existingIndex] = entry;
                } else {
                    newSchedule.push(entry);
                }
            }
        });

        // Add new entries
        DataStore.shiftSchedule.push(...newSchedule);
        DataStore.saveToCache();

        Components.hideLoading();
        Components.closeModal();
        Components.toast(`Generated ${newSchedule.length} schedule entries`, 'success');

        // Refresh views
        this.renderCalendar();
        this.renderTeamSchedule();
    }
};

// Make globally available
window.ScheduleView = ScheduleView;
