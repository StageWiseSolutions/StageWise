/**
 * Data Store - Central data management
 * Manages all application data and provides methods for CRUD operations
 */

const DataStore = {
    // Data collections
    teams: [],
    positions: [],
    personnel: [],
    trainingTypes: [],
    positionTraining: [],
    personnelTraining: [],
    rotationPatterns: [],
    shiftSchedule: [],
    shiftSwaps: [],
    straighsAssignments: [],
    settings: {},

    // Loading state
    isLoading: false,
    lastLoaded: null,

    // Event listeners
    _listeners: {},

    /**
     * Initialize data store
     */
    async init() {
        // Try to load from cache first
        this.loadFromCache();

        // Listen for Google Auth changes
        window.addEventListener('googleAuthChange', async (e) => {
            if (e.detail.isSignedIn) {
                try {
                    await this.refreshAll();
                } catch (error) {
                    console.error('Failed to load from API after sign-in:', error);
                }
            }
        });

        // Then refresh from API if configured
        if (SheetsAPI.isConfigured()) {
            try {
                await this.refreshAll();
            } catch (error) {
                console.error('Failed to load from API, using cached data:', error);
                if (this.isEmpty()) {
                    this.loadSampleData();
                }
            }
        } else {
            // Load sample data for demo/development
            this.loadSampleData();
        }
    },

    /**
     * Check if store is empty
     */
    isEmpty() {
        return this.teams.length === 0 && this.personnel.length === 0;
    },

    /**
     * Refresh all data from API
     */
    async refreshAll() {
        this.isLoading = true;
        this.emit('loading', true);

        try {
            const data = await SheetsAPI.loadAllData();

            // Map sheet data to store
            this.teams = data[CONFIG.SHEETS.TEAMS] || [];
            this.positions = data[CONFIG.SHEETS.POSITIONS] || [];
            this.personnel = data[CONFIG.SHEETS.PERSONNEL] || [];
            this.trainingTypes = data[CONFIG.SHEETS.TRAINING_TYPES] || [];
            this.positionTraining = data[CONFIG.SHEETS.POSITION_TRAINING] || [];
            this.personnelTraining = data[CONFIG.SHEETS.PERSONNEL_TRAINING] || [];
            this.rotationPatterns = data[CONFIG.SHEETS.ROTATION_PATTERNS] || [];
            this.shiftSchedule = data[CONFIG.SHEETS.SHIFT_SCHEDULE] || [];
            this.shiftSwaps = data[CONFIG.SHEETS.SHIFT_SWAPS] || [];
            this.straighsAssignments = data[CONFIG.SHEETS.STRAIGHTS] || [];

            // Process settings
            const settingsArray = data[CONFIG.SHEETS.SETTINGS] || [];
            this.settings = {};
            settingsArray.forEach(row => {
                if (row.SettingKey) {
                    this.settings[row.SettingKey] = row.SettingValue;
                }
            });

            this.lastLoaded = new Date();
            this.saveToCache();
            this.emit('dataLoaded', this.getSummary());
        } catch (error) {
            this.emit('error', error);
            throw error;
        } finally {
            this.isLoading = false;
            this.emit('loading', false);
        }
    },

    /**
     * Load data from local cache
     */
    loadFromCache() {
        const cached = Utils.storage.get(CONFIG.STORAGE_KEYS.CACHE);
        if (cached) {
            Object.assign(this, cached);
            this.lastLoaded = cached.lastLoaded ? new Date(cached.lastLoaded) : null;
        }
    },

    /**
     * Save data to local cache
     */
    saveToCache() {
        Utils.storage.set(CONFIG.STORAGE_KEYS.CACHE, {
            teams: this.teams,
            positions: this.positions,
            personnel: this.personnel,
            trainingTypes: this.trainingTypes,
            positionTraining: this.positionTraining,
            personnelTraining: this.personnelTraining,
            rotationPatterns: this.rotationPatterns,
            shiftSchedule: this.shiftSchedule,
            shiftSwaps: this.shiftSwaps,
            straighsAssignments: this.straighsAssignments,
            settings: this.settings,
            lastLoaded: this.lastLoaded
        });
    },

    /**
     * Load sample data for demo
     */
    loadSampleData() {
        // Teams
        this.teams = [
            { TeamID: 'T1', TeamName: 'Team 1', Description: 'Alpha Team', Color: '#4285f4' },
            { TeamID: 'T2', TeamName: 'Team 2', Description: 'Bravo Team', Color: '#ea4335' },
            { TeamID: 'T3', TeamName: 'Team 3', Description: 'Charlie Team', Color: '#34a853' },
            { TeamID: 'T4', TeamName: 'Team 4', Description: 'Delta Team', Color: '#fbbc05' },
            { TeamID: 'T5', TeamName: 'Team 5', Description: 'Echo Team', Color: '#9c27b0' }
        ];

        // Positions
        this.positions = [
            { PositionID: 'POS001', Title: 'Operator', Description: 'Control room operator', Department: 'Operations', Level: '1' },
            { PositionID: 'POS002', Title: 'Senior Operator', Description: 'Lead operator with training duties', Department: 'Operations', Level: '2' },
            { PositionID: 'POS003', Title: 'Supervisor', Description: 'Shift supervisor', Department: 'Operations', Level: '3' },
            { PositionID: 'POS004', Title: 'Technician', Description: 'Maintenance technician', Department: 'Maintenance', Level: '1' },
            { PositionID: 'POS005', Title: 'Lead Technician', Description: 'Senior maintenance lead', Department: 'Maintenance', Level: '2' }
        ];

        // Training Types
        this.trainingTypes = [
            { TrainingID: 'TR001', TrainingName: 'Safety Orientation', Description: 'Basic safety and emergency procedures', ValidityMonths: '12', Category: 'Safety' },
            { TrainingID: 'TR002', TrainingName: 'CPR/First Aid', Description: 'CPR and basic first aid certification', ValidityMonths: '24', Category: 'Safety' },
            { TrainingID: 'TR003', TrainingName: 'Lockout/Tagout', Description: 'LOTO procedures', ValidityMonths: '12', Category: 'Safety' },
            { TrainingID: 'TR004', TrainingName: 'Operator Certification', Description: 'Control room operations', ValidityMonths: '36', Category: 'Operations' },
            { TrainingID: 'TR005', TrainingName: 'Confined Space', Description: 'Confined space entry procedures', ValidityMonths: '12', Category: 'Safety' },
            { TrainingID: 'TR006', TrainingName: 'Fall Protection', Description: 'Working at heights', ValidityMonths: '12', Category: 'Safety' },
            { TrainingID: 'TR007', TrainingName: 'Forklift Operation', Description: 'Powered industrial truck operation', ValidityMonths: '36', Category: 'Equipment' },
            { TrainingID: 'TR008', TrainingName: 'Hazmat Awareness', Description: 'Hazardous materials handling', ValidityMonths: '12', Category: 'Safety' }
        ];

        // Position Training Requirements
        this.positionTraining = [
            { ID: 'PT001', PositionID: 'POS001', TrainingID: 'TR001', Required: 'TRUE' },
            { ID: 'PT002', PositionID: 'POS001', TrainingID: 'TR002', Required: 'TRUE' },
            { ID: 'PT003', PositionID: 'POS001', TrainingID: 'TR003', Required: 'TRUE' },
            { ID: 'PT004', PositionID: 'POS001', TrainingID: 'TR004', Required: 'TRUE' },
            { ID: 'PT005', PositionID: 'POS002', TrainingID: 'TR001', Required: 'TRUE' },
            { ID: 'PT006', PositionID: 'POS002', TrainingID: 'TR002', Required: 'TRUE' },
            { ID: 'PT007', PositionID: 'POS002', TrainingID: 'TR003', Required: 'TRUE' },
            { ID: 'PT008', PositionID: 'POS002', TrainingID: 'TR004', Required: 'TRUE' },
            { ID: 'PT009', PositionID: 'POS002', TrainingID: 'TR005', Required: 'TRUE' },
            { ID: 'PT010', PositionID: 'POS003', TrainingID: 'TR001', Required: 'TRUE' },
            { ID: 'PT011', PositionID: 'POS003', TrainingID: 'TR002', Required: 'TRUE' },
            { ID: 'PT012', PositionID: 'POS004', TrainingID: 'TR001', Required: 'TRUE' },
            { ID: 'PT013', PositionID: 'POS004', TrainingID: 'TR003', Required: 'TRUE' },
            { ID: 'PT014', PositionID: 'POS004', TrainingID: 'TR007', Required: 'TRUE' }
        ];

        // Sample Personnel (20 people, 4 per team)
        this.personnel = this.generateSamplePersonnel();

        // Sample Training Records
        this.personnelTraining = this.generateSampleTrainingRecords();

        // Rotation Patterns
        this.rotationPatterns = [
            {
                PatternID: 'RP001',
                Name: 'DuPont',
                Description: '4-week rotating pattern with 12-hour shifts',
                CycleDays: '28',
                Pattern: 'D,D,D,D,O,O,O,N,N,N,N,O,O,O,D,D,D,O,O,O,O,N,N,N,O,O,O,O',
                IsActive: 'TRUE'
            }
        ];

        // Generate sample schedule
        this.shiftSchedule = this.generateSampleSchedule();

        // Sample straights assignments
        this.straighsAssignments = [
            { ID: 'SA001', PersonID: 'P001', TeamID: 'T1', WeekStartDate: this.getNextMonday(), WeekEndDate: this.getNextFriday(), Location: 'Training Center', DailyStartTime: '0700', DailyEndTime: '1500', Notes: 'Annual recertification' },
            { ID: 'SA002', PersonID: 'P006', TeamID: 'T2', WeekStartDate: this.getNextMonday(7), WeekEndDate: this.getNextFriday(7), Location: 'Main Office', DailyStartTime: '0800', DailyEndTime: '1600', Notes: 'Administrative duties' }
        ];

        // Empty swaps
        this.shiftSwaps = [];

        this.lastLoaded = new Date();
        this.emit('dataLoaded', this.getSummary());
    },

    /**
     * Generate sample personnel
     */
    generateSamplePersonnel() {
        const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Amanda', 'Robert', 'Lisa',
            'James', 'Jennifer', 'Daniel', 'Michelle', 'William', 'Ashley', 'Richard', 'Jessica', 'Thomas', 'Nicole'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
            'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez'];

        const personnel = [];
        let personIndex = 0;

        for (let teamNum = 1; teamNum <= 5; teamNum++) {
            for (let i = 0; i < 4; i++) {
                const firstName = firstNames[personIndex % firstNames.length];
                const lastName = lastNames[personIndex % lastNames.length];
                const positionIndex = i === 0 ? 2 : (i === 1 ? 1 : 0); // Supervisor, Senior Op, 2 Operators

                personnel.push({
                    PersonID: `P${String(personIndex + 1).padStart(3, '0')}`,
                    EmployeeNumber: `EMP${String(10000 + personIndex).substring(1)}`,
                    FirstName: firstName,
                    LastName: lastName,
                    Email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
                    Phone: `555-${String(100 + personIndex).padStart(3, '0')}-${String(1000 + personIndex).substring(1)}`,
                    EmergencyContact: 'Emergency Contact',
                    EmergencyPhone: `555-999-${String(1000 + personIndex).substring(1)}`,
                    TeamID: `T${teamNum}`,
                    PositionID: `POS${String(positionIndex + 1).padStart(3, '0')}`,
                    HireDate: `202${Math.floor(personIndex / 7)}-0${(personIndex % 12) + 1}-15`,
                    PositionStartDate: `202${Math.floor(personIndex / 7) + 1}-0${(personIndex % 12) + 1}-01`,
                    Supervisor: i === 0 ? '' : `P${String(teamNum * 4 - 3).padStart(3, '0')}`,
                    Department: 'Operations',
                    Status: 'Active',
                    BadgeNumber: `B${String(100 + personIndex).padStart(3, '0')}`,
                    Notes: ''
                });
                personIndex++;
            }
        }
        return personnel;
    },

    /**
     * Generate sample training records
     */
    generateSampleTrainingRecords() {
        const records = [];
        const today = new Date();
        let recordIndex = 1;

        this.personnel.forEach(person => {
            // Get required training for person's position
            const requiredTraining = this.positionTraining.filter(pt => pt.PositionID === person.PositionID);

            requiredTraining.forEach(req => {
                const training = this.trainingTypes.find(t => t.TrainingID === req.TrainingID);
                if (!training) return;

                // Randomly generate completion dates (some expired, some current, some expiring soon)
                const randomMonths = Math.floor(Math.random() * parseInt(training.ValidityMonths || 12));
                const completionDate = new Date(today);
                completionDate.setMonth(completionDate.getMonth() - randomMonths);

                const expirationDate = new Date(completionDate);
                expirationDate.setMonth(expirationDate.getMonth() + parseInt(training.ValidityMonths || 12));

                const status = Utils.getTrainingStatus(expirationDate.toISOString().split('T')[0]);

                records.push({
                    ID: `PTR${String(recordIndex).padStart(3, '0')}`,
                    PersonID: person.PersonID,
                    TrainingID: req.TrainingID,
                    CompletionDate: completionDate.toISOString().split('T')[0],
                    ExpirationDate: expirationDate.toISOString().split('T')[0],
                    Status: status === 'current' ? 'Current' : (status === 'expiring' ? 'Due Soon' : 'Expired'),
                    Notes: ''
                });
                recordIndex++;
            });
        });

        return records;
    },

    /**
     * Generate sample schedule for next 60 days
     */
    generateSampleSchedule() {
        const schedule = [];
        const pattern = CONFIG.DEFAULT_ROTATION_PATTERN.pattern.split(',');
        const patternLength = pattern.length;

        // Pattern start date (arbitrary reference point)
        const patternStart = new Date('2024-01-01');

        // Generate for each person
        this.personnel.forEach(person => {
            const team = this.teams.find(t => t.TeamID === person.TeamID);
            const teamIndex = parseInt(person.TeamID.replace('T', '')) - 1;
            const offset = Utils.getTeamPatternOffset(teamIndex, 5, patternLength);

            // Generate 60 days of schedule
            const today = new Date();
            for (let day = 0; day < 60; day++) {
                const date = Utils.addDays(today, day);
                const shiftType = Utils.getShiftFromPattern(date, patternStart, CONFIG.DEFAULT_ROTATION_PATTERN.pattern, offset);

                let startTime = '';
                let endTime = '';

                if (shiftType === 'Day') {
                    startTime = CONFIG.SHIFTS.DAY.START.replace(':', '');
                    endTime = CONFIG.SHIFTS.DAY.END.replace(':', '');
                } else if (shiftType === 'Night') {
                    startTime = CONFIG.SHIFTS.NIGHT.START.replace(':', '');
                    endTime = CONFIG.SHIFTS.NIGHT.END.replace(':', '');
                }

                schedule.push({
                    ID: Utils.generateId('SS'),
                    PersonID: person.PersonID,
                    TeamID: person.TeamID,
                    Date: date.toISOString().split('T')[0],
                    ShiftType: shiftType,
                    StartTime: startTime,
                    EndTime: endTime,
                    Location: 'Main Plant',
                    IsOverride: 'FALSE',
                    Notes: ''
                });
            }
        });

        return schedule;
    },

    /**
     * Get next Monday
     */
    getNextMonday(offsetDays = 0) {
        const today = new Date();
        today.setDate(today.getDate() + offsetDays);
        const day = today.getDay();
        const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day);
        today.setDate(today.getDate() + diff);
        return today.toISOString().split('T')[0];
    },

    /**
     * Get next Friday
     */
    getNextFriday(offsetDays = 0) {
        const monday = new Date(this.getNextMonday(offsetDays));
        monday.setDate(monday.getDate() + 4);
        return monday.toISOString().split('T')[0];
    },

    /**
     * Get data summary
     */
    getSummary() {
        return {
            personnelCount: this.personnel.length,
            teamsCount: this.teams.length,
            positionsCount: this.positions.length,
            trainingTypesCount: this.trainingTypes.length,
            activePersonnel: this.personnel.filter(p => p.Status === 'Active').length,
            lastLoaded: this.lastLoaded
        };
    },

    // ========================================
    // Lookup Methods
    // ========================================

    getTeam(teamId) {
        return this.teams.find(t => t.TeamID === teamId);
    },

    getTeamName(teamId) {
        const team = this.getTeam(teamId);
        return team ? team.TeamName : teamId;
    },

    getTeamColor(teamId) {
        const team = this.getTeam(teamId);
        return team?.Color || CONFIG.TEAM_COLORS[teamId] || '#6b7280';
    },

    getPosition(positionId) {
        return this.positions.find(p => p.PositionID === positionId);
    },

    getPositionTitle(positionId) {
        const position = this.getPosition(positionId);
        return position ? position.Title : positionId;
    },

    getPerson(personId) {
        return this.personnel.find(p => p.PersonID === personId);
    },

    getPersonName(personId) {
        const person = this.getPerson(personId);
        return person ? `${person.FirstName} ${person.LastName}` : personId;
    },

    getPersonnelByTeam(teamId) {
        return this.personnel.filter(p => p.TeamID === teamId);
    },

    getPersonnelByPosition(positionId) {
        return this.personnel.filter(p => p.PositionID === positionId);
    },

    getTrainingType(trainingId) {
        return this.trainingTypes.find(t => t.TrainingID === trainingId);
    },

    getTrainingName(trainingId) {
        const training = this.getTrainingType(trainingId);
        return training ? training.Name : trainingId;
    },

    getRequiredTrainingForPosition(positionId) {
        return this.positionTraining
            .filter(pt => pt.PositionID === positionId && pt.Required === 'TRUE')
            .map(pt => this.getTrainingType(pt.TrainingID))
            .filter(Boolean);
    },

    getPersonTrainingRecords(personId) {
        return this.personnelTraining.filter(pt => pt.PersonID === personId);
    },

    getScheduleForDate(date) {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return this.shiftSchedule.filter(s => s.Date === dateStr);
    },

    getScheduleForPerson(personId, startDate, endDate) {
        return this.shiftSchedule.filter(s => {
            if (s.PersonID !== personId) return false;
            if (startDate && s.Date < startDate) return false;
            if (endDate && s.Date > endDate) return false;
            return true;
        });
    },

    getScheduleForTeam(teamId, startDate, endDate) {
        return this.shiftSchedule.filter(s => {
            if (s.TeamID !== teamId) return false;
            if (startDate && s.Date < startDate) return false;
            if (endDate && s.Date > endDate) return false;
            return true;
        });
    },

    getStraightsForPerson(personId) {
        return this.straighsAssignments.filter(s => s.PersonID === personId);
    },

    getCurrentStraights() {
        const today = new Date().toISOString().split('T')[0];
        return this.straighsAssignments.filter(s => s.WeekStartDate <= today && s.WeekEndDate >= today);
    },

    getUpcomingStraights(days = 30) {
        const today = new Date();
        const futureDate = Utils.addDays(today, days).toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];

        return this.straighsAssignments.filter(s => s.WeekStartDate >= todayStr && s.WeekStartDate <= futureDate);
    },

    // ========================================
    // Computed Data Methods
    // ========================================

    /**
     * Get training compliance for a person
     */
    getPersonTrainingCompliance(personId) {
        const person = this.getPerson(personId);
        if (!person) return { current: 0, expiring: 0, expired: 0, missing: 0, total: 0 };

        const required = this.getRequiredTrainingForPosition(person.PositionID);
        const records = this.getPersonTrainingRecords(personId);

        let current = 0, expiring = 0, expired = 0, missing = 0;

        required.forEach(training => {
            const record = records.find(r => r.TrainingID === training.TrainingID);
            if (!record) {
                missing++;
            } else {
                const status = Utils.getTrainingStatus(record.ExpirationDate);
                if (status === 'current') current++;
                else if (status === 'expiring') expiring++;
                else expired++;
            }
        });

        return { current, expiring, expired, missing, total: required.length };
    },

    /**
     * Get expiring training within N days
     */
    getExpiringTraining(days = 30) {
        const today = new Date();
        const futureDate = Utils.addDays(today, days);
        const todayStr = today.toISOString().split('T')[0];
        const futureDateStr = futureDate.toISOString().split('T')[0];

        return this.personnelTraining
            .filter(pt => {
                if (!pt.ExpirationDate) return false;
                return pt.ExpirationDate >= todayStr && pt.ExpirationDate <= futureDateStr;
            })
            .map(pt => ({
                ...pt,
                person: this.getPerson(pt.PersonID),
                training: this.getTrainingType(pt.TrainingID),
                daysRemaining: Utils.daysDiff(today, pt.ExpirationDate)
            }))
            .sort((a, b) => a.daysRemaining - b.daysRemaining);
    },

    /**
     * Get who's working on a specific date
     */
    getWhosWorking(date, shiftType = null) {
        const schedule = this.getScheduleForDate(date);
        let working = schedule.filter(s => s.ShiftType !== 'Off');

        if (shiftType) {
            working = working.filter(s => s.ShiftType === shiftType);
        }

        // Also check for straights
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const straights = this.straighsAssignments.filter(s =>
            s.WeekStartDate <= dateStr && s.WeekEndDate >= dateStr
        );

        straights.forEach(s => {
            // Override schedule with straights
            const existing = working.find(w => w.PersonID === s.PersonID);
            if (existing) {
                existing.ShiftType = 'Straights';
                existing.Location = s.Location;
                existing.StartTime = s.DailyStartTime;
                existing.EndTime = s.DailyEndTime;
            }
        });

        return working.map(w => ({
            ...w,
            person: this.getPerson(w.PersonID),
            team: this.getTeam(w.TeamID)
        }));
    },

    /**
     * Get team stats
     */
    getTeamStats(teamId) {
        const personnel = this.getPersonnelByTeam(teamId);
        const active = personnel.filter(p => p.Status === 'Active');

        let trainingIssues = 0;
        active.forEach(p => {
            const compliance = this.getPersonTrainingCompliance(p.PersonID);
            if (compliance.expired > 0 || compliance.missing > 0) {
                trainingIssues++;
            }
        });

        return {
            total: personnel.length,
            active: active.length,
            onLOA: personnel.filter(p => p.Status === 'LOA').length,
            trainingIssues
        };
    },

    // ========================================
    // CRUD Operations (Save to Google Sheets)
    // ========================================

    /**
     * Add a new person
     */
    async addPerson(personData) {
        // Generate ID if not provided
        if (!personData.PersonnelID) {
            personData.PersonnelID = Utils.generateId('P');
        }

        // Add to local store
        this.personnel.push(personData);

        // Save to Google Sheets
        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.appendRow(CONFIG.SHEETS.PERSONNEL, personData);
        }

        this.saveToCache();
        this.emit('personnelAdded', personData);
        return personData;
    },

    /**
     * Update a person
     */
    async updatePerson(personId, updates) {
        const index = this.personnel.findIndex(p => p.PersonnelID === personId);
        if (index === -1) throw new Error('Person not found');

        // Update local store
        this.personnel[index] = { ...this.personnel[index], ...updates };

        // Save to Google Sheets
        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.updateRow(CONFIG.SHEETS.PERSONNEL, index, this.personnel[index]);
        }

        this.saveToCache();
        this.emit('personnelUpdated', this.personnel[index]);
        return this.personnel[index];
    },

    /**
     * Delete a person
     */
    async deletePerson(personId) {
        const index = this.personnel.findIndex(p => p.PersonnelID === personId);
        if (index === -1) throw new Error('Person not found');

        // Remove from local store
        const deleted = this.personnel.splice(index, 1)[0];

        // Delete from Google Sheets
        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.deleteRow(CONFIG.SHEETS.PERSONNEL, index);
        }

        this.saveToCache();
        this.emit('personnelDeleted', deleted);
        return deleted;
    },

    /**
     * Add a new team
     */
    async addTeam(teamData) {
        if (!teamData.TeamID) {
            teamData.TeamID = Utils.generateId('T');
        }

        this.teams.push(teamData);

        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.appendRow(CONFIG.SHEETS.TEAMS, teamData);
        }

        this.saveToCache();
        this.emit('teamAdded', teamData);
        return teamData;
    },

    /**
     * Update a team
     */
    async updateTeam(teamId, updates) {
        const index = this.teams.findIndex(t => t.TeamID === teamId);
        if (index === -1) throw new Error('Team not found');

        this.teams[index] = { ...this.teams[index], ...updates };

        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.updateRow(CONFIG.SHEETS.TEAMS, index, this.teams[index]);
        }

        this.saveToCache();
        this.emit('teamUpdated', this.teams[index]);
        return this.teams[index];
    },

    /**
     * Delete a team
     */
    async deleteTeam(teamId) {
        const index = this.teams.findIndex(t => t.TeamID === teamId);
        if (index === -1) throw new Error('Team not found');

        const deleted = this.teams.splice(index, 1)[0];

        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.deleteRow(CONFIG.SHEETS.TEAMS, index);
        }

        this.saveToCache();
        this.emit('teamDeleted', deleted);
        return deleted;
    },

    /**
     * Add a training record
     */
    async addTrainingRecord(recordData) {
        if (!recordData.PersonnelID) {
            recordData.PersonnelID = Utils.generateId('PTR');
        }

        this.personnelTraining.push(recordData);

        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.appendRow(CONFIG.SHEETS.PERSONNEL_TRAINING, recordData);
        }

        this.saveToCache();
        this.emit('trainingRecordAdded', recordData);
        return recordData;
    },

    /**
     * Update a training record
     */
    async updateTrainingRecord(recordId, updates) {
        const index = this.personnelTraining.findIndex(r => r.PersonnelID === recordId || r.ID === recordId);
        if (index === -1) throw new Error('Training record not found');

        this.personnelTraining[index] = { ...this.personnelTraining[index], ...updates };

        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.updateRow(CONFIG.SHEETS.PERSONNEL_TRAINING, index, this.personnelTraining[index]);
        }

        this.saveToCache();
        this.emit('trainingRecordUpdated', this.personnelTraining[index]);
        return this.personnelTraining[index];
    },

    /**
     * Add a straights assignment
     */
    async addStraightsAssignment(assignmentData) {
        if (!assignmentData.AssignmentID) {
            assignmentData.AssignmentID = Utils.generateId('SA');
        }

        this.straighsAssignments.push(assignmentData);

        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.appendRow(CONFIG.SHEETS.STRAIGHTS, assignmentData);
        }

        this.saveToCache();
        this.emit('straightsAdded', assignmentData);
        return assignmentData;
    },

    /**
     * Add a shift swap request
     */
    async addShiftSwap(swapData) {
        if (!swapData.SwapID) {
            swapData.SwapID = Utils.generateId('SW');
        }

        this.shiftSwaps.push(swapData);

        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.appendRow(CONFIG.SHEETS.SHIFT_SWAPS, swapData);
        }

        this.saveToCache();
        this.emit('swapAdded', swapData);
        return swapData;
    },

    /**
     * Update a shift swap
     */
    async updateShiftSwap(swapId, updates) {
        const index = this.shiftSwaps.findIndex(s => s.SwapID === swapId);
        if (index === -1) throw new Error('Shift swap not found');

        this.shiftSwaps[index] = { ...this.shiftSwaps[index], ...updates };

        if (SheetsAPI.isConfigured()) {
            await SheetsAPI.updateRow(CONFIG.SHEETS.SHIFT_SWAPS, index, this.shiftSwaps[index]);
        }

        this.saveToCache();
        this.emit('swapUpdated', this.shiftSwaps[index]);
        return this.shiftSwaps[index];
    },

    /**
     * Save all data to Google Sheets (full sync)
     */
    async saveAllData() {
        if (!SheetsAPI.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        await Promise.all([
            SheetsAPI.saveSheet(CONFIG.SHEETS.TEAMS, this.teams),
            SheetsAPI.saveSheet(CONFIG.SHEETS.POSITIONS, this.positions),
            SheetsAPI.saveSheet(CONFIG.SHEETS.PERSONNEL, this.personnel),
            SheetsAPI.saveSheet(CONFIG.SHEETS.TRAINING_TYPES, this.trainingTypes),
            SheetsAPI.saveSheet(CONFIG.SHEETS.POSITION_TRAINING, this.positionTraining),
            SheetsAPI.saveSheet(CONFIG.SHEETS.PERSONNEL_TRAINING, this.personnelTraining),
            SheetsAPI.saveSheet(CONFIG.SHEETS.ROTATION_PATTERNS, this.rotationPatterns),
            SheetsAPI.saveSheet(CONFIG.SHEETS.SHIFT_SCHEDULE, this.shiftSchedule),
            SheetsAPI.saveSheet(CONFIG.SHEETS.SHIFT_SWAPS, this.shiftSwaps),
            SheetsAPI.saveSheet(CONFIG.SHEETS.STRAIGHTS, this.straighsAssignments)
        ]);

        this.emit('allDataSaved');
    },

    // ========================================
    // Event System
    // ========================================

    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    },

    off(event, callback) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    },

    emit(event, data) {
        if (!this._listeners[event]) return;
        this._listeners[event].forEach(callback => callback(data));
    }
};

// Make globally available
window.DataStore = DataStore;
