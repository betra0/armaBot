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

const saveRedisNewMessageSubcription = async ({ type='rankingDonations', gildID, clanTag, channelID, messageID})=>{
// hay Type rankingDonations y lastLogsDonations
// primero verificas si ya hay un objeto 
    let clanSubcriptionObject = await redis.hget(`Clanes:subcripcion:${type}`, clanTag)
    clanSubcriptionObject= clanSubcriptionObject ? JSON.parse(clanSubcriptionObject) : {}

    if (!clanSubcriptionObject[channelID]){
        clanSubcriptionObject[channelID] = {}
    }
    clanSubcriptionObject[channelID] = {
        gildID: gildID,
        messageID: messageID,
        channelID: channelID
    }

    // Guardar el objeto en redis
    await redis.hset(`Clanes:subcripcion:${type}`, clanTag, JSON.stringify(clanSubcriptionObject))

}
const getListRedisClanSubcription = async ({type='rankingDonations', clanTag=null, valueClan=null })=>{
    if (!clanTag && !valueClan){
        throw new Error('No se han proporcionado los datos necesarios.');
    } else if(!valueClan){
        valueClan = await redis.hget(`Clanes:subcripcion:${type}`, clanTag)
    }
    const clanData= valueClan ? JSON.parse(valueClan) : {}
    // retornar una lista de objetos
    return Object.values(clanData)
    
}

const donationsRankingTask = async () => {
    const typesList = ['rankingDonations', 'lastLogsDonations']
    for (const type of typesList){
        clansData = await redis.hgetall(`Clanes:subcripcion:${type}`)

        for (const clanTag in clansData){

            const URL = `http://${process.env.APIHOST}:${process.env.APIPORT}/members`
            console.log(URL)
            let response;
            try {
                response = await axios.get(URL);
                if (response.status !== 200 || !response.data) {
                    throw new Error('Respuesta inválida de la API');
                }
            } catch (err) {
                console.error('Error al obtener los miembros del clan de la api:','ClanTag: ',clanTag , 'error:', err);
            }
            try {
                const members = response.data.members;
                // doantionLogs is a list or array
                const donationLogs = response.data.donationLogs;

                const newMessage ={
                    content: '',
                    embeds: []
                }
                if(type === 'rankingDonations'){
                    // generar el mensaje del ranking de donaciones
                    newMessage.content = generateStrRankingDonacionesTotales(members);
                }else if(type === 'lastLogsDonations'){
                    //generar Mensajes de los registros de donaciones
                   newMessage.embeds = generateEmbedsLogs({membersDict: members, logsDonationList: donationLogs})
                }
                // Obtener la lista de subcripciones del clan
                const clanSubcriptionList = await getListRedisClanSubcription({ clanTag, valueClan: clansData[clanTag] })
                    for (const clanSubcription of clanSubcriptionList){
                        const {channelID, messageID} = clanSubcription
                        await findAndEditMessageText(client, channelID, messageID, newMessage);
                    }


            }catch (err) {
                console.error('Error En el Transacion de enviaro editar mensajes', err);
            }

        }
    }



};



const generateEmbedsLogs = ({membersDict={}, logsDonationList={}})=>{
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
}
const generateStrRankingDonacionesTotales = (members) => {
    // Ordenar los miembros por 'accumulatedDonations' en orden descendente
    const sortedMembers = Object.values(members).sort((a, b) => b.accumulatedDonations - a.accumulatedDonations);
    // Construir el mensaje con hora y dia 
    let newMessage = `   ≫ ───────≪•◦Última actualización: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} UTC ◦•≫ ─────── ≪\n`;
    newMessage += '**                               ≫ Ranking de donaciones del clan ≪:**\n';
    let i = 1;
    for (const member of sortedMembers) {
        if (member.accumulatedDonations === 0) break;
        newMessage += `•◦ ${i} •◦ ★ ${member.username}  Donaciones: ${member.accumulatedDonations}\n`;
        i++;
    }
    newMessage += '   ≫ ─────── ≪•◦ ❈ ◦•≫ ─────── ≪'
    
    if (newMessage.length > 2000) {
        newMessage = newMessage.slice(-1999); // Mantener los últimos 2000 caracteres
      }
    return newMessage;
}



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
    saveRedisNewMessageSubcription({type:'rankingDonations', gildID:'1327408280217059444', clanTag:'Q8J9J8', channelID:'1326100799800999939', messageID:'1326102556979499074'})
    saveRedisNewMessageSubcription({type:'rankingDonations', gildID:'1327408280217059444', clanTag:'Q8J9J8', channelID:'1334621620047974534', messageID:'1334621692906967123'})
    saveRedisNewMessageSubcription({type:'lastLogsDonations', gildID:'1327408280217059444', clanTag:'Q8J9J8', channelID:'1334634919187447902', messageID:'1334634949822779434'})


    // Espera 10 segundos antes de ejecutar por primera vez
    setTimeout(() => {
        donationsRankingTask(); 

        // Programa la ejecución repetitiva cada 2 minutos (120,000 ms)
        setInterval(donationsRankingTask, 1000 * 60 * 1,5);
    }, 4000); 
   

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


client.on('interactionCreate', async (interaction) => {
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
});

client.login(token); 