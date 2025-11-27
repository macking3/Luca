
const fs = require('fs');
const path = require('path');

const RECOVERY_FILE = '.luca_recovery';

console.log('\x1b[33m%s\x1b[0m', '=== LUCA LAZARUS PROTOCOL ===');
console.log('Initiating emergency system restoration...');

if (!fs.existsSync(RECOVERY_FILE)) {
    console.error('\x1b[31m%s\x1b[0m', '[ERROR] No recovery log found. Cannot determine last modified file.');
    process.exit(1);
}

try {
    // 1. Read the path of the damaged file
    const targetFile = fs.readFileSync(RECOVERY_FILE, 'utf8').trim();
    const backupFile = targetFile + '.bak';

    console.log(`Target: ${targetFile}`);
    console.log(`Backup: ${backupFile}`);

    // 2. Verify backup exists
    if (!fs.existsSync(backupFile)) {
        console.error('\x1b[31m%s\x1b[0m', `[ERROR] Backup file not found: ${backupFile}`);
        process.exit(1);
    }

    // 3. Perform the restore
    fs.copyFileSync(backupFile, targetFile);
    
    console.log('\x1b[32m%s\x1b[0m', `[SUCCESS] Restored ${targetFile} from backup.`);
    console.log('System should auto-restart if running via nodemon/vite.');

} catch (e) {
    console.error('\x1b[31m%s\x1b[0m', `[CRITICAL FAILURE] ${e.message}`);
    process.exit(1);
}
