/**
 * Reusable UI Components
 */

const Components = {
    /**
     * Show toast notification
     */
    toast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${Utils.escapeHtml(message)}</span>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('toast-hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
    },

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        overlay.querySelector('span').textContent = message;
        overlay.classList.remove('hidden');
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    },

    /**
     * Open modal
     */
    openModal(content, options = {}) {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');

        container.innerHTML = '';
        container.className = `modal-container ${options.size || 'modal-md'}`;

        if (typeof content === 'string') {
            container.innerHTML = content;
        } else {
            container.appendChild(content);
        }

        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        };

        // Close on escape
        document.addEventListener('keydown', this._modalEscHandler);

        return container;
    },

    /**
     * Close modal
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', this._modalEscHandler);
    },

    _modalEscHandler(e) {
        if (e.key === 'Escape') {
            Components.closeModal();
        }
    },

    /**
     * Confirmation dialog
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const content = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${options.title || 'Confirm'}</h3>
                        <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${Utils.escapeHtml(message)}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
                        <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">
                            ${options.confirmText || 'Confirm'}
                        </button>
                    </div>
                </div>
            `;

            this.openModal(content, { size: 'modal-sm' });

            document.getElementById('confirm-cancel').onclick = () => {
                this.closeModal();
                resolve(false);
            };

            document.getElementById('confirm-ok').onclick = () => {
                this.closeModal();
                resolve(true);
            };
        });
    },

    /**
     * Create badge element
     */
    badge(text, type = 'secondary') {
        return `<span class="badge badge-${type}">${Utils.escapeHtml(text)}</span>`;
    },

    /**
     * Create status badge
     */
    statusBadge(status) {
        const className = Utils.getStatusClass(status);
        return `<span class="badge ${className}">${Utils.escapeHtml(status)}</span>`;
    },

    /**
     * Create training status indicator
     */
    trainingStatusCell(compliance) {
        const { current, expiring, expired, missing, total } = compliance;

        if (total === 0) {
            return '<span class="badge badge-secondary">No Training Required</span>';
        }

        const compliant = current === total;
        const hasIssues = expired > 0 || missing > 0;

        let html = '<div class="training-status-mini">';

        if (compliant) {
            html += '<span class="badge badge-success"><i class="fas fa-check"></i> Complete</span>';
        } else {
            const parts = [];
            if (current > 0) parts.push(`<span class="text-success">${current} Current</span>`);
            if (expiring > 0) parts.push(`<span class="text-warning">${expiring} Expiring</span>`);
            if (expired > 0) parts.push(`<span class="text-danger">${expired} Expired</span>`);
            if (missing > 0) parts.push(`<span class="text-muted">${missing} Missing</span>`);
            html += parts.join(' | ');
        }

        html += '</div>';
        return html;
    },

    /**
     * Create shift cell for schedule
     */
    shiftCell(shiftType, time = '') {
        const shiftClass = Utils.getShiftClass(shiftType);
        const timeStr = time ? `<small>${Utils.formatTime(time)}</small>` : '';
        return `<div class="shift-cell ${shiftClass}">${shiftType}${timeStr}</div>`;
    },

    /**
     * Create person card
     */
    personCard(person, options = {}) {
        const team = DataStore.getTeam(person.TeamID);
        const position = DataStore.getPosition(person.PositionID);
        const compliance = DataStore.getPersonTrainingCompliance(person.PersonID);

        return `
            <div class="person-card" data-person-id="${person.PersonID}">
                <div class="person-card-header" style="border-color: ${team?.Color || '#ccc'}">
                    <div class="person-avatar" style="background-color: ${team?.Color || '#ccc'}">
                        ${person.FirstName[0]}${person.LastName[0]}
                    </div>
                    <div class="person-info">
                        <h4>${Utils.escapeHtml(person.FirstName)} ${Utils.escapeHtml(person.LastName)}</h4>
                        <span class="person-position">${position?.Title || person.PositionID}</span>
                    </div>
                    ${this.statusBadge(person.Status)}
                </div>
                <div class="person-card-body">
                    <div class="person-detail">
                        <i class="fas fa-users"></i>
                        <span>${team?.TeamName || person.TeamID}</span>
                    </div>
                    <div class="person-detail">
                        <i class="fas fa-id-badge"></i>
                        <span>${person.EmployeeNumber}</span>
                    </div>
                    <div class="person-detail">
                        <i class="fas fa-envelope"></i>
                        <span>${person.Email}</span>
                    </div>
                    <div class="person-detail">
                        <i class="fas fa-graduation-cap"></i>
                        ${this.trainingStatusCell(compliance)}
                    </div>
                </div>
                ${options.showActions !== false ? `
                <div class="person-card-actions">
                    <button class="btn btn-sm btn-secondary" onclick="PersonnelView.viewPerson('${person.PersonID}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="PersonnelView.editPerson('${person.PersonID}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Create team card
     */
    teamCard(team) {
        const stats = DataStore.getTeamStats(team.TeamID);
        const pattern = team.PatternID ? DataStore.rotationPatterns.find(p => p.PatternID === team.PatternID) : null;

        return `
            <div class="team-card" style="border-top-color: ${team.Color}">
                <div class="team-card-header">
                    <div class="team-color-indicator" style="background-color: ${team.Color}"></div>
                    <h3>${Utils.escapeHtml(team.TeamName)}</h3>
                    <span class="team-id">${team.TeamID}</span>
                </div>
                <div class="team-card-body">
                    <p class="team-description">${Utils.escapeHtml(team.Description || 'No description')}</p>
                    <div class="team-pattern-info">
                        ${pattern ?
                            `<span class="badge badge-info"><i class="fas fa-calendar-alt"></i> ${pattern.PatternName}</span>
                             <small class="text-muted">Offset: ${team.PatternOffset || 0} days</small>`
                            : '<span class="text-muted"><i class="fas fa-calendar-times"></i> No pattern assigned</span>'
                        }
                    </div>
                    <div class="team-stats">
                        <div class="team-stat">
                            <span class="stat-value">${stats.active}</span>
                            <span class="stat-label">Active</span>
                        </div>
                        <div class="team-stat">
                            <span class="stat-value">${stats.onLOA}</span>
                            <span class="stat-label">On LOA</span>
                        </div>
                        <div class="team-stat ${stats.trainingIssues > 0 ? 'text-danger' : ''}">
                            <span class="stat-value">${stats.trainingIssues}</span>
                            <span class="stat-label">Training Issues</span>
                        </div>
                    </div>
                </div>
                <div class="team-card-actions">
                    <button class="btn btn-sm btn-secondary" onclick="TeamsView.viewTeam('${team.TeamID}')">
                        <i class="fas fa-users"></i> Members
                    </button>
                    <button class="btn btn-sm btn-info" onclick="TeamsView.assignPattern('${team.TeamID}')">
                        <i class="fas fa-calendar-alt"></i> Pattern
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="TeamsView.editTeam('${team.TeamID}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Create pagination
     */
    pagination(currentPage, totalPages, onPageChange) {
        if (totalPages <= 1) return '';

        let html = '<div class="pagination">';

        // Previous button
        html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
            <i class="fas fa-chevron-left"></i>
        </button>`;

        // Page numbers
        const range = 2;
        const start = Math.max(1, currentPage - range);
        const end = Math.min(totalPages, currentPage + range);

        if (start > 1) {
            html += '<button class="page-btn" data-page="1">1</button>';
            if (start > 2) html += '<span class="page-ellipsis">...</span>';
        }

        for (let i = start; i <= end; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (end < totalPages) {
            if (end < totalPages - 1) html += '<span class="page-ellipsis">...</span>';
            html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
            <i class="fas fa-chevron-right"></i>
        </button>`;

        html += '</div>';

        return html;
    },

    /**
     * Create form field
     */
    formField(options) {
        const { type = 'text', name, label, value = '', required = false, placeholder = '', options: selectOptions = [], disabled = false } = options;

        let input = '';

        switch (type) {
            case 'select':
                input = `
                    <select name="${name}" id="${name}" class="form-control" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>
                        <option value="">Select ${label}</option>
                        ${selectOptions.map(opt =>
                    `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${Utils.escapeHtml(opt.label)}</option>`
                ).join('')}
                    </select>
                `;
                break;

            case 'textarea':
                input = `<textarea name="${name}" id="${name}" class="form-control" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} placeholder="${placeholder}">${Utils.escapeHtml(value)}</textarea>`;
                break;

            case 'date':
                input = `<input type="date" name="${name}" id="${name}" class="form-control" value="${value}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>`;
                break;

            default:
                input = `<input type="${type}" name="${name}" id="${name}" class="form-control" value="${Utils.escapeHtml(value)}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} placeholder="${placeholder}">`;
        }

        return `
            <div class="form-group">
                <label for="${name}">${label}${required ? ' <span class="required">*</span>' : ''}</label>
                ${input}
            </div>
        `;
    },

    /**
     * Create empty state
     */
    emptyState(message, icon = 'fa-inbox', action = null) {
        return `
            <div class="empty-state">
                <i class="fas ${icon}"></i>
                <p>${message}</p>
                ${action ? `<button class="btn btn-primary" onclick="${action.handler}">${action.label}</button>` : ''}
            </div>
        `;
    },

    /**
     * Populate select with teams
     */
    populateTeamSelect(selectId, includeAll = true) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = includeAll ? '<option value="">All Teams</option>' : '';
        DataStore.teams.forEach(team => {
            select.innerHTML += `<option value="${team.TeamID}">${Utils.escapeHtml(team.TeamName)}</option>`;
        });
    },

    /**
     * Populate select with positions
     */
    populatePositionSelect(selectId, includeAll = true) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = includeAll ? '<option value="">All Positions</option>' : '';
        DataStore.positions.forEach(pos => {
            select.innerHTML += `<option value="${pos.PositionID}">${Utils.escapeHtml(pos.Title)}</option>`;
        });
    },

    /**
     * Populate select with personnel
     */
    populatePersonnelSelect(selectId, includeAll = true, filterFn = null) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = includeAll ? '<option value="">Select Person</option>' : '';

        let personnel = [...DataStore.personnel];
        if (filterFn) {
            personnel = personnel.filter(filterFn);
        }

        personnel
            .sort((a, b) => `${a.LastName} ${a.FirstName}`.localeCompare(`${b.LastName} ${b.FirstName}`))
            .forEach(person => {
                select.innerHTML += `<option value="${person.PersonID}">${Utils.escapeHtml(person.LastName)}, ${Utils.escapeHtml(person.FirstName)}</option>`;
            });
    }
};

// Make globally available
window.Components = Components;
