const { Agent } = require('undici');
const { findAndEditMessageText } = require('../services/findAndEditMessageText');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getSimpleRedisJson } = require('../services/getFromRedis');

const craftyDispatcher = new Agent({
    connect: {
        rejectUnauthorized: false, // cert autofirmado de Crafty
    },
});
const safeValue = (value, defaultValue = 'Desconocido') => {
    // Si el valor es null o undefined, devolver el valor por defecto
    if (value == null) {
        return defaultValue;
    }

    // Si no es una cadena, convertirlo a cadena
    if (typeof value !== 'string') {
        value = String(value);
    }

    // Si la cadena no está vacía o solo contiene espacios en blanco, devolver el valor
    if (value.trim()) {
        return value;
    }

    // Si no cumple, devolver el valor por defecto
    return defaultValue;
};



// example response body
const example = {
  "status": "ok",
  "data": {
    "stats_id": 6609,
    "created": "2025-12-29T10:09:06.604258",
    "server_id": {
      "server_id": "66b01db1-aef2-44ae-8bbe-6aa8183db904",
      "created": "2025-12-26T23:09:45.906377",
      "server_name": "JuanitoYSusAmigos",
      "path": "/crafty/servers/66b01db1-aef2-44ae-8bbe-6aa8183db904",
      "executable": "libraries/net/minecraftforge/forge/1.20.1-47.4.10/forge-1.20.1-47.4.10-server.jar",
      "log_path": "./logs/latest.log",
      "execution_command": "java @user_jvm_args.txt @libraries/net/minecraftforge/forge/1.20.1-47.4.10/unix_args.txt nogui  \"$@\"",
      "auto_start": false,
      "auto_start_delay": 10,
      "crash_detection": false,
      "stop_command": "stop",
      "executable_update_url": "",
      "server_ip": "127.0.0.1",
      "server_port": 25565,
      "logs_delete_after": 0,
      "type": "minecraft-java",
      "show_status": true,
      "created_by": 1,
      "shutdown_timeout": 60,
      "ignored_exits": "0",
      "count_players": true
    },
    "started": "False",
    "running": false,
    "cpu": 0.0,
    "mem": 0.0,
    "mem_percent": 0.0,
    "world_name": "JuanitoYSusAmigos",
    "world_size": "1022.9MB",
    "server_port": 25565,
    "int_ping_results": "False",
    "online": 0,
    "max": 0,
    "players": "False",
    "desc": "False",
    "icon": null,
    "version": "False",
    "updating": false,
    "waiting_start": false,
    "first_run": true,
    "crashed": false,
    "importing": false
  }
}
const examample2={
  "status": "ok",
  "data": {
    "stats_id": 6625,
    "created": "2025-12-29T12:55:46.249576",
    "server_id": {
      "server_id": "66b01db1-aef2-44ae-8bbe-6aa8183db904",
      "created": "2025-12-26T23:09:45.906377",
      "server_name": "JuanitoYSusAmigos",
      "path": "/crafty/servers/66b01db1-aef2-44ae-8bbe-6aa8183db904",
      "executable": "libraries/net/minecraftforge/forge/1.20.1-47.4.10/forge-1.20.1-47.4.10-server.jar",
      "log_path": "./logs/latest.log",
      "execution_command": "java @user_jvm_args.txt @libraries/net/minecraftforge/forge/1.20.1-47.4.10/unix_args.txt nogui  \"$@\"",
      "auto_start": false,
      "auto_start_delay": 10,
      "crash_detection": false,
      "stop_command": "stop",
      "executable_update_url": "",
      "server_ip": "127.0.0.1",
      "server_port": 25565,
      "logs_delete_after": 0,
      "type": "minecraft-java",
      "show_status": true,
      "created_by": 1,
      "shutdown_timeout": 60,
      "ignored_exits": "0",
      "count_players": true
    },
    "started": "2025-12-29 12:48:15",
    "running": true,
    "cpu": 3.0,
    "mem": "2.5GB",
    "mem_percent": 33.0,
    "world_name": "JuanitoYSusAmigos",
    "world_size": "1018.1MB",
    "server_port": 25565,
    "int_ping_results": "True",
    "online": 1,
    "max": 20,
    "players": "['bytrayed']",
    "desc": "A Minecraft Server",
    "icon": "",
    "version": "1.20.1",
    "updating": false,
    "waiting_start": false,
    "first_run": true,
    "crashed": false,
    "importing": false
  }
}

