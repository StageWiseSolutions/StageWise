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
            tbody.innerHTML = `<tr><td colspan="7">${Components.emptyState('No positions found', 'fa-briefcase')}</td></tr>`;
            return;
        }

        tbody.innerHTML = DataStore.positions
            .sort((a, b) => parseInt(a.Level) - parseInt(b.Level))
            .map(position => {
                const requiredTraining = DataStore.getRequiredTrainingForPosition(position.PositionID);
                const personnelCount = DataStore.getPersonnelByPosition(position.PositionID).length;

                return `
                    <tr>
                        <td>${position.PositionID}</td>
                        <td><strong>${Utils.escapeHtml(position.Title)}</strong></td>
                        <td>${position.Department}</td>
                        <td>${position.Level}</td>
                        <td>
                            ${requiredTraining.length > 0 ?
                                requiredTraining.map(t => `<span class="badge badge-info">${t.Name}</span>`).join(' ')
                                : '<span class="text-muted">None</span>'
                            }
                        </td>
                        <td><span class="badge badge-secondary">${personnelCount}</span></td>
                        <td>
                            <div class="action-buttons">
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

        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit' : 'Add'} Position</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="position-form">
                        ${Components.formField({ name: 'PositionID', label: 'Position ID', value: position?.PositionID, required: true, disabled: isEdit })}
                        ${Components.formField({ name: 'Title', label: 'Title', value: position?.Title, required: true })}
                        ${Components.formField({ type: 'textarea', name: 'Description', label: 'Description', value: position?.Description })}
                        ${Components.formField({ name: 'Department', label: 'Department', value: position?.Department || 'Operations' })}
                        ${Components.formField({ type: 'select', name: 'Level', label: 'Level', value: position?.Level || '1', required: true,
                            options: [1,2,3,4,5].map(l => ({ value: String(l), label: `Level ${l}` })) })}
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
            `Are you sure you want to delete the "${position.Title}" position?`,
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
                    <h3>Training Requirements: ${position.Title}</h3>
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
                                    <strong>${training.Name}</strong>
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
