const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const os = require('os'); // System monitoring
const { URL } = require('url');
const { exec } = require('child_process');
const { Buffer } = require('buffer');
const { createServer } = require('https');
const { WebSocketServer, createWebSocketStream } = require('ws');

const WEB_SHELL = process.env.WEB_SHELL || 'off';
const UUID = process.env.UUID || '10889da6-14ea-4cc8-97fa-6c0bc410f121';
const DOMAIN = process.env.DOMAIN || 'example.com';
const PORT = process.env.PORT || 3000;
const REMARKS = process.env.REMARKS || 'nodejs-vless-tls';
const SHELL_PASS = process.env.SHELL_PASS || 'karikudda123@'; // <--- Password එක මෙතනින් වෙනස් කරන්න පුළුවන්

// --- Bandwidth Stats Persistence Logic ---
const STATS_FILE = path.join(__dirname, 'stats.json');
let stats = { totalUpload: 0, totalDownload: 0 };
let isWritingStats = false; // Prevents overlapping disk writes (Prevents CPU Spikes)

if (fs.existsSync(STATS_FILE)) {
    try {
        stats = JSON.parse(fs.readFileSync(STATS_FILE));
    } catch (e) {
        console.error("Stats file read error");
    }
}

// Event Loop Block නොවන ලෙස Asynchronous ලෙස Save කිරීම
function saveStats() {
    if (isWritingStats) return;
    isWritingStats = true;
    fs.writeFile(STATS_FILE, JSON.stringify(stats), (err) => {
        isWritingStats = false;
        if (err) console.error("Error saving stats:", err);
    });
}

