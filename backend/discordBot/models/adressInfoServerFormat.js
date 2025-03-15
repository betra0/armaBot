const infoServerFormatted = ({ infoAdress }) => {
    let dictInfoFormatted = {
        protocol: infoAdress.info.protocol,
        serverName: infoAdress.info.server_name,
        mapName: infoAdress.info.map_name,
        folder: infoAdress.info.folder,
        game: infoAdress.info.game,
        appId: infoAdress.info.app_id,
        playerCount: infoAdress.info.player_count,
        maxPlayers: infoAdress.info.max_players,
        botCount: infoAdress.info.bot_count,
        serverType: infoAdress.info.server_type,
        platform: infoAdress.info.platform,
        passwordProtected: infoAdress.info.password_protected,
        vacEnabled: infoAdress.info.vac_enabled,
        version: infoAdress.info.version,
        edf: infoAdress.info.edf,
        ping: infoAdress.info.ping,
        port: infoAdress.info.port,
        steamId: infoAdress.info.steam_id,
        stvPort: infoAdress.info.stv_port,
        stvName: infoAdress.info.stv_name,
        gameId: infoAdress.info.game_id,
        players: infoAdress.players,
        updatedInfo: infoAdress.updatedInfo,
        status: infoAdress.status,
    };

    return dictInfoFormatted;
};

module.exports = {
    infoServerFormatted
}