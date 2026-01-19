# Google Sheets Setup for Personnel & Shift Tracker

This document describes how to set up Google Sheets to mirror the SharePoint 2016 lists structure.

## Prerequisites
1. Create a new Google Spreadsheet
2. Enable Google Sheets API in Google Cloud Console
3. Create API credentials (API Key for read-only, or OAuth for read/write)

## Sheet Structure

Create the following sheets (tabs) in your Google Spreadsheet. The first row of each sheet should contain the column headers exactly as shown.

---

## Sheet 1: Teams

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | TeamID | Primary key | T1 |
| B | TeamName | Display name | Team 1 |
| C | Description | Optional notes | Day shift primary |
| D | Color | Hex color for calendar | #4285f4 |

**Sample Data:**
```
TeamID,TeamName,Description,Color
T1,Team 1,Alpha Team,#4285f4
T2,Team 2,Bravo Team,#ea4335
T3,Team 3,Charlie Team,#34a853
T4,Team 4,Delta Team,#fbbc05
T5,Team 5,Echo Team,#9c27b0
```

---

## Sheet 2: Positions

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | PositionID | Primary key | POS001 |
| B | Title | Position name | Operator |
| C | Description | Job description | Main control room operator |
| D | Department | Department/area | Operations |
| E | Level | Hierarchy level (1=entry) | 1 |

**Sample Data:**
```
PositionID,Title,Description,Department,Level
POS001,Operator,Main control room operator,Operations,1
POS002,Senior Operator,Lead operator with training duties,Operations,2
POS003,Supervisor,Shift supervisor,Operations,3
POS004,Technician,Maintenance technician,Maintenance,1
POS005,Lead Technician,Senior maintenance lead,Maintenance,2
```

---

## Sheet 3: Personnel

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | PersonID | Primary key | P001 |
| B | EmployeeNumber | Employee ID | EMP12345 |
| C | FirstName | First name | John |
| D | LastName | Last name | Smith |
| E | Email | Email address | john.smith@company.com |
| F | Phone | Phone number | 555-123-4567 |
| G | EmergencyContact | Emergency contact name | Jane Smith |
| H | EmergencyPhone | Emergency contact phone | 555-987-6543 |
| I | TeamID | FK to Teams | T1 |
| J | PositionID | FK to Positions | POS001 |
| K | HireDate | Date hired (YYYY-MM-DD) | 2020-01-15 |
| L | PositionStartDate | Current position start | 2022-06-01 |
| M | Supervisor | Supervisor name/ID | P010 |
| N | Department | Department | Operations |
| O | Status | Active/LOA/Terminated | Active |
| P | BadgeNumber | Badge/access number | B00123 |
| Q | Notes | Additional notes | CPR certified |

---

## Sheet 4: TrainingTypes

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | TrainingID | Primary key | TR001 |
| B | Name | Training name | Safety Orientation |
| C | Description | What it covers | Basic safety procedures |
| D | ValidityMonths | Months until expiration | 12 |
| E | Category | Category/grouping | Safety |

**Sample Data:**
```
TrainingID,Name,Description,ValidityMonths,Category
TR001,Safety Orientation,Basic safety and emergency procedures,12,Safety
TR002,CPR/First Aid,CPR and basic first aid certification,24,Safety
TR003,Lockout/Tagout,LOTO procedures,12,Safety
TR004,Operator Certification,Control room operations,36,Operations
TR005,Confined Space,Confined space entry procedures,12,Safety
TR006,Fall Protection,Working at heights,12,Safety
TR007,Forklift Operation,Powered industrial truck operation,36,Equipment
TR008,Hazmat Awareness,Hazardous materials handling,12,Safety
```

---

## Sheet 5: PositionTraining

Links positions to their required trainings.

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | ID | Primary key | PT001 |
| B | PositionID | FK to Positions | POS001 |
| C | TrainingID | FK to TrainingTypes | TR001 |
| D | Required | TRUE = required | TRUE |

**Sample Data:**
```
ID,PositionID,TrainingID,Required
PT001,POS001,TR001,TRUE
PT002,POS001,TR002,TRUE
PT003,POS001,TR003,TRUE
PT004,POS001,TR004,TRUE
PT005,POS002,TR001,TRUE
PT006,POS002,TR002,TRUE
PT007,POS002,TR003,TRUE
PT008,POS002,TR004,TRUE
PT009,POS002,TR005,TRUE
```

---

## Sheet 6: PersonnelTraining

Actual training completion records.

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | ID | Primary key | PTR001 |
| B | PersonID | FK to Personnel | P001 |
| C | TrainingID | FK to TrainingTypes | TR001 |
| D | CompletionDate | When completed (YYYY-MM-DD) | 2024-01-15 |
| E | ExpirationDate | When it expires | 2025-01-15 |
| F | Status | Current/Expired/Due Soon | Current |
| G | Notes | Additional notes | Completed online |

---

## Sheet 7: RotationPatterns

