extends CharacterBody2D


const SPEED = 500.0
var peer_id : int = 0


func _physics_process(delta: float) -> void:	
	if peer_id == PlayerManager.get_my_peer_id():
		var nv = Vector2(0, 0)
		if Input.is_action_pressed("up"):
			nv.y -= 1
		if Input.is_action_pressed("down"):
			nv.y += 1
		if Input.is_action_pressed("left"):
			nv.x -= 1
		if Input.is_action_pressed("right"):
			nv.x += 1
		nv = nv.normalized()
		request_sync_move_vector.rpc_id(PlayerManager.get_host_peer_id(), nv)
	if is_multiplayer_authority():
		#print("syncing position")
		sync_position.rpc(global_position)

@rpc("authority")
func sync_position(pos : Vector2) -> void:
	global_position = pos

@rpc("any_peer")
func request_sync_move_vector(nv : Vector2) -> void:
	velocity = nv * SPEED
	move_and_slide()
	
