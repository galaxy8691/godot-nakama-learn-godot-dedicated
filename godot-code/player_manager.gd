extends Node


var players : Array[int] = []
var my_peer_id : int = -1
var host_peer_id : int = -1

func add_player(peer_id : int) -> void:
	players.append(peer_id)
	players.sort()

func remove_player(peer_id : int) -> void:
	players.erase(peer_id)
	players.sort()
func get_player_count() -> int:
	if host_peer_id == -1:
		return players.size()
	else:
		return players.size() + 1

func set_my_peer_id(peer_id : int) -> void:
	my_peer_id = peer_id

func get_my_peer_id() -> int:
	return my_peer_id

func set_host_peer_id(peer_id : int) -> void:
	host_peer_id = peer_id
	if players.has(peer_id):
		players.erase(peer_id)
	players.sort()

func get_host_peer_id() -> int:
	return host_peer_id
