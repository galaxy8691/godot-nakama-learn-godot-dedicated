extends Node

var ip = "113.107.139.70"
var port = 7350
var server_key = "defaultkey"
var client : NakamaClient
var session : NakamaSession
var socket : NakamaSocket
# var multiplayer_bridge : NakamaMultiplayerBridge
var start_game_count : int = 0
var match_id : String = ""
var godot_port : int = -1
var match_id_for_client : String = ""
var email : String = ""
var password : String = ""
var my_name : String = ""

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	client = Nakama.create_client(server_key, ip, port, "http", 3, NakamaLogger.LOG_LEVEL.ERROR)
	socket = Nakama.create_socket_from(client)
	socket.connected.connect(self._on_socket_connected)
	socket.closed.connect(self._on_socket_closed)
	socket.received_error.connect(self._on_socket_error)
	socket.received_match_state.connect(self._on_received_match_state)
	socket.received_match_presence.connect(self._on_received_match_presence)
	for arg in OS.get_cmdline_args():
		if arg.begins_with("--name="):
			my_name = arg.split("=")[1]
			print("my name: ", my_name)
	if "--server" in OS.get_cmdline_args():
		# var email = "test3@test.com"
		# var password = "password"
		# session = await client.authenticate_email_async(email, password)
		$CanvasLayer.visible = false
		$CanvasLayer/Panel2/ServerJoinButton.visible = true
		for arg in OS.get_cmdline_args():

			if arg.begins_with("--email="):
				email = arg.split("=")[1]
				print("email: ", email)
			if arg.begins_with("--password="):
				password = arg.split("=")[1]
				print("password: ", password)
			if session == null and email != "" and password != "":
				session = await client.authenticate_email_async(email, password)
				PlayerManager.set_my_user_id(session.user_id)
				PlayerManager.add_player(session.user_id, 0)
			if arg.begins_with("--port="):
				godot_port = int(arg.split("=")[1])
				print("godot port: ", godot_port)

			if session != null and godot_port != -1: 

				await socket.connect_async(session)
				var json =  JSON.stringify({
					"ip": ip,
					"port": str(godot_port)
				})
				print("json: ", json)
				var result = await client.rpc_async(session, "tellNakamaIamAServer", json)
				print("result: ", result)
				var timer = Timer.new()
				timer.autostart = true
				add_child(timer)
				timer.wait_time = 10.0
				timer.one_shot = false
				timer.timeout.connect(func():
					var resulta = await client.rpc_async(session, "tellNakamaIamAServer", json)
					#print("resulta: ", resulta)
					pass
				)
				timer.start()
				var job_timer = Timer.new()
				job_timer.autostart = true
				add_child(job_timer)
				job_timer.wait_time = 5.0
				job_timer.one_shot = false
				job_timer.timeout.connect(func():
					var job_result = await client.rpc_async(session, "rpcGetJob", "{}")
					var job_result_json = JSON.parse_string(job_result.payload)
					if job_result_json.job != null:
						
						match_id = job_result_json.job.matchId
						#print("match id: ", match_id)
						var resultx = await socket.join_match_async(match_id)
						#print("result: ", resultx)
						job_timer.stop()
					
				)
				job_timer.start()
				
				


# Called every frame. 'delta' is the elapsed time since the previous frame.


func _on_login_button_pressed() -> void:
	email = $CanvasLayer/Panel/EmailLineEdit.text
	password = $CanvasLayer/Panel/PasswordLineEdit.text
	session = await client.authenticate_email_async(email, password)
	await socket.connect_async(session)
	$CanvasLayer/Panel/LoginButton.disabled = true
	$CanvasLayer/Panel/EmailLineEdit.editable = false
	$CanvasLayer/Panel/PasswordLineEdit.editable = false
	# multiplayer_bridge = NakamaMultiplayerBridge.new(socket)
	# multiplayer_bridge.match_join_error.connect(self._on_match_join_error)
	# multiplayer_bridge.match_joined.connect(self._on_match_joined)
	# multiplayer.set_multiplayer_peer(multiplayer_bridge.multiplayer_peer)
	multiplayer.peer_connected.connect(self._on_peer_connected)
	multiplayer.peer_disconnected.connect(self._on_peer_disconnected)


