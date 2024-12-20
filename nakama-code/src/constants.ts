// 服务器状态枚举 (Server State Enumeration)
enum ServerState {
  Ready = 0, // 准备就绪 (Ready)
  InUse = 1, // 正在使用 (In Use)
}

// 比赛状态枚举 (Match State Enumeration)
enum MatchState {
  WaitingForPlayers = 0, // 等待玩家 (Waiting for Players)
  GameStarted = 2, // 游戏开始 (Game Started)
  GameEnded = 3, // 游戏结束 (Game Ended)
}

// 玩家状态枚举 (Player State Enumeration)
enum PlayerState {
  Ready = 0, // 准备好 (Ready)
  NotReady = 1, // 未准备 (Not Ready)
}

// 系统ID常量，用于标识系统操作 (System ID constant for system operations)
const SYSTEM_ID = "00000000-0000-0000-0000-000000000000";
