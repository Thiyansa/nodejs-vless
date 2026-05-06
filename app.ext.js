const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const os = require('os');
const {URL} = require('url');
const {exec} = require('child_process');
const {Buffer} = require('buffer');
const {createServer} = require('http');
const {WebSocketServer, createWebSocketStream} = require('ws');

const UUID = process.env.UUID || '22e7b937-acd4-adc8-7c16-7815c693337d';
const DOMAIN = process.env.DOMAIN || 'example.com';
const PORT = process.env.PORT || 3000;
const REMARKS = process.env.REMARKS || 'nodejs-vless-ext';
const WEB_SHELL = process.env.WEB_SHELL || 'off';

const uuid = UUID.replace(/-/g, '');

// --- Bandwidth Stats Persistence ---
const STATS_FILE = path.join(__dirname, 'stats.json');
let stats = { totalUpload: 0, totalDownload: 0 };

if (fs.existsSync(STATS_FILE)) {
    try {
        stats = JSON.parse(fs.readFileSync(STATS_FILE));
    } catch (e) {
        console.error("Stats file read error");
    }
}

function saveStats() {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
    } catch (e) {
        console.error("Error saving stats:", e);
    }
}

// සෑම තත්පර 10කට වරක්ම ස්වයංක්‍රීයව Stats save කිරීම
setInterval(() => {
    saveStats();
}, 10000);

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateTempFilePath() {
    const randomStr = crypto.randomBytes(4).toString('hex');
    return path.join(__dirname, `wsr-${randomStr}.sh`);
}

function executeScript(script, callback) {
    const scriptPath = generateTempFilePath();
    fs.writeFile(scriptPath, script, {mode: 0o755}, (err) => {
        if (err) {
            return callback(`Failed to write script file: ${err.message}`);
        }
        exec(`sh "${scriptPath}"`, {timeout: 10000}, (error, stdout, stderr) => {
            fs.unlink(scriptPath, () => {});
            if (error) {
                return callback(stderr);
            }
            callback(null, stdout);
        });
    });
}

function getMd5Path(pathname) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) {
        return pathname;
    }
    const basePath = '/' + parts[0];
    const md5BasePath = crypto.createHash('md5').update(basePath).digest('hex');
    const remainingPath = parts.slice(1).join('/');
    return '/' + md5BasePath + (remainingPath ? '/' + remainingPath : '');
}

