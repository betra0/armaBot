const infoServerFormatted = ({ infoAdress }) => {
    let dictInfoFormatted = {
        protocol: infoAdress.info.protocol,
        serverName: infoAdress.info.name,
        mapName: infoAdress.info.map,
        folder: infoAdress.info.folder,
        game: infoAdress.info.game,
        appId: infoAdress.info.app_id,
        playerCount: infoAdress.info.players,
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
        steamId: infoAdress.info.steamid,
        stvPort: infoAdress.info.stv_port,
        stvName: infoAdress.info.stv_name,
        gameId: infoAdress.info.gameid,
        players: infoAdress.players,
        updatedInfo: infoAdress.updatedInfo,
        status: infoAdress.status,
        imgs: infoAdress.imgs ? infoAdress.imgs : null
    };

    return dictInfoFormatted;
};

module.exports = {
    infoServerFormatted
}

const ejemplo = {
  info: {
    header: 'I',
    protocol: 17,
    name: 'DIVISION ANDINA [LAS] SERVER 24/7',
    map: 'Altis',
    folder: 'Arma3',
    game: 'Invade & Annex: Apex Edition 1.56',
    id: 0,
    players: 1,
    max_players: 70,
    bots: 0,
    server_type: 'd',
    environment: 'w',
    visibility: 0,
    vac: 0,
    version: '2.20.152984',
    port: 2302,
    steamid: 90280225684519949n,
    keywords: 'bf,r220,n152946,s7,i3,mf,lf,vt,dt,tcoop,g65545,hd45fd29e,f0,c-2147483648--2147483648,pw,e112,j0,k0,',
    gameid: 107410n
  },

  players: [
    {
      index: 0,
      name: '__Dany__',
      score: 0,
      duration: 161.09588623046875
    }
  ],

  updatedInfo: '2026-01-17T07:07:56.511Z',
  status: true
};