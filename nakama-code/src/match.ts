// 游戏状态接口 (Game State Interface)

interface GameState {
  presences: {
    [userId: string]: {
      presence: nkruntime.Presence;
      playerState: PlayerState;
      peerId: number;
    };
  };
  server: { serverId: string; presence: nkruntime.Presence | null };
  matchState: MatchState;
  minPlayers: number;
  maxPlayers: number;
  preAssignedServerId: string;
}
// 匹配初始化，设置初始游戏状态 (Match Initialization, setting initial game state)
const matchInit = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string }
): { state: GameState; tickRate: number; label: string } => {
  const state: GameState = {
    presences: {},
    server: { serverId: "", presence: null },
    matchState: MatchState.WaitingForPlayers,
    minPlayers: 2,
    maxPlayers: 4,
    preAssignedServerId: "",
  };

  return {
    state,
    tickRate: 1, // 设置每秒一次的tick率 (Set tick rate to once per second)
    label: "", // 匹配标签，可用于筛选匹配 (Match label, can be used for filtering matches)
  };
};

// 尝试加入匹配时的逻辑判断 (Logic for attempting to join a match)
const matchJoinAttempt = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any }
): {
  state: GameState;
  accept: boolean;
  rejectMessage?: string;
} | null => {
  logger.debug(`%q attempted to join Lobby match`, ctx.userId);

  if (ctx.userId === state.preAssignedServerId) {
    // 如果用户ID是预分配的服务器ID，直接接受 (If user ID is pre-assigned server ID, accept directly)
    return { state, accept: true };
  }

  if (state.matchState === MatchState.WaitingForPlayers) {
    // 如果正在等待玩家 (If waiting for players)
    if (Object.keys(state.presences).length < state.maxPlayers) {
      // 如果当前玩家数少于最大值，接受加入 (If current player count is less than maximum, accept join)
      return { state, accept: true };
    } else {
      // 否则拒绝，匹配已满 (Otherwise, reject as match is full)
      return { state, accept: false, rejectMessage: "Match is full" };
    }
  }

  // 如果比赛已开始或其他状态，拒绝加入 (If match has started or other states, reject join)
  return { state, accept: false, rejectMessage: "Match already started" };
};

// 玩家加入匹配后的处理 (Handling after player joins the match)
const matchJoin = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  presences: nkruntime.Presence[]
): { state: GameState } | null => {
  presences.forEach((presence) => {
    if (presence.userId !== state.preAssignedServerId) {
      // 如果加入的是玩家而不是服务器，记录其状态为未准备 (If joining as a player, not server, record as not ready)
      state.presences[presence.userId] = {
        presence,
        playerState: PlayerState.NotReady,
        peerId: -1,
      };
      logger.info(`Player joined: ${presence.userId}`);
    } else {
      // 如果加入的是服务器，记录服务器信息 (If joining as server, record server information)
      state.server = { serverId: presence.userId, presence };
      logger.info(`Server joined: ${presence.userId}`);
    }
  });

  return { state };
};

// 玩家离开匹配后的处理 (Handling after player leaves the match)
const matchLeave = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  presences: nkruntime.Presence[]
): { state: GameState } | null => {
  presences.forEach((presence) => {
    delete state.presences[presence.userId]; // 从状态中移除玩家 (Remove player from state)
    logger.debug(`%q left Lobby match`, presence.userId);
  });

  if (Object.keys(state.presences).length === 0) {
    // 如果没有玩家剩下，重置服务器状态 (If no players left, reset server state)
    resetServerAfterMatchEnd(nk, state);
    return null;
  }

  return { state };
};

// 终止匹配时的处理 (Handling when terminating the match)
const matchTerminate = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  graceSeconds: number
): { state: GameState } | null => {
  logger.debug("Lobby match terminated");
  resetServerAfterMatchEnd(nk, state); // 重置服务器状态 (Reset server state)

  const message = `Server shutting down in ${graceSeconds} seconds.`; // 服务器将在 X 秒后关闭 (Server will shut down in X seconds)
  dispatcher.broadcastMessage(2, message, null, null); // 向所有客户端广播关闭消息 (Broadcast shutdown message to all clients)

  return { state };
};

// 处理来自客户端的信号 (Handle signals from clients)
const matchSignal = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  data: string
): { state: GameState; data?: string } | null => {
  logger.debug(`Lobby match signal received: ${data}`);
  return { state, data: `Lobby match signal received: ${data}` };
};

// 比赛结束后重置服务器状态 (Reset server state after match ends)
const resetServerAfterMatchEnd = (nk: nkruntime.Nakama, state: GameState) => {
  const servers = nk.storageRead([
    { collection: "servers", key: state.server.serverId, userId: SYSTEM_ID },
  ]);

  if (servers.length > 0) {
    const server = servers[0];
    nk.storageWrite([
      {
        collection: "servers",
        key: server.key,
        userId: SYSTEM_ID,
        value: {
          serverId: server.key,
          ip: server.value.ip,
          port: server.value.port,
          state: ServerState.Ready, // 重新标记为准备状态 (Re-mark as ready)
          heartbeat: new Date().toISOString(), // 更新心跳时间 (Update heartbeat time)
        },
      },
    ]);
  }
};