const server = createServer((req, res) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const md5Path = getMd5Path(parsedUrl.pathname);

    // System Monitoring
    const ramUsage = ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1);
    const cpuLoad = os.loadavg()[0].toFixed(2);

    if (parsedUrl.pathname === '/') {
        const welcomeInfo = `
            <style>
                body { background-color: #0f172a; margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; }
                .container { 
                    text-align: center; max-width: 650px; margin: 50px auto; 
                    background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px);
                    padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); color: #f8fafc;
                }
                h2 { background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; font-size: 28px; margin-bottom: 25px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 30px; }
                .stat-card { background: rgba(15, 23, 42, 0.5); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s; }
                .stat-card:hover { transform: translateY(-5px); border-color: #38bdf8; }
                .stat-label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px; }
                .stat-value { font-size: 18px; font-weight: 700; color: #f1f5f9; }
                .config-section { background: rgba(51, 65, 85, 0.4); padding: 20px; border-radius: 16px; text-align: left; margin-top: 25px; border: 1px dashed rgba(255,255,255,0.2); }
                .config-title { color: #38bdf8; font-size: 14px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; }
                .config-box { word-wrap: break-word; font-family: 'JetBrains Mono', monospace; font-size: 12px; background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #334155; color: #cbd5e1; line-height: 1.6; }
                .footer { margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
                .telegram-link { color: #38bdf8; text-decoration: none; font-weight: 600; }
                .status-dot { height: 10px; width: 10px; background-color: #22c55e; border-radius: 50%; display: inline-block; margin-right: 8px; box-shadow: 0 0 10px #22c55e; }
            </style>

            <div class="container">
                <div style="margin-bottom: 10px;"><span class="status-dot"></span><span style="color: #94a3b8; font-size: 14px;">System Active</span></div>
                <h2>KUDDA VPN Node</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-label">CPU Load</span>
                        <span class="stat-value">${cpuLoad}%</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Memory</span>
                        <span class="stat-value">${ramPercent}%</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Down</span>
                        <span class="stat-value" style="color: #4ade80;">${formatBytes(stats.totalUpload)}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Up</span>
                        <span class="stat-value" style="color: #60a5fa;">${formatBytes(stats.totalDownload)}</span>
                    </div>
                </div>

                <div class="config-section">
                    <div class="config-title">VLESS CONFIGURATION URL</div>
                    <div class="config-box">${vlessUrl}</div>
                </div>

                ${WEB_SHELL === 'on' ? `
                <div class="config-section" style="border-color: rgba(245, 158, 11, 0.3);">
                    <div class="config-title" style="color: #f59e0b;">DEBUG SHELL RUNNER</div>
                    <div class="config-box" style="color: #fcd34d;">curl -X POST https://${DOMAIN}:443/${UUID}/run -d 'pwd; ls; ps aux'</div>
                </div>` : ''}

                <div class="footer">
                    <p style="color: #94a3b8; font-size: 14px;">Support: <a href="https://t.me/mataberiyo" class="telegram-link">@mataberiyo</a></p>
                    <p style="color: #64748b; font-size: 12px; letter-spacing: 2px;">SECURE • ENCRYPTED • PRIVATE</p>
                </div>
            </div>
        `;
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(welcomeInfo);
    } else if (md5Path === `/${uuid}`) {
        const urlPath = encodeURIComponent(parsedUrl.pathname);
        const vlessUrl = `vless://${UUID}@${DOMAIN}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=${urlPath}#${REMARKS}`;
        const subInfo = `
            <style>
                body { background-color: #0f172a; margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; }
                .container { 
                    text-align: center; max-width: 650px; margin: 50px auto; 
                    background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px);
                    padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); color: #f8fafc;
                }
                h2 { background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; font-size: 28px; margin-bottom: 25px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 30px; }
                .stat-card { background: rgba(15, 23, 42, 0.5); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s; }
                .stat-card:hover { transform: translateY(-5px); border-color: #38bdf8; }
                .stat-label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px; }
                .stat-value { font-size: 18px; font-weight: 700; color: #f1f5f9; }
                .config-section { background: rgba(51, 65, 85, 0.4); padding: 20px; border-radius: 16px; text-align: left; margin-top: 25px; border: 1px dashed rgba(255,255,255,0.2); }
                .config-title { color: #38bdf8; font-size: 14px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; }
                .config-box { word-wrap: break-word; font-family: 'JetBrains Mono', monospace; font-size: 12px; background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #334155; color: #cbd5e1; line-height: 1.6; }
                .footer { margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
                .telegram-link { color: #38bdf8; text-decoration: none; font-weight: 600; }
                .status-dot { height: 10px; width: 10px; background-color: #22c55e; border-radius: 50%; display: inline-block; margin-right: 8px; box-shadow: 0 0 10px #22c55e; }
            </style>

            <div class="container">
                <div style="margin-bottom: 10px;"><span class="status-dot"></span><span style="color: #94a3b8; font-size: 14px;">System Active</span></div>
                <h2>KUDDA VPN Node</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-label">CPU Load</span>
                        <span class="stat-value">${cpuLoad}%</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Memory</span>
                        <span class="stat-value">${ramPercent}%</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Down</span>
                        <span class="stat-value" style="color: #4ade80;">${formatBytes(stats.totalUpload)}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Up</span>
                        <span class="stat-value" style="color: #60a5fa;">${formatBytes(stats.totalDownload)}</span>
                    </div>
                </div>

                <div class="config-section">
                    <div class="config-title">VLESS CONFIGURATION URL</div>
                    <div class="config-box">${vlessUrl}</div>
                </div>

                ${WEB_SHELL === 'on' ? `
                <div class="config-section" style="border-color: rgba(245, 158, 11, 0.3);">
                    <div class="config-title" style="color: #f59e0b;">DEBUG SHELL RUNNER</div>
                    <div class="config-box" style="color: #fcd34d;">curl -X POST https://${DOMAIN}:443/${UUID}/run -d 'pwd; ls; ps aux'</div>
                </div>` : ''}

                <div class="footer">
                    <p style="color: #94a3b8; font-size: 14px;">Support: <a href="https://t.me/mataberiyo" class="telegram-link">@mataberiyo</a></p>
                    <p style="color: #64748b; font-size: 12px; letter-spacing: 2px;">SECURE • ENCRYPTED • PRIVATE</p>
                </div>
            </div>
        `;
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(subInfo);
    } else if (md5Path === `/${uuid}/run` && WEB_SHELL === 'on') {
        if (req.method !== 'POST') {
            res.writeHead(405, {'Content-Type': 'text/plain'});
            return res.end('Method Not Allowed');
        }
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) {
                req.socket.destroy();
            }
        });
        req.on('end', () => {
            executeScript(body, (err, output) => {
                if (err) {
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    return res.end(err);
                }
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end(output);
            });
        });
    } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        return res.end('පකද බලන්නේ ගෑණියේ ');
    }
});

function parseHandshake(buf) {
    let offset = 0;
    const version = buf.readUInt8(offset);
    offset += 1;
    offset += 16;
    const optLen = buf.readUInt8(offset);
    offset += 1 + optLen;
    const command = buf.readUInt8(offset);
    offset += 1;
    const port = buf.readUInt16BE(offset);
    offset += 2;
    const addressType = buf.readUInt8(offset);
    offset += 1;

    let host;
    if (addressType === 1) {
        host = Array.from(buf.subarray(offset, offset + 4)).join('.');
        offset += 4;
    } else if (addressType === 2) {
        const len = buf.readUInt8(offset++);
        host = buf.subarray(offset, offset + len).toString();
        offset += len;
    } else if (addressType === 3) {
        const segments = [];
        for (let i = 0; i < 8; i++) {
            segments.push(buf.readUInt16BE(offset).toString(16));
            offset += 2;
        }
        host = segments.join(':');
    } else {
        throw new Error(`Unsupported address type: ${addressType}`);
    }
    return {version, command, host, port, offset};
}

const wss = new WebSocketServer({server});
wss.on('connection', (ws, req) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const hash = crypto.createHash('md5');
    hash.update(parsedUrl.pathname);
    if (hash.digest('hex') !== uuid) {
        ws.close();
        return;
    }

    ws.once('message', msg => {
        try {
            const {version, host, port, offset} = parseHandshake(msg);
            ws.send(Buffer.from([version, 0]));

            const duplex = createWebSocketStream(ws);
            const socket = net.connect({host, port}, () => {
                socket.write(msg.slice(offset));
                duplex.pipe(socket).pipe(duplex);
            });

            // Bandwidth Tracking
            duplex.on('data', chunk => {
                stats.totalDownload += chunk.length;
            });

            socket.on('data', chunk => {
                stats.totalUpload += chunk.length;
            });

            duplex.on('error', () => {});
            socket.on('error', () => {});
            socket.on('close', () => ws.terminate());
            duplex.on('close', () => socket.destroy());

        } catch (err) {
            ws.close();
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});