const {Client, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Embed, InteractionFlags, PermissionsBitField, InteractionReplyOptions, MessageFlags  } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { findAndEditMessageText, findAndEditChannelName } = require('./services/findAndEditMessageText');
const generateRegister = require('./other/generateRegister');
const Redis = require('ioredis');
require('dotenv').config({ path: '../../.env' });
const { saveRedisNewMessageSubcription } = require('./services/insertInRedis');
const { getListRedisIpSubcription, getInfoAdressForRedis, getSimpleRedisJson } = require('./services/getFromRedis');
const { GenerateEmbedStatusServer } = require('./services/embedStatusServer');

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

    //test
    async function runInterval() {
        try {
            console.log('example ...');
        } catch (e) {
            console.log('En testeInterval', e);
        }
        setTimeout(runInterval, 20000); // Espera a que termine antes de iniciar el siguiente
    }
    
    /* runInterval(); */


    // NO usado de momento
    /* await findAndEditChannelName(
        client, 
        '1350949826363392042', 
        `🎮 Bot OFF 👥`,
        true
    );
    setTimeout(async ()=>{
        
    await findAndEditChannelName(
        client, 
        '1350949899470114846', 
        `🎮 Bot OFF 👥`,
        true
    );
    }, 1500) */
    


    
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
        console.log(`Mensaje recibido en el canal de redis ${channel}: ${message}`);
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
                    
                    // crear embed con la info del server
                    const allEbeds = await GenerateEmbedStatusServer({infoAdress, seudoTitle:valuesSub.seudoTitle})
                    // se envia ls info, editando el mensaje con la nueva info 
                    await findAndEditMessageText(
                            client, 
                            valuesSub.channelID, 
                            valuesSub.messageID, 
                            {content: "", embeds: allEbeds}
                    )
                }else if (type==='playerCountInTitle' && valuesSub.channelID ){

                    await retryEditChannelTitle({
                        channelID: valuesSub.channelID,
                        redisClient: redis,
                        attempt: 1,
                        maxAttempts: 50,
                        titletextFunc: async ()=> await titleTextArmaServer({ adress: ip, redisClient: redis, seudoTitle: valuesSub.seudoTitle }),
                        client: client
                    });
                    
                        
                    
                    // aqui se edita el titulo del canal de voz 

                }
            }
            
        } 
    })

});
async function retryEditChannelTitle(
    {  
        attempt = 1,
        channelID, 
        maxAttempts = 50,
        redisClient,
        titletextFunc,
        client
     }) {
    const retryTime = 1000 * 60 * 11; // minutos

    // Solo la primera vez verifica Redis
    if (attempt === 1) {
        const isRetrying = await redisClient.get(`retrying:${channelID}`);
        if (isRetrying) {
            console.log(`🔄 Ya hay un reintento en curso para el canal ${channelID}, evitando duplicados.`);
            return;
        }
    }
    
    try {
        let text = await titletextFunc()
        console.log(`Intento ${attempt} para canal ${channelID}`);
        await findAndEditChannelName(
            client, 
            channelID, 
            text,
            true
        );
        await redisClient.del(`retrying:${channelID}`);
        console.log(`Operación exitosa en canal ${channelID}`);
        return; // Salir si la operación fue exitosa

    } catch (err) {
        console.log(`Error: ${err.message}, reintentando... (${attempt}/${maxAttempts})`);

        if (err.message === 'TimeoutFunction' && attempt < maxAttempts) {
                // Aunque sea el segundo intento establece el reintento en Redis para reiniciar el ttl 
            await redisClient.set(`retrying:${channelID}`, "true", "EX", retryTime/1000 + 5); //  con tiempo de expiración en segundos
            await new Promise(res => setTimeout(res, retryTime)); // Esperar antes de reintentar
            return retryEditChannelTitle({ attempt: attempt + 1, channelID, maxAttempts, redisClient, titletextFunc, client });
        } else {
            console.log(`Se alcanzó el número máximo de intentos para el canal ${channelID} u otro error, abortando.`);
            await redisClient.del(`retrying:${channelID}`); // Liberar canal en fallo definitivo
        }
    }
}
async function titleTextArmaServer({ adress, redisClient, seudoTitle }){
    const infoAdress = await getInfoAdressForRedis({ adress: adress, redis: redisClient });
    if (!infoAdress){
        throw new Error('No infoAdress');
    }
    let text = infoAdress.status == false ? '| CLOSED' : `| ${infoAdress.playerCount}/${infoAdress.maxPlayers}`
    return `🎮 ${seudoTitle} ${text} 👥`
}
async function titleMembersCount({ guild }){
    const memberCount = guild.memberCount;
    console.log(`Miembros totales obtenidos: ${memberCount}`);
    return `Miembros: ${memberCount}`
}
async function changeAmountMembers({member}){
    const guild = member.guild;
    const data = await getSimpleRedisJson({ redis: redis, type: 'voiceMembersCount', UID: `${guild.id}` })
    if (data && data.channelID){
        try{
            await retryEditChannelTitle({
                channelID: data.channelID,
                redisClient: redis,
                attempt: 1,
                maxAttempts: 3,
                titletextFunc: async ()=> await titleMembersCount({ guild: member.guild }),
                client: client
            });
        }catch(e){
            console.log('error al cambiar el nombre del canal de miembros', e)
        }
        
    }

}
client.on(Events.GuildMemberAdd, async member => {
    console.log('se a unido un nuevo miembro al servidor')
    changeAmountMembers({member})
});
client.on(Events.GuildMemberRemove, async member => {
    console.log('un miembro a salido del servidor')
    changeAmountMembers({member})  
});

