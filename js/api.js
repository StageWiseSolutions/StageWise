/**
 * Google Sheets API Integration with OAuth
 * Handles all communication with Google Sheets using gapi.client
 * Provides full read/write access
 */

const SheetsAPI = {
    // Authentication state
    _isSignedIn: false,
    _tokenClient: null,
    _gapiInited: false,
    _gisInited: false,

    // Store for loaded data
    _cache: {},
    _cacheTimestamps: {},

    // Sheet headers for each sheet type
    SHEET_HEADERS: {
        Teams: ['TeamID', 'TeamName', 'Color', 'Description', 'Active'],
        Positions: ['PositionID', 'PositionName', 'TeamID', 'Description', 'MinStaffing', 'Active'],
        Personnel: ['PersonnelID', 'FirstName', 'LastName', 'Email', 'Phone', 'TeamID', 'PositionID', 'HireDate', 'Status', 'Notes'],
        TrainingTypes: ['TrainingID', 'TrainingName', 'Category', 'ValidityMonths', 'Description', 'Required'],
        PositionTraining: ['PositionID', 'TrainingID', 'Required'],
        PersonnelTraining: ['PersonnelID', 'TrainingID', 'CompletedDate', 'ExpirationDate', 'Status', 'Notes'],
        RotationPatterns: ['PatternID', 'PatternName', 'CycleDays', 'Pattern', 'Description'],
        ShiftSchedule: ['ScheduleID', 'PersonnelID', 'Date', 'ShiftType', 'StartTime', 'EndTime', 'Notes'],
        ShiftSwaps: ['SwapID', 'RequestorID', 'RequestDate', 'OriginalDate', 'OriginalShift', 'TargetID', 'TargetDate', 'TargetShift', 'Status', 'ApprovedBy', 'ApprovedDate', 'Notes'],
        StraightsAssignments: ['AssignmentID', 'PersonnelID', 'StartDate', 'EndDate', 'Reason', 'ApprovedBy', 'Notes'],
        Settings: ['SettingKey', 'SettingValue', 'Description']
    },

    /**
     * Initialize the Google API client
     */
    async initGapiClient() {
        await gapi.client.init({});
        await gapi.client.load('sheets', 'v4');
        this._gapiInited = true;
        this.maybeEnableButtons();
    },

    /**
     * Initialize the Google Identity Services client
     */
    initGisClient() {
        this._tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.CLIENT_ID,
            scope: CONFIG.SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error('Token error:', tokenResponse);
                    return;
                }
                this._isSignedIn = true;
                this.onSignInChange(true);
            },
        });
        this._gisInited = true;
        this.maybeEnableButtons();
    },

    /**
     * Check if both APIs are initialized and enable sign-in
     */
    maybeEnableButtons() {
        if (this._gapiInited && this._gisInited) {
            // Check if we have a valid token
            const token = gapi.client.getToken();
            if (token) {
                this._isSignedIn = true;
                this.onSignInChange(true);
            }
        }
    },

    /**
     * Handle sign-in button click
     */
    handleSignIn() {
        if (!this._tokenClient) {
            console.error('Token client not initialized');
            return;
        }

        if (gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and consent
            this._tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            // Skip consent for returning users
            this._tokenClient.requestAccessToken({ prompt: '' });
        }
    },

    /**
     * Handle sign-out
     */
    handleSignOut() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken(null);
        }
        this._isSignedIn = false;
        this.onSignInChange(false);
    },

    /**
     * Callback when sign-in state changes
     */
    onSignInChange(isSignedIn) {
        // Update UI elements
        const signInBtn = document.getElementById('google-signin-btn');
        const signOutBtn = document.getElementById('google-signout-btn');
        const userInfo = document.getElementById('google-user-info');

        if (signInBtn) signInBtn.style.display = isSignedIn ? 'none' : 'inline-flex';
        if (signOutBtn) signOutBtn.style.display = isSignedIn ? 'inline-flex' : 'none';

        if (isSignedIn && userInfo) {
            userInfo.textContent = 'Connected to Google Sheets';
            userInfo.style.display = 'inline';
        } else if (userInfo) {
            userInfo.style.display = 'none';
        }

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('googleAuthChange', { detail: { isSignedIn } }));
    },

    /**
     * Check if user is signed in
     */
    isSignedIn() {
        return this._isSignedIn;
    },

    /**
     * Check if API is configured and ready
     */
    isConfigured() {
        return CONFIG.SPREADSHEET_ID && CONFIG.CLIENT_ID && this._isSignedIn;
    },

    /**
     * Initialize sheets in the spreadsheet if they don't exist
     */
    async initializeSheets() {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        try {
            // Get existing sheets
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: CONFIG.SPREADSHEET_ID
            });

            const existingSheets = response.result.sheets.map(s => s.properties.title);
            const requiredSheets = Object.values(CONFIG.SHEETS);
            const missingSheets = requiredSheets.filter(s => !existingSheets.includes(s));

            if (missingSheets.length === 0) {
                console.log('All required sheets exist');
                return { created: [], existing: existingSheets };
            }

            // Create missing sheets
            const requests = missingSheets.map(sheetName => ({
                addSheet: {
                    properties: { title: sheetName }
                }
            }));

            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                resource: { requests }
            });

            // Add headers to new sheets
            for (const sheetName of missingSheets) {
                const headers = this.SHEET_HEADERS[sheetName];
                if (headers) {
                    await gapi.client.sheets.spreadsheets.values.update({
                        spreadsheetId: CONFIG.SPREADSHEET_ID,
                        range: `${sheetName}!A1`,
                        valueInputOption: 'RAW',
                        resource: { values: [headers] }
                    });
                }
            }

            console.log('Created sheets:', missingSheets);
            return { created: missingSheets, existing: existingSheets };
        } catch (error) {
            console.error('Error initializing sheets:', error);
            throw error;
        }
    },

    /**
     * Fetch data from a sheet
     */
    async fetchSheet(sheetName, useCache = true) {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        // Check cache
        if (useCache && this._cache[sheetName]) {
            const cacheAge = Date.now() - (this._cacheTimestamps[sheetName] || 0);
            if (cacheAge < CONFIG.CACHE_DURATION) {
                return this._cache[sheetName];
            }
        }

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: sheetName
            });

            const processed = this.processSheetData(response.result.values || []);

            // Update cache
            this._cache[sheetName] = processed;
            this._cacheTimestamps[sheetName] = Date.now();

            return processed;
        } catch (error) {
            console.error(`Error fetching sheet ${sheetName}:`, error);
            throw error;
        }
    },

    /**
     * Fetch multiple sheets at once
     */
    async fetchMultipleSheets(sheetNames) {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        try {
            const response = await gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                ranges: sheetNames
            });

            const result = {};

            response.result.valueRanges?.forEach((range, index) => {
                const sheetName = sheetNames[index];
                const processed = this.processSheetData(range.values || []);
                result[sheetName] = processed;

                // Update cache
                this._cache[sheetName] = processed;
                this._cacheTimestamps[sheetName] = Date.now();
            });

            return result;
        } catch (error) {
            console.error('Error fetching multiple sheets:', error);
            throw error;
        }
    },

    /**
     * Process sheet data (convert rows to objects)
     */
    processSheetData(values) {
        if (!values || values.length < 2) return [];

        const headers = values[0];
        const rows = values.slice(1);

        return rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
    },

    /**
     * Save data to a sheet (replaces all data)
     */
    async saveSheet(sheetName, data) {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        try {
            const headers = this.SHEET_HEADERS[sheetName];
            if (!headers) {
                throw new Error(`Unknown sheet: ${sheetName}`);
            }

            // Convert objects back to rows
            const rows = data.map(item => headers.map(header => item[header] || ''));
            const values = [headers, ...rows];

            // Clear existing data and write new data
            await gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: sheetName
            });

            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                resource: { values }
            });

            // Update cache
            this._cache[sheetName] = data;
            this._cacheTimestamps[sheetName] = Date.now();

            return { success: true };
        } catch (error) {
            console.error(`Error saving sheet ${sheetName}:`, error);
            throw error;
        }
    },

    /**
     * Append a row to a sheet
     */
    async appendRow(sheetName, data) {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        try {
            const headers = this.SHEET_HEADERS[sheetName];
            if (!headers) {
                throw new Error(`Unknown sheet: ${sheetName}`);
            }

            const row = headers.map(header => data[header] || '');

            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [row] }
            });

            // Invalidate cache
            this.clearCache(sheetName);

            return { success: true };
        } catch (error) {
            console.error(`Error appending to sheet ${sheetName}:`, error);
            throw error;
        }
    },

    /**
     * Update a specific row in a sheet
     */
    async updateRow(sheetName, rowIndex, data) {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        try {
            const headers = this.SHEET_HEADERS[sheetName];
            if (!headers) {
                throw new Error(`Unknown sheet: ${sheetName}`);
            }

            const row = headers.map(header => data[header] || '');
            const range = `${sheetName}!A${rowIndex + 2}`; // +2 for header row and 1-indexed

            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: range,
                valueInputOption: 'RAW',
                resource: { values: [row] }
            });

            // Invalidate cache
            this.clearCache(sheetName);

            return { success: true };
        } catch (error) {
            console.error(`Error updating row in sheet ${sheetName}:`, error);
            throw error;
        }
    },

    /**
     * Delete a row from a sheet
     */
    async deleteRow(sheetName, rowIndex) {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        try {
            // Get sheet ID first
            const spreadsheet = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: CONFIG.SPREADSHEET_ID
            });

            const sheet = spreadsheet.result.sheets.find(s => s.properties.title === sheetName);
            if (!sheet) {
                throw new Error(`Sheet not found: ${sheetName}`);
            }

            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex + 1, // +1 for header row
                                endIndex: rowIndex + 2
                            }
                        }
                    }]
                }
            });

            // Invalidate cache
            this.clearCache(sheetName);

            return { success: true };
        } catch (error) {
            console.error(`Error deleting row from sheet ${sheetName}:`, error);
            throw error;
        }
    },

    /**
     * Clear cache for a specific sheet or all
     */
    clearCache(sheetName = null) {
        if (sheetName) {
            delete this._cache[sheetName];
            delete this._cacheTimestamps[sheetName];
        } else {
            this._cache = {};
            this._cacheTimestamps = {};
        }
    },

    /**
     * Delete sheets that are not needed by the Personnel Tracker
     */
    async deleteUnusedSheets() {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        try {
            // Get existing sheets
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: CONFIG.SPREADSHEET_ID
            });

            const existingSheets = response.result.sheets;
            const requiredSheets = Object.values(CONFIG.SHEETS);

            // Find sheets to delete (not in required list)
            const sheetsToDelete = existingSheets.filter(sheet =>
                !requiredSheets.includes(sheet.properties.title)
            );

            if (sheetsToDelete.length === 0) {
                console.log('No unused sheets to delete');
                return { deleted: [], kept: requiredSheets };
            }

            // Create delete requests
            const requests = sheetsToDelete.map(sheet => ({
                deleteSheet: {
                    sheetId: sheet.properties.sheetId
                }
            }));

            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                resource: { requests }
            });

            const deletedNames = sheetsToDelete.map(s => s.properties.title);
            console.log('Deleted sheets:', deletedNames);
            return { deleted: deletedNames, kept: requiredSheets };
        } catch (error) {
            console.error('Error deleting unused sheets:', error);
            throw error;
        }
    },

    /**
     * Test connection to Google Sheets
     */
    async testConnection() {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        try {
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: CONFIG.SPREADSHEET_ID
            });

            return {
                success: true,
                message: 'Connection successful!',
                spreadsheetTitle: response.result.properties.title
            };
        } catch (error) {
            throw new Error(`Connection failed: ${error.message}`);
        }
    },

    /**
     * Load all data from Google Sheets
     */
    async loadAllData() {
        if (!this.isConfigured()) {
            throw new Error('Please sign in to Google first');
        }

        const sheetNames = Object.values(CONFIG.SHEETS);
        return await this.fetchMultipleSheets(sheetNames);
    }
};

// Make globally available
window.SheetsAPI = SheetsAPI;
