// 游戏状态接口 (Game State Interface)
interface GameState {
  presences: {
    [userId: string]: {
      presence: nkruntime.Presence;
      playerState: PlayerState;
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

// 匹配循环，每个tick执行一次 (Match loop, executes once per tick)
const matchLoop = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  messages: nkruntime.MatchMessage[]
): { state: GameState } | null => {
  if (messages.length > 0) {
    // 处理收到的消息 (Handle received messages)
    const result = processGameMessage(
      ctx,
      logger,
      nk,
      dispatcher,
      tick,
      state,
      messages
    );
    state = result?.state || state;
  }

  if (state.matchState !== MatchState.GameStarted) {
    // 如果游戏尚未开始 (If game has not started)
    if (
      state.matchState === MatchState.WaitingForPlayers &&
      Object.keys(state.presences).length >= state.minPlayers
    ) {
      // 如果有足够的玩家 (If there are enough players)
      if (isAllPlayersReady(state)) {
        if (state.server.serverId === "") {
          // 如果没有分配服务器 (If no server assigned)
          if (state.preAssignedServerId === "") {
            // 获取一个可用的服务器 (Get an available server)
            const preAssignedServerId = getAvailableServer(
              nk,
              ctx.matchId!,
              logger
            );

            if (preAssignedServerId !== "") {
              logger.info(`Pre-assigned server: ${preAssignedServerId}`);
              state.preAssignedServerId = preAssignedServerId;
            }
          }
        } else {
          // 标记比赛为已开始 (Mark match as started)
          state.matchState = MatchState.GameStarted;
        }
      }
    }
  } else {
    // 游戏进行中的逻辑可以在这里添加 (Logic for ongoing game can be added here)
  }

  return { state };
};
// 检查所有玩家是否都已准备 (Check if all players are ready)
function isAllPlayersReady(state: nkruntime.MatchState): boolean {
  return Object.keys(state.presences).every(
    (key) => state.presences[key].playerState === PlayerState.Ready
  );
}

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

// 处理游戏消息 (Handle game messages)
const processGameMessage = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  messages: nkruntime.MatchMessage[]
): { state: GameState } | null => {
  messages.forEach((message) => {
    const stringData = nk.binaryToString(message.data); // 将二进制数据转换为字符串 (Convert binary data to string)
    const data = JSON.parse(stringData); // 解析JSON数据 (Parse JSON data)

    if (data.state === "start") {
      // 如果收到开始信号，标记玩家为已准备 (If start signal received, mark player as ready)
      state.presences[message.sender.userId].playerState = PlayerState.Ready;
    }

    logger.info(`Received ${stringData} from ${message.sender.userId}`);
  });

  return { state };
};

// 获取一个可用的服务器 (Get an available server)
const getAvailableServer = (
  nk: nkruntime.Nakama,
  matchId: string,
  logger: nkruntime.Logger
): string => {
  const servers = nk.storageList(SYSTEM_ID, "servers"); // 列出服务器列表 (List server list)

  for (const server of servers.objects || []) {
    const heartbeat = new Date(server.value.heartbeat);
    const now = new Date();
    const diffInSeconds = (now.getTime() - heartbeat.getTime()) / 1000;

    if (diffInSeconds > 30) {
      // 如果服务器心跳超时，删除该服务器记录 (If server heartbeat timed out, delete server record)
      nk.storageDelete([
        {
          collection: "servers",
          key: server.key,
          userId: SYSTEM_ID,
        },
      ]);
    } else if (server.value.state === ServerState.Ready) {
      // 如果服务器处于准备状态，标记为正在使用 (If server is ready, mark as in use)
      server.value.state = ServerState.InUse;
      nk.storageWrite([
        {
          collection: "servers",
          key: server.key,
          userId: SYSTEM_ID,
          value: server.value,
        },
      ]);

      // 创建一个工作任务 (Create a job task)
      createServerJob(nk, server.key, matchId);

      return server.key; // 返回分配的服务器ID (Return assigned server ID)
    }
  }

  return ""; // 如果没有可用服务器，返回空字符串 (If no available server, return empty string)
};

const createServerJob = (
  nk: nkruntime.Nakama,
  serverId: string,
  matchId: string
) => {
  const job = {
    matchId,
    assignedAt: new Date().toISOString(),
  };
  nk.storageWrite([
    {
      collection: "jobs",
      key: serverId,
      userId: SYSTEM_ID,
      value: job,
    },
  ]);
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
