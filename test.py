import a2s

server_address = ("104.234.7.8", 2363)  
server_info = a2s.info(server_address)

print(f"Nombre del servidor: {server_info.server_name}")
print(f"Jugadores: {server_info.player_count}/{server_info.max_players}")
print(f"Mapa: {server_info.map_name}")
