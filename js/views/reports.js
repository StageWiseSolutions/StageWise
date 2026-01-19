/**
 * Reports View
 */

const ReportsView = {
    /**
     * Initialize reports view
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        document.querySelectorAll('.report-card button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.report-card');
                const reportType = card.dataset.report;
                this.generateReport(reportType);
            });
        });
    },

    /**
     * Generate report
     */
    generateReport(reportType) {
        switch (reportType) {
            case 'personnel-roster':
                this.generatePersonnelRoster();
                break;
            case 'training-compliance':
                this.generateTrainingCompliance();
                break;
            case 'schedule-export':
                this.showScheduleExportModal();
                break;
            case 'team-summary':
                this.generateTeamSummary();
                break;
            default:
                Components.toast('Report type not found', 'error');
        }
    },

    /**
     * Generate personnel roster report
     */
    generatePersonnelRoster() {
        const personnel = DataStore.personnel
            .filter(p => p.Status === 'Active')
            .sort((a, b) => `${a.LastName} ${a.FirstName}`.localeCompare(`${b.LastName} ${b.FirstName}`));

        const headers = [
            'LastName', 'FirstName', 'EmployeeNumber', 'BadgeNumber', 'Email', 'Phone',
            'Team', 'Position', 'Department', 'HireDate', 'EmergencyContact', 'EmergencyPhone'
        ];

        const data = personnel.map(p => ({
            LastName: p.LastName,
            FirstName: p.FirstName,
            EmployeeNumber: p.EmployeeNumber,
            BadgeNumber: p.BadgeNumber,
            Email: p.Email,
            Phone: p.Phone,
            Team: DataStore.getTeamName(p.TeamID),
            Position: DataStore.getPositionTitle(p.PositionID),
            Department: p.Department,
            HireDate: p.HireDate,
            EmergencyContact: p.EmergencyContact,
            EmergencyPhone: p.EmergencyPhone
        }));

        const csv = Utils.arrayToCsv(data, headers);
        Utils.downloadFile(csv, `personnel_roster_${Utils.formatDate(new Date(), 'iso')}.csv`);
        Components.toast('Personnel roster exported', 'success');
    },

    /**
     * Generate training compliance report
     */
    generateTrainingCompliance() {
        const personnel = DataStore.personnel.filter(p => p.Status === 'Active');

        const rows = [];

        personnel.forEach(person => {
            const requiredTraining = DataStore.getRequiredTrainingForPosition(person.PositionID);
            const records = DataStore.getPersonTrainingRecords(person.PersonID);

            requiredTraining.forEach(training => {
                const record = records.find(r => r.TrainingID === training.TrainingID);
                const status = record ? Utils.getTrainingStatus(record.ExpirationDate) : 'missing';

                rows.push({
                    LastName: person.LastName,
                    FirstName: person.FirstName,
                    EmployeeNumber: person.EmployeeNumber,
                    Team: DataStore.getTeamName(person.TeamID),
                    Position: DataStore.getPositionTitle(person.PositionID),
                    Training: training.Name,
                    Category: training.Category,
                    CompletionDate: record?.CompletionDate || '',
                    ExpirationDate: record?.ExpirationDate || '',
                    Status: status === 'current' ? 'Current' : (status === 'expiring' ? 'Expiring Soon' : (status === 'expired' ? 'Expired' : 'Missing')),
                    DaysRemaining: record ? Utils.daysDiff(new Date(), record.ExpirationDate) : ''
                });
            });
        });

        const headers = ['LastName', 'FirstName', 'EmployeeNumber', 'Team', 'Position', 'Training', 'Category', 'CompletionDate', 'ExpirationDate', 'Status', 'DaysRemaining'];
        const csv = Utils.arrayToCsv(rows, headers);
        Utils.downloadFile(csv, `training_compliance_${Utils.formatDate(new Date(), 'iso')}.csv`);
        Components.toast('Training compliance report exported', 'success');
    },

    /**
     * Show schedule export modal
     */
    showScheduleExportModal() {
        const today = new Date();
        const startOfMonth = Utils.getMonthStart(today).toISOString().split('T')[0];
        const endOfMonth = Utils.getMonthEnd(today).toISOString().split('T')[0];

        const content = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Export Schedule</h3>
                    <button class="modal-close" onclick="Components.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="schedule-export-form">
                        <div class="form-row">
                            ${Components.formField({ type: 'date', name: 'StartDate', label: 'Start Date', value: startOfMonth, required: true })}
                            ${Components.formField({ type: 'date', name: 'EndDate', label: 'End Date', value: endOfMonth, required: true })}
                        </div>
                        <div class="form-group">
                            <label for="ExportTeam">Team</label>
                            <select name="TeamID" id="ExportTeam" class="form-control">
                                <option value="">All Teams</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Format</label>
                            <div class="radio-group">
                                <label class="radio-item">
                                    <input type="radio" name="Format" value="csv" checked>
                                    <span>CSV (Excel compatible)</span>
                                </label>
                                <label class="radio-item">
                                    <input type="radio" name="Format" value="ical">
                                    <span>iCalendar (Calendar apps)</span>
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="ReportsView.exportSchedule()">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
        `;

        Components.openModal(content);
        Components.populateTeamSelect('ExportTeam', true);
    },

    /**
     * Export schedule
     */
    exportSchedule() {
        const form = document.getElementById('schedule-export-form');
        const formData = new FormData(form);

        const startDate = formData.get('StartDate');
        const endDate = formData.get('EndDate');
        const teamFilter = formData.get('TeamID');
        const format = formData.get('Format');

        let schedule = DataStore.shiftSchedule.filter(s =>
            s.Date >= startDate && s.Date <= endDate
        );

        if (teamFilter) {
            schedule = schedule.filter(s => s.TeamID === teamFilter);
        }

        if (format === 'csv') {
            const rows = schedule.map(s => ({
                Date: s.Date,
                Person: DataStore.getPersonName(s.PersonID),
                Team: DataStore.getTeamName(s.TeamID),
                ShiftType: s.ShiftType,
                StartTime: s.StartTime,
                EndTime: s.EndTime,
                Location: s.Location
            }));

            const headers = ['Date', 'Person', 'Team', 'ShiftType', 'StartTime', 'EndTime', 'Location'];
            const csv = Utils.arrayToCsv(rows, headers);
            Utils.downloadFile(csv, `schedule_${startDate}_to_${endDate}.csv`);
        } else {
            // Generate iCalendar format
            let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Personnel Shift Tracker//EN\n';

            schedule.filter(s => s.ShiftType !== 'Off').forEach(s => {
                const person = DataStore.getPerson(s.PersonID);
                const startDateTime = s.StartTime ? `${s.Date.replace(/-/g, '')}T${s.StartTime}00` : `${s.Date.replace(/-/g, '')}`;
                const endDateTime = s.EndTime ? `${s.Date.replace(/-/g, '')}T${s.EndTime}00` : `${s.Date.replace(/-/g, '')}`;

                ical += `BEGIN:VEVENT
UID:${s.ID}@pst
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${person?.FirstName} ${person?.LastName} - ${s.ShiftType}
LOCATION:${s.Location || 'Main Plant'}
DESCRIPTION:Team: ${DataStore.getTeamName(s.TeamID)}
END:VEVENT
`;
            });

            ical += 'END:VCALENDAR';
            Utils.downloadFile(ical, `schedule_${startDate}_to_${endDate}.ics`, 'text/calendar');
        }

        Components.closeModal();
        Components.toast('Schedule exported', 'success');
    },

    /**
     * Generate team summary report
     */
    generateTeamSummary() {
        const rows = [];

        DataStore.teams.forEach(team => {
            const personnel = DataStore.getPersonnelByTeam(team.TeamID);
            const active = personnel.filter(p => p.Status === 'Active');
            const onLOA = personnel.filter(p => p.Status === 'LOA');

            // Count by position
            const positionCounts = {};
            active.forEach(p => {
                const title = DataStore.getPositionTitle(p.PositionID);
                positionCounts[title] = (positionCounts[title] || 0) + 1;
            });

            // Training compliance
            let trainingCurrent = 0, trainingExpiring = 0, trainingExpired = 0, trainingMissing = 0;
            active.forEach(p => {
                const compliance = DataStore.getPersonTrainingCompliance(p.PersonID);
                trainingCurrent += compliance.current;
                trainingExpiring += compliance.expiring;
                trainingExpired += compliance.expired;
                trainingMissing += compliance.missing;
            });

            rows.push({
                Team: team.TeamName,
                TotalPersonnel: personnel.length,
                Active: active.length,
                OnLOA: onLOA.length,
                Positions: Object.entries(positionCounts).map(([k, v]) => `${k}: ${v}`).join('; '),
                TrainingCurrent: trainingCurrent,
                TrainingExpiring: trainingExpiring,
                TrainingExpired: trainingExpired,
                TrainingMissing: trainingMissing,
                ComplianceRate: ((trainingCurrent / (trainingCurrent + trainingExpiring + trainingExpired + trainingMissing)) * 100).toFixed(1) + '%'
            });
        });

        const headers = ['Team', 'TotalPersonnel', 'Active', 'OnLOA', 'Positions', 'TrainingCurrent', 'TrainingExpiring', 'TrainingExpired', 'TrainingMissing', 'ComplianceRate'];
        const csv = Utils.arrayToCsv(rows, headers);
        Utils.downloadFile(csv, `team_summary_${Utils.formatDate(new Date(), 'iso')}.csv`);
        Components.toast('Team summary exported', 'success');
    }
};

// Make globally available
window.ReportsView = ReportsView;
