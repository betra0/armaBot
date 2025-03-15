const {Client, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Embed, InteractionFlags } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { findAndEditMessageText, findAndEditChannelName } = require('./services/findAndEditMessageText');
const generateRegister = require('./other/generateRegister');
const Redis = require('ioredis');
require('dotenv').config({ path: '../../.env' });
const { saveRedisNewMessageSubcription } = require('./services/insertInRedis');
const { getListRedisIpSubcription, getInfoAdressForRedis } = require('./services/getFromRedis');

console.log('este es el Redis host y port \n ', process.env.REDISHOST, process.env.REDISPORT)

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
let redis 
let subscriber


const client = new Client({
    intents:process.env.INTENTSDS
});
const token = process.env.BOTDSTOKEN

const handlerReqireCommand = (carpeta, arg, message, redis)=>{
  try{
    const command = require(`./${carpeta}/${arg}`)
    command.run(message, redis)
  }catch(e){
    console.log(e)
  }

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
    saveRedisNewMessageSubcription(
        {
            type:'playerCountInTitle', 
            gildID:'1349159517270708356', 
            adress:'104.234.7.8:2363', 
            channelID:'1349159517971021929', 
            messageID:'', 
            seudoTitle:'𝗦𝗲𝗿𝘃𝗲𝗿-1', redis:redis
        })

    saveRedisNewMessageSubcription(
        {
            type:'playerCountInTitle', 
            gildID:'1349159517270708356', 
            adress:'104.234.7.106:2353', 
            channelID:'1349699425043222548', 
            messageID:'', 
            seudoTitle:'𝗦𝗲𝗿𝘃𝗲𝗿 2', 
            redis:redis
        }) 

    
    // suscribire a los canales de comunicacion con fetcher en redis 
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
            const listValuesSub = await getListRedisIpSubcription({type:type, adress:ip, redis:redis})
            console.log(listValuesSub)
            if (!listValuesSub || listValuesSub.length === 0){
                return
            }   
            //buscar la info 
            const infoAdress = await getInfoAdressForRedis({ adress: ip, redis: redis });
            if (!infoAdress){
                return
            }
            for (const valuesSub of listValuesSub){
                console.log('status info; ', infoAdress.status)
                if ( type==='status' && valuesSub.channelID && valuesSub.messageID){

                    const allEbeds = GenerateEmbedStatusServer({infoAdress, seudoTitle:valuesSub.seudoTitle})

                    await findAndEditMessageText(
                            client, 
                            valuesSub.channelID, 
                            valuesSub.messageID, 
                            {content: "", embeds: allEbeds}
                    )
                }else if (type==='playerCountInTitle' && valuesSub.channelID ){
                    let text = infoAdress.status == false ? '| CLOSED' : `| ${infoAdress.playerCount}/${infoAdress.maxPlayers}`
                    console.log(
                        'cambiando el del nombre de canal de voz', 
                        `${valuesSub.seudoTitle} ${infoAdress.playerCount}/${infoAdress.maxPlayers}`,
                    )
                    await findAndEditChannelName(
                        client, 
                        valuesSub.channelID, 
                        `🎮 ${valuesSub.seudoTitle} ${text} 👥`
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
          if (message.member && !message.member.permissions.has('ADMINISTRATOR') && message.author.id !== '708054004923629639') {
              return message.reply('¡Solo los administradores pueden ejecutar este comando!');
          }
        
           // Handler comannd
          const arg = message.content.slice(5).split(' ')[0]
          if(arg === 'create'){
            const arg = message.content.slice(5).split(' ')[1]
            console.log(arg)
            handlerReqireCommand('createCommands', arg, message, redis)
          }
          else{
            console.log(arg)
            handlerReqireCommand('adminCommands', arg, message, redis)
          }
          


    }
    if (message.content.startsWith('%')){
      if (message.author.bot) return
      const arg = message.content.slice(1).split(' ')[0]
      console.log(arg)
      handlerReqireCommand('commands', arg, message, redis)
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



async function ejecutar() {
    console.log('Esperando unos segundos para iniciar el bot...');
    await sleep( 4 * 1000); 
    console.log('Iniciando el bot...');
    redis = new Redis({
        host:process.env.REDISHOST,
        port:process.env.REDISPORT
    });
    subscriber = new Redis({
        host: process.env.REDISHOST,
        port: process.env.REDISPORT
    });
    client.login(token);

}

ejecutar();



const GenerateEmbedStatusServer = ({infoAdress={}, seudoTitle=''}) => {
    const allEbeds = []
    const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`≫ ${seudoTitle} ≪`)
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
    console.log('status info antes de if; ', infoAdress.status)
    // si el status es false se agrega un embed de error
    if(infoAdress.status == false){
        console.log('status false')
        allEbeds.push(generateErrorEmbed({title:'Error', descripcion:'El servidor se encuentra cerrado o no se ha podido obtener la información.'}))
    }

    if (infoAdress.playerCount > 0 && infoAdress.players) {
        let fieldsPlayers = [];
        const maxFields = 25; // Límite de Discord
    
        for (let i = 0; i < Math.min(infoAdress.players.length, maxFields); i++) {
            fieldsPlayers.push({
                name: `${infoAdress.players[i].name}`,
                value: `${Number(infoAdress.players[i].score) * 100} Puntos`,
                inline: true
            });
        }
    
        const embed2 = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Jugadores ${infoAdress.playerCount}/${infoAdress.maxPlayers}`)
            .addFields(fieldsPlayers);
    
        allEbeds.push(embed2);
    }
    return allEbeds
}













const generateErrorEmbed = ({title='ERROR: ', descripcion='Ocurrio in error Inesperado'

}) => {
    return new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle(title)
        .setDescription(descripcion);
}
'No se ha podido obtener la información del servidor.'