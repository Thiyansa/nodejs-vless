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

const UUID = process.env.UUID || '10889da6-14ea-4cc8-97fa-6c0bc410f121';
const PATH = process.env.PATH_NAME || 'sub'; // UUID එක වෙනුවට පාවිච්චි වන path එක මෙතනට දාන්න
const DOMAIN = process.env.DOMAIN || 'example.com';
const PORT = process.env.PORT || 3000;
const REMARKS = process.env.REMARKS || 'nodejs-vless';
const WEB_SHELL = process.env.WEB_SHELL || 'off';

// Persistence for Bandwidth
const USAGE_FILE = path.join(__dirname, 'data-usage.json');
let stats = { upload: 0, download: 0 };

if (fs.existsSync(USAGE_FILE)) {
    try {
        stats = JSON.parse(fs.readFileSync(USAGE_FILE));
    } catch (e) {
        stats = { upload: 0, download: 0 };
    }
}

function saveStats() {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(stats));
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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

const server = createServer((req, res) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    if (parsedUrl.pathname === '/') {
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const memUsage = ((1 - freeMem / totalMem) * 100).toFixed(2);
        const load = os.loadavg();
        const cpuUsage = ((load[0] * 100) / os.cpus().length).toFixed(2);

        const welcomeInfo = `
            <div style="text-align: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background: #f0f2f5; min-height: 100vh;">
                <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.1);">
                    <h1 style="color: #1a73e8; margin-bottom: 10px;">🚀 KUDDA VPN</h1>
                    <h3 style="color: #5f6368; font-weight: 400; margin-top: 0;">System Dashboard</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0;">
                        <div style="background: #e8f0fe; padding: 15px; border-radius: 12px; border: 1px solid #d2e3fc;">
                            <span style="display: block; font-size: 0.8rem; color: #1967d2; font-weight: bold; text-transform: uppercase;">CPU Usage</span>
                            <span style="font-size: 1.5rem; color: #174ea6; font-weight: bold;">${cpuUsage}%</span>
                        </div>
                        <div style="background: #e6fffa; padding: 15px; border-radius: 12px; border: 1px solid #b2f5ea;">
                            <span style="display: block; font-size: 0.8rem; color: #2c7a7b; font-weight: bold; text-transform: uppercase;">RAM Usage</span>
                            <span style="font-size: 1.5rem; color: #285e61; font-weight: bold;">${memUsage}%</span>
                        </div>
                        <div style="background: #fff5f5; padding: 15px; border-radius: 12px; border: 1px solid #feb2b2;">
                            <span style="display: block; font-size: 0.8rem; color: #c53030; font-weight: bold; text-transform: uppercase;">Total Upload</span>
                            <span style="font-size: 1.2rem; color: #9b2c2c; font-weight: bold;">${formatBytes(stats.upload)}</span>
                        </div>
                        <div style="background: #f0fff4; padding: 15px; border-radius: 12px; border: 1px solid #9ae6b4;">
                            <span style="display: block; font-size: 0.8rem; color: #2f855a; font-weight: bold; text-transform: uppercase;">Total Download</span>
                            <span style="font-size: 1.2rem; color: #22543d; font-weight: bold;">${formatBytes(stats.download)}</span>
                        </div>
                    </div>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                    
                    <p style="font-size: 1.1rem; color: #3c4043;">
                        ඔබේ Node තොරතුරු ලබා ගැනීමට <br>
                        <a href="/${PATH}" style="display: inline-block; margin-top: 10px; text-decoration: none; font-weight: bold; color: #ffffff; background: #e74c3c; padding: 8px 20px; border-radius: 50px;">/${PATH}</a>
                    </p>

                    <div style="margin-top: 25px; padding: 15px; background: #f8f9fa; border-radius: 12px;">
                        <p style="margin: 0; color: #70757a; font-size: 0.9rem;">Contact for Support:</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold; color: #1a73e8;">t.me/mataberiyo</p>
                    </div>
                </div>
            </div>
        `;
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(welcomeInfo);
    } else if (parsedUrl.pathname === `/${PATH}`) {
        const vlessUrl = `vless://${UUID}@${DOMAIN}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${REMARKS}`;
        const subInfo = `
            <div style="text-align: center; font-family: 'Segoe UI', sans-serif; padding: 40px; background: #fff; border-radius: 15px; border: 2px solid #3498db; max-width: 600px; margin: 50px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <h2 style="color: #2c3e50;">KUDDA VPN - Node Config</h2>
                
                <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #3498db; text-align: left;">
                    <h4 style="margin-top: 0; color: #2980b9;">VLESS URL:</h4>
                    <p style="word-wrap: break-word; font-family: monospace; font-size: 13px; background: #fff; padding: 12px; border: 1px solid #ced4da; border-radius: 5px; color: #333;">${vlessUrl}</p>
                </div>

                ${WEB_SHELL === 'on' ? `
                <div style="background: #fdf2e9; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #e67e22; text-align: left;">
                    <h4 style="margin-top: 0; color: #d35400;">Web Shell Runner:</h4>
                    <code style="display: block; background: #fff; padding: 10px; border-radius: 5px; border: 1px solid #fadbd8; font-size: 13px;">curl -X POST https://${DOMAIN}:443/${PATH}/run -d'pwd; ls; ps aux'</code>
                </div>` : ''}

                <hr style="border: 0; border-top: 1px dotted #ccc; margin: 20px 0;">
                <a href="/" style="text-decoration: none; color: #3498db; font-weight: bold;">Back to Dashboard</a>
                <p style="color: #7f8c8d; font-size: 0.9rem; margin-top: 15px;">Contact: <strong>t.me/mataberiyo</strong></p>
            </div>
        `;
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(subInfo);
    } else if (parsedUrl.pathname === `/${PATH}/run` && WEB_SHELL === 'on') {
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

/**
 * Refer to: https://xtls.github.io/development/protocols/vless.html
 */
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

            // Tracking bandwidth
            duplex.on('data', (chunk) => {
                stats.download += chunk.length;
            });
            socket.on('data', (chunk) => {
                stats.upload += chunk.length;
            });

            duplex.on('error', () => {});
            socket.on('error', () => {});

            socket.on('close', () => {
                ws.terminate();
                saveStats();
            });
            duplex.on('close', () => {
                socket.destroy();
                saveStats();
            });

        } catch (err) {
            ws.close();
        }
    });
});

// Auto-save bandwidth every 30 seconds
setInterval(saveStats, 30000);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
