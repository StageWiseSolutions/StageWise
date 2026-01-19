/**
 * Dashboard View
 */

const DashboardView = {
    /**
     * Initialize dashboard
     */
    init() {
        this.render();
    },

    /**
     * Render dashboard
     */
    render() {
        this.updateStats();
        this.renderTodaysCoverage();
        this.renderTrainingAlerts();
        this.renderTeamStatus();
        this.renderRecentActivity();
        this.renderUpcomingStraights();

        // Update today's date
        const today = new Date();
        document.getElementById('today-date').textContent = Utils.formatDate(today, 'weekday');
    },

    /**
     * Update stats cards
     */
    updateStats() {
        // Total personnel
        const totalPersonnel = DataStore.personnel.filter(p => p.Status === 'Active').length;
        document.getElementById('stat-total-personnel').textContent = totalPersonnel;

        // On shift today
        const today = new Date().toISOString().split('T')[0];
        const onShift = DataStore.getWhosWorking(today).length;
        document.getElementById('stat-on-shift').textContent = onShift;

        // Training due soon
        const expiringTraining = DataStore.getExpiringTraining(30);
        document.getElementById('stat-training-due').textContent = expiringTraining.length;
        document.getElementById('expiring-badge').textContent = expiringTraining.length;

        // On straights
        const onStraights = DataStore.getCurrentStraights().length;
        document.getElementById('stat-on-straights').textContent = onStraights;
    },

    /**
     * Render today's coverage section
     */
    renderTodaysCoverage() {
        const container = document.getElementById('todays-coverage');
        const today = new Date().toISOString().split('T')[0];
        const working = DataStore.getWhosWorking(today);

        // Group by shift type
        const byShift = Utils.groupBy(working, 'ShiftType');

        let html = '';

        // Day shift
        const dayShift = byShift['Day'] || [];
        html += `
            <div class="coverage-section">
                <h4 class="shift-day"><i class="fas fa-sun"></i> Day Shift (${dayShift.length})</h4>
                <div class="coverage-list">
                    ${dayShift.length > 0 ? dayShift.slice(0, 5).map(s => `
                        <div class="coverage-item">
                            <span class="person-name">${s.person?.FirstName} ${s.person?.LastName}</span>
                            <span class="team-badge" style="background-color: ${s.team?.Color}">${s.team?.TeamName}</span>
                        </div>
                    `).join('') : '<div class="no-data">No one scheduled</div>'}
                    ${dayShift.length > 5 ? `<div class="more-link">+${dayShift.length - 5} more</div>` : ''}
                </div>
            </div>
        `;

        // Night shift
        const nightShift = byShift['Night'] || [];
        html += `
            <div class="coverage-section">
                <h4 class="shift-night"><i class="fas fa-moon"></i> Night Shift (${nightShift.length})</h4>
                <div class="coverage-list">
                    ${nightShift.length > 0 ? nightShift.slice(0, 5).map(s => `
                        <div class="coverage-item">
                            <span class="person-name">${s.person?.FirstName} ${s.person?.LastName}</span>
                            <span class="team-badge" style="background-color: ${s.team?.Color}">${s.team?.TeamName}</span>
                        </div>
                    `).join('') : '<div class="no-data">No one scheduled</div>'}
                    ${nightShift.length > 5 ? `<div class="more-link">+${nightShift.length - 5} more</div>` : ''}
                </div>
            </div>
        `;

        // Straights
        const straights = byShift['Straights'] || [];
        html += `
            <div class="coverage-section">
                <h4 class="shift-straights"><i class="fas fa-building"></i> Straights (${straights.length})</h4>
                <div class="coverage-list">
                    ${straights.length > 0 ? straights.map(s => `
                        <div class="coverage-item">
                            <span class="person-name">${s.person?.FirstName} ${s.person?.LastName}</span>
                            <span class="location">${s.Location || 'TBD'}</span>
                        </div>
                    `).join('') : '<div class="no-data">No one on straights</div>'}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Render training alerts
     */
    renderTrainingAlerts() {
        const container = document.getElementById('training-alerts');
        const expiring = DataStore.getExpiringTraining(30);

        if (expiring.length === 0) {
            container.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle text-success"></i>
                    <span>No training expiring in the next 30 days</span>
                </div>
            `;
            return;
        }

        container.innerHTML = expiring.slice(0, 5).map(item => `
            <div class="alert-item ${item.daysRemaining <= 7 ? 'alert-urgent' : ''}">
                <div class="alert-icon">
                    <i class="fas fa-exclamation-triangle ${item.daysRemaining <= 7 ? 'text-danger' : 'text-warning'}"></i>
                </div>
                <div class="alert-content">
                    <strong>${item.person?.FirstName} ${item.person?.LastName}</strong>
                    <span>${item.training?.Name}</span>
                </div>
                <div class="alert-badge">
                    <span class="badge ${item.daysRemaining <= 7 ? 'badge-danger' : 'badge-warning'}">
                        ${item.daysRemaining} days
                    </span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Render team status
     */
    renderTeamStatus() {
        const container = document.getElementById('team-status');

        container.innerHTML = DataStore.teams.map(team => {
            const stats = DataStore.getTeamStats(team.TeamID);
            const today = new Date().toISOString().split('T')[0];
            const working = DataStore.getWhosWorking(today).filter(w => w.TeamID === team.TeamID);

            return `
                <div class="team-status-card" style="border-left-color: ${team.Color}">
                    <div class="team-status-header">
                        <span class="team-name">${Utils.escapeHtml(team.TeamName)}</span>
                        <span class="team-count">${stats.active} active</span>
                    </div>
                    <div class="team-status-body">
                        <div class="status-row">
                            <span>Working Today:</span>
                            <strong>${working.length}</strong>
                        </div>
                        <div class="status-row">
                            <span>On LOA:</span>
                            <strong>${stats.onLOA}</strong>
                        </div>
                        <div class="status-row ${stats.trainingIssues > 0 ? 'text-danger' : ''}">
                            <span>Training Issues:</span>
                            <strong>${stats.trainingIssues}</strong>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render recent activity
     */
    renderRecentActivity() {
        const container = document.getElementById('recent-activity');

        // Generate some mock activity based on data
        const activities = [];

        // Recent training completions
        DataStore.personnelTraining
            .filter(pt => {
                const daysSinceCompletion = Utils.daysDiff(pt.CompletionDate, new Date());
                return daysSinceCompletion >= 0 && daysSinceCompletion <= 7;
            })
            .slice(0, 3)
            .forEach(pt => {
                activities.push({
                    type: 'training',
                    icon: 'fa-graduation-cap',
                    text: `${DataStore.getPersonName(pt.PersonID)} completed ${DataStore.getTrainingName(pt.TrainingID)}`,
                    date: pt.CompletionDate
                });
            });

        // Upcoming straights
        DataStore.getUpcomingStraights(7).slice(0, 2).forEach(s => {
            activities.push({
                type: 'straights',
                icon: 'fa-building',
                text: `${DataStore.getPersonName(s.PersonID)} assigned to straights week`,
                date: s.WeekStartDate
            });
        });

        if (activities.length === 0) {
            container.innerHTML = '<div class="no-data">No recent activity</div>';
            return;
        }

        container.innerHTML = activities
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
            .map(activity => `
                <div class="activity-item">
                    <div class="activity-icon"><i class="fas ${activity.icon}"></i></div>
                    <div class="activity-content">
                        <span>${activity.text}</span>
                        <small>${Utils.formatDate(activity.date)}</small>
                    </div>
                </div>
            `).join('');
    },

    /**
     * Render upcoming straights
     */
    renderUpcomingStraights() {
        const container = document.getElementById('upcoming-straights');
        const upcoming = DataStore.getUpcomingStraights(30);

        if (upcoming.length === 0) {
            container.innerHTML = '<div class="no-data">No upcoming straights assignments</div>';
            return;
        }

        container.innerHTML = upcoming.slice(0, 5).map(s => {
            const person = DataStore.getPerson(s.PersonID);
            const team = DataStore.getTeam(s.TeamID);

            return `
                <div class="straights-item">
                    <div class="straights-person">
                        <strong>${person?.FirstName} ${person?.LastName}</strong>
                        <span class="team-badge" style="background-color: ${team?.Color}">${team?.TeamName}</span>
                    </div>
                    <div class="straights-details">
                        <span><i class="fas fa-calendar"></i> ${Utils.formatDate(s.WeekStartDate)} - ${Utils.formatDate(s.WeekEndDate)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${s.Location || 'TBD'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// Make globally available
window.DashboardView = DashboardView;
