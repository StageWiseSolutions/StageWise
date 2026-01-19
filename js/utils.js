/**
 * Utility functions for Personnel & Shift Tracker
 */

const Utils = {
    /**
     * Format date for display
     */
    formatDate(dateStr, format = 'short') {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr;

        const options = {
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
            weekday: { weekday: 'short', month: 'short', day: 'numeric' },
            monthDay: { month: 'short', day: 'numeric' },
            iso: null // Special case for ISO format
        };

        if (format === 'iso') {
            return date.toISOString().split('T')[0];
        }

        return date.toLocaleDateString('en-US', options[format] || options.short);
    },

    /**
     * Format time for display
     */
    formatTime(timeStr) {
        if (!timeStr) return '';
        // Convert 24hr (HHmm or HH:mm) to 12hr format
        const clean = timeStr.replace(':', '');
        const hours = parseInt(clean.substring(0, 2));
        const minutes = clean.substring(2, 4) || '00';
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    },

    /**
     * Get date difference in days
     */
    daysDiff(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = d2 - d1;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * Check if date is today
     */
    isToday(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    /**
     * Check if date is in the past
     */
    isPast(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    },

    /**
     * Get start of week (Sunday)
     */
    getWeekStart(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    /**
     * Get end of week (Saturday)
     */
    getWeekEnd(date = new Date()) {
        const d = this.getWeekStart(date);
        d.setDate(d.getDate() + 6);
        return d;
    },

    /**
     * Get start of month
     */
    getMonthStart(date = new Date()) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    },

    /**
     * Get end of month
     */
    getMonthEnd(date = new Date()) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    },

    /**
     * Add days to date
     */
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    /**
     * Generate unique ID
     */
    generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Check if object is empty
     */
    isEmpty(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },

    /**
     * Group array by key
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const groupKey = typeof key === 'function' ? key(item) : item[key];
            (result[groupKey] = result[groupKey] || []).push(item);
            return result;
        }, {});
    },

    /**
     * Sort array by key
     */
    sortBy(array, key, ascending = true) {
        return [...array].sort((a, b) => {
            const valA = typeof key === 'function' ? key(a) : a[key];
            const valB = typeof key === 'function' ? key(b) : b[key];

            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
        });
    },

    /**
     * Filter array by multiple conditions
     */
    filterBy(array, conditions) {
        return array.filter(item => {
            return Object.entries(conditions).every(([key, value]) => {
                if (value === '' || value === null || value === undefined) return true;
                return item[key] === value;
            });
        });
    },

    /**
     * Search array by text
     */
    searchBy(array, text, fields) {
        if (!text) return array;
        const searchLower = text.toLowerCase();
        return array.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(searchLower);
            });
        });
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Parse CSV row to object
     */
    csvRowToObject(headers, values) {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        return obj;
    },

    /**
     * Convert array to CSV
     */
    arrayToCsv(data, headers) {
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header] || '';
                // Escape quotes and wrap in quotes if contains comma
                const escaped = value.toString().replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            }).join(',');
        });
        return [csvHeaders, ...csvRows].join('\n');
    },

    /**
     * Download file
     */
    downloadFile(content, filename, type = 'text/csv') {
        const blob = new Blob([content], { type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    /**
     * Local storage helpers
     */
    storage: {
        get(key) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.error('Storage get error:', e);
                return null;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Storage remove error:', e);
                return false;
            }
        }
    },

    /**
     * Get training status based on expiration date
     */
    getTrainingStatus(expirationDate, warningDays = 30) {
        if (!expirationDate) return 'missing';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(expirationDate);
        const daysUntilExpiry = this.daysDiff(today, expDate);

        if (daysUntilExpiry < 0) return 'expired';
        if (daysUntilExpiry <= warningDays) return 'expiring';
        return 'current';
    },

    /**
     * Get status badge class
     */
    getStatusClass(status) {
        const classes = {
            // Personnel status
            'Active': 'badge-success',
            'LOA': 'badge-warning',
            'Terminated': 'badge-danger',
            'Training': 'badge-info',
            'Probation': 'badge-secondary',

            // Training status
            'current': 'badge-success',
            'expiring': 'badge-warning',
            'expired': 'badge-danger',
            'missing': 'badge-secondary',
            'Current': 'badge-success',
            'Due Soon': 'badge-warning',
            'Expired': 'badge-danger',

            // Swap status
            'Pending': 'badge-warning',
            'Approved': 'badge-success',
            'Completed': 'badge-info',
            'Rejected': 'badge-danger'
        };
        return classes[status] || 'badge-secondary';
    },

    /**
     * Get shift type class for styling
     */
    getShiftClass(shiftType) {
        const classes = {
            'Day': 'shift-day',
            'Night': 'shift-night',
            'Off': 'shift-off',
            'Straights': 'shift-straights'
        };
        return classes[shiftType] || '';
    },

    /**
     * Calculate team rotation offset for DuPont pattern
     * Each team starts at a different point in the pattern
     */
    getTeamPatternOffset(teamIndex, totalTeams = 5, cycleDays = 28) {
        // Offset each team by cycleDays/totalTeams to ensure coverage
        return Math.floor((teamIndex * cycleDays) / totalTeams);
    },

    /**
     * Get shift for a specific date based on pattern
     */
    getShiftFromPattern(date, patternStartDate, pattern, offset = 0) {
        const daysSinceStart = this.daysDiff(patternStartDate, date);
        const patternArray = pattern.split(',');
        const patternLength = patternArray.length;

        // Apply offset and get position in pattern
        const adjustedDays = (daysSinceStart + offset) % patternLength;
        const index = adjustedDays >= 0 ? adjustedDays : patternLength + adjustedDays;

        const shiftCode = patternArray[index];
        const shiftMap = {
            'D': 'Day',
            'N': 'Night',
            'O': 'Off'
        };

        return shiftMap[shiftCode] || 'Off';
    }
};

// Make Utils globally available
window.Utils = Utils;
