# User Guide

Welcome to Logifi - Your AC 120-78B Compliant Digital Flight Logbook.

## Getting Started

### Setup and Authentication

1. **Create an Account**
   - When you first open the application, you'll be prompted to create an account
   - Enter your email address and choose a secure password
   - Click "Sign Up" to create your account

2. **Sign In**
   - If you already have an account, click "Sign In"
   - Enter your email and password
   - Your session will be automatically saved for future visits

3. **Migration from LocalStorage (First-Time Users)**
   - If you have existing logbook data stored locally in your browser, it will be automatically migrated to the cloud when you first sign in
   - A migration progress indicator will show the status
   - Once complete, all your data will be synced to your account

## Importing Data

### CSV Import

1. **Prepare Your CSV File**
   - Your CSV file should contain flight log entries with appropriate columns
   - Required columns: Date, Aircraft Make/Model, Registration, Departure, Destination, Total Time
   - The system will attempt to map common column names automatically

2. **Import Process**
   - Click the "Import from CSV" button in the sidebar
   - Select your CSV file from your computer
   - Alternatively, drag and drop your CSV file into the import area
   - The system will parse the file and show an import preview

3. **Import Preview**
   - Review the parsed entries in the preview modal
   - Check the import statistics (total entries, valid entries, duplicates, etc.)
   - Review any validation warnings or errors
   - Click "Import" to confirm, or "Cancel" to abort

4. **Handling Duplicates**
   - If duplicate entries are detected (same date and registration), you'll be notified
   - You can choose to:
     - Skip duplicates
     - Import with duplicates (they will be marked)
     - Review and manually resolve duplicates

### JSON Import

1. **Prepare Your JSON File**
   - Your JSON file should contain an array of log entries, or an object with an "entries" property containing an array
   - Each entry should follow the LogEntry format

2. **Import Process**
   - Click the "Import from JSON" button in the sidebar
   - Select your JSON file from your computer
   - Alternatively, drag and drop your JSON file into the import area
   - The system will parse the file and show an import preview

3. **Import Preview**
   - Same process as CSV import
   - Review entries and statistics before confirming

### Import Tracking

- All imported entries are automatically marked with import metadata:
  - Import source (CSV, JSON, paper, etc.)
  - Import batch ID
  - Original entry date from the source
  - Import metadata (additional information)
- Imported entries are visually distinguished in the logbook (different color coding)

## Using Compliance Features

### AC 120-78B Compliance Checklist

The compliance checklist shows your system's compliance with AC 120-78B requirements:

1. **Access the Checklist**
   - The compliance checklist is visible in the sidebar
   - Click to expand and view detailed compliance status

2. **Compliance Requirements**
   - **Revision History / Audit Trail**: Complete - All changes are tracked with full audit logs
   - **Data Integrity / Tamper Protection**: Complete - SHA-256 hashing ensures data integrity
   - **Signer Identity Recording**: Complete - User ID is tracked for all entries
   - **Export and Secured Archival**: Complete - Export functionality with metadata
   - **Electronic Signatures**: Deferred to Phase 2
   - **Non-Repudiation**: Partial - Audit trail provides some non-repudiation

### 14 CFR Part 61 Compliance Checklist

The Part 61 compliance checklist shows compliance with FAA regulations:

1. **Required Fields Validation**: Complete - All Part 61 required fields are validated
2. **Recordkeeping Requirements**: Complete - Meets Part 61 recordkeeping standards
3. **Currency Tracking**: Complete - Available in Pilot Profile

### Currency Tracking Dashboard

Track your Part 61.57 recent flight experience requirements:

1. **Access Currency Dashboard**
   - In the dashboard section, click "View Details" next to Currency Status
   - Or click the currency status indicator in the sidebar

2. **Currency Types Tracked**
   - **90-Day Passenger Currency** (Part 61.57(a))
     - Requires 3 takeoffs and 3 landings within 90 days
     - Shows progress: X/3 takeoffs, X/3 landings
     - Displays expiration date and days remaining
   
   - **90-Day Night Currency** (Part 61.57(b))
     - Requires 3 night takeoffs and 3 night landings to full stop within 90 days
     - Shows progress and expiration information
   
   - **6-Month Instrument Currency** (Part 61.57(c))
     - Requires 6 instrument approaches, holding procedures, and intercept/track tasks within 6 months
     - Shows progress toward each requirement
   
   - **Annual Requirements** (Part 61.57(d))
     - Framework for annual requirements tracking

3. **Currency Status Indicators**
   - **Current** (Green): Requirements are met with more than 30 days remaining
   - **Expiring Soon** (Yellow): Requirements are met but expiring within 30 days
   - **Expired** (Red): Requirements are not met or have expired

### Audit Trail

View the complete history of changes to any log entry:

1. **Access Audit Trail**
   - Click the "View History" button on any log entry
   - The audit trail modal will show all changes made to that entry

2. **Audit Trail Information**
   - **Timestamp**: When the change was made
   - **User**: Who made the change (user ID)
   - **Action**: Type of change (insert, update, delete)
   - **Changed Fields**: Which fields were modified
   - **Before/After**: Old and new values for changed fields