const reloadStatusCraftyTask = async (client, redis) => {
    // Lógica para recargar el estado de Crafty

    const hash = await redis.hgetall('databot:adminCraftyServer:config');
    for (const guildId in hash) {
        try {
            const config = JSON.parse(hash[guildId]);
            const json = await fetchCrafty(config.serverEndpoint, config.craftyToken);
            const data = json.data;
            if (!data || typeof data !== 'object') {
                // manejar error
                continue;
            }
            // convertir el valor de fecha de inicio en 20 horas desde que se inicio
            let iniciado = "Apagado";

            if (data.started && data.started !== 'False') {
                // Forzar UTC
                const startedDate = new Date(
                    data.started.replace(" ", "T") + "Z"
                );
            
                const now = new Date();
                const diffMs = now.getTime() - startedDate.getTime();
            
                if (!isNaN(diffMs) && diffMs >= 0) {
                    const diffHrs = Math.floor(diffMs / 3600000);
                    const diffMins = Math.floor((diffMs % 3600000) / 60000);
                    iniciado = `${diffHrs}h ${diffMins}m`;
                }
            }
            // generar embed
            const AllEmbeds = [];
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`≫ ${data.server_id.server_name} ≪`)
                .setDescription(`cada 3 minutos se actualiza este estado automáticamente 🛠️, Utilice los botones a continuacion para administrar el servidor Crafty.`)
                .addFields(
                    { name: 'Estado', value: `${data.running ? '🟢 En línea' : '🔴 Apagado'}`, inline: true },
                    { name: 'Jugadores', value: `${data.online}/${data.max}`, inline: true },
                    { name: 'cpu', value: `${data.cpu}%`, inline: true },
                    { name: 'Memoria', value: `${data.mem_percent}% (${data.mem})`, inline: true },
                    { name : 'Iniciado' , value: `${iniciado}` , inline: true },
                    { name : 'Puerto' , value: `${data.server_port}` , inline: true },
                    { name : 'world_size' , value: `${data.world_size}` , inline: true },
                    { name : 'Versión' , value: `${data.version|| 'Desconocida'}` , inline: true }
                

                )
                .setTimestamp();

            AllEmbeds.push(embed);

            if(data.online > 0 && data.players && data.players !== 'False'){
                let fieldsPlayers = [];
                const maxFields = 25; // Límite de Discord
                const playersList = JSON.parse(data.players.replace(/'/g, '"'));

                for (let i = 0; i < Math.min(playersList.length, maxFields); i++) {
                    fieldsPlayers.push({
                        name: `${playersList[i]}`,
                        value: `-_-`,
                        inline: true
                    });
                }

                const embed2 = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Jugadores ${data.online}/${data.max}`)
                    .addFields(fieldsPlayers);
                AllEmbeds.push(embed2);
            }
            actions = await getSimpleRedisJson({
                redis,
                type: 'adminCraftyServer:register',
                UID: `${guildId}`
            });
            if (actions && actions.length > 0) {
                const logs = actions.map(action => `${action.user} realizó la acción: ${action.action}`).join('\n');
                const embed3 = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Registro de acciones`)
                    .setDescription(`\`\`\`log\n${logs}\n\`\`\``);
                AllEmbeds.push(embed3);
            }
            // agregar los botones de administrar servidor con el Id correspondiente
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(config.btnStartId)
                        .setLabel('Iniciar')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(config.btnStopId)
                        .setLabel('Detener')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(config.btnRebootId)
                        .setLabel('Reiniciar')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(config.btnBackUpId)
                        .setLabel('respaldar')
                        .setStyle(ButtonStyle.Primary)
                );
            

            // enviar embed al canal
            await findAndEditMessageText(client, config.channelId, config.messageId, {
                embeds: AllEmbeds,
                components: [actionRow]
            });

        } catch (error) {
            console.error(`Error al procesar la configuración de la guild ${guildId}:`, error);
        }
    }
};





async function fetchCrafty(serverEndpoint, token) {
    console.log(`${serverEndpoint}/stats`, token);
    const res = await fetch(
        `${serverEndpoint}/stats`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': '*/*',
                'user-agent': 'Thunder Client (https://www.thunderclient.com)'
            },
            dispatcher: craftyDispatcher,
        }
    );

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Crafty error ${res.status}: ${text}`);
    }

    return res.json();
}

module.exports = {
    reloadStatusCraftyTask
};