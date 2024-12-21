extends Node


var players : Dictionary = {}
var my_user_id: String = ""
var host_user_id: String = ""

func add_player(user_id : String, peer_id : int) -> void:
	print("add player: ", user_id, " ", peer_id)
	print("b4 add: ", players)
	if not players.has(user_id):
		players[user_id] = peer_id
	print("all players: ", players)

func remove_player(user_id : String) -> void:
	players.erase(user_id)

func set_player_peer_id(user_id : String, peer_id : int) -> void:
	players[user_id] = peer_id

func get_player_peer_id(user_id : String) -> int:
	return players[user_id]

func get_player_count() -> int:
	var count = 0
	for player in players:
		if player != host_user_id:
			count += 1
	return count

func set_my_user_id(user_id : String) -> void:
	my_user_id = user_id

func get_my_peer_id() -> int:
	if not players.has(my_user_id):
		return 1
	return players[my_user_id]

func set_host_user_id(user_id: String) -> void:
	host_user_id = user_id
	if not players.has(user_id):
		players[user_id] = -1

func get_host_user_id() -> String:
	return host_user_id

func get_host_peer_id() -> int:
	if not players.has(host_user_id):
		return 1
	return players[host_user_id]
