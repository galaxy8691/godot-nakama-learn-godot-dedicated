// 匹配循环，每个tick执行一次 (Match loop, executes once per tick)
enum OpCode {
  PlayerReady = 0,
  PlayerNotReady = 1,
  GetAllPresences = 2,
  GetServerInfo = 3,
}
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

  state = manageGameState(ctx, logger, nk, dispatcher, state);

  return { state };
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
    if (message.opCode === OpCode.PlayerReady) {
      state.presences[message.sender.userId].playerState = PlayerState.Ready;
    }
    if (message.opCode === OpCode.PlayerNotReady) {
      state.presences[message.sender.userId].playerState = PlayerState.NotReady;
    }
    if (message.opCode === OpCode.GetAllPresences) {
      const presences: { presences: { userId: string; peerId: number }[] } = {
        presences: [],
      };
      for (const key of Object.keys(state.presences)) {
        logger.info(`Presence!!!: ${key}`);
        logger.info("peerId!!!: ", state.presences[key]);
        const p = { userId: key, peerId: state.presences[key].peerId };
        presences.presences.push(p);
      }
      dispatcher.broadcastMessage(
        OpCode.GetAllPresences,
        nk.stringToBinary(JSON.stringify(presences))
      );
    }
  });

  return { state };
};

function manageGameState(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  state: GameState
) {
  if (state.matchState !== MatchState.GameStarted) {
    state = runWaitingState(ctx, logger, nk, dispatcher, state);
  } else {
    // 游戏进行中的逻辑可以在这里添加 (Logic for ongoing game can be added here)
  }
  return state;
}

function runWaitingState(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  state: GameState
) {
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
        dispatcher.broadcastMessage(2, "GameStarted", null, null);
        logger.info(`Match started: ${ctx.matchId}`);
      }
    }
  }
  return state;
}

// 检查所有玩家是否都已准备 (Check if all players are ready)
function isAllPlayersReady(state: nkruntime.MatchState): boolean {
  return Object.keys(state.presences).every(
    (key) => state.presences[key].playerState === PlayerState.Ready
  );
}

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
