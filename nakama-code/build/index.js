"use strict";
// 初始化模块，注册RPC和匹配逻辑 (Initialization Module, registering RPC and match logic)
var InitModule = function (ctx, logger, nk, initializer) {
    logger.info("Hello World!");
    // 注册RPC函数 (Register RPC functions)
    initializer.registerRpc("tellNakamaIamAServer", tellNakamaIamAServer);
    initializer.registerRpc("rpcCreateMatch", rpcCreateMatch);
    initializer.registerRpc("rpcGetJob", serverGetJob);
    // 注册匹配类型和其相关的回调函数 (Register match type and its callback functions)
    initializer.registerMatch("lobby", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchSignal: matchSignal,
        matchTerminate: matchTerminate,
    });
};
// RPC函数：创建一个新的匹配 (RPC Function: Create a new match)
function rpcCreateMatch(context, logger, nk, payload) {
    var matchId = nk.matchCreate("lobby"); // 创建名为"lobby"的匹配 (Create a match named "lobby")
    return JSON.stringify({ matchId: matchId }); // 返回匹配ID (Return match ID)
}
// RPC函数：服务器自我声明 (RPC Function: Server self-declaration)
var tellNakamaIamAServer = function (ctx, logger, nk, payload) {
    var serverId = ctx.userId; // 获取当前用户ID作为服务器ID (Get current user ID as server ID)
    var _a = JSON.parse(payload), serverIp = _a.ip, serverPort = _a.port; // 解析IP和端口信息 (Parse IP and port information)
    if (!serverId) {
        // 如果没有服务器ID，返回失败 (If no server ID, return failure)
        return JSON.stringify({ data: { success: false } });
    }
    // 读取已有的服务器信息 (Read existing server information)
    var existingServers = nk.storageRead([
        { collection: "servers", key: serverId, userId: SYSTEM_ID },
    ]);
    var newObjects = [];
    var currentTime = new Date().toISOString(); // 获取当前时间 (Get current time)
    if (existingServers.length > 0) {
        // 如果服务器已存在，更新心跳时间 (If server exists, update heartbeat time)
        var serverData = {
            serverId: serverId,
            state: existingServers[0].value.state,
            ip: existingServers[0].value.ip,
            port: existingServers[0].value.port,
            heartbeat: currentTime,
        };
        newObjects.push({
            collection: "servers",
            key: serverId,
            userId: SYSTEM_ID,
            value: serverData,
        });
    }
    else {
        // 如果服务器不存在，创建新的服务器数据 (If server does not exist, create new server data)
        var serverData = {
            serverId: serverId,
            state: ServerState.Ready,
            ip: serverIp,
            port: serverPort,
            heartbeat: currentTime,
        };
        newObjects.push({
            collection: "servers",
            key: serverId,
            userId: SYSTEM_ID,
            value: serverData,
        });
    }
    try {
        nk.storageWrite(newObjects); // 写入存储 (Write to storage)
        return JSON.stringify({ data: { success: true } }); // 返回成功 (Return success)
    }
    catch (error) {
        logger.error(String(error)); // 记录错误 (Log error)
        return JSON.stringify({ data: { success: false } }); // 返回失败 (Return failure)
    }
};
// RPC函数：获取服务器的工作任务 (RPC Function: Get server's job tasks)
var serverGetJob = function (ctx, logger, nk, payload) {
    var serverId = ctx.userId; // 获取服务器ID (Get server ID)
    var jobs = nk.storageRead([
        { collection: "jobs", key: serverId, userId: SYSTEM_ID },
    ]);
    if (jobs.length > 0) {
        // 如果有任务，删除任务记录并返回任务信息 (If there are jobs, delete job records and return job info)
        nk.storageDelete([
            { collection: "jobs", key: serverId, userId: SYSTEM_ID },
        ]);
        return JSON.stringify({ job: jobs[0].value });
    }
    return JSON.stringify({ job: null }); // 如果没有任务，返回null (If no jobs, return null)
};
// 匹配初始化，设置初始游戏状态 (Match Initialization, setting initial game state)
var matchInit = function (ctx, logger, nk, params) {
    var state = {
        presences: {},
        server: { serverId: "", presence: null },
        matchState: MatchState.WaitingForPlayers,
        minPlayers: 2,
        maxPlayers: 4,
        preAssignedServerId: "",
    };
    return {
        state: state,
        tickRate: 1, // 设置每秒一次的tick率 (Set tick rate to once per second)
        label: "", // 匹配标签，可用于筛选匹配 (Match label, can be used for filtering matches)
    };
};
// 尝试加入匹配时的逻辑判断 (Logic for attempting to join a match)
var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    logger.debug("%q attempted to join Lobby match", ctx.userId);
    if (ctx.userId === state.preAssignedServerId) {
        // 如果用户ID是预分配的服务器ID，直接接受 (If user ID is pre-assigned server ID, accept directly)
        return { state: state, accept: true };
    }
    if (state.matchState === MatchState.WaitingForPlayers) {
        // 如果正在等待玩家 (If waiting for players)
        if (Object.keys(state.presences).length < state.maxPlayers) {
            // 如果当前玩家数少于最大值，接受加入 (If current player count is less than maximum, accept join)
            return { state: state, accept: true };
        }
        else {
            // 否则拒绝，匹配已满 (Otherwise, reject as match is full)
            return { state: state, accept: false, rejectMessage: "Match is full" };
        }
    }
    // 如果比赛已开始或其他状态，拒绝加入 (If match has started or other states, reject join)
    return { state: state, accept: false, rejectMessage: "Match already started" };
};
// 玩家加入匹配后的处理 (Handling after player joins the match)
var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach(function (presence) {
        if (presence.userId !== state.preAssignedServerId) {
            // 如果加入的是玩家而不是服务器，记录其状态为未准备 (If joining as a player, not server, record as not ready)
            state.presences[presence.userId] = {
                presence: presence,
                playerState: PlayerState.NotReady,
            };
            logger.info("Player joined: ".concat(presence.userId));
        }
        else {
            // 如果加入的是服务器，记录服务器信息 (If joining as server, record server information)
            state.server = { serverId: presence.userId, presence: presence };
            logger.info("Server joined: ".concat(presence.userId));
        }
    });
    return { state: state };
};
// 玩家离开匹配后的处理 (Handling after player leaves the match)
var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach(function (presence) {
        delete state.presences[presence.userId]; // 从状态中移除玩家 (Remove player from state)
        logger.debug("%q left Lobby match", presence.userId);
    });
    if (Object.keys(state.presences).length === 0) {
        // 如果没有玩家剩下，重置服务器状态 (If no players left, reset server state)
        resetServerAfterMatchEnd(nk, state);
        return null;
    }
    return { state: state };
};
// 匹配循环，每个tick执行一次 (Match loop, executes once per tick)
var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    if (messages.length > 0) {
        // 处理收到的消息 (Handle received messages)
        var result = processGameMessage(ctx, logger, nk, dispatcher, tick, state, messages);
        state = (result === null || result === void 0 ? void 0 : result.state) || state;
    }
    if (state.matchState !== MatchState.GameStarted) {
        // 如果游戏尚未开始 (If game has not started)
        if (state.matchState === MatchState.WaitingForPlayers &&
            Object.keys(state.presences).length >= state.minPlayers) {
            // 如果有足够的玩家 (If there are enough players)
            if (isAllPlayersReady(state)) {
                if (state.server.serverId === "") {
                    // 如果没有分配服务器 (If no server assigned)
                    if (state.preAssignedServerId === "") {
                        // 获取一个可用的服务器 (Get an available server)
                        var preAssignedServerId = getAvailableServer(nk, ctx.matchId, logger);
                        if (preAssignedServerId !== "") {
                            logger.info("Pre-assigned server: ".concat(preAssignedServerId));
                            state.preAssignedServerId = preAssignedServerId;
                        }
                    }
                }
                else {
                    // 标记比赛为已开始 (Mark match as started)
                    state.matchState = MatchState.GameStarted;
                }
            }
        }
    }
    else {
        // 游戏进行中的逻辑可以在这里添加 (Logic for ongoing game can be added here)
    }
    return { state: state };
};
// 检查所有玩家是否都已准备 (Check if all players are ready)
function isAllPlayersReady(state) {
    return Object.keys(state.presences).every(function (key) { return state.presences[key].playerState === PlayerState.Ready; });
}
// 终止匹配时的处理 (Handling when terminating the match)
var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    logger.debug("Lobby match terminated");
    resetServerAfterMatchEnd(nk, state); // 重置服务器状态 (Reset server state)
    var message = "Server shutting down in ".concat(graceSeconds, " seconds."); // 服务器将在 X 秒后关闭 (Server will shut down in X seconds)
    dispatcher.broadcastMessage(2, message, null, null); // 向所有客户端广播关闭消息 (Broadcast shutdown message to all clients)
    return { state: state };
};
// 处理来自客户端的信号 (Handle signals from clients)
var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
    logger.debug("Lobby match signal received: ".concat(data));
    return { state: state, data: "Lobby match signal received: ".concat(data) };
};
// 处理游戏消息 (Handle game messages)
var processGameMessage = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    messages.forEach(function (message) {
        var stringData = nk.binaryToString(message.data); // 将二进制数据转换为字符串 (Convert binary data to string)
        var data = JSON.parse(stringData); // 解析JSON数据 (Parse JSON data)
        if (data.state === "start") {
            // 如果收到开始信号，标记玩家为已准备 (If start signal received, mark player as ready)
            state.presences[message.sender.userId].playerState = PlayerState.Ready;
        }
        logger.info("Received ".concat(stringData, " from ").concat(message.sender.userId));
    });
    return { state: state };
};
// 获取一个可用的服务器 (Get an available server)
var getAvailableServer = function (nk, matchId, logger) {
    var servers = nk.storageList(SYSTEM_ID, "servers"); // 列出服务器列表 (List server list)
    for (var _i = 0, _a = servers.objects || []; _i < _a.length; _i++) {
        var server = _a[_i];
        var heartbeat = new Date(server.value.heartbeat);
        var now = new Date();
        var diffInSeconds = (now.getTime() - heartbeat.getTime()) / 1000;
        if (diffInSeconds > 30) {
            // 如果服务器心跳超时，删除该服务器记录 (If server heartbeat timed out, delete server record)
            nk.storageDelete([
                {
                    collection: "servers",
                    key: server.key,
                    userId: SYSTEM_ID,
                },
            ]);
        }
        else if (server.value.state === ServerState.Ready) {
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
var createServerJob = function (nk, serverId, matchId) {
    var job = {
        matchId: matchId,
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
var resetServerAfterMatchEnd = function (nk, state) {
    var servers = nk.storageRead([
        { collection: "servers", key: state.server.serverId, userId: SYSTEM_ID },
    ]);
    if (servers.length > 0) {
        var server = servers[0];
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
// 服务器状态枚举 (Server State Enumeration)
var ServerState;
(function (ServerState) {
    ServerState[ServerState["Ready"] = 0] = "Ready";
    ServerState[ServerState["InUse"] = 1] = "InUse";
})(ServerState || (ServerState = {}));
// 比赛状态枚举 (Match State Enumeration)
var MatchState;
(function (MatchState) {
    MatchState[MatchState["WaitingForPlayers"] = 0] = "WaitingForPlayers";
    MatchState[MatchState["GameStarted"] = 2] = "GameStarted";
    MatchState[MatchState["GameEnded"] = 3] = "GameEnded";
})(MatchState || (MatchState = {}));
// 玩家状态枚举 (Player State Enumeration)
var PlayerState;
(function (PlayerState) {
    PlayerState[PlayerState["Ready"] = 0] = "Ready";
    PlayerState[PlayerState["NotReady"] = 1] = "NotReady";
})(PlayerState || (PlayerState = {}));
// 系统ID常量，用于标识系统操作 (System ID constant for system operations)
var SYSTEM_ID = "00000000-0000-0000-0000-000000000000";
