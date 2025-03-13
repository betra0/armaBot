const {Client, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Embed, InteractionFlags } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { findAndEditMessageText, findAndEditChannelName } = require('./services/findAndEditMessageText');
const generateRegister = require('./other/generateRegister');
const Redis = require('ioredis');
require('dotenv').config({ path: '../../.env' });

const redis = new Redis({
    host:'localhost',
    port:6379
});
const subscriber = new Redis({
    host: 'localhost',
    port: 6379
});

const client = new Client({
    intents:process.env.INTENTSDS
});
const token = process.env.BOTDSTOKEN
const handlerReqireCommand = (carpeta, arg, message)=>{
  try{
    const command = require(`./${carpeta}/${arg}`)
    command.run(message)
  }catch(e){
    console.log(e)
  }

}

const saveRedisNewMessageSubcription = async ({ type='status', gildID, adress, channelID, messageID, seudoTitle=''})=>{
// hay Type status y voicetitle
// primero verificas si ya hay un objeto 
    let ipSubcriptionObject = await redis.hget(`adress:sub:${type}`, adress)
    ipSubcriptionObject= ipSubcriptionObject ? JSON.parse(ipSubcriptionObject) : {}

    if (!ipSubcriptionObject[channelID]){
        ipSubcriptionObject[channelID] = {}
    }
    ipSubcriptionObject[channelID] = {
        gildID: gildID,
        messageID: messageID,
        channelID: channelID,
        seudoTitle: seudoTitle
    }
    // Guardar el objeto en redis
    await redis.hset(`adress:sub:${type}`, adress, JSON.stringify(ipSubcriptionObject))

}
const getListRedisIpSubcription = async ({type='status', adress=null, value=null })=>{
    // vaslue  e el valor obtenido sin formatear o sin parsear
    //
    if (!adress && !value){
        throw new Error('No se han proporcionado los datos necesarios.');
    } else if(!value){
        value = await redis.hget(`adress:sub:${type}`, adress)
    }
    const clanData= value ? JSON.parse(value) : {}
    // retornar una lista de objetos
    return Object.values(clanData)
    
}
const getInfoAdressForRedis = async ({ adress=null })=>{ 
    if (!adress){
        throw new Error('No se han proporcionado los datos necesarios.');
    }
    let infoAdress = await redis.hget(`adressInfo`, adress)
    infoAdress = infoAdress ? JSON.parse(infoAdress) : null
    // formatear info del adress
    if (infoAdress){
        //console.log("esta es la info pre formated; ", infoAdress)
        infoAdress = infoServerFormatted({ infoAdress })
    }
    return infoAdress

}




/* const exampleTask = async () => {
    const boton = new ButtonBuilder()
        .setCustomId('sendReportTomateTeam')  // Identificador único para el botón
        .setLabel('Presionar aquí')  // Etiqueta del botón
        .setStyle(ButtonStyle.Primary);  // Estilo del botón (puede ser 'Primary', 'Secondary', etc.)

    // Crear una fila de acción que contenga el botón
    const fila = new ActionRowBuilder().addComponents(boton);

    // Enviar el mensaje con el botón

    const targetChannelId = '1327408280217059444'; 
    const channel = client.channels.cache.get(targetChannelId);

        if (channel) {
            // Envía un mensaje al canal
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Reporte del Clan')
                .setDescription('Presiona el botón para obtener el reporte del clan en exel.')
            channel.send({
              content: '',
                embeds: [embed],
               components: [fila],            
            });
        } else {
            console.log('Canal no encontrado.');
        }
}*/

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    //guardar en redis el mensaje de subcripcion para testear 
    saveRedisNewMessageSubcription({type:'status', gildID:'1349159517270708356', adress:'104.234.7.8:2363', channelID:'1349159517971021928', messageID:'1349161450349789186', seudoTitle:'Servidor 1'})
    saveRedisNewMessageSubcription({type:'playerCountInTitle', gildID:'1349159517270708356', adress:'104.234.7.8:2363', channelID:'1349159517971021929', messageID:'', seudoTitle:'𝗦𝗲𝗿𝘃𝗲𝗿-1'})
    saveRedisNewMessageSubcription({type:'status', gildID:'1349159517270708356', adress:'104.234.7.16:2353', channelID:'1349528710574772316', messageID:'1349529750028156948', seudoTitle:'Servidor 2'})
    
    // test de change name audi chanel
    
    //await findAndEditChannelName(client, '1349159517971021929', 'Nuevo Nombre');
    console.log('Cambio de nombre de canal de voz.');
    // suscribire a un canal en redis 
    subscriber.subscribe('adressChangeInfo', (err, count) => {
        if (err) {
          console.error('Error al suscribirse a subscriber:', err);
        } else {
          console.log(`Suscrito a ${count} canal(es) en subscriber.`);
        }
    });
    subscriber.subscribe('adressChangePlayerCount', (err, count) => {
        if (err) {
          console.error('Error al suscribirse a subscriber:', err);
        } else {
          console.log(`Suscrito a ${count} canal(es) en subscriber.`);
        }
    });
    
    subscriber.on('message', async (channel, message) => {
        console.log(`Mensaje recibido en el canal ${channel}: ${message}`);
        if (channel === 'adressChangeInfo' || channel === 'adressChangePlayerCount'){ 
            const ip = message;
            let type = channel === 'adressChangeInfo' ? 'status' : 'playerCountInTitle'
            const listValuesSub = await getListRedisIpSubcription({type:type, adress:ip})
            console.log(listValuesSub)
            if (!listValuesSub || listValuesSub.length === 0){
                return
            }   
            //buscar la info 
            const infoAdress = await getInfoAdressForRedis({ adress: ip });
            if (!infoAdress){
                return
            }
            for (const valuesSub of listValuesSub){
                
                if ( type==='status' && valuesSub.channelID && valuesSub.messageID){
                    allEbeds = []
                    const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`≫ ${valuesSub.seudoTitle} ≪`)
                    .setDescription(`${infoAdress.serverName}`)
                    .addFields(
                            { name: 'Modo', value: `${infoAdress.game}`, inline: true },
                            { name: 'Mapa', value: `${infoAdress.mapName}`, inline: true },
                            { name: 'Jugadores', value: `${infoAdress.playerCount}/${infoAdress.maxPlayers}`, inline: true },
                            { name: 'Contraseña:', value: `${infoAdress.passwordProtected ? 'Sí' : 'No'}`, inline: true },
                            { name: 'Versión', value: `${infoAdress.version}`, inline: true },
                            { name: 'SteamId', value: `${infoAdress.steamId}`, inline: true },
                            
                        
                    )
                    .setImage('https://cdn.discordapp.com/attachments/1349294304455163938/1349294670806646824/36636746158cb38795e0eb6cdde17624d7183ed4.png?ex=67d29416&is=67d14296&hm=fc441b5728558c3286e726cd3c2acb336a2a65ba4b00f131673213df7bf924fb&')
                    .setTimestamp();
                    allEbeds.push(embed)
                    if(infoAdress.playerCount >0 && infoAdress.players){
                            // hacer un ermbed solo para los 7 primeros players
                            fieldsPlayers = []
                            for (let i = 0; i < infoAdress.players.length; i++){
                                fieldsPlayers.push({name: `${infoAdress.players[i].name}`, value: `${Number(infoAdress.players[i].score) * 100} Puntos`, inline: true})
                            }
                            const embed2 = new EmbedBuilder()
                                .setColor('#0099ff')
                                .setTitle(`Jugadores ${infoAdress.playerCount}/${infoAdress.maxPlayers}`)
                                .addFields(fieldsPlayers)
                            allEbeds.push(embed2)

                    }
                    await findAndEditMessageText(
                            client, 
                            valuesSub.channelID, 
                            valuesSub.messageID, 
                            {content: "", embeds: allEbeds}
                    )
                }else if (type==='playerCountInTitle' && valuesSub.channelID ){
                    console.log('cambiand el d nombre de canal de voz por llamda de redis', valuesSub.channelID, `${valuesSub.seudoTitle} ${infoAdress.playerCount}/${infoAdress.maxPlayers}`)
                    await findAndEditChannelName(
                        client, 
                        valuesSub.channelID, 
                        `🎮 ${valuesSub.seudoTitle} │ ${infoAdress.playerCount}/${infoAdress.maxPlayers} 👥`
                    );
                    
                    console.log('devria haber cambiado el nombre del canal de voz')
                    // aqui se edita el titulo del canal de voz 

                }
            }
            
        } 
    })

});