// cuando se manda un mensaje por un servidor de discord    
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return
    if (!message.guild) {
        console.log('Message received:',  'DM', message.author.username, ':', message.content );
        return message.reply('este bot no funciona por dm, por favor usa los comandos en un servidor.');
    }
    console.log('Message received:',  'ServerName',message.guild.name, 'ChannelName', message.channel.name, message.author.username, ':', message.content );

    if (message.content.startsWith('%s')) {
          if (message.member && !message.member?.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== '708054004923629639') {
              return message.reply('¡Solo los administradores pueden ejecutar este comando!');
          }
        
           // Handler comannd
          const arg = message.content.slice(3).split(' ')[0]
          if(arg === 'create'){
            const arg = message.content.slice(3).split(' ')[1]
            console.log(arg)
            handlerReqireCommand('createCommands', arg, message, redis)
          }
          else if (arg === 'edit'){
            const arg = message.content.slice(3).split(' ')[1]
            console.log(arg)
            handlerReqireCommand('editCommands', arg, message, redis)
          }
          else if (arg === 'setup'){
            const arg = message.content.slice(3).split(' ')[1]
            console.log(arg)
            handlerReqireCommand('setup', arg, message, redis)
          }
          else{
            console.log(arg)
            handlerReqireCommand('adminCommands', arg, message, redis)
          }
          


    }else if(message.content.startsWith('%r')){
        const resComand = await redis.get(`response:${message.channel.id}`);
        if (!resComand || resComand ==''){
            return
        }
      const arg = `${resComand}`
      // agregarle  comando despues del iniciador %r a arg
      

      console.log(arg)
      handlerReqireCommand('setup', arg, message, redis)

    }
    else if (message.content.startsWith('%')){
      const arg = message.content.slice(1).split(' ')[0]
      console.log(arg)
      handlerReqireCommand('commands', arg, message, redis)
    }
    
    

});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const data = await getSimpleRedisJson({
        redis: redis,
        type: 'checkUser:config',
        UID: `${interaction.guild.id}`
    });

    if (data && data.btnId && interaction.customId === data.btnId) {
    console.log('Botón de verificación presionado por', interaction.user.tag);
    console.log('idrol:', data.roleToAssign);
    console.log('data:', data);

        const role = interaction.guild.roles.cache.get(data.roleToAssign);

        if (role) {
            await interaction.member.roles.add(role);

            await interaction.reply({
                content: '¡Verificación exitosa! Ahora tienes acceso al servidor.',
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.reply({
                content: 'Error: El rol de verificación no existe.',
                flags: MessageFlags.Ephemeral
            });
        }
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














