# Advanced Multiplayer Game Development Tutorial

Based on [FinePointCGI's Tutorial](https://www.youtube.com/watch?v=gU6gIIMYmDM&t=1220s)

## Introduction

This project is an advanced multiplayer game development tutorial built upon and optimized from FinePointCGI's YouTube tutorial. Unlike the original tutorial, we've abandoned using `multiplayer_bridge` for server-client connections in favor of Godot's built-in `multiplayer` module. This improvement enables UDP protocol communication, enhancing network transmission efficiency and stability while eliminating dependency on Nakama's WebSocket connection.

Additionally, the project now integrates Nakama's automatic server distribution functionality. Users only need to join the game, and Nakama will automatically find an idle server and assign it to matches ready to begin, simplifying server management and matchmaking processes.

## Using as a Template

You can use the code in this project as a template to create your own game. In future updates, we will thoroughly comment the Godot part of the code and clean up the incomplete `multiplayer_bridge` sections to make the Godot codebase clearer and easier to understand.

## Features

- **Native Godot Multiplayer Support**

  - Efficient UDP networking through Godot's `multiplayer` module
  - Real-time multiplayer synchronization

- **Nakama Auto Server Distribution**

  - Automatic server allocation and matchmaking
  - Simplified server management

- **Advanced Network Management**

  - Server heartbeat monitoring
  - Task allocation
  - State synchronization

- **RPC Functionality**
  - Match creation
  - Server state declaration
  - Server task management

## Tech Stack

- **Game Engine**: Godot
- **Server Framework**: Nakama
- **Programming Languages**:
  - GDScript (Godot)
  - TypeScript (Nakama Server)
- **Network Protocols**: UDP, HTTP

## Installation

### Prerequisites

- Godot Engine 3.5+
- Nakama Server
- Node.js & npm

### Setup Steps

1. **Clone Repository**

```bash
git clone https://github.com/galaxy8691/godot-nakama-learn-godot-dedicated
cd godot-nakama-learn-godot-dedicated
```

2. **Configure Nakama Server**

   - Install Nakama following the [official guide](https://heroiclabs.com/docs/nakama/getting-started/install/)
   - Deploy TypeScript code from `nakama-code/`
   - Start Nakama server

3. **Configure Godot Client**
   - Open project in `godot-code/`
   - Install Nakama plugin
   - Configure server settings in `main.gd`
   - Test connection

## Usage

### Running the Game

1. **Normal Client Mode**:

   - Launch directly through Godot

2. **Headless Server Mode**:

```bash
--server --email=<email> --password=<password> --port=<port>
```

## Project Structure

```
.
├── godot-code/
│   ├── main.gd           # Main client script
│   ├── player.gd         # Player logic
│   └── addons/          # Nakama plugin
├── nakama-code/
│   ├── src/
│   │   ├── main.ts      # Server initialization
│   │   └── match.ts     # Match lifecycle
│   └── package.json
└── README.md
```

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

## Acknowledgments

- Special thanks to [FinePointCGI](https://www.youtube.com/@FinePointCGI) for providing excellent tutorials that inspired this project.

---

# 高级多人游戏开发教程

基于 [FinePointCGI 的教程](https://www.youtube.com/watch?v=gU6gIIMYmDM&t=1220s)

## 项目简介

本项目是一个基于 FinePointCGI 的 YouTube 教程进行构建和优化的高级多人游戏开发教程。与原始教程不同，我们放弃了使用 `multiplayer_bridge` 作为服务器与客户端之间的连接方式，转而采用 Godot 引擎自带的 `multiplayer` 模块。这一改进使得游戏能够使用 UDP 协议进行通信，提升了网络传输的效率和稳定性，同时避免了依赖 Nakama 的 WebSocket 连接。

此外，项目现在集成了 Nakama 的自动分发服务器功能。用户只需加入游戏，Nakama 将自动查找空闲服务器，并将其分配到准备开始的比赛，简化了服务器管理和匹配流程。

## 使用模板

您可以使用本项目的代码作为模板来制作您自己的游戏。后续我们将对 Godot 部分的代码进行详细注释，并清理未完成的 `multiplayer_bridge` 相关部分，使 Godot 代码库更加清晰易懂。

## 功能特点

- **Godot 原生多人游戏支持**

  - 通过 Godot 的 `multiplayer` 模块实现高效的 UDP 网络通信
  - 实时多人同步

- **Nakama 自动分发服务器**

  - 自动服务器分配和匹配系统
  - 简化的服务器管理

- **高级网络管理**

  - 服务器心跳检测
  - 任务分配
  - 状态同步

- **RPC 功能**
  - 创建匹配
  - 服务器状态声明
  - 服务器任务管理

## 技术栈

- **游戏引擎**: Godot
- **服务器框架**: Nakama
- **编程语言**:
  - GDScript (Godot)
  - TypeScript (Nakama Server)
- **网络协议**: UDP, HTTP

## 安装指南

### 前置条件

- Godot Engine 3.5+
- Nakama 服务器
- Node.js 和 npm

### 设置步骤

1. **克隆仓库**

```bash
git clone https://github.com/galaxy8691/godot-nakama-learn-godot-dedicated
cd godot-nakama-learn-godot-dedicated
```

2. **配置 Nakama 服务器**

   - 按照[官方指南](https://heroiclabs.com/docs/nakama/getting-started/install/)安装 Nakama
   - 部署 `nakama-code/` 中的 TypeScript 代码
   - 启动 Nakama 服务器

3. **配置 Godot 客户端**
   - 打开 `godot-code/` 中的项目
   - 安装 Nakama 插件
   - 在 `main.gd` 中配置服务器设置
   - 测试连接

## 使用方法

### 运行游戏

1. **普通客户端模式**:

   - 直接通过 Godot 启动游戏

2. **无头服务器模式**:

```bash
--server --email=<email> --password=<password> --port=<port>
```

## 项目结构

```
.
├── godot-code/
│   ├── main.gd           # 主客户端脚本
│   ├── player.gd         # 玩家逻辑
│   └── addons/          # Nakama 插件
├── nakama-code/
│   ├── src/
│   │   ├── main.ts      # 服务器初始化
│   │   └── match.ts     # 匹配生命周期
│   └── package.json
└── README.md
```

## 许可证

本项目采用 MIT 许可证，详情请参阅 [LICENSE](LICENSE.md) 文件

## 致谢

特别感谢 [FinePointCGI](https://www.youtube.com/@FinePointCGI) 提供的优秀教程，为本项目提供了宝贵的指导和灵感。

---

For questions or suggestions, please open an [Issue](https://github.com/galaxy8691/godot-nakama-learn-godot-dedicated/project-name/issues).  
如有问题或建议，请提交 [Issue](https://github.com/galaxy8691/godot-nakama-learn-godot-dedicated/issues)。
