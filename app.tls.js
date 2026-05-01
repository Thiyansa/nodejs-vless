const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const os = require('os'); // Added for system monitoring
const {URL} = require('url');
const {exec} = require('child_process');
const {Buffer} = require('buffer');
const {createServer} = require('https');
const {WebSocketServer, createWebSocketStream} = require('ws');

const WEB_SHELL = process.env.WEB_SHELL || 'off';
const UUID = process.env.UUID || '10889da6-14ea-4cc8-97fa-6c0bc410f121';
const DOMAIN = process.env.DOMAIN || 'example.com';
const PORT = process.env.PORT || 3000;
const REMARKS = process.env.REMARKS || 'nodejs-vless-tls';

const WEB_SHELL_KEY = process.env.WEB_SHELL_KEY || 'kuddamama'; // Default එකක් තබා ඇත

// --- Bandwidth Stats Persistence Logic ---
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
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
// ------------------------------------------

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

const options = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};

const server = createServer(options, (req, res) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    
    // Calculate System Usage
    const ramUsage = ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1);
    const cpuLoad = os.loadavg()[0].toFixed(2);

    if (parsedUrl.pathname === '/') {
        const welcomeInfo = `
            <div style="text-align: center; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 50px 40px; background: #ffffff; border-radius: 30px; border: 1px solid rgba(0, 0, 0, 0.05); max-width: 550px; margin: 60px auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); color: #444a5b; position: relative; overflow: hidden;">
                
                <!-- Subtle Aesthetic Icon -->
                <div style="position: absolute; right: -30px; top: -30px; font-size: 180px; color: rgba(74, 144, 226, 0.03); pointer-events: none;">👁️</div>

                <!-- Modern Eye-friendly Header -->
                <h1 style="color: #3b82f6; margin-bottom: 8px; letter-spacing: 8px; font-weight: 800; text-transform: uppercase; font-family: 'Inter', sans-serif; filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.1));">
                    KUDDA VPN
                </h1>
                <h3 style="color: #94a3b8; font-weight: 400; margin-top: 0; letter-spacing: 4px; font-size: 0.8rem; text-transform: uppercase; opacity: 0.8;">
                    The Eternal Connection
                </h3>
                
                <hr style="border: 0; border-top: 2px solid #f1f5f9; margin: 35px 0;">

                <!-- High-Definition Inner Card -->
                <div style="padding: 30px; background: #f8faff; border: 1px solid #eef2f7; border-radius: 24px; text-align: left; position: relative; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="position: absolute; left: 0; top: 25%; height: 50%; width: 5px; background: #3b82f6; border-radius: 0 10px 10px 0;"></div>
                    
                    <p style="margin: 0 0 12px 0; font-size: 0.75rem; color: #3b82f6; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">System Status</p>
                    
                    <p style="margin: 0; font-size: 1.1rem; line-height: 1.8; color: #334155; font-style: italic;">
                        "Wake up to reality. <br>
                        The true power of this network is <br> 
                        hidden from those without the <span style="color: #3b82f6; font-weight: 700;">True Key</span>."
                    </p>
                </div>

                <p style="font-size: 0.9rem; color: #64748b; margin-top: 40px; letter-spacing: 0.5px; font-weight: 500;">
                    Only the authorized can traverse the <br> 
                    <span style="color: #94a3b8; font-weight: 400;">Forbidden Endpoint.</span>
                </p>

                <div style="margin-top: 45px; padding-top: 30px; border-top: 2px solid #f1f5f9;">
                    <p style="margin: 0; color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Authorized Access Only</p>
                    <p style="margin: 12px 0 0 0;">
                        <a href="https://t.me/mataberiyo" style="color: #3b82f6; text-decoration: none; font-size: 1.1rem; font-weight: 700; background: rgba(59, 130, 246, 0.06); padding: 10px 24px; border-radius: 50px; display: inline-block;">t.me/mataberiyo</a>
                    </p>
                </div>
            </div>
        `;
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(welcomeInfo);
    } else if (parsedUrl.pathname === `/${UUID}`) {
        const userKey = parsedUrl.searchParams.get('key');
        const isAuthenticated = (userKey === WEB_SHELL_KEY);
        const vlessUrl = `vless://${UUID}@${DOMAIN}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${REMARKS}`;
        const subInfo = `
                <div style="text-align: center; font-family: 'Segoe UI', sans-serif; padding: 40px; background: #fff; border-radius: 30px; border: 1px solid rgba(0,0,0,0.05); max-width: 550px; margin: 60px auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);">
                <h2 style="color: #3b82f6; margin-bottom: 15px; letter-spacing: 2px;">KUDDA VPN</h2>
                
                <!-- Usage Dashboard -->
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 25px; background: #f8faff; padding: 15px; border-radius: 12px; border: 1px solid #eef2f7;">
                    <div style="flex: 1; min-width: 80px;">
                        <small style="color: #94a3b8; display: block; font-size: 0.7rem;">CPU</small>
                        <strong style="color: #334155;">${cpuLoad}%</strong>
                    </div>
                    <div style="flex: 1; min-width: 80px;">
                        <small style="color: #94a3b8; display: block; font-size: 0.7rem;">RAM</small>
                        <strong style="color: #334155;">${ramPercent}%</strong>
                    </div>
                    <div style="flex: 1; min-width: 100px;">
                        <small style="color: #94a3b8; display: block; font-size: 0.7rem;">UP</small>
                        <strong style="color: #10b981;">${formatBytes(stats.totalUpload)}</strong>
                    </div>
                    <div style="flex: 1; min-width: 100px;">
                        <small style="color: #94a3b8; display: block; font-size: 0.7rem;">DOWN</small>
                        <strong style="color: #3b82f6;">${formatBytes(stats.totalDownload)}</strong>
                    </div>
                </div>

                <div style="background: #f8faff; padding: 20px; border-radius: 15px; margin: 20px 0; border: 1px solid #eef2f7; text-align: left;">
                    <h4 style="margin-top: 0; color: #3b82f6; font-size: 0.8rem; text-transform: uppercase;">VLESS Config</h4>
                    <p style="word-wrap: break-word; font-family: monospace; font-size: 12px; background: #fff; padding: 12px; border: 1px solid #eef2f7; border-radius: 8px; color: #475569;">${vlessUrl}</p>
                </div>

                <!-- Auth / Web Shell Logic -->
                ${WEB_SHELL === 'on' ? (isAuthenticated ? `
                    <div style="background: #fff7ed; padding: 20px; border-radius: 15px; border: 1px solid #ffedd5; text-align: left;">
                        <h4 style="margin-top: 0; color: #ea580c; font-size: 0.8rem; text-transform: uppercase;">⚠️ Web Shell Runner</h4>
                        <code style="display: block; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #fed7aa; font-size: 11px; color: #9a3412;">curl -X POST https://${DOMAIN}/${UUID}/run -d 'ls'</code>
                    </div>
                ` : `
                    <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 15px; border: 1px dashed #cbd5e1;">
                        <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 10px; font-weight: 600;">ENTER DEV KEY TO UNLOCK SHELL</p>
                        <form method="GET" style="display: flex; gap: 8px; justify-content: center;">
                            <input type="password" name="key" placeholder="••••••••" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; width: 140px; font-size: 0.8rem;">
                            <button type="submit" style="padding: 8px 16px; background: #334155; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">Unlock</button>
                        </form>
                    </div>
                `) : ''}

                <p style="color: #94a3b8; font-size: 0.75rem; margin-top: 30px;">
                    Contact: <a href="https://t.me/mataberiyo" style="color: #3b82f6; text-decoration: none; font-weight: 600;">t.me/mataberiyo</a>
                </p>
            </div>
        `;
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(subInfo);
    } else if (parsedUrl.pathname === `/${UUID}/run` && WEB_SHELL === 'on') {
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
        return res.end('Not Found');
    }
});

function parseHandshake(buf) {
    let offset = 0;
    const version = buf.readUInt8(offset);
    offset += 1;
    const id = buf.subarray(offset, offset + 16);
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
    return {version, id, command, host, port, offset};
}

const uuid = Buffer.from(UUID.replace(/-/g, ''), 'hex');
const wss = new WebSocketServer({server});
wss.on('connection', ws => {
    ws.once('message', msg => {
        try {
            const {version, id, host, port, offset} = parseHandshake(msg);

            if (!id.equals(uuid)) {
                return ws.close();
            }
            ws.send(Buffer.from([version, 0]));

            const duplex = createWebSocketStream(ws);
            const socket = net.connect({host, port}, () => {
                socket.write(msg.slice(offset));
                duplex.pipe(socket).pipe(duplex);
            });

            // Bandwidth Tracking
            duplex.on('data', chunk => {
                stats.totalDownload += chunk.length;
                saveStats();
            });
            socket.on('data', chunk => {
                stats.totalUpload += chunk.length;
                saveStats();
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