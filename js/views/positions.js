/**
 * Positions View
 */

const PositionsView = {
    /**
     * Initialize positions view
     */
    init() {
        this.bindEvents();
        this.render();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const addBtn = document.getElementById('add-position-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }
    },

    /**
     * Render positions view
     */
    render() {
        const tbody = document.getElementById('positions-table-body');

        if (DataStore.positions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8">${Components.emptyState('No positions found', 'fa-briefcase')}</td></tr>`;
            return;
        }

        tbody.innerHTML = DataStore.positions
            .map(position => {
                const requiredTraining = DataStore.getRequiredTrainingForPosition(position.PositionID);
                const personnelCount = DataStore.getPersonnelByPosition(position.PositionID).length;
                const pattern = position.PatternID ? DataStore.rotationPatterns.find(p => p.PatternID === position.PatternID) : null;

                return `
                    <tr>
                        <td>${position.PositionID}</td>
                        <td><strong>${Utils.escapeHtml(position.PositionName || '')}</strong></td>
                        <td>${Utils.escapeHtml(position.Description || '')}</td>
                        <td>${position.MinStaffing || 1}</td>
                        <td>
                            ${pattern ?
                                `<span class="badge badge-info">${pattern.PatternName}</span>
                                 ${position.PatternStartDate ? `<br><small>Start: ${Utils.formatDate(position.PatternStartDate)}</small>` : ''}
                                 ${position.PatternOffset ? `<br><small>Offset: ${position.PatternOffset} days</small>` : ''}`
                                : '<span class="text-muted">None</span>'
                            }
                        </td>
                        <td>
                            ${requiredTraining.length > 0 ?
                                requiredTraining.map(t => `<span class="badge badge-secondary">${t.TrainingName || t.Name}</span>`).join(' ')
                                : '<span class="text-muted">None</span>'
                            }
                        </td>
                        <td><span class="badge badge-secondary">${personnelCount}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-icon" title="Assign Pattern" onclick="PositionsView.assignPattern('${position.PositionID}')">
                                    <i class="fas fa-calendar-alt"></i>
                                </button>
                                <button class="btn btn-sm btn-icon" title="Manage Training" onclick="PositionsView.manageTraining('${position.PositionID}')">
                                    <i class="fas fa-graduation-cap"></i>
                                </button>
                                <button class="btn btn-sm btn-icon" title="Edit" onclick="PositionsView.editPosition('${position.PositionID}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-icon btn-danger" title="Delete" onclick="PositionsView.deletePosition('${position.PositionID}')">
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
    showAddModal(positionId = null) {
        const position = positionId ? DataStore.getPosition(positionId) : null;
        const isEdit = !!position;

        // Build pattern options
        const patternOptions = [
            { value: '', label: 'None' },
            ...DataStore.rotationPatterns.map(p => ({ value: p.PatternID, label: p.PatternName }))
        ];

        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit' : 'Add'} Position</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="position-form">
                        ${Components.formField({ name: 'PositionID', label: 'Position ID', value: position?.PositionID, required: true, disabled: isEdit })}
                        ${Components.formField({ name: 'PositionName', label: 'Position Name', value: position?.PositionName, required: true })}
                        ${Components.formField({ type: 'textarea', name: 'Description', label: 'Description', value: position?.Description })}
                        ${Components.formField({ type: 'number', name: 'MinStaffing', label: 'Min Staffing', value: position?.MinStaffing || '1', required: true })}
                        ${Components.formField({ type: 'select', name: 'Active', label: 'Active', value: position?.Active || 'TRUE', required: true,
                            options: [{ value: 'TRUE', label: 'Active' }, { value: 'FALSE', label: 'Inactive' }] })}
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="PositionsView.savePosition(${isEdit})">
                        <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Add'} Position
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);
    },

    /**
     * Show pattern assignment modal
     */
    assignPattern(positionId) {
        const position = DataStore.getPosition(positionId);
        if (!position) return;

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
                <div class="modal-header">
                    <h3>Assign Rotation Pattern: ${position.PositionName}</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="pattern-form">
                        <input type="hidden" name="PositionID" value="${positionId}">

                        ${Components.formField({
                            type: 'select',
                            name: 'PatternID',
                            label: 'Rotation Pattern',
                            value: position.PatternID || '',
                            options: patternOptions
                        })}

                        ${Components.formField({
                            type: 'date',
                            name: 'PatternStartDate',
                            label: 'Pattern Start Date',
                            value: position.PatternStartDate || '',
                            help: 'The date when this pattern cycle begins (Day 1 of the pattern)'
                        })}

                        ${Components.formField({
                            type: 'number',
                            name: 'PatternOffset',
                            label: 'Pattern Offset (Days)',
                            value: position.PatternOffset || '0',
                            help: 'Number of days to offset this position within the pattern cycle. Use this to stagger teams through the rotation.'
                        })}
                    </form>

                    <div class="pattern-preview" id="pattern-preview">
                        <h4>Pattern Preview</h4>
                        <div id="pattern-preview-content">
                            <p class="text-muted">Select a pattern and start date to see preview</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="PositionsView.previewPattern()">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="PositionsView.savePatternAssignment()">
                        <i class="fas fa-save"></i> Save Pattern
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);
    },

    /**
     * Preview the pattern assignment
     */
    previewPattern() {
        const form = document.getElementById('pattern-form');
        const patternId = form.querySelector('[name="PatternID"]').value;
        const startDate = form.querySelector('[name="PatternStartDate"]').value;
        const offset = parseInt(form.querySelector('[name="PatternOffset"]').value) || 0;

        const previewContent = document.getElementById('pattern-preview-content');

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
     * Save pattern assignment
     */
    savePatternAssignment() {
        const form = document.getElementById('pattern-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const index = DataStore.positions.findIndex(p => p.PositionID === data.PositionID);
        if (index === -1) {
            Components.toast('Position not found', 'error');
            return;
        }

        // Update position with pattern info
        DataStore.positions[index] = {
            ...DataStore.positions[index],
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
     * Edit position
     */
    editPosition(positionId) {
        this.showAddModal(positionId);
    },

    /**
     * Save position
     */
    savePosition(isEdit) {
        const form = document.getElementById('position-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (isEdit) {
            const index = DataStore.positions.findIndex(p => p.PositionID === data.PositionID);
            if (index !== -1) {
                DataStore.positions[index] = { ...DataStore.positions[index], ...data };
            }
        } else {
            if (DataStore.positions.some(p => p.PositionID === data.PositionID)) {
                Components.toast('Position ID already exists', 'error');
                return;
            }
            data.TeamID = ''; // Not team-specific
            data.PatternID = '';
            data.PatternStartDate = '';
            data.PatternOffset = '0';
            DataStore.positions.push(data);
        }

        DataStore.saveToCache();
        Components.closeModal();
        this.render();
        Components.toast(`Position ${isEdit ? 'updated' : 'added'} successfully`, 'success');
    },

    /**
     * Delete position
     */
    async deletePosition(positionId) {
        const position = DataStore.getPosition(positionId);
        if (!position) return;

        const personnelCount = DataStore.getPersonnelByPosition(positionId).length;
        if (personnelCount > 0) {
            Components.toast(`Cannot delete position with ${personnelCount} assigned personnel`, 'error');
            return;
        }

        const confirmed = await Components.confirm(
            `Are you sure you want to delete the "${position.PositionName}" position?`,
            { title: 'Delete Position', danger: true, confirmText: 'Delete' }
        );

        if (confirmed) {
            DataStore.positions = DataStore.positions.filter(p => p.PositionID !== positionId);
            DataStore.positionTraining = DataStore.positionTraining.filter(pt => pt.PositionID !== positionId);
            DataStore.saveToCache();
            this.render();
            Components.toast('Position deleted successfully', 'success');
        }
    },

    /**
     * Manage training requirements for position
     */
    manageTraining(positionId) {
        const position = DataStore.getPosition(positionId);
        if (!position) return;

        const currentRequirements = DataStore.positionTraining.filter(pt => pt.PositionID === positionId);
        const currentTrainingIds = currentRequirements.map(pt => pt.TrainingID);

        const content = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>Training Requirements: ${position.PositionName}</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="text-muted">Select the training courses required for this position:</p>
                    <div class="training-checkboxes">
                        ${DataStore.trainingTypes.map(training => `
                            <label class="checkbox-item">
                                <input type="checkbox" name="training" value="${training.TrainingID}"
                                    ${currentTrainingIds.includes(training.TrainingID) ? 'checked' : ''}>
                                <span class="checkbox-label">
                                    <strong>${training.TrainingName || training.Name}</strong>
                                    <small>${training.Category} - ${training.ValidityMonths} months validity</small>
                                </span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="PositionsView.savePositionTraining('${positionId}')">
                        <i class="fas fa-save"></i> Save Requirements
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content, { size: 'modal-lg' });
    },

    /**
     * Save position training requirements
     */
    savePositionTraining(positionId) {
        const checkboxes = document.querySelectorAll('input[name="training"]:checked');
        const selectedTrainingIds = Array.from(checkboxes).map(cb => cb.value);

        // Remove existing requirements for this position
        DataStore.positionTraining = DataStore.positionTraining.filter(pt => pt.PositionID !== positionId);

        // Add new requirements
        selectedTrainingIds.forEach(trainingId => {
            DataStore.positionTraining.push({
                ID: Utils.generateId('PT'),
                PositionID: positionId,
                TrainingID: trainingId,
                Required: 'TRUE'
            });
        });

        DataStore.saveToCache();
        Components.closeModal();
        this.render();
        Components.toast('Training requirements updated successfully', 'success');
    }
};

// Make globally available
window.PositionsView = PositionsView;