// තත්පර 15කට වරක් Non-blocking async save කිරීම
setInterval(saveStats, 15000);

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
    fs.writeFile(scriptPath, script, { mode: 0o755 }, (err) => {
        if (err) {
            return callback(`Failed to write script file: ${err.message}`);
        }
        exec(`sh "${scriptPath}"`, { timeout: 10000 }, (error, stdout, stderr) => {
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
			<div style="text-align:center;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:55px 40px;background:linear-gradient(145deg,#ffffff,#f8fbff);border-radius:35px;border:1px solid rgba(59,130,246,.15);max-width:560px;margin:60px auto;box-shadow:0 30px 70px rgba(15,23,42,.18);color:#334155;position:relative;overflow:hidden;">
			
			  <!-- Background Leaf SVG -->
			  <div style="position:absolute;right:-45px;top:-45px;opacity:.06;pointer-events:none;">
			    <svg width="230" height="230" viewBox="0 0 24 24" fill="none">
			      <path d="M20.5 3.5C13 3.5 6 7 4 14c-1 3.5 1.5 6.5 5 6.5 7 0 11-7 11.5-17Z" fill="#22c55e"/>
			      <path d="M6 18C10 14 14 10 19 5" stroke="#166534" stroke-width="1.2" stroke-linecap="round"/>
			      <path d="M11 13L8 11" stroke="#166534" stroke-width="1" stroke-linecap="round"/>
			      <path d="M14 10L12 7" stroke="#166534" stroke-width="1" stroke-linecap="round"/>
			    </svg>
			  </div>
			
			  <!-- Logo -->
			  <h1 style="color:#2563eb;margin:0;letter-spacing:10px;font-weight:900;font-size:34px;text-transform:uppercase;text-shadow:0 0 20px rgba(37,99,235,.25);">KUDDA VPN</h1>
			
			  <h3 style="margin-top:12px;color:#64748b;font-size:.85rem;letter-spacing:5px;font-weight:500;text-transform:uppercase;">THE ETERNAL CONNECTION</h3>
			
			  <div style="height:2px;background:linear-gradient(90deg,transparent,#3b82f6,transparent);margin:40px 0;"></div>
			
			  <!-- Status Box -->
			  <div style="padding:35px;background:#f8faff;border-radius:28px;border:1px solid rgba(59,130,246,.12);text-align:left;box-shadow:inset 0 0 30px rgba(59,130,246,.05);position:relative;">
			    <div style="position:absolute;left:0;top:20%;height:60%;width:6px;background:linear-gradient(#60a5fa,#2563eb);border-radius:0 20px 20px 0;"></div>
			
			    <p style="display:flex;align-items:center;gap:8px;margin:0 0 15px;font-size:.75rem;color:#2563eb;font-weight:900;letter-spacing:3px;">
			      <svg width="18" height="18" viewBox="0 0 24 24" fill="#2563eb">
			        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8Z"/>
			      </svg>
			      SYSTEM STATUS
			    </p>
			
			    <p style="margin:0;font-size:1.15rem;line-height:1.9;font-style:italic;color:#1e293b;">
			      "Wake up to reality.<br>
			      The strongest network layer<br>
			      is protected behind the
			      <span style="color:#2563eb;font-weight:900;text-shadow:0 0 10px rgba(37,99,235,.4);">True Key</span>."
			    </p>
			  </div>
			
			  <p style="margin-top:45px;font-size:.95rem;color:#475569;line-height:1.8;font-weight:600;">
			    Only verified users can access<br>
			    <span style="color:#2563eb;">the hidden gateway.</span>
			  </p>
			
			  <!-- Footer -->
			  <div style="margin-top:45px;padding-top:30px;border-top:1px solid #e2e8f0;">
			    <p style="font-size:.7rem;letter-spacing:3px;color:#94a3b8;font-weight:800;">AUTHORIZED ACCESS ONLY</p>
			
			    <a href="https://t.me/mataberiyo" style="margin-top:15px;display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#2563eb,#38bdf8);color:white;padding:13px 32px;border-radius:50px;text-decoration:none;font-weight:800;font-size:1rem;box-shadow:0 10px 25px rgba(37,99,235,.35);">
			      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
			        <path d="M14.5 3C10 4 6.5 7.5 5 12l-3 3 5 1 1 5 3-3c4.5-1.5 8-5 9-9.5L14.5 3Z"/>
			        <circle cx="13" cy="9" r="1.5" fill="#2481cc"/>
			      </svg>
			      Contact Owner
			    </a>
			  </div>
			</div>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(welcomeInfo);
    } else if (parsedUrl.pathname === `/${UUID}`) {
        const vlessUrl = `vless://${UUID}@${DOMAIN}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${REMARKS}`;
        const subInfo = `
            <div style="text-align: center; font-family: 'Segoe UI', sans-serif; padding: 40px; background: #fff; border-radius: 15px; border: 2px solid #3498db; max-width: 600px; margin: 50px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <h2 style="color: #2c3e50; margin-bottom: 15px;">KUDDA VPN - Node Config</h2>
                
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 25px; background: #f8f9fa; padding: 15px; border-radius: 12px; border: 1px solid #e1e4e8;">
                    <div style="flex: 1; min-width: 80px;">
                        <small style="color: #7f8c8d; display: block;">CPU</small>
                        <strong style="color: #2c3e50;">${cpuLoad}%</strong>
                    </div>
                    <div style="flex: 1; min-width: 80px;">
                        <small style="color: #7f8c8d; display: block;">RAM</small>
                        <strong style="color: #2c3e50;">${ramUsage}%</strong>
                    </div>
                    <div style="flex: 1; min-width: 110px;">
                        <small style="color: #7f8c8d; display: block;">Download</small>
                        <strong style="color: #27ae60;">${formatBytes(stats.totalUpload)}</strong>
                    </div>
                    <div style="flex: 1; min-width: 110px;">
                        <small style="color: #7f8c8d; display: block;">Upload</small>
                        <strong style="color: #2980b9;">${formatBytes(stats.totalDownload)}</strong>
                    </div>
                </div>

                <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #3498db; text-align: left;">
                    <h4 style="margin-top: 0; color: #2980b9;">VLESS URL:</h4>
                    <p style="word-wrap: break-word; font-family: monospace; font-size: 13px; background: #fff; padding: 12px; border: 1px solid #ced4da; border-radius: 5px; color: #333;">${vlessUrl}</p>
                </div>

                ${WEB_SHELL === 'on' ? `
                <div style="background: #fdf2e9; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #e67e22; text-align: left; position: relative;">
                    <h4 style="margin-top: 0; color: #d35400;">Web Shell Runner:</h4>
                    
                    <!-- Secure Overlay (Blurred Background + Inputs) -->
                    <div id="secure-shell-overlay" style="position: relative; width: 100%; height: 50px; background: #fff; border: 1px solid #fadbd8; border-radius: 5px; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; filter: blur(3px); opacity: 0.4; background: repeating-linear-gradient(45deg, #fceceb, #fceceb 10px, #ffffff 10px, #ffffff 20px);"></div>
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 10; gap: 8px;">
                            <input type="password" id="admin-pwd" placeholder="Enter Password" style="padding: 6px 12px; border: 1px solid #e67e22; border-radius: 4px; outline: none; font-size: 13px; font-family: monospace;">
                            <button onclick="revealCmd()" style="padding: 6px 15px; background: #e67e22; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">Unlock</button>
                        </div>
                    </div>

                    <!-- The Real Command Box (Hidden by default, empty until API returns it) -->
                    <code id="secure-shell-cmd" style="display: none; background: #fff; padding: 10px; border-radius: 5px; border: 1px solid #fadbd8; font-size: 13px; color: #333; word-wrap: break-word;"></code>
                    <p id="shell-error" style="color: #c0392b; font-size: 12px; margin-top: 8px; display: none; font-weight: bold;">❌ Incorrect Password!</p>

                    <script>
                        function revealCmd() {
                            const pwd = document.getElementById('admin-pwd').value;
                            if(!pwd) return;
                            
                            // API එකට යවලා Server එකෙන් Command එක ගන්නවා
                            fetch(window.location.pathname.replace(/\\/?$/, '') + '/get-cmd', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pwd: pwd })
                            })
                            .then(res => {
                                if(res.status === 200) return res.text();
                                throw new Error('Unauthorized');
                            })
                            .then(cmd => {
                                // Password එක හරි නම් විතරයි මේ ටික වෙන්නේ
                                document.getElementById('secure-shell-overlay').style.display = 'none';
                                document.getElementById('shell-error').style.display = 'none';
                                const cmdEl = document.getElementById('secure-shell-cmd');
                                cmdEl.style.display = 'block';
                                cmdEl.innerText = cmd;
                            })
                            .catch(err => {
                                document.getElementById('shell-error').style.display = 'block';
                            });
                        }
                    </script>
                </div>` : ''}

				<hr style="border: 0; border-top: 1px solid #eaeaea; margin: 25px 0;">
				
				<div style="text-align: center; margin: 20px 0;">
					<a href="https://t.me/mataberiyo" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background-color: #2481cc; color: #ffffff; text-decoration: none; padding: 10px 24px; font-size: 14px; border-radius: 25px; font-weight: bold; box-shadow: 0 4px 6px rgba(36, 129, 204, 0.2); font-family: sans-serif; cursor: pointer;">
					
					    <!-- Rocket Icon -->
					    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
					        <path d="M13.5 2C9.7 2.5 6.5 5.2 5 8.8L2 12l4 1 1 4 3.2-3c3.6-1.5 6.3-4.7 6.8-8.5L18 2l-4.5.5zM9 12c-.8 0-1.5-.7-1.5-1.5S8.2 9 9 9s1.5.7 1.5 1.5S9.8 12 9 12z"/>
					        <path d="M6 17l-3 3 4-1 1-3-2-2zM14 18l-1 4 3-3-2-1z"/>
					    </svg>
					
					    Contact on Telegram
					</a>
				</div>
				
				<p style="color: #bdc3c7; font-size: 0.85rem; text-align: center; margin-top: 15px; font-style: italic;">
				    Enjoy your secure connection ~
				</p>
            </div>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(subInfo);
    } else if (parsedUrl.pathname === `/${UUID}/run` && WEB_SHELL === 'on') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
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
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    return res.end(err);
                }
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(output);
            });
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Pakada Balanne kari Ponnayo');
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
    return { version, id, command, host, port, offset };
}

const uuid = Buffer.from(UUID.replace(/-/g, ''), 'hex');
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
    ws.once('message', msg => {
        try {
            const { version, id, host, port, offset } = parseHandshake(msg);

            if (!id.equals(uuid)) {
                return ws.close();
            }
            ws.send(Buffer.from([version, 0]));

            const duplex = createWebSocketStream(ws);
            const socket = net.connect({ host, port }, () => {
                socket.write(msg.slice(offset));

                // Speed & Ping Optimizations
                socket.setNoDelay(true); // Disable Nagle's Algorithm for low ping
                socket.setKeepAlive(true, 10000); // Connection stability

                // Optimized Pipe Stream
                duplex.pipe(socket);
                socket.pipe(duplex);
            });

            // Bandwidth Tracking
            duplex.on('data', chunk => {
                stats.totalDownload += chunk.length;
            });

            socket.on('data', chunk => {
                stats.totalUpload += chunk.length;
            });

            // Connection එක වැසෙද්දී RAM එක Clean කරන ආකාරය (Memory Sweep Function)
            const forceCleanMemory = () => {
                try {
                    if (duplex) {
                        duplex.removeAllListeners();
                        duplex.destroy();
                    }
                    if (socket) {
                        socket.removeAllListeners();
                        socket.destroy();
                    }
                    if (ws) {
                        ws.terminate();
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
            };

            duplex.on('close', forceCleanMemory);
            socket.on('close', forceCleanMemory);
            duplex.on('error', forceCleanMemory);
            socket.on('error', forceCleanMemory);

        } catch (err) {
            ws.close();
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
