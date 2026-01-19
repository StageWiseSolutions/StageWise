/**
 * Personnel View
 */

const PersonnelView = {
    currentPage: 1,
    itemsPerPage: CONFIG.ITEMS_PER_PAGE,
    sortField: 'LastName',
    sortAscending: true,
    filters: {
        search: '',
        team: '',
        position: '',
        status: ''
    },
    displayMode: 'table',

    /**
     * Initialize personnel view
     */
    init() {
        this.bindEvents();
        this.populateFilters();
        this.render();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Search
        const searchInput = document.getElementById('personnel-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.render();
            }, 300));
        }

        // Filters
        ['filter-team', 'filter-position', 'filter-status'].forEach(filterId => {
            const select = document.getElementById(filterId);
            if (select) {
                select.addEventListener('change', (e) => {
                    const key = filterId.replace('filter-', '');
                    this.filters[key] = e.target.value;
                    this.currentPage = 1;
                    this.render();
                });
            }
        });

        // View toggle
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.displayMode = btn.dataset.display;
                this.render();
            });
        });

        // Sort headers
        document.querySelectorAll('#personnel-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (this.sortField === field) {
                    this.sortAscending = !this.sortAscending;
                } else {
                    this.sortField = field;
                    this.sortAscending = true;
                }
                this.updateSortIndicators();
                this.render();
            });
        });

        // Add personnel button
        const addBtn = document.getElementById('add-personnel-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // Export button
        const exportBtn = document.getElementById('export-personnel-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPersonnel());
        }
    },

    /**
     * Populate filter dropdowns
     */
    populateFilters() {
        Components.populateTeamSelect('filter-team', true);
        Components.populatePositionSelect('filter-position', true);
    },

    /**
     * Get filtered and sorted personnel
     */
    getFilteredPersonnel() {
        let personnel = [...DataStore.personnel];

        // Apply filters
        if (this.filters.search) {
            personnel = Utils.searchBy(personnel, this.filters.search,
                ['FirstName', 'LastName', 'EmployeeNumber', 'BadgeNumber', 'Email']);
        }

        if (this.filters.team) {
            personnel = personnel.filter(p => p.TeamID === this.filters.team);
        }

        if (this.filters.position) {
            personnel = personnel.filter(p => p.PositionID === this.filters.position);
        }

        if (this.filters.status) {
            personnel = personnel.filter(p => p.Status === this.filters.status);
        }

        // Sort
        personnel = Utils.sortBy(personnel, this.sortField, this.sortAscending);

        return personnel;
    },

    /**
     * Render personnel view
     */
    render() {
        const personnel = this.getFilteredPersonnel();
        const totalPages = Math.ceil(personnel.length / this.itemsPerPage);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const pagePersonnel = personnel.slice(start, start + this.itemsPerPage);

        if (this.displayMode === 'table') {
            this.renderTable(pagePersonnel);
            document.getElementById('personnel-table-container').classList.remove('hidden');
            document.getElementById('personnel-cards-container').classList.add('hidden');
        } else {
            this.renderCards(pagePersonnel);
            document.getElementById('personnel-table-container').classList.add('hidden');
            document.getElementById('personnel-cards-container').classList.remove('hidden');
        }

        // Render pagination
        const paginationContainer = document.getElementById('personnel-pagination');
        paginationContainer.innerHTML = Components.pagination(this.currentPage, totalPages);

        // Bind pagination events
        paginationContainer.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    this.currentPage = page;
                    this.render();
                }
            });
        });
    },

    /**
     * Render table view
     */
    renderTable(personnel) {
        const tbody = document.getElementById('personnel-table-body');

        if (personnel.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">${Components.emptyState('No personnel found', 'fa-users')}</td></tr>`;
            return;
        }

        tbody.innerHTML = personnel.map(person => {
            const team = DataStore.getTeam(person.TeamID);
            const position = DataStore.getPosition(person.PositionID);
            const compliance = DataStore.getPersonTrainingCompliance(person.PersonID);

            return `
                <tr data-person-id="${person.PersonID}">
                    <td>
                        <div class="person-name-cell">
                            <div class="person-avatar-sm" style="background-color: ${team?.Color || '#ccc'}">
                                ${person.FirstName[0]}${person.LastName[0]}
                            </div>
                            <div>
                                <strong>${Utils.escapeHtml(person.LastName)}, ${Utils.escapeHtml(person.FirstName)}</strong>
                                <small class="text-muted">${person.Email}</small>
                            </div>
                        </div>
                    </td>
                    <td>${person.EmployeeNumber}</td>
                    <td>
                        <span class="team-badge" style="background-color: ${team?.Color}">${team?.TeamName || person.TeamID}</span>
                    </td>
                    <td>${position?.Title || person.PositionID}</td>
                    <td>${Components.trainingStatusCell(compliance)}</td>
                    <td>${Components.statusBadge(person.Status)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-icon" title="View" onclick="PersonnelView.viewPerson('${person.PersonID}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-icon" title="Edit" onclick="PersonnelView.editPerson('${person.PersonID}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-icon btn-danger" title="Delete" onclick="PersonnelView.deletePerson('${person.PersonID}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Render card view
     */
    renderCards(personnel) {
        const container = document.getElementById('personnel-cards-container');

        if (personnel.length === 0) {
            container.innerHTML = Components.emptyState('No personnel found', 'fa-users');
            return;
        }

        container.innerHTML = personnel.map(person => Components.personCard(person)).join('');
    },

    /**
     * Update sort indicators
     */
    updateSortIndicators() {
        document.querySelectorAll('#personnel-table th.sortable').forEach(th => {
            const icon = th.querySelector('i');
            if (th.dataset.sort === this.sortField) {
                icon.className = `fas fa-sort-${this.sortAscending ? 'up' : 'down'}`;
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    },

    /**
     * View person details
     */
    viewPerson(personId) {
        const person = DataStore.getPerson(personId);
        if (!person) return;

        const team = DataStore.getTeam(person.TeamID);
        const position = DataStore.getPosition(person.PositionID);
        const trainingRecords = DataStore.getPersonTrainingRecords(personId);
        const requiredTraining = DataStore.getRequiredTrainingForPosition(person.PositionID);

        const content = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>${person.FirstName} ${person.LastName}</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="person-detail-grid">
                        <div class="detail-section">
                            <h4>Personal Information</h4>
                            <div class="detail-row">
                                <label>Employee Number:</label>
                                <span>${person.EmployeeNumber}</span>
                            </div>
                            <div class="detail-row">
                                <label>Badge Number:</label>
                                <span>${person.BadgeNumber || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <label>Email:</label>
                                <span>${person.Email}</span>
                            </div>
                            <div class="detail-row">
                                <label>Phone:</label>
                                <span>${person.Phone || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <label>Emergency Contact:</label>
                                <span>${person.EmergencyContact || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <label>Emergency Phone:</label>
                                <span>${person.EmergencyPhone || 'N/A'}</span>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>Work Information</h4>
                            <div class="detail-row">
                                <label>Team:</label>
                                <span class="team-badge" style="background-color: ${team?.Color}">${team?.TeamName}</span>
                            </div>
                            <div class="detail-row">
                                <label>Position:</label>
                                <span>${position?.Title}</span>
                            </div>
                            <div class="detail-row">
                                <label>Department:</label>
                                <span>${person.Department}</span>
                            </div>
                            <div class="detail-row">
                                <label>Status:</label>
                                ${Components.statusBadge(person.Status)}
                            </div>
                            <div class="detail-row">
                                <label>Hire Date:</label>
                                <span>${Utils.formatDate(person.HireDate)}</span>
                            </div>
                            <div class="detail-row">
                                <label>Position Start:</label>
                                <span>${Utils.formatDate(person.PositionStartDate)}</span>
                            </div>
                            <div class="detail-row">
                                <label>Supervisor:</label>
                                <span>${person.Supervisor ? DataStore.getPersonName(person.Supervisor) : 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>Training Status</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Training</th>
                                    <th>Category</th>
                                    <th>Completion Date</th>
                                    <th>Expiration Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${requiredTraining.map(training => {
                                    const record = trainingRecords.find(r => r.TrainingID === training.TrainingID);
                                    const status = record ? Utils.getTrainingStatus(record.ExpirationDate) : 'missing';
                                    return `
                                        <tr>
                                            <td>${training.Name}</td>
                                            <td>${training.Category}</td>
                                            <td>${record ? Utils.formatDate(record.CompletionDate) : '-'}</td>
                                            <td>${record ? Utils.formatDate(record.ExpirationDate) : '-'}</td>
                                            <td>${Components.statusBadge(status === 'missing' ? 'Missing' : (status === 'current' ? 'Current' : (status === 'expiring' ? 'Due Soon' : 'Expired')))}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${person.Notes ? `
                    <div class="detail-section">
                        <h4>Notes</h4>
                        <p>${Utils.escapeHtml(person.Notes)}</p>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Close</button>
                    <button class="btn btn-primary" onclick="Components.closeModal(); PersonnelView.editPerson('${personId}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content, { size: 'modal-lg' });
    },

    /**
     * Show add/edit modal
     */
    showAddModal(personId = null) {
        const person = personId ? DataStore.getPerson(personId) : null;
        const isEdit = !!person;

        const teamOptions = DataStore.teams.map(t => ({ value: t.TeamID, label: t.TeamName }));
        const positionOptions = DataStore.positions.map(p => ({ value: p.PositionID, label: p.Title }));
        const statusOptions = CONFIG.STATUSES.PERSONNEL.map(s => ({ value: s, label: s }));

        const content = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit' : 'Add'} Personnel</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="personnel-form">
                        <div class="form-row">
                            ${Components.formField({ name: 'FirstName', label: 'First Name', value: person?.FirstName, required: true })}
                            ${Components.formField({ name: 'LastName', label: 'Last Name', value: person?.LastName, required: true })}
                        </div>
                        <div class="form-row">
                            ${Components.formField({ name: 'EmployeeNumber', label: 'Employee Number', value: person?.EmployeeNumber, required: true })}
                            ${Components.formField({ name: 'BadgeNumber', label: 'Badge Number', value: person?.BadgeNumber })}
                        </div>
                        <div class="form-row">
                            ${Components.formField({ name: 'Email', label: 'Email', type: 'email', value: person?.Email, required: true })}
                            ${Components.formField({ name: 'Phone', label: 'Phone', type: 'tel', value: person?.Phone })}
                        </div>
                        <div class="form-row">
                            ${Components.formField({ type: 'select', name: 'TeamID', label: 'Team', value: person?.TeamID, required: true, options: teamOptions })}
                            ${Components.formField({ type: 'select', name: 'PositionID', label: 'Position', value: person?.PositionID, required: true, options: positionOptions })}
                        </div>
                        <div class="form-row">
                            ${Components.formField({ name: 'Department', label: 'Department', value: person?.Department || 'Operations' })}
                            ${Components.formField({ type: 'select', name: 'Status', label: 'Status', value: person?.Status || 'Active', required: true, options: statusOptions })}
                        </div>
                        <div class="form-row">
                            ${Components.formField({ type: 'date', name: 'HireDate', label: 'Hire Date', value: person?.HireDate, required: true })}
                            ${Components.formField({ type: 'date', name: 'PositionStartDate', label: 'Position Start Date', value: person?.PositionStartDate })}
                        </div>
                        <div class="form-row">
                            ${Components.formField({ name: 'EmergencyContact', label: 'Emergency Contact', value: person?.EmergencyContact })}
                            ${Components.formField({ name: 'EmergencyPhone', label: 'Emergency Phone', type: 'tel', value: person?.EmergencyPhone })}
                        </div>
                        ${Components.formField({ type: 'textarea', name: 'Notes', label: 'Notes', value: person?.Notes })}
                        <input type="hidden" name="PersonID" value="${person?.PersonID || ''}">
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="PersonnelView.savePerson(${isEdit})">
                        <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Add'} Personnel
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content, { size: 'modal-lg' });
    },

    /**
     * Edit person
     */
    editPerson(personId) {
        this.showAddModal(personId);
    },

    /**
     * Save person (add or update)
     */
    savePerson(isEdit) {
        const form = document.getElementById('personnel-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (!isEdit) {
            data.PersonID = Utils.generateId('P');
        }

        // Update local data store
        if (isEdit) {
            const index = DataStore.personnel.findIndex(p => p.PersonID === data.PersonID);
            if (index !== -1) {
                DataStore.personnel[index] = { ...DataStore.personnel[index], ...data };
            }
        } else {
            DataStore.personnel.push(data);
        }

        DataStore.saveToCache();
        Components.closeModal();
        this.render();
        Components.toast(`Personnel ${isEdit ? 'updated' : 'added'} successfully`, 'success');
    },

    /**
     * Delete person
     */
    async deletePerson(personId) {
        const person = DataStore.getPerson(personId);
        if (!person) return;

        const confirmed = await Components.confirm(
            `Are you sure you want to delete ${person.FirstName} ${person.LastName}?`,
            { title: 'Delete Personnel', danger: true, confirmText: 'Delete' }
        );

        if (confirmed) {
            DataStore.personnel = DataStore.personnel.filter(p => p.PersonID !== personId);
            DataStore.saveToCache();
            this.render();
            Components.toast('Personnel deleted successfully', 'success');
        }
    },

    /**
     * Export personnel to CSV
     */
    exportPersonnel() {
        const personnel = this.getFilteredPersonnel();
        const headers = ['PersonID', 'EmployeeNumber', 'FirstName', 'LastName', 'Email', 'Phone',
                         'TeamID', 'PositionID', 'Department', 'Status', 'HireDate', 'BadgeNumber'];

        const csv = Utils.arrayToCsv(personnel, headers);
        Utils.downloadFile(csv, `personnel_export_${Utils.formatDate(new Date(), 'iso')}.csv`);
        Components.toast('Export complete', 'success');
    }
};

// Make globally available
window.PersonnelView = PersonnelView;