Configurable shift patterns (DuPont, Panama, etc.)

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | PatternID | Primary key | RP001 |
| B | Name | Pattern name | DuPont |
| C | Description | Explanation | 4-week rotating pattern |
| D | CycleDays | Full cycle length | 28 |
| E | Pattern | Pattern definition | D,D,D,D,O,O,O,N,N,N,N,O,O,O,D,D,D,O,O,O,O,N,N,N,O,O,O,O |
| F | IsActive | Currently in use | TRUE |

**Pattern Legend:**
- D = Day shift (e.g., 0600-1800)
- N = Night shift (e.g., 1800-0600)
- O = Off

**Sample DuPont Pattern (28-day cycle per team):**
```
Week 1: D,D,D,D,O,O,O (4 days, 3 off)
Week 2: N,N,N,N,O,O,O (4 nights, 3 off)
Week 3: D,D,D,O,O,O,O (3 days, 4 off - includes "straights" option)
Week 4: N,N,N,O,O,O,O (3 nights, 4 off)
```

---

## Sheet 8: ShiftSchedule

Generated or manually entered schedule.

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | ID | Primary key | SS001 |
| B | PersonID | FK to Personnel | P001 |
| C | TeamID | FK to Teams | T1 |
| D | Date | Shift date (YYYY-MM-DD) | 2024-01-15 |
| E | ShiftType | Day/Night/Off/Straights | Day |
| F | StartTime | Shift start (HHmm) | 0600 |
| G | EndTime | Shift end (HHmm) | 1800 |
| H | Location | Work location | Main Plant |
| I | IsOverride | Manual override (TRUE/FALSE) | FALSE |
| J | Notes | Additional notes | |

---

## Sheet 9: ShiftSwaps

Record of shift swaps between personnel.

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | ID | Primary key | SW001 |
| B | RequestorID | Person requesting swap | P001 |
| C | RequesteeID | Person swapping with | P005 |
| D | OriginalDate | Date being swapped | 2024-01-15 |
| E | SwapDate | Date swapping to | 2024-01-22 |
| F | Status | Pending/Approved/Completed | Approved |
| G | ApprovedBy | Who approved | P010 |
| H | ApprovedDate | When approved | 2024-01-10 |
| I | Notes | Additional notes | |

---

## Sheet 10: StraightsAssignments

Track straights week assignments.

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | ID | Primary key | SA001 |
| B | PersonID | FK to Personnel | P001 |
| C | TeamID | FK to Teams | T1 |
| D | WeekStartDate | Monday of straights week | 2024-01-15 |
| E | WeekEndDate | Friday of straights week | 2024-01-19 |
| F | Location | Where working | Training Center |
| G | DailyStartTime | Start time (HHmm) | 0700 |
| H | DailyEndTime | End time (HHmm) | 1500 |
| I | Notes | Additional notes | Annual recert |

---

## Sheet 11: Settings (Optional)

Application configuration settings.

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | SettingKey | Setting identifier | DayShiftStart |
| B | SettingValue | Setting value | 0600 |
| C | Description | What it controls | Day shift start time |

**Sample Settings:**
```
SettingKey,SettingValue,Description
DayShiftStart,0600,Day shift start time
DayShiftEnd,1800,Day shift end time
NightShiftStart,1800,Night shift start time
NightShiftEnd,0600,Night shift end time
StraightsStart,0700,Straights week start time
StraightsEnd,1500,Straights week end time
TrainingWarningDays,30,Days before expiration to warn
ScheduleGenerationMonths,3,Months ahead to generate schedule
DefaultLocation,Main Plant,Default work location
```

---

## Google Sheets API Configuration

### For the Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Sheets API
4. Create credentials:
   - For read-only: API Key
   - For read/write: OAuth 2.0 Client ID
5. Note your Spreadsheet ID (from the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`)

### In the Application

Update `config.js` with:
```javascript
const CONFIG = {
    SPREADSHEET_ID: 'your-spreadsheet-id-here',
    API_KEY: 'your-api-key-here',
    // Sheet names must match exactly
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
    }
};
```

---

## SharePoint 2016 List Mapping

When you're ready to migrate to SharePoint 2016:

| Google Sheet | SharePoint List Type | Notes |
|--------------|---------------------|-------|
| Teams | Custom List | Simple lookup |
| Positions | Custom List | Simple lookup |
| Personnel | Custom List | Main employee data |
| TrainingTypes | Custom List | Training catalog |
| PositionTraining | Custom List | Many-to-many link |
| PersonnelTraining | Custom List | Training records |
| RotationPatterns | Custom List | Pattern definitions |
| ShiftSchedule | Custom List | Large, consider indexing Date |
| ShiftSwaps | Custom List | Workflow potential |
| StraightsAssignments | Custom List | Workflow potential |
| Settings | Custom List | App configuration |

### SharePoint Column Types
- Text columns → Single line of text
- Date columns → Date and Time
- Choice columns → Choice (dropdown)
- Boolean → Yes/No
- Number → Number
- FK references → Single line of text (or Lookup if same site)
