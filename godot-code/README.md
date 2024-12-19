# Godot-Nakama Multiplayer Game Demo
## English

This is a multiplayer game demonstration using Godot and Nakama server. The project showcases basic multiplayer functionality including player connections, match creation, and headless server mode.

### Features
- Multiplayer game implementation using Godot and Nakama
- Support for headless server mode
- Player authentication
- Match creation and joining
- Real-time multiplayer synchronization

### Running the Game
1. Normal client mode:
   - Launch the game directly through Godot

2. Headless server mode:
   - Get the match ID from Nakama console
   - Run the game with the following command line arguments:
   ```
   --server --matchid=<match_id> --headless
   ```
   Replace `<match_id>` with your actual match ID from the Nakama console.

---

## 中文

这是一个使用 Godot 和 Nakama 服务器的多人游戏演示项目。该项目展示了基本的多人游戏功能，包括玩家连接、比赛创建和无头服务器模式。

### 功能特点
- 使用 Godot 和 Nakama 实现的多人游戏
- 支持无头服务器模式
- 玩家认证
- 创建和加入比赛
- 实时多人同步

### 运行游戏
1. 普通客户端模式：
   - 直接通过 Godot 启动游戏

2. 无头服务器模式：
   - 从 Nakama 控制台获取比赛 ID
   - 使用以下命令行参数运行游戏：
   ```
   --server --matchid=<match_id> --headless
   ```
   将 `<match_id>` 替换为从 Nakama 控制台获取的实际比赛 ID。 