func _on_socket_connected() -> void:
	print("Socket connected.")


func _on_socket_closed() -> void:
	print("Socket closed.")

func _on_socket_error(error) -> void:
	print("Socket error: ", error)

func _on_match_join_error(error) -> void:
	print("Match join error: ", error)

func _on_received_match_presence(peer_presence_event : NakamaRTAPI.MatchPresenceEvent) -> void:
	print(my_name, "says: peer presence event: ", peer_presence_event.joins)
	socket.send_match_state_async(match_id_for_client, OpCodes.OpCode.GetAllPresences, JSON.stringify({}))
	# for join in peer_presence_event.joins:
	# 	PlayerManager.add_player(join.user_id, 0)

func _on_received_match_state(match_state : NakamaRTAPI.MatchData) -> void:
	# print(my_name, "says: match state: ", match_state.data)
	# print("received match state: ", match_state.data)
	if match_state.op_code == OpCodes.OpCode.GetAllPresences:
		var data = JSON.parse_string(match_state.data)
		for presence in data.presences:
			PlayerManager.add_player(presence.userId, presence.peerId)

# func _on_match_joined() -> void:
# 	PlayerManager.add_player(multiplayer.get_unique_id())
# 	PlayerManager.set_my_peer_id(multiplayer.get_unique_id())
# 	print(multiplayer_bridge.match_id)
# 	print("Match joined.")
# 	if match_id != "":
# 		await get_tree().create_timer(2.0).timeout
# 		set_host_peer_id.rpc(multiplayer.get_unique_id())
# 		start_game.rpc()
# 	match_id_for_client = multiplayer_bridge.match_id
# 	print("match id for client: ", match_id_for_client)

func _on_peer_connected(peer_id) -> void:
	#PlayerManager.add_player(peer_id)
	#sync_player_list.rpc(PlayerManager.players)
	print("Peer connected: ", peer_id)

func _on_peer_disconnected(peer_id) -> void:
	print("Peer disconnected: ", peer_id)


func _on_cj_match_button_pressed() -> void:
	#multiplayer_bridge.join_named_match($CanvasLayer/Panel2/MatchNameLineEdit.text)
	var result :NakamaAsyncResult = await socket.rpc_async("rpcCreateMatch", JSON.stringify({}))
	print("result: ", result.payload)
	match_id_for_client = JSON.parse_string(result.payload).matchId
	await socket.join_match_async(match_id_for_client)
	$CanvasLayer/Panel2/MatchNameLineEdit.editable = false
	$CanvasLayer/Panel2/MatchNameLineEdit.text = str(match_id_for_client)
	$CanvasLayer/Panel2/CJMatchButton.disabled = true
	$CanvasLayer/Panel2/JoinButton.disabled = true
	
	# print("result: ", match_id_for_client)
	# print("Result2: ", result2)
	

@rpc("any_peer")
func sync_player_list(players : Dictionary) -> void:
	for player in players:
		if player not in PlayerManager.players:
			#PlayerManager.add_player(player)
			pass
	for player in PlayerManager.players:
		print("player: ", player)


@rpc("any_peer", "call_local")
func set_host_peer_id(peer_id : int) -> void:
	PlayerManager.set_host_peer_id(peer_id)
	print("set host peer id: ", peer_id)

@rpc("any_peer", "call_local")
func start_game() -> void:
	#print("player count: ", PlayerManager.get_player_count())
	start_game_count += 1
	if start_game_count == PlayerManager.get_player_count():
		if PlayerManager.get_host_peer_id() == -1:
			print("no host")
			var i : int = 0
			for player in PlayerManager.players:
				$Game.get_node("Player" + str(i+1)).peer_id = player
				$Game.get_node("Player" + str(i+1)).set_multiplayer_authority(player)
				i += 1
		else:
			print("host: ", PlayerManager.get_host_peer_id())
			$Game/Player1.set_multiplayer_authority(PlayerManager.get_host_peer_id())
			$Game/Player1.peer_id = PlayerManager.players[0]
			$Game/Player2.set_multiplayer_authority(PlayerManager.get_host_peer_id())
			$Game/Player2.peer_id = PlayerManager.players[1]
		$Game.visible = true
		$CanvasLayer.visible = false


