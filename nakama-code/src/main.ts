// 服务器数据接口 (Server Data Interface)
interface ServerData {
  serverId: string;
  state: ServerState;
  ip: string;
  port: number;
  heartbeat: string;
}

// 初始化模块，注册RPC和匹配逻辑 (Initialization Module, registering RPC and match logic)
const InitModule: nkruntime.InitModule = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) => {
  logger.info("Hello World!");

  // 注册RPC函数 (Register RPC functions)
  initializer.registerRpc("tellNakamaIamAServer", tellNakamaIamAServer);
  initializer.registerRpc("rpcCreateMatch", rpcCreateMatch);
  initializer.registerRpc("rpcGetJob", serverGetJob);

  // 注册匹配类型和其相关的回调函数 (Register match type and its callback functions)
  initializer.registerMatch("lobby", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchSignal,
    matchTerminate,
  });
};

// RPC函数：创建一个新的匹配 (RPC Function: Create a new match)
function rpcCreateMatch(
  context: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const matchId = nk.matchCreate("lobby"); // 创建名为"lobby"的匹配 (Create a match named "lobby")
  return JSON.stringify({ matchId }); // 返回匹配ID (Return match ID)
}

// RPC函数：服务器自我声明 (RPC Function: Server self-declaration)
const tellNakamaIamAServer: nkruntime.RpcFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
) => {
  const serverId = ctx.userId; // 获取当前用户ID作为服务器ID (Get current user ID as server ID)
  const { ip: serverIp, port: serverPort } = JSON.parse(payload); // 解析IP和端口信息 (Parse IP and port information)

  if (!serverId) {
    // 如果没有服务器ID，返回失败 (If no server ID, return failure)
    return JSON.stringify({ data: { success: false } });
  }

  // 读取已有的服务器信息 (Read existing server information)
  const existingServers = nk.storageRead([
    { collection: "servers", key: serverId, userId: SYSTEM_ID },
  ]);

  const newObjects: nkruntime.StorageWriteRequest[] = [];
  const currentTime = new Date().toISOString(); // 获取当前时间 (Get current time)

  if (existingServers.length > 0) {
    // 如果服务器已存在，更新心跳时间 (If server exists, update heartbeat time)
    const serverData: ServerData = {
      serverId,
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
  } else {
    // 如果服务器不存在，创建新的服务器数据 (If server does not exist, create new server data)
    const serverData: ServerData = {
      serverId,
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
  } catch (error) {
    logger.error(String(error)); // 记录错误 (Log error)
    return JSON.stringify({ data: { success: false } }); // 返回失败 (Return failure)
  }
};
// RPC函数：获取服务器的工作任务 (RPC Function: Get server's job tasks)
const serverGetJob: nkruntime.RpcFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
) => {
  const serverId = ctx.userId; // 获取服务器ID (Get server ID)
  const jobs = nk.storageRead([
    { collection: "jobs", key: serverId!, userId: SYSTEM_ID },
  ]);

  if (jobs.length > 0) {
    // 如果有任务，删除任务记录并返回任务信息 (If there are jobs, delete job records and return job info)
    nk.storageDelete([
      { collection: "jobs", key: serverId!, userId: SYSTEM_ID },
    ]);
    return JSON.stringify({ job: jobs[0].value });
  }

  return JSON.stringify({ job: null }); // 如果没有任务，返回null (If no jobs, return null)
};
