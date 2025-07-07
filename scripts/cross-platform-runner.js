#!/usr/bin/env node

/**
 * Cross-platform script runner for Docker operations
 * Detects the platform and runs the appropriate script (bash for Unix, PowerShell for Windows)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS = {
    'docker-setup': {
        windows: 'scripts/docker-setup.ps1',
        unix: 'scripts/docker-setup.sh'
    },
    'docker-run': {
        windows: 'scripts/docker-run.ps1', 
        unix: 'scripts/docker-run.sh'
    }
};

function getScriptName() {
    const scriptName = process.argv[2];
    if (!scriptName || !SCRIPTS[scriptName]) {
        console.error('Usage: node cross-platform-runner.js <script-name>');
        console.error('Available scripts:', Object.keys(SCRIPTS).join(', '));
        process.exit(1);
    }
    return scriptName;
}

function getPlatform() {
    return process.platform === 'win32' ? 'windows' : 'unix';
}

function getScriptPath(scriptName, platform) {
    const scriptPath = SCRIPTS[scriptName][platform];
    const fullPath = path.resolve(scriptPath);
    
    if (!fs.existsSync(fullPath)) {
        console.error(`Script not found: ${fullPath}`);
        process.exit(1);
    }
    
    return fullPath;
}

function runScript(scriptPath, platform) {
    let command, args;
    
    if (platform === 'windows') {
        // Use PowerShell on Windows
        command = 'powershell.exe';
        args = ['-ExecutionPolicy', 'Bypass', '-File', scriptPath];
    } else {
        // Use bash on Unix-like systems
        command = 'bash';
        args = [scriptPath];
    }
    
    console.log(`Running ${platform} script: ${scriptPath}`);
    
    const child = spawn(command, args, {
        stdio: 'inherit',
        shell: platform === 'windows'
    });
    
    child.on('error', (error) => {
        console.error(`Failed to start script: ${error.message}`);
        process.exit(1);
    });
    
    child.on('close', (code) => {
        if (code !== 0) {
            console.error(`Script exited with code ${code}`);
            process.exit(code);
        }
        console.log('Script completed successfully');
    });
}

function main() {
    try {
        const scriptName = getScriptName();
        const platform = getPlatform();
        const scriptPath = getScriptPath(scriptName, platform);
        
        console.log(`Detected platform: ${platform}`);
        runScript(scriptPath, platform);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main, getPlatform, getScriptPath };
