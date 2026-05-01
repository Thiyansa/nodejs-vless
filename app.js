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
const DOMAIN = process.env.DOMAIN || 'example.com';
const PORT = process.env.PORT || 3000;
const REMARKS = process.env.REMARKS || 'nodejs-vless';
const WEB_SHELL = process.env.WEB_SHELL || 'off';

// --- Data Persistence for Bandwidth ---
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
    
    // System Resource Monitoring
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercent = ((usedMem / totalMem) * 100).toFixed(1);
    const cpuLoad = (os.loadavg()[0]).toFixed(2);

    if (parsedUrl.pathname === '/') {
        const welcomeInfo = `
            <div style="text-align: center; font-family: 'Segoe UI', sans-serif; padding: 40px; background: #f4f7f6; border-radius: 15px; border: 1px solid #ddd; max-width: 500px; margin: 50px auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                <h1 style="color: #2c3e50; margin-bottom: 5px;">🚀 KUDDA VPN</h1>
                <h3 style="color: #34495e; font-weight: 400; margin-top: 0;">සාදරයෙන් පිළිගනිමු!</h3>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 1.1rem; color: #34495e;">
                    ඔබේ Node තොරතුරු ලබා ගැනීමට <br>
                    <span style="font-weight: bold; color: #e74c3c;">/${UUID}</span> <br>
                    වෙත පිවිසෙන්න.
                </p>
                <div style="margin-top: 25px; padding: 10px; background: #fff; border-radius: 8px;">
                    <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Contact for Support:</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; color: #0088cc;">t.me/mataberiyo</p>
                </div>
            </div>
        `;
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(welcomeInfo);
    } else if (parsedUrl.pathname === `/${UUID}`) {
        const vlessUrl = `vless://${UUID}@${DOMAIN}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${REMARKS}`;
        const subInfo = `
            <div style="text-align: center; font-family: 'Segoe UI', sans-serif; padding: 40px; background: #fff; border-radius: 15px; border: 2px solid #3498db; max-width: 600px; margin: 50px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <h2 style="color: #2c3e50; margin-bottom: 15px;">KUDDA VPN - Node Config</h2>
                
                <!-- Usage Dashboard -->
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 25px; background: #f8f9fa; padding: 15px; border-radius: 12px; border: 1px solid #e1e4e8;">
                    <div style="flex: 1; min-width: 100px;">
                        <small style="color: #7f8c8d; display: block;">CPU</small>
                        <strong style="color: #2c3e50;">${cpuLoad}%</strong>
                    </div>
                    <div style="flex: 1; min-width: 100px;">
                        <small style="color: #7f8c8d; display: block;">RAM</small>
                        <strong style="color: #2c3e50;">${ramPercent}%</strong>
                    </div>
                    <div style="flex: 1; min-width: 120px;">
                        <small style="color: #7f8c8d; display: block;">Upload</small>
                        <strong style="color: #27ae60;">${formatBytes(stats.totalUpload)}</strong>
                    </div>
                    <div style="flex: 1; min-width: 120px;">
                        <small style="color: #7f8c8d; display: block;">Download</small>
                        <strong style="color: #2980b9;">${formatBytes(stats.totalDownload)}</strong>
                    </div>
                </div>

                <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #3498db; text-align: left;">
                    <h4 style="margin-top: 0; color: #2980b9;">VLESS URL:</h4>
                    <p style="word-wrap: break-word; font-family: monospace; font-size: 13px; background: #fff; padding: 12px; border: 1px solid #ced4da; border-radius: 5px; color: #333;">${vlessUrl}</p>
                </div>

                ${WEB_SHELL === 'on' ? `
                <div style="background: #fdf2e9; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #e67e22; text-align: left;">
                    <h4 style="margin-top: 0; color: #d35400;">Web Shell Runner:</h4>
                    <code style="display: block; background: #fff; padding: 10px; border-radius: 5px; border: 1px solid #fadbd8; font-size: 13px;">curl -X POST https://${DOMAIN}:443/${UUID}/run -d'pwd; ls; ps aux'</code>
                </div>` : ''}

                <hr style="border: 0; border-top: 1px dotted #ccc; margin: 20px 0;">
                <p style="color: #7f8c8d; font-size: 0.9rem;">Contact: <strong>t.me/mataberiyo</strong></p>
                <p style="color: #bdc3c7; font-size: 0.8rem;">Enjoy your secure connection ~</p>
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

            // Tracking Bandwidth Usage
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