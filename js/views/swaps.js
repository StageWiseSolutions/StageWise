/**
 * Shift Swaps View
 */

const SwapsView = {
    /**
     * Initialize swaps view
     */
    init() {
        this.bindEvents();
        this.render();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const addBtn = document.getElementById('add-swap-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        document.getElementById('swap-status-filter')?.addEventListener('change', () => this.render());
    },

    /**
     * Render swaps view
     */
    render() {
        const statusFilter = document.getElementById('swap-status-filter')?.value || '';

        let swaps = [...DataStore.shiftSwaps];

        if (statusFilter) {
            swaps = swaps.filter(s => s.Status === statusFilter);
        }

        // Sort by date (newest first)
        swaps.sort((a, b) => new Date(b.OriginalDate) - new Date(a.OriginalDate));

        const tbody = document.getElementById('swaps-table-body');

        if (swaps.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">${Components.emptyState('No shift swaps found', 'fa-exchange-alt')}</td></tr>`;
            return;
        }

        tbody.innerHTML = swaps.map(swap => {
            const requestor = DataStore.getPerson(swap.RequestorID);
            const requestee = DataStore.getPerson(swap.RequesteeID);

            return `
                <tr>
                    <td>
                        <strong>${requestor?.FirstName} ${requestor?.LastName}</strong>
                        <br><small>${DataStore.getTeamName(requestor?.TeamID)}</small>
                    </td>
                    <td>${Utils.formatDate(swap.OriginalDate)}</td>
                    <td>
                        <strong>${requestee?.FirstName} ${requestee?.LastName}</strong>
                        <br><small>${DataStore.getTeamName(requestee?.TeamID)}</small>
                    </td>
                    <td>${Utils.formatDate(swap.SwapDate)}</td>
                    <td>${Components.statusBadge(swap.Status)}</td>
                    <td>
                        <div class="action-buttons">
                            ${swap.Status === 'Pending' ? `
                                <button class="btn btn-sm btn-success" title="Approve" onclick="SwapsView.approveSwap('${swap.ID}')">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" title="Reject" onclick="SwapsView.rejectSwap('${swap.ID}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                            ${swap.Status === 'Approved' ? `
                                <button class="btn btn-sm btn-info" title="Mark Complete" onclick="SwapsView.completeSwap('${swap.ID}')">
                                    <i class="fas fa-check-double"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-icon" title="View" onclick="SwapsView.viewSwap('${swap.ID}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-icon btn-danger" title="Delete" onclick="SwapsView.deleteSwap('${swap.ID}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Show add swap modal
     */
    showAddModal() {
        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>New Shift Swap Request</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="swap-form">
                        <h4>Person Requesting Swap</h4>
                        <div class="form-group">
                            <label for="RequestorID">Requestor <span class="required">*</span></label>
                            <select name="RequestorID" id="RequestorID" class="form-control" required>
                                <option value="">Select Person</option>
                            </select>
                        </div>
                        ${Components.formField({ type: 'date', name: 'OriginalDate', label: 'Original Shift Date', required: true })}

                        <hr>

                        <h4>Swap With</h4>
                        <div class="form-group">
                            <label for="RequesteeID">Person to Swap With <span class="required">*</span></label>
                            <select name="RequesteeID" id="RequesteeID" class="form-control" required>
                                <option value="">Select Person</option>
                            </select>
                        </div>
                        ${Components.formField({ type: 'date', name: 'SwapDate', label: 'Swap Shift Date', required: true })}

                        <hr>

                        ${Components.formField({ type: 'textarea', name: 'Notes', label: 'Notes' })}
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="SwapsView.saveSwap()">
                        <i class="fas fa-save"></i> Submit Request
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);

        // Populate personnel selects
        Components.populatePersonnelSelect('RequestorID', true, p => p.Status === 'Active');
        Components.populatePersonnelSelect('RequesteeID', true, p => p.Status === 'Active');
    },

    /**
     * Save swap request
     */
    saveSwap() {
        const form = document.getElementById('swap-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);

        if (formData.get('RequestorID') === formData.get('RequesteeID')) {
            Components.toast('Requestor and swap person cannot be the same', 'error');
            return;
        }

        const data = {
            ID: Utils.generateId('SW'),
            RequestorID: formData.get('RequestorID'),
            RequesteeID: formData.get('RequesteeID'),
            OriginalDate: formData.get('OriginalDate'),
            SwapDate: formData.get('SwapDate'),
            Status: 'Pending',
            ApprovedBy: '',
            ApprovedDate: '',
            Notes: formData.get('Notes')
        };

        DataStore.shiftSwaps.push(data);
        DataStore.saveToCache();

        Components.closeModal();
        this.render();
        Components.toast('Swap request submitted', 'success');
    },

    /**
     * View swap details
     */
    viewSwap(swapId) {
        const swap = DataStore.shiftSwaps.find(s => s.ID === swapId);
        if (!swap) return;

        const requestor = DataStore.getPerson(swap.RequestorID);
        const requestee = DataStore.getPerson(swap.RequesteeID);

        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Swap Request Details</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="swap-detail-grid">
                        <div class="swap-person">
                            <h4>Requestor</h4>
                            <p><strong>${requestor?.FirstName} ${requestor?.LastName}</strong></p>
                            <p>${DataStore.getTeamName(requestor?.TeamID)}</p>
                            <p>Shift: ${Utils.formatDate(swap.OriginalDate)}</p>
                        </div>
                        <div class="swap-arrow">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div class="swap-person">
                            <h4>Swap With</h4>
                            <p><strong>${requestee?.FirstName} ${requestee?.LastName}</strong></p>
                            <p>${DataStore.getTeamName(requestee?.TeamID)}</p>
                            <p>Shift: ${Utils.formatDate(swap.SwapDate)}</p>
                        </div>
                    </div>

                    <div class="swap-status-section">
                        <p><strong>Status:</strong> ${Components.statusBadge(swap.Status)}</p>
                        ${swap.ApprovedBy ? `<p><strong>Approved By:</strong> ${DataStore.getPersonName(swap.ApprovedBy) || swap.ApprovedBy}</p>` : ''}
                        ${swap.ApprovedDate ? `<p><strong>Approved Date:</strong> ${Utils.formatDate(swap.ApprovedDate)}</p>` : ''}
                        ${swap.Notes ? `<p><strong>Notes:</strong> ${Utils.escapeHtml(swap.Notes)}</p>` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Close</button>
                    ${swap.Status === 'Pending' ? `
                        <button class="btn btn-success" onclick="Components.closeModal(); SwapsView.approveSwap('${swap.ID}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-danger" onclick="Components.closeModal(); SwapsView.rejectSwap('${swap.ID}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        Components.openModal(content);
    },

    /**
     * Approve swap
     */
    approveSwap(swapId) {
        const swap = DataStore.shiftSwaps.find(s => s.ID === swapId);
        if (!swap) return;

        swap.Status = 'Approved';
        swap.ApprovedDate = new Date().toISOString().split('T')[0];
        swap.ApprovedBy = 'Admin'; // In a real app, this would be the logged-in user

        DataStore.saveToCache();
        this.render();
        Components.toast('Swap approved', 'success');
    },

    /**
     * Reject swap
     */
    async rejectSwap(swapId) {
        const confirmed = await Components.confirm(
            'Are you sure you want to reject this swap request?',
            { title: 'Reject Swap', danger: true, confirmText: 'Reject' }
        );

        if (confirmed) {
            const swap = DataStore.shiftSwaps.find(s => s.ID === swapId);
            if (swap) {
                swap.Status = 'Rejected';
                DataStore.saveToCache();
                this.render();
                Components.toast('Swap rejected', 'success');
            }
        }
    },

    /**
     * Mark swap as complete
     */
    completeSwap(swapId) {
        const swap = DataStore.shiftSwaps.find(s => s.ID === swapId);
        if (!swap) return;

        swap.Status = 'Completed';

        // Update the actual schedule entries
        // Find and swap the schedule entries for both dates
        const requestorSchedule = DataStore.shiftSchedule.find(
            s => s.PersonID === swap.RequestorID && s.Date === swap.OriginalDate
        );
        const requesteeSchedule = DataStore.shiftSchedule.find(
            s => s.PersonID === swap.RequesteeID && s.Date === swap.SwapDate
        );

        if (requestorSchedule && requesteeSchedule) {
            // Swap the person assignments
            requestorSchedule.PersonID = swap.RequesteeID;
            requestorSchedule.IsOverride = 'TRUE';
            requestorSchedule.Notes = `Swapped from ${DataStore.getPersonName(swap.RequestorID)}`;

            requesteeSchedule.PersonID = swap.RequestorID;
            requesteeSchedule.IsOverride = 'TRUE';
            requesteeSchedule.Notes = `Swapped from ${DataStore.getPersonName(swap.RequesteeID)}`;
        }

        DataStore.saveToCache();
        this.render();
        Components.toast('Swap completed and schedule updated', 'success');
    },

    /**
     * Delete swap
     */
    async deleteSwap(swapId) {
        const confirmed = await Components.confirm(
            'Are you sure you want to delete this swap request?',
            { title: 'Delete Swap', danger: true, confirmText: 'Delete' }
        );

        if (confirmed) {
            DataStore.shiftSwaps = DataStore.shiftSwaps.filter(s => s.ID !== swapId);
            DataStore.saveToCache();
            this.render();
            Components.toast('Swap deleted', 'success');
        }
    }
};

// Make globally available
window.SwapsView = SwapsView;
