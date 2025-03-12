const {Client, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Embed, InteractionFlags } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const findAndEditMessageText = require('./services/findAndEditMessageText');
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

const saveRedisNewMessageSubcription = async ({ type='status', gildID, adress, channelID, messageID})=>{
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
        channelID: channelID
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
const getDictRedisIpSubcription = async ({type='status', adress=null })=>{
    if (!adress){
        throw new Error('No se han proporcionado los datos necesarios.');
    }
    const subAdress = await redis.hget(`adress:sub:${type}`, adress)
    return subAdress ? JSON.parse(subAdress) : {}
}





/* const generateEmbedsLogs = ({membersDict={}, logsDonationList={}})=>{
    const MAX_LOGS = 9;
    if (!membersDict || !logsDonationList) throw new Error('No se han proporcionado los datos necesarios.');
    const donationLogs = [...logsDonationList];
    // Verifica si el array supera el límite
    if (donationLogs.length > MAX_LOGS) {
      // Elimina los elementos más antiguos (los primeros)
      donationLogs.splice(-1 * (donationLogs.length - MAX_LOGS));
    }
    let embeds = []
    const TitleEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`≫ ───────≪•◦Registro donaciones del clan•◦≫ ───────≪`)
        .setDescription('Este es el registro de las ultimas donaciones del clan')
        .setTimestamp()
    embeds.push(TitleEmbed)

    let n=1
    for (const log of donationLogs.reverse()){
        let embed=generateRegister({ members:membersDict, NRegistro: n, logMembers: log.members });
        if (embed)
            embeds.push(embed)
            n++

    }
    return embeds
} */




const exampleTask = async () => {
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



}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    //guardar en redis el mensaje de subcripcion para testear 
    saveRedisNewMessageSubcription({type:'status', gildID:'1349159517270708356', adress:'104.234.7.8:2363', channelID:'1349159517971021928', messageID:'1349161450349789186'})
    // suscribire a un canal en redis 
    subscriber.subscribe('adressChangeInfo', (err, count) => {
        if (err) {
          console.error('Error al suscribirse a subscriber:', err);
        } else {
          console.log(`Suscrito a ${count} canal(es) en subscriber.`);
        }
    });
    
    subscriber.on('message', async (channel, message) => {
        console.log(`Mensaje recibido en el canal ${channel}: ${message}`);
        if (channel === 'adressChangeInfo') {
            console.log('Mensaje de cambio de ip recibido:', message);
            const ip = message;
            const listValuesSub = await getListRedisIpSubcription({type:'status', adress:ip})
            console.log(listValuesSub)
            for (const valuesSub of listValuesSub){
                if (valuesSub.channelID && valuesSub.messageID){
                    await findAndEditMessageText(
                        client, 
                        valuesSub.channelID, 
                        valuesSub.messageID, 
                        {content: `La ip ${ip} ha cambiado de estado`}
                    )
                }
            }
        }
    
    });





    // Espera 10 segundos antes de ejecutar por primera vez
    /* setTimeout(() => {
        donationsRankingTask(); 

        // Programa la ejecución repetitiva cada 2 minutos (120,000 ms)
        setInterval(donationsRankingTask, 1000 * 60 * 1,5);
    }, 4000); 
    */

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