client.on(Events.MessageCreate, async message => {
    console.log('Message received:', message.guildId, message.content, message.channelId);
    if (!message.guild) {
          return message.reply('Este comando solo puede ser usado en un servidor de Discord.');
    }
    if (message.content.startsWith('sudo')) {


          if (message.author.bot) return
          if (message.member && !message.member.permissions.has('ADMINISTRATOR')) {
              return message.reply('¡Solo los administradores pueden ejecutar este comando!');
          }
        
           // Handler comannd
          const arg = message.content.slice(5).split(' ')[0]
          if(arg === 'create'){
            const arg = message.content.slice(5).split(' ')[1]
            console.log(arg)
            handlerReqireCommand('createCommands', arg, message)
          }
          else{
            console.log(arg)
            handlerReqireCommand('adminCommands', arg, message)
          }
          


    }
    if (message.content.startsWith('%')){
      if (message.author.bot) return
      const arg = message.content.slice(1).split(' ')[0]
      console.log(arg)
      handlerReqireCommand('commands', arg, message)
    }
    
    

});



/* client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;  // Asegúrate de que la interacción sea un botón

    if (interaction.customId === 'sendReportTomateTeam') {
        try {
            // Hacer la solicitud GET para obtener el archivo desde tu API
            const url = `http://${process.env.APIHOST}:${process.env.APIPORT}/report`;
            const response = await axios.get(url, {
                responseType: 'arraybuffer', // Esto es importante para obtener el archivo binario
            });

            // Crear un archivo temporal en el sistema con el contenido del archivo recibido
            const filePath = path.join(__dirname, 'reporte_generado.xlsx');
            fs.writeFileSync(filePath, response.data); // Guardar el archivo recibido

            // Enviar el archivo al canal
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Reporte del Clan')
                .setDescription(`Se ha generado un reporte para ${interaction.user.username}.`)
                .setTimestamp();
            const mensajeReply = await interaction.reply({
                content: ``,
                files: [{ attachment: filePath, name: 'ReporteTomateTeam.xlsx' }],
                embeds: [embed],
                flags: 64
            });


            // Opcional: Eliminar el archivo temporal después de enviarlo
            fs.unlinkSync(filePath);
            setTimeout(() => {
                mensajeReply.delete().catch(console.error);  // Eliminar el mensaje
            }, 60000);
            

        } catch (error) {
            console.error('Error al obtener el reporte:', error);
            await interaction.reply({
                content: 'Hubo un error al generar el reporte. Intenta de nuevo más tarde.',
                flags: 64
            });
        }

    }
}); */

client.login(token);










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
        updatedInfo: infoAdress.updatedInfo
    };

    return dictInfoFormatted;
};