func _on_start_button_pressed() -> void:
	#start_game.rpc()
	print("match id for client: ", match_id_for_client)
	socket.send_match_state_async(match_id_for_client, OpCodes.PlayerReady, JSON.stringify({}))
	pass




func _on_host_button_pressed() -> void:
	set_host_peer_id.rpc(multiplayer.get_unique_id())



func _on_login_test_1_button_pressed() -> void:
	email = "test1@test.com"
	password = "password"
	session = await client.authenticate_email_async(email, password)
	print("user id: ", session.user_id)
	PlayerManager.set_my_user_id(session.user_id)
	PlayerManager.add_player(session.user_id, -1)
	await socket.connect_async(session)
	$CanvasLayer/Panel/LoginButton.disabled = true
	$CanvasLayer/Panel/EmailLineEdit.editable = false
	$CanvasLayer/Panel/PasswordLineEdit.editable = false
	# multiplayer_bridge = NakamaMultiplayerBridge.new(socket)
	# multiplayer_bridge.match_join_error.connect(self._on_match_join_error)
	# multiplayer_bridge.match_joined.connect(self._on_match_joined)
	# multiplayer.set_multiplayer_peer(multiplayer_bridge.multiplayer_peer)
	multiplayer.peer_connected.connect(self._on_peer_connected)
	multiplayer.peer_disconnected.connect(self._on_peer_disconnected)

func _on_login_test_2_button_pressed() -> void:
	email = "test2@test.com"
	password = "password"
	session = await client.authenticate_email_async(email, password)
	PlayerManager.set_my_user_id(session.user_id)
	PlayerManager.add_player(session.user_id, -1)
	await socket.connect_async(session)
	$CanvasLayer/Panel/LoginButton.disabled = true
	$CanvasLayer/Panel/EmailLineEdit.editable = false
	$CanvasLayer/Panel/PasswordLineEdit.editable = false
	# multiplayer_bridge = NakamaMultiplayerBridge.new(socket)
	# multiplayer_bridge.match_join_error.connect(self._on_match_join_error)
	# multiplayer_bridge.match_joined.connect(self._on_match_joined)
	# multiplayer.set_multiplayer_peer(multiplayer_bridge.multiplayer_peer)
	
	multiplayer.peer_connected.connect(self._on_peer_connected)
	multiplayer.peer_disconnected.connect(self._on_peer_disconnected)




func _on_login_test_3_button_pressed() -> void:
	# set_host()
	pass

# func set_host():
# 	var  email = "test3@test.com"
# 	var password = "password"
# 	session = await client.authenticate_email_async(email, password)
# 	await socket.connect_async(session)
# 	$CanvasLayer/Panel/LoginButton.disabled = true
# 	$CanvasLayer/Panel/EmailLineEdit.editable = false
# 	$CanvasLayer/Panel/PasswordLineEdit.editable = false
# 	multiplayer_bridge = NakamaMultiplayerBridge.new(socket)
# 	multiplayer_bridge.match_join_error.connect(self._on_match_join_error)
# 	multiplayer_bridge.match_joined.connect(self._on_match_joined)
# 	multiplayer.set_multiplayer_peer(multiplayer_bridge.multiplayer_peer)
# 	multiplayer.peer_connected.connect(self._on_peer_connected)
# 	multiplayer.peer_disconnected.connect(self._on_peer_disconnected)
# 	await get_tree().create_timer(2.0).timeout
# 	if match_id != "":
# 		multiplayer_bridge.join_match(match_id)
		
func _on_join_button_pressed() -> void:
	match_id_for_client = $CanvasLayer/Panel2/MatchNameLineEdit.text
	await socket.join_match_async(match_id_for_client)
	$CanvasLayer/Panel2/CJMatchButton.disabled = true
	$CanvasLayer/Panel2/JoinButton.disabled = true


func _on_server_join_button_pressed() -> void:
	var job_result = await client.rpc_async(session, "rpcGetJob", "{}")
	var job_result_json = JSON.parse_string(job_result.payload)
	match_id = $CanvasLayer/Panel2/MatchNameLineEdit.text
	await socket.join_match_async(match_id)
	var resultx = await socket.join_match_async(match_id)
	print("result: ", resultx)
