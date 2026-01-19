/**
 * Main Application Controller
 * Personnel & Shift Tracker
 */

const App = {
    currentView: 'dashboard',
    gapiLoaded: false,
    gisLoaded: false,

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Personnel & Shift Tracker...');

        // Show loading
        Components.showLoading('Loading application...');

        try {
            // Initialize data store (will load cache/sample data first)
            await DataStore.init();

            // Setup event listeners
            this.bindEvents();

            // Update connection status
            this.updateConnectionStatus();

            // Update current date display
            this.updateCurrentDate();

            // Initialize all views
            this.initializeViews();

            // Show dashboard
            this.showView('dashboard');

            Components.hideLoading();
            console.log('Application initialized successfully');

            // Initialize Google APIs (async, non-blocking)
            this.initGoogleAPIs();

        } catch (error) {
            console.error('Initialization error:', error);
            Components.hideLoading();
            Components.toast('Error loading application: ' + error.message, 'error');
        }
    },

    /**
     * Initialize Google APIs for Sheets integration
     */
    initGoogleAPIs() {
        // Load GAPI
        if (typeof gapi !== 'undefined') {
            gapi.load('client', async () => {
                try {
                    await SheetsAPI.initGapiClient();
                    this.gapiLoaded = true;
                    console.log('Google API client loaded');
                    this.checkGoogleReady();
                } catch (error) {
                    console.error('Error loading Google API client:', error);
                }
            });
        } else {
            // Wait for gapi to load
            const checkGapi = setInterval(() => {
                if (typeof gapi !== 'undefined') {
                    clearInterval(checkGapi);
                    gapi.load('client', async () => {
                        try {
                            await SheetsAPI.initGapiClient();
                            this.gapiLoaded = true;
                            console.log('Google API client loaded');
                            this.checkGoogleReady();
                        } catch (error) {
                            console.error('Error loading Google API client:', error);
                        }
                    });
                }
            }, 100);
        }

        // Load GIS (Google Identity Services)
        if (typeof google !== 'undefined' && google.accounts) {
            SheetsAPI.initGisClient();
            this.gisLoaded = true;
            console.log('Google Identity Services loaded');
            this.checkGoogleReady();
        } else {
            // Wait for GIS to load
            const checkGis = setInterval(() => {
                if (typeof google !== 'undefined' && google.accounts) {
                    clearInterval(checkGis);
                    SheetsAPI.initGisClient();
                    this.gisLoaded = true;
                    console.log('Google Identity Services loaded');
                    this.checkGoogleReady();
                }
            }, 100);
        }
    },

    /**
     * Check if both Google APIs are ready
     */
    checkGoogleReady() {
        if (this.gapiLoaded && this.gisLoaded) {
            console.log('Google APIs ready');
            this.updateConnectionStatus();
        }
    },

    /**
     * Bind global event listeners
     */
    bindEvents() {
        // Sidebar toggle
        document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
            document.querySelector('.main-content').classList.toggle('expanded');
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) {
                    this.showView(view);
                }
            });
        });

        // Panel links (navigation within panels)
        document.querySelectorAll('.panel-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                if (view) {
                    this.showView(view);
                }
            });
        });

        // Refresh button
        document.getElementById('refresh-btn')?.addEventListener('click', () => {
            this.refreshData();
        });

        // Settings button
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.showSettings();
        });

        // Settings modal close buttons
        document.querySelectorAll('[data-close="settings-modal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('settings-modal').classList.add('hidden');
            });
        });

        // Google Sign-In button
        document.getElementById('google-signin-btn')?.addEventListener('click', () => {
            SheetsAPI.handleSignIn();
        });

        // Google Sign-Out button
        document.getElementById('google-signout-btn')?.addEventListener('click', () => {
            SheetsAPI.handleSignOut();
        });

        // Test connection button
        document.getElementById('test-connection-btn')?.addEventListener('click', () => {
            this.testConnection();
        });

        // Initialize Sheets button
        document.getElementById('init-sheets-btn')?.addEventListener('click', () => {
            this.initializeSheets();
        });

        // Delete Unused Sheets button
        document.getElementById('delete-unused-sheets-btn')?.addEventListener('click', () => {
            this.deleteUnusedSheets();
        });

        // Save settings button
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Listen for Google auth changes
        window.addEventListener('googleAuthChange', (e) => {
            this.updateConnectionStatus();
            this.updateSettingsConnectionStatus(e.detail.isSignedIn);
        });

        // Listen for data changes
        DataStore.on('loading', (isLoading) => {
            if (isLoading) {
                Components.showLoading('Syncing data...');
            } else {
                Components.hideLoading();
            }
        });

        DataStore.on('dataLoaded', () => {
            this.refreshCurrentView();
            this.updateConnectionStatus();
        });

        DataStore.on('error', (error) => {
            Components.toast('Data error: ' + error.message, 'error');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                Components.closeModal();
                document.getElementById('settings-modal')?.classList.add('hidden');
            }

            // Ctrl+R to refresh
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshData();
            }
        });
    },

    /**
     * Initialize all views
     */
    initializeViews() {
        // Each view has its own init that sets up its specific event handlers
        DashboardView.init();
        PersonnelView.init();
        TeamsView.init();
        PositionsView.init();
        TrainingView.init();
        ScheduleView.init();
        StraightsView.init();
        SwapsView.init();
        ReportsView.init();
    },

    /**
     * Show a specific view
     */
    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const viewElement = document.getElementById(`view-${viewName}`);
        if (viewElement) {
            viewElement.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            }
        });

        this.currentView = viewName;

        // Trigger view-specific render
        this.renderView(viewName);
    },

    /**
     * Render a specific view
     */
    renderView(viewName) {
        switch (viewName) {
            case 'dashboard':
                DashboardView.render();
                break;
            case 'personnel':
                PersonnelView.render();
                break;
            case 'teams':
                TeamsView.render();
                break;
            case 'positions':
                PositionsView.render();
                break;
            case 'training-overview':
                TrainingView.renderOverview();
                break;
            case 'training-types':
                TrainingView.renderTrainingTypes();
                break;
            case 'training-matrix':
                TrainingView.renderTrainingMatrix();
                break;
            case 'expiring-training':
                TrainingView.renderExpiringTraining();
                break;
            case 'schedule-calendar':
                ScheduleView.renderCalendar();
                break;
            case 'schedule-team':
                ScheduleView.renderTeamSchedule();
                break;
            case 'whos-working':
                ScheduleView.renderWhosWorking();
                break;
            case 'rotation-patterns':
                ScheduleView.renderRotationPatterns();
                break;
            case 'straights':
                StraightsView.render();
                break;
            case 'shift-swaps':
                SwapsView.render();
                break;
            case 'reports':
                // Reports view is mostly static
                break;
        }
    },

    /**
     * Refresh current view
     */
    refreshCurrentView() {
        this.renderView(this.currentView);
    },

    /**
     * Refresh data from source
     */
    async refreshData() {
        if (!SheetsAPI.isConfigured()) {
            Components.toast('Please configure Google Sheets connection in Settings', 'warning');
            this.showSettings();
            return;
        }

        try {
            await DataStore.refreshAll();
            Components.toast('Data refreshed successfully', 'success');
        } catch (error) {
            Components.toast('Failed to refresh data: ' + error.message, 'error');
        }
    },

    /**
     * Update connection status indicator
     */
    updateConnectionStatus() {
        const statusEl = document.getElementById('connection-status');
        const isSignedIn = SheetsAPI.isSignedIn();
        const isConfigured = SheetsAPI.isConfigured();
        const hasData = !DataStore.isEmpty();

        if (isConfigured && hasData) {
            statusEl.innerHTML = '<i class="fas fa-circle text-success"></i><span>Connected</span>';
            statusEl.title = `Last sync: ${DataStore.lastLoaded ? Utils.formatDate(DataStore.lastLoaded, 'long') : 'Never'}`;
        } else if (isSignedIn && !hasData) {
            statusEl.innerHTML = '<i class="fas fa-circle text-warning"></i><span>Signed In</span>';
            statusEl.title = 'Signed in to Google. Click refresh to load data.';
        } else if (hasData) {
            statusEl.innerHTML = '<i class="fas fa-circle text-warning"></i><span>Demo Mode</span>';
            statusEl.title = 'Using sample data. Sign in to Google for live data.';
        } else {
            statusEl.innerHTML = '<i class="fas fa-circle text-danger"></i><span>Not Connected</span>';
            statusEl.title = 'Sign in to Google to connect';
        }
    },

    /**
     * Update settings modal connection status
     */
    updateSettingsConnectionStatus(isSignedIn) {
        const statusBox = document.getElementById('settings-connection-status');
        if (!statusBox) return;

        if (isSignedIn) {
            statusBox.innerHTML = '<i class="fas fa-circle text-success"></i><span>Connected to Google Sheets</span>';
        } else {
            statusBox.innerHTML = '<i class="fas fa-circle text-gray"></i><span>Not connected - Please sign in with Google</span>';
        }
    },

    /**
     * Update current date display
     */
    updateCurrentDate() {
        const dateEl = document.getElementById('current-date');
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Update every minute
        setInterval(() => {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }, 60000);
    },

    /**
     * Show settings modal
     */
    showSettings() {
        const modal = document.getElementById('settings-modal');

        // Load current settings
        const settings = Utils.storage.get(CONFIG.STORAGE_KEYS.SETTINGS) || {};

        // Show configured spreadsheet ID (read-only now)
        document.getElementById('setting-spreadsheet-id').value = CONFIG.SPREADSHEET_ID || '';
        document.getElementById('setting-day-start').value = settings.dayShiftStart || CONFIG.SHIFTS.DAY.START;
        document.getElementById('setting-day-end').value = settings.dayShiftEnd || CONFIG.SHIFTS.DAY.END;
        document.getElementById('setting-night-start').value = settings.nightShiftStart || CONFIG.SHIFTS.NIGHT.START;
        document.getElementById('setting-night-end').value = settings.nightShiftEnd || CONFIG.SHIFTS.NIGHT.END;
        document.getElementById('setting-straights-start').value = settings.straightsStart || CONFIG.SHIFTS.STRAIGHTS.START;
        document.getElementById('setting-straights-end').value = settings.straightsEnd || CONFIG.SHIFTS.STRAIGHTS.END;
        document.getElementById('setting-warning-days').value = settings.warningDays || CONFIG.TRAINING.WARNING_DAYS;

        // Update connection status in settings
        this.updateSettingsConnectionStatus(SheetsAPI.isSignedIn());

        modal.classList.remove('hidden');
    },

    /**
     * Test Google Sheets connection
     */
    async testConnection() {
        if (!SheetsAPI.isSignedIn()) {
            Components.toast('Please sign in to Google first', 'warning');
            return;
        }

        try {
            const result = await SheetsAPI.testConnection();
            Components.toast(`${result.message} Spreadsheet: ${result.spreadsheetTitle}`, 'success');
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    /**
     * Initialize sheets in the spreadsheet
     */
    async initializeSheets() {
        if (!SheetsAPI.isSignedIn()) {
            Components.toast('Please sign in to Google first', 'warning');
            return;
        }

        try {
            Components.showLoading('Initializing sheets...');
            const result = await SheetsAPI.initializeSheets();

            if (result.created.length > 0) {
                Components.toast(`Created ${result.created.length} new sheets: ${result.created.join(', ')}`, 'success');
            } else {
                Components.toast('All required sheets already exist', 'info');
            }

            Components.hideLoading();
        } catch (error) {
            Components.hideLoading();
            Components.toast('Failed to initialize sheets: ' + error.message, 'error');
        }
    },

    /**
     * Delete unused sheets from the spreadsheet
     */
    async deleteUnusedSheets() {
        if (!SheetsAPI.isSignedIn()) {
            Components.toast('Please sign in to Google first', 'warning');
            return;
        }

        // Confirm with user
        if (!confirm('This will delete all sheets that are not used by Personnel Tracker (e.g., old StageWise sheets). This cannot be undone. Continue?')) {
            return;
        }

        try {
            Components.showLoading('Deleting unused sheets...');
            const result = await SheetsAPI.deleteUnusedSheets();

            if (result.deleted.length > 0) {
                Components.toast(`Deleted ${result.deleted.length} sheets: ${result.deleted.join(', ')}`, 'success');
            } else {
                Components.toast('No unused sheets to delete', 'info');
            }

            Components.hideLoading();
        } catch (error) {
            Components.hideLoading();
            Components.toast('Failed to delete sheets: ' + error.message, 'error');
        }
    },

    /**
     * Save settings
     */
    saveSettings() {
        const settings = {
            dayShiftStart: document.getElementById('setting-day-start').value,
            dayShiftEnd: document.getElementById('setting-day-end').value,
            nightShiftStart: document.getElementById('setting-night-start').value,
            nightShiftEnd: document.getElementById('setting-night-end').value,
            straightsStart: document.getElementById('setting-straights-start').value,
            straightsEnd: document.getElementById('setting-straights-end').value,
            warningDays: parseInt(document.getElementById('setting-warning-days').value) || 30
        };

        // Save to local storage
        Utils.storage.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);

        // Close modal
        document.getElementById('settings-modal').classList.add('hidden');

        Components.toast('Settings saved successfully', 'success');

        // Update connection status
        this.updateConnectionStatus();
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally available
window.App = App;
