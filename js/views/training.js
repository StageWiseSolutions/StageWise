/**
 * Training Views (Overview, Types, Matrix, Expiring)
 */

const TrainingView = {
    /**
     * Initialize training views
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Training types add button
        const addBtn = document.getElementById('add-training-type-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddTrainingTypeModal());
        }

        // Expiring days filter
        const expiringFilter = document.getElementById('expiring-days-filter');
        if (expiringFilter) {
            expiringFilter.addEventListener('change', () => this.renderExpiringTraining());
        }

        // Matrix team filter
        const matrixFilter = document.getElementById('matrix-team-filter');
        if (matrixFilter) {
            matrixFilter.addEventListener('change', () => this.renderTrainingMatrix());
        }

        // Export matrix button
        const exportBtn = document.getElementById('export-matrix-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportMatrix());
        }
    },

    /**
     * Render training overview
     */
    renderOverview() {
        this.updateOverviewStats();
        this.renderComplianceByTeam();
    },

    /**
     * Update overview stats
     */
    updateOverviewStats() {
        let current = 0, expiring = 0, expired = 0, missing = 0;

        DataStore.personnel.filter(p => p.Status === 'Active').forEach(person => {
            const compliance = DataStore.getPersonTrainingCompliance(person.PersonID);
            current += compliance.current;
            expiring += compliance.expiring;
            expired += compliance.expired;
            missing += compliance.missing;
        });

        document.getElementById('stat-training-current').textContent = current;
        document.getElementById('stat-training-expiring').textContent = expiring;
        document.getElementById('stat-training-expired').textContent = expired;
        document.getElementById('stat-training-missing').textContent = missing;
    },

    /**
     * Render compliance by team
     */
    renderComplianceByTeam() {
        const container = document.getElementById('training-by-team');

        container.innerHTML = DataStore.teams.map(team => {
            const personnel = DataStore.getPersonnelByTeam(team.TeamID).filter(p => p.Status === 'Active');
            if (personnel.length === 0) return '';

            let totalRequired = 0, totalCompliant = 0;

            personnel.forEach(person => {
                const compliance = DataStore.getPersonTrainingCompliance(person.PersonID);
                totalRequired += compliance.total;
                totalCompliant += compliance.current;
            });

            const percentage = totalRequired > 0 ? Math.round((totalCompliant / totalRequired) * 100) : 100;

            return `
                <div class="compliance-bar-row">
                    <div class="compliance-label">
                        <span class="team-name">${team.TeamName}</span>
                        <span class="compliance-value">${percentage}%</span>
                    </div>
                    <div class="compliance-bar">
                        <div class="compliance-fill" style="width: ${percentage}%; background-color: ${team.Color}"></div>
                    </div>
                    <div class="compliance-details">
                        <small>${totalCompliant} / ${totalRequired} training items current</small>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render training types
     */
    renderTrainingTypes() {
        const tbody = document.getElementById('training-types-table-body');

        if (DataStore.trainingTypes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">${Components.emptyState('No training types found', 'fa-graduation-cap')}</td></tr>`;
            return;
        }

        tbody.innerHTML = DataStore.trainingTypes.map(training => {
            const requiredBy = DataStore.positionTraining.filter(pt => pt.TrainingID === training.TrainingID);
            const positions = requiredBy.map(pt => DataStore.getPositionTitle(pt.PositionID));
            const trainingName = training.TrainingName || training.Name || '';

            return `
                <tr>
                    <td>${training.TrainingID}</td>
                    <td><strong>${Utils.escapeHtml(trainingName)}</strong></td>
                    <td><span class="badge badge-secondary">${training.Category}</span></td>
                    <td>${training.ValidityMonths} months</td>
                    <td>${positions.length > 0 ? positions.join(', ') : '<span class="text-muted">None</span>'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-icon" title="Edit" onclick="TrainingView.editTrainingType('${training.TrainingID}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-icon btn-danger" title="Delete" onclick="TrainingView.deleteTrainingType('${training.TrainingID}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Show add/edit training type modal
     */
    showAddTrainingTypeModal(trainingId = null) {
        const training = trainingId ? DataStore.getTrainingType(trainingId) : null;
        const isEdit = !!training;
        const trainingName = training ? (training.TrainingName || training.Name || '') : '';

        const categoryOptions = CONFIG.TRAINING.CATEGORIES.map(c => ({ value: c, label: c }));

        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit' : 'Add'} Training Type</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="training-type-form">
                        ${Components.formField({ name: 'TrainingID', label: 'Training ID', value: training?.TrainingID, required: true, disabled: isEdit })}
                        ${Components.formField({ name: 'TrainingName', label: 'Training Name', value: trainingName, required: true })}
                        ${Components.formField({ type: 'textarea', name: 'Description', label: 'Description', value: training?.Description })}
                        ${Components.formField({ type: 'select', name: 'Category', label: 'Category', value: training?.Category || 'Safety', required: true, options: categoryOptions })}
                        ${Components.formField({ type: 'number', name: 'ValidityMonths', label: 'Validity (Months)', value: training?.ValidityMonths || '12', required: true })}
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="TrainingView.saveTrainingType(${isEdit})">
                        <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Add'} Training Type
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);
    },

    /**
     * Edit training type
     */
    editTrainingType(trainingId) {
        this.showAddTrainingTypeModal(trainingId);
    },

    /**
     * Save training type
     */
    saveTrainingType(isEdit) {
        const form = document.getElementById('training-type-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (isEdit) {
            const index = DataStore.trainingTypes.findIndex(t => t.TrainingID === data.TrainingID);
            if (index !== -1) {
                DataStore.trainingTypes[index] = { ...DataStore.trainingTypes[index], ...data };
            }
        } else {
            if (DataStore.trainingTypes.some(t => t.TrainingID === data.TrainingID)) {
                Components.toast('Training ID already exists', 'error');
                return;
            }
            DataStore.trainingTypes.push(data);
        }

        DataStore.saveToCache();
        Components.closeModal();
        this.renderTrainingTypes();
        Components.toast(`Training type ${isEdit ? 'updated' : 'added'} successfully`, 'success');
    },

    /**
     * Delete training type
     */
    async deleteTrainingType(trainingId) {
        const training = DataStore.getTrainingType(trainingId);
        if (!training) return;

        const confirmed = await Components.confirm(
            `Are you sure you want to delete "${training.TrainingName || training.Name}"?`,
            { title: 'Delete Training Type', danger: true, confirmText: 'Delete' }
        );

        if (confirmed) {
            DataStore.trainingTypes = DataStore.trainingTypes.filter(t => t.TrainingID !== trainingId);
            DataStore.positionTraining = DataStore.positionTraining.filter(pt => pt.TrainingID !== trainingId);
            DataStore.personnelTraining = DataStore.personnelTraining.filter(pt => pt.TrainingID !== trainingId);
            DataStore.saveToCache();
            this.renderTrainingTypes();
            Components.toast('Training type deleted successfully', 'success');
        }
    },

    /**
     * Render training matrix
     */
    renderTrainingMatrix() {
        const teamFilter = document.getElementById('matrix-team-filter')?.value || '';

        // Populate team filter if needed
        Components.populateTeamSelect('matrix-team-filter', true);

        let personnel = DataStore.personnel.filter(p => p.Status === 'Active');
        if (teamFilter) {
            personnel = personnel.filter(p => p.TeamID === teamFilter);
        }

        const trainings = DataStore.trainingTypes;

        // Build header
        const header = document.getElementById('training-matrix-header');
        header.innerHTML = `
            <tr>
                <th class="sticky-col">Name</th>
                <th>Team</th>
                <th>Position</th>
                ${trainings.map(t => `<th class="rotate"><div>${Utils.escapeHtml(t.TrainingName || t.Name || '')}</div></th>`).join('')}
            </tr>
        `;

        // Build body
        const body = document.getElementById('training-matrix-body');

        if (personnel.length === 0) {
            body.innerHTML = `<tr><td colspan="${trainings.length + 3}">${Components.emptyState('No personnel found', 'fa-users')}</td></tr>`;
            return;
        }

        body.innerHTML = personnel
            .sort((a, b) => `${a.LastName} ${a.FirstName}`.localeCompare(`${b.LastName} ${b.FirstName}`))
            .map(person => {
                const team = DataStore.getTeam(person.TeamID);
                const position = DataStore.getPosition(person.PositionID);
                const records = DataStore.getPersonTrainingRecords(person.PersonID);
                const requiredTrainingIds = DataStore.positionTraining
                    .filter(pt => pt.PositionID === person.PositionID)
                    .map(pt => pt.TrainingID);

                return `
                    <tr>
                        <td class="sticky-col">
                            <strong>${person.LastName}, ${person.FirstName}</strong>
                        </td>
                        <td><span class="team-badge-sm" style="background-color: ${team?.Color}">${team?.TeamName}</span></td>
                        <td>${position?.Title || ''}</td>
                        ${trainings.map(training => {
                            const isRequired = requiredTrainingIds.includes(training.TrainingID);
                            const record = records.find(r => r.TrainingID === training.TrainingID);

                            if (!isRequired) {
                                return '<td class="matrix-cell matrix-na"><i class="fas fa-minus"></i></td>';
                            }

                            if (!record) {
                                return '<td class="matrix-cell matrix-missing" title="Missing"><i class="fas fa-times"></i></td>';
                            }

                            const status = Utils.getTrainingStatus(record.ExpirationDate);
                            const statusClass = status === 'current' ? 'matrix-current' :
                                               (status === 'expiring' ? 'matrix-expiring' : 'matrix-expired');
                            const icon = status === 'current' ? 'fa-check' :
                                        (status === 'expiring' ? 'fa-exclamation' : 'fa-times');

                            return `<td class="matrix-cell ${statusClass}" title="${Utils.formatDate(record.ExpirationDate)}">
                                <i class="fas ${icon}"></i>
                            </td>`;
                        }).join('')}
                    </tr>
                `;
            }).join('');
    },

    /**
     * Render expiring training
     */
    renderExpiringTraining() {
        const days = parseInt(document.getElementById('expiring-days-filter')?.value || '30');
        const expiring = DataStore.getExpiringTraining(days);

        const tbody = document.getElementById('expiring-training-table-body');

        if (expiring.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">
                <div class="no-alerts">
                    <i class="fas fa-check-circle text-success"></i>
                    <span>No training expiring in the next ${days} days</span>
                </div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = expiring.map(item => {
            const team = DataStore.getTeam(item.person?.TeamID);
            const urgencyClass = item.daysRemaining <= 7 ? 'text-danger' : (item.daysRemaining <= 14 ? 'text-warning' : '');

            return `
                <tr class="${urgencyClass}">
                    <td>
                        <strong>${item.person?.FirstName} ${item.person?.LastName}</strong>
                        <br><small>${item.person?.EmployeeNumber}</small>
                    </td>
                    <td><span class="team-badge" style="background-color: ${team?.Color}">${team?.TeamName}</span></td>
                    <td>${item.training?.TrainingName || item.training?.Name}</td>
                    <td>${Utils.formatDate(item.ExpirationDate)}</td>
                    <td>
                        <span class="badge ${item.daysRemaining <= 7 ? 'badge-danger' : 'badge-warning'}">
                            ${item.daysRemaining} days
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="TrainingView.recordTraining('${item.PersonID}', '${item.TrainingID}')">
                            <i class="fas fa-plus"></i> Record Completion
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Record training completion
     */
    recordTraining(personId, trainingId) {
        const person = DataStore.getPerson(personId);
        const training = DataStore.getTrainingType(trainingId);

        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Record Training Completion</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Person:</strong> ${person?.FirstName} ${person?.LastName}</p>
                    <p><strong>Training:</strong> ${training?.TrainingName || training?.Name}</p>
                    <form id="record-training-form">
                        ${Components.formField({ type: 'date', name: 'CompletionDate', label: 'Completion Date', value: new Date().toISOString().split('T')[0], required: true })}
                        ${Components.formField({ type: 'textarea', name: 'Notes', label: 'Notes' })}
                        <input type="hidden" name="PersonID" value="${personId}">
                        <input type="hidden" name="TrainingID" value="${trainingId}">
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="TrainingView.saveTrainingRecord()">
                        <i class="fas fa-save"></i> Save Record
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);
    },

    /**
     * Save training record
     */
    saveTrainingRecord() {
        const form = document.getElementById('record-training-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const training = DataStore.getTrainingType(data.TrainingID);
        const validityMonths = parseInt(training?.ValidityMonths || 12);

        const completionDate = new Date(data.CompletionDate);
        const expirationDate = new Date(completionDate);
        expirationDate.setMonth(expirationDate.getMonth() + validityMonths);

        // Remove existing record if any
        DataStore.personnelTraining = DataStore.personnelTraining.filter(
            pt => !(pt.PersonID === data.PersonID && pt.TrainingID === data.TrainingID)
        );

        // Add new record
        DataStore.personnelTraining.push({
            ID: Utils.generateId('PTR'),
            PersonID: data.PersonID,
            TrainingID: data.TrainingID,
            CompletionDate: data.CompletionDate,
            ExpirationDate: expirationDate.toISOString().split('T')[0],
            Status: 'Current',
            Notes: data.Notes
        });

        DataStore.saveToCache();
        Components.closeModal();
        this.renderExpiringTraining();
        Components.toast('Training record saved successfully', 'success');
    },

    /**
     * Export training matrix to CSV
     */
    exportMatrix() {
        const teamFilter = document.getElementById('matrix-team-filter')?.value || '';

        let personnel = DataStore.personnel.filter(p => p.Status === 'Active');
        if (teamFilter) {
            personnel = personnel.filter(p => p.TeamID === teamFilter);
        }

        const trainings = DataStore.trainingTypes;
        const headers = ['Name', 'Team', 'Position', ...trainings.map(t => t.TrainingName || t.Name)];

        const data = personnel.map(person => {
            const records = DataStore.getPersonTrainingRecords(person.PersonID);
            const row = {
                Name: `${person.LastName}, ${person.FirstName}`,
                Team: DataStore.getTeamName(person.TeamID),
                Position: DataStore.getPositionTitle(person.PositionID)
            };

            trainings.forEach(training => {
                const trainingName = training.TrainingName || training.Name;
                const record = records.find(r => r.TrainingID === training.TrainingID);
                if (record) {
                    const status = Utils.getTrainingStatus(record.ExpirationDate);
                    row[trainingName] = `${status} (${Utils.formatDate(record.ExpirationDate)})`;
                } else {
                    row[trainingName] = 'Missing';
                }
            });

            return row;
        });

        const csv = Utils.arrayToCsv(data, headers);
        Utils.downloadFile(csv, `training_matrix_${Utils.formatDate(new Date(), 'iso')}.csv`);
        Components.toast('Matrix exported successfully', 'success');
    }
};

// Make globally available
window.TrainingView = TrainingView;
