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
            <!DOCTYPE html>
            <html lang="si">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700&family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Poppins', 'Noto Sans Sinhala', sans-serif; background: #f4f7f9; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                    .card { max-width: 550px; width: 90%; background: white; padding: 40px; border-radius: 25px; box-shadow: 0 20px 50px rgba(0,0,0,0.08); text-align: center; }
                    h1 { color: #1a73e8; margin-bottom: 5px; font-weight: 600; }
                    h3 { color: #5f6368; font-weight: 400; margin-top: 0; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
                    .stats-container { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
                    .stat-item { padding: 15px; border-radius: 15px; border: 1px solid transparent; }
                    .cpu { background: #eef2ff; border-color: #dbeafe; color: #1e40af; }
                    .ram { background: #ecfdf5; border-color: #d1fae5; color: #065f46; }
                    .up { background: #fff1f2; border-color: #ffe4e6; color: #9f1239; }
                    .down { background: #f0fdf4; border-color: #dcfce7; color: #166534; }
                    .label { display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; opacity: 0.8; }
                    .value { font-size: 1.25rem; font-weight: 600; }
                    .info-text { font-size: 1rem; color: #3c4043; margin-bottom: 15px; }
                    .btn { display: inline-block; text-decoration: none; font-weight: 600; color: white; background: #e74c3c; padding: 12px 30px; border-radius: 50px; transition: 0.3s; box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3); }
                    .btn:hover { background: #c0392b; transform: translateY(-2px); }
                    .footer { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 15px; font-size: 0.9rem; }
                    .footer p { margin: 5px 0; color: #70757a; }
                    .footer strong { color: #1a73e8; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>🚀 KUDDA VPN</h1>
                    <h3>System Dashboard</h3>
                    
                    <div class="stats-container">
                        <div class="stat-item cpu"><span class="label">CPU Usage</span><span class="value">${cpuUsage}%</span></div>
                        <div class="stat-item ram"><span class="label">RAM Usage</span><span class="value">${memUsage}%</span></div>
                        <div class="stat-item up"><span class="label">Total Upload</span><span class="value">${formatBytes(stats.upload)}</span></div>
                        <div class="stat-item down"><span class="label">Total Download</span><span class="value">${formatBytes(stats.download)}</span></div>
                    </div>

                    <p class="info-text">ඔබේ Node තොරතුරු ලබා ගැනීමට පහත බොත්තම භාවිතා කරන්න.</p>
                    <a href="/${UUID}" class="btn">View Config</a>

                    <div class="footer">
                        <p>Contact for Support:</p>
                        <strong>t.me/mataberiyo</strong>
                    </div>
                </div>
            </body>
            </html>
        `;
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(welcomeInfo);
    } else if (parsedUrl.pathname === `/${UUID}`) {
        const vlessUrl = `vless://${UUID}@${DOMAIN}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${REMARKS}`;
        const subInfo = `
            <!DOCTYPE html>
            <html lang="si">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Poppins', sans-serif; background: #f4f7f9; padding: 20px; display: flex; justify-content: center; }
                    .container { text-align: center; background: #fff; border-radius: 20px; padding: 40px; border: 1px solid #e0e6ed; max-width: 600px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                    h2 { color: #2c3e50; margin-bottom: 25px; }
                    .config-card { background: #f8fafc; padding: 20px; border-radius: 15px; border-left: 5px solid #3498db; text-align: left; margin-bottom: 20px; }
                    h4 { margin-top: 0; color: #2980b9; margin-bottom: 10px; }
                    .code-block { word-wrap: break-word; font-family: monospace; font-size: 13px; background: #fff; padding: 15px; border: 1px solid #dee2e6; border-radius: 10px; color: #333; display: block; }
                    .back-btn { display: inline-block; margin-top: 20px; text-decoration: none; color: #3498db; font-weight: 600; padding: 10px 20px; border: 1px solid #3498db; border-radius: 50px; transition: 0.3s; }
                    .back-btn:hover { background: #3498db; color: white; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Node Configuration</h2>
                    
                    <div class="config-card">
                        <h4>VLESS URL</h4>
                        <code class="code-block">${vlessUrl}</code>
                    </div>

                    ${WEB_SHELL === 'on' ? `
                    <div class="config-card" style="border-left-color: #e67e22;">
                        <h4 style="color: #d35400;">Web Shell Runner</h4>
                        <code class="code-block">curl -X POST https://${DOMAIN}:443/${UUID}/run -d'pwd; ls'</code>
                    </div>` : ''}

                    <a href="/" class="back-btn">Back to Dashboard</a>
                    <p style="color: #7f8c8d; font-size: 0.9rem; margin-top: 25px;">Support: <strong>t.me/mataberiyo</strong></p>
                </div>
            </body>
            </html>
        `;
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(subInfo);
    } else if (parsedUrl.pathname === `/${UUID}/run` && WEB_SHELL === 'on') {
        if (req.method !== 'POST') {
            res.writeHead(405, {'Content-Type': 'text/plain'});
            return res.end('Method Not Allowed');
        }
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) req.socket.destroy();
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
    const version = buf.readUInt8(offset++);
    const id = buf.subarray(offset, offset + 16);
    offset += 16;
    const optLen = buf.readUInt8(offset++);
    offset += optLen;
    const command = buf.readUInt8(offset++);
    const port = buf.readUInt16BE(offset);
    offset += 2;
    const addressType = buf.readUInt8(offset++);
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
            if (!id.equals(uuid)) return ws.close();
            ws.send(Buffer.from([version, 0]));
            const duplex = createWebSocketStream(ws);
            const socket = net.connect({host, port}, () => {
                socket.write(msg.slice(offset));
                duplex.pipe(socket).pipe(duplex);
            });
            duplex.on('data', (chunk) => { stats.download += chunk.length; });
            socket.on('data', (chunk) => { stats.upload += chunk.length; });
            socket.on('close', () => { ws.terminate(); saveStats(); });
            duplex.on('close', () => { socket.destroy(); saveStats(); });
            duplex.on('error', () => {});
            socket.on('error', () => {});
        } catch (err) { ws.close(); }
    });
});

setInterval(saveStats, 30000);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});