3. **Auto-Validation**
   - The audit trail automatically validates entry integrity when opened
   - Any integrity issues will be displayed

## Exporting Data

### CSV Export

1. **Export Process**
   - Click "Export as CSV" in the sidebar
   - A CSV file will be downloaded to your computer

2. **Export Contents**
   - All log entries with all fields
   - Import metadata (Is Imported, Import Source, Import Batch ID, Original Entry Date, Import Metadata)
   - Compliance info (Version, Data Hash, Created At, Updated At)

### JSON Export

1. **Export Process**
   - Click "Export as JSON" in the sidebar
   - A JSON file will be downloaded to your computer

2. **Export Contents**
   - Full entry data for all entries
   - Complete audit trail for each entry
   - Integrity hashes (version, dataHash, createdAt, updatedAt)
   - Import metadata

### Form 8710 PDF Export

Generate FAA Form 8710 for certificate applications:

1. **Generate Form**
   - Click "Generate 8710 Form" in the sidebar
   - The form preview modal will open

2. **Form Sections**
   - **Section II**: Recent Experience (last 90 days)
   - **Section III**: Record of Pilot Time (totals by category)
   - Import metadata section showing source information

3. **Preview and Print**
   - Review the form in the preview modal
   - Click "Print" to generate a PDF
   - Use your browser's print dialog to save as PDF or print

4. **Data Validation**
   - The form includes validation to ensure data completeness
   - Any issues will be highlighted in the preview

## Offline Usage

### How Offline Mode Works

Logifi uses a local-first architecture, meaning your data is stored locally first and synced to the cloud:

1. **Local Storage**
   - All entries are stored in IndexedDB (browser storage)
   - Data is available immediately, even when offline
   - No internet connection required for viewing or editing

2. **Automatic Sync**
   - When online, changes are automatically synced to the cloud (Supabase)
   - Sync happens in the background every 10 seconds
   - Failed syncs are queued and retried automatically

3. **Online/Offline Indicator**
   - Check the status indicator in the UI
   - **Green**: Online and synced
   - **Yellow**: Online but syncing
   - **Red**: Offline (changes queued)

### Sync Behavior

1. **When Online**
   - Changes sync immediately after saving
   - Background sync processes queued operations
   - Sync queue shows pending operations

2. **When Offline**
   - All changes are saved locally
   - Operations are queued for sync
   - Queue length is displayed in the status indicator

3. **Coming Back Online**
   - Automatic sync starts when connection is restored
   - Queued operations are processed
   - Status indicator updates to show sync progress

### Conflict Resolution

- **Last-Write-Wins**: If the same entry is modified on multiple devices, the most recent version (based on version number and timestamp) wins
- Conflicts are automatically resolved using version numbers
- Audit trail preserves all changes for compliance

### Best Practices for Offline Use

1. **Ensure Sync Before Important Tasks**
   - Check that you're online and synced before critical operations
   - Wait for sync queue to clear if you've been offline

2. **Multiple Devices**
   - Data syncs across all devices when online
   - Last write wins for conflicts
   - Check sync status when switching devices

3. **Export Before Travel**
   - Export your data before extended offline periods
   - This ensures you have a backup

## Tips and Best Practices

### Data Entry

1. **Required Fields**: Always fill in Part 61 required fields (Date, Aircraft Make/Model, Registration, Departure, Destination, Total Time)

2. **Validation Warnings**: Pay attention to validation warnings - they help ensure data accuracy

3. **Cross-Country Validation**: The system validates cross-country flights by calculating distance between airports (requires 50+ nautical miles)

4. **Night Time Calculation**: Use OOOI times for accurate night time calculation - the system calculates night time based on civil twilight

### Compliance

1. **Regular Exports**: Export your data regularly for backups and compliance documentation

2. **Audit Trail Review**: Periodically review audit trails to verify data integrity

3. **Currency Tracking**: Check currency status regularly to ensure you maintain currency

4. **Form 8710**: Use the Form 8710 generator for certificate applications - it includes all necessary compliance metadata

### Performance

1. **Large Datasets**: The system handles large logbooks efficiently
2. **Offline Storage**: All data is stored locally for fast access
3. **Sync Optimization**: Sync happens in the background and doesn't block your work

## Troubleshooting

### Import Issues

- **CSV Parsing Errors**: Check that your CSV file uses proper formatting (comma-separated, proper quoting)
- **Missing Columns**: The system will attempt to map common column names, but may need manual adjustment
- **Date Format**: Dates should be in YYYY-MM-DD format or common date formats

### Sync Issues

- **Stuck Sync Queue**: Refresh the page to restart sync
- **Offline Indicator**: If stuck offline, check your internet connection
- **Conflicts**: Review audit trail if you suspect data conflicts

### Performance Issues

- **Slow Loading**: Clear browser cache if the application loads slowly
- **Large Logbooks**: Export and re-import if you experience performance issues with very large datasets

## Support

For issues, questions, or contributions, please visit:
- GitHub: [Link to repository]
- Discord: [Link to Discord community]

## Version Information

This guide applies to Phase 1 of Logifi. Additional features (electronic signatures, student/instructor updates) are planned for Phase 2.
