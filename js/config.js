/**
 * Configuration for Personnel & Shift Tracker
 * Update these values with your Google Sheets credentials
 */

const CONFIG = {
    // Google Sheets Configuration
    SPREADSHEET_ID: '1YAQaj1lGTuKo9jVQBrPSM8G2LgFXWe24wVkV1ndzCyA',
    API_KEY: '', // Not needed with OAuth

    // OAuth Configuration (for read/write access)
    CLIENT_ID: '110270758432-i5tmkuq7ve7vc1pijlc2p7o70ib0879r.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',

    // Sheet Names (must match exactly with your Google Sheets tabs)
    SHEETS: {
        TEAMS: 'Teams',
        POSITIONS: 'Positions',
        PERSONNEL: 'Personnel',
        TRAINING_TYPES: 'TrainingTypes',
        POSITION_TRAINING: 'PositionTraining',
        PERSONNEL_TRAINING: 'PersonnelTraining',
        ROTATION_PATTERNS: 'RotationPatterns',
        SHIFT_SCHEDULE: 'ShiftSchedule',
        SHIFT_SWAPS: 'ShiftSwaps',
        STRAIGHTS: 'StraightsAssignments',
        SETTINGS: 'Settings'
    },

    // Default Shift Times (24-hour format)
    SHIFTS: {
        DAY: {
            START: '06:00',
            END: '18:00'
        },
        NIGHT: {
            START: '18:00',
            END: '06:00'
        },
        STRAIGHTS: {
            START: '07:00',
            END: '15:00'
        }
    },

    // Training Configuration
    TRAINING: {
        WARNING_DAYS: 30, // Days before expiration to show warning
        CATEGORIES: ['Safety', 'Operations', 'Equipment', 'Compliance', 'Other']
    },

    // Status Options
    STATUSES: {
        PERSONNEL: ['Active', 'LOA', 'Terminated', 'Training', 'Probation'],
        TRAINING: ['Current', 'Expired', 'Due Soon', 'Scheduled'],
        SWAP: ['Pending', 'Approved', 'Completed', 'Rejected']
    },

    // Shift Types
    SHIFT_TYPES: ['Day', 'Night', 'Off', 'Straights'],

    // Pagination
    ITEMS_PER_PAGE: 25,

    // Team Colors (default)
    TEAM_COLORS: {
        'T1': '#4285f4', // Blue
        'T2': '#ea4335', // Red
        'T3': '#34a853', // Green
        'T4': '#fbbc05', // Yellow
        'T5': '#9c27b0'  // Purple
    },

    // DuPont Pattern (default 28-day cycle)
    DEFAULT_ROTATION_PATTERN: {
        name: 'DuPont',
        cycleDays: 28,
        // Pattern for one team: D=Day, N=Night, O=Off
        // Week 1: 4 days, 3 off
        // Week 2: 4 nights, 3 off
        // Week 3: 3 days, 4 off
        // Week 4: 3 nights, 4 off
        pattern: 'D,D,D,D,O,O,O,N,N,N,N,O,O,O,D,D,D,O,O,O,O,N,N,N,O,O,O,O'
    },

    // Local Storage Keys
    STORAGE_KEYS: {
        SETTINGS: 'pst_settings',
        CACHE: 'pst_cache',
        LAST_SYNC: 'pst_last_sync'
    },

    // Cache Duration (milliseconds)
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    // Date Format
    DATE_FORMAT: 'YYYY-MM-DD',
    DISPLAY_DATE_FORMAT: 'MMM D, YYYY'
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.SHEETS);
Object.freeze(CONFIG.SHIFTS);
Object.freeze(CONFIG.TRAINING);
Object.freeze(CONFIG.STATUSES);
Object.freeze(CONFIG.TEAM_COLORS);
Object.freeze(CONFIG.DEFAULT_ROTATION_PATTERN);
Object.freeze(CONFIG.STORAGE_KEYS);
