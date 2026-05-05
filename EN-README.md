# VLESS WebSocket Server & Shell API Executor

This project is a lightweight VLESS proxy server implemented using Node.js and the WebSocket protocol. It supports executing Shell scripts via a Web API and is suitable for self-hosted proxy setups and remote script execution scenarios.

## ✨ Key Features

- ✅ Supports the VLESS protocol and is compatible with mainstream proxy clients
- 🌐 Enables encrypted transmission via WebSocket + TLS
- 🔐 Supports UUID-based authentication
- 🖥 Provides a Web API interface for remote execution of Shell scripts
- 📎 Simple and user-friendly, with flexible configuration via environment variables

## 📦 Environment Variable Configuration

| Variable Name | Description                                         | Default Value                          |
| ------------- | --------------------------------------------------- | -------------------------------------- |
| `UUID`        | VLESS authentication key                            | `10889da6-14ea-4cc8-97fa-6c0bc410f121` |
| `DOMAIN`      | Access domain (used for client configuration)       | `example.com`                          |
| `PORT`        | Port number on which the service runs               | `3000`                                 |
| `REMARKS`     | Node remarks/description                            | `nodejs-vless`                         |
| `WEB_SHELL` | Whether to enable the Web Shell ( **on** : enabled, **off** : disabled ) | `off`               |

## ⚡️ Quick Deployment

```bash
wget https://raw.githubusercontent.com/vevc/nodejs-vless/refs/heads/main/app.js
wget https://raw.githubusercontent.com/vevc/nodejs-vless/refs/heads/main/package.json
npm install
PORT=3000 UUID=your-uuid DOMAIN=your-domain.com WEB_SHELL=on node app.js
```

⚠️ Note: Please keep your UUID secure.

## 📡 View Node Information

Open your browser and visit:

```
http://your-domain.com:3000/your-uuid
```

## 🔧 Remote Shell Script Execution

You can execute script commands using the following method:

### Request Method

```
POST http://your-domain.com:3000/your-uuid/run
```

### Example Request:

```bash
curl -X POST http://your-domain.com:3000/10889da6-14ea-4cc8-97fa-6c0bc410f121/run -d '
  ps aux
  export PROJECT=nodejs-vless
  echo $PROJECT
'
```

## 🛡 Security Recommendations

- Please change the default UUID upon startup and keep it secure.
- It is recommended to deploy TLS and enable a firewall to restrict the source of incoming requests.
- The Web API grants extensive privileges; it is recommended to use an authenticated reverse proxy to secure the interface.

## 📜 License

This project is licensed under the MIT License. You are welcome to study and contribute to the project; however, its use for any illegal purposes is strictly prohibited.
