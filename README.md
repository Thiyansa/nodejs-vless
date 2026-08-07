# VLESS WebSocket 服务端 & Shell API 执行器

[English](/README.md) [සිංහල](/SI-README.md) [English](/README.md) 

本项目是一个基于 Node.js + WebSocket 协议实现的轻量级 VLESS 代理服务端，支持通过 Web API 执行 Shell 脚本，适用于自建代理和远程脚本执行场景。

## ✨ 功能特点

- ✅ 支持 VLESS 协议，兼容主流代理客户端
- 🌐 通过 WebSocket + TLS 实现加密传输
- 🔐 支持 UUID 鉴权机制
- 🖥 提供 Web API 接口，远程执行 Shell 脚本
- 📎 简单易用，环境变量配置灵活

## 📦 环境变量配置

| 变量名      | 说明                                                | 默认值                                 |
| ----------- | --------------------------------------------------- | -------------------------------------- |
| `UUID`      | VLESS 的认证密钥                                    | `10889da6-14ea-4cc8-97fa-6c0bc410f121` |
| `DOMAIN`    | 访问的域名（用于客户端配置）                        | `example.com`                          |
| `PORT`      | 服务启动的端口号                                    | `3000`                                 |
| `REMARKS`   | 节点备注                                            | `nodejs-vless`                         |
| `WEB_SHELL` | 是否启用 Web Shell（**on** : 启用，**off** : 禁用） | `off`                                  |

## ⚡️ 快速部署

```bash
wget https://raw.githubusercontent.com/Thiyansa/nodejs-vless/refs/heads/main/app.js
wget https://raw.githubusercontent.com/Thiyansa/nodejs-vless/refs/heads/main/package.json
npm install
PORT=3000 UUID=your-uuid DOMAIN=your-domain.com WEB_SHELL=on node app.js
```

⚠️ 注意：请妥善保管你的 UUID

## 📡 节点信息查看

打开浏览器访问：

```
http://your-domain.com:3000/your-uuid
```

## 🔧 Shell 脚本远程执行

你可以通过以下方式执行脚本指令：

### 请求方式

```
POST http://your-domain.com:3000/your-uuid/run
```

### 示例请求：

```bash
curl -X POST http://your-domain.com:3000/10889da6-14ea-4cc8-97fa-6c0bc410f121/run -d '
  ps aux
  export PROJECT=nodejs-vless
  echo $PROJECT
'
```

## 🛡 安全建议

- 启动时请更改默认 UUID，并妥善保管
- 推荐部署 TLS 并启用防火墙限制请求来源
- Web API 提供强大权限，建议使用认证反向代理保护接口

## 📜 许可证

本项目采用 MIT 许可证，欢迎学习与贡献，禁止非法用途。

