#!/usr/bin/env node

/**
 * Test script for cross-platform runner
 * Verifies that the platform detection and script selection works correctly
 */

const { getPlatform, getScriptPath } = require('./cross-platform-runner');
const fs = require('fs');
const path = require('path');

function testPlatformDetection() {
    console.log('Testing platform detection...');
    const platform = getPlatform();
    console.log(`Detected platform: ${platform}`);
    
    if (platform !== 'windows' && platform !== 'unix') {
        throw new Error(`Invalid platform detected: ${platform}`);
    }
    
    console.log('✓ Platform detection works correctly');
}

function testScriptPaths() {
    console.log('Testing script path resolution...');
    
    const scripts = ['docker-setup', 'docker-run'];
    const platform = getPlatform();
    
    for (const script of scripts) {
        try {
            const scriptPath = getScriptPath(script, platform);
            console.log(`✓ ${script} -> ${scriptPath}`);
            
            if (!fs.existsSync(scriptPath)) {
                throw new Error(`Script file does not exist: ${scriptPath}`);
            }
        } catch (error) {
            console.error(`✗ Failed to resolve ${script}: ${error.message}`);
            throw error;
        }
    }
    
    console.log('✓ All script paths resolved correctly');
}

function main() {
    try {
        console.log('Cross-Platform Runner Test');
        console.log('==========================');
        
        testPlatformDetection();
        testScriptPaths();
        
        console.log('');
        console.log('✓ All tests passed!');
        console.log('Cross-platform runner is working correctly.');
        
    } catch (error) {
        console.error('');
        console.error('✗ Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
