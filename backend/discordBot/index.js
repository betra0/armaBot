const {Client, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Embed, InteractionFlags, PermissionsBitField, InteractionReplyOptions, MessageFlags  } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { findAndEditMessageText, findAndEditChannelName } = require('./services/findAndEditMessageText');

const Redis = require('ioredis');
require('dotenv').config({ path: '../../.env' });

const { getListRedisIpSubcription, getInfoAdressForRedis, getSimpleRedisJson } = require('./services/getFromRedis');
const { GenerateEmbedStatusServer } = require('./services/embedStatusServer');
const { generateMessageEmbed } = require('./services/embedMessageGenerator');
const { reloadStatusCraftyTask } = require('./task/reloadStatusCrafty');






console.log('este es el Redis host y port \n ', process.env.REDISHOST, process.env.REDISPORT)

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
let redis 
let subscriber
const traslatecommands = {
    'createCommands': '%s create',
    'editCommands': '%s edit',
    'setup': '%s setup',
    'adminCommands': '%s',
    'commands': '%'
}


const client = new Client({
    intents:process.env.INTENTSDS
});
const token = process.env.BOTDSTOKEN
// funcion que itera las carpetas de comandos [capeta, carpeta2, ...] y busca los comandos, 
async function scanFoldersCommands(carpetasarray){
    const embeds = []
    embeds.push(generateMessageEmbed(
        {
            title: 'Lista de Comandos Disponibles',
            descripcion: `Aquí tienes la lista de comandos disponibles según el tipo que hayas consultado. Los comandos que aparecen como \`%s comando\` son **solo para administradores**, mientras que los comandos con \`%comando\` son libres para cualquier usuario. Usa '--help' después de un comando para ver más detalles.`,
            color: '#0099ff',
        }
    ));
    const colors = ['#ff9900', '#33cc33', '#ff3333', '#9933ff', '#00cc99'];

    for (let i = 0; i < carpetasarray.length; i++) {
        const carpeta = carpetasarray[i];
        const fields = [];
        const files = fs.readdirSync(`./${carpeta}`);
        for (const file of files) {
            const { title, usage, description } = callHelpCommand(carpeta, file);

            const safeUsage = usage?.trim() || 'No definido';
            const safeDescription = description?.trim() || 'Sin descripción';

            fields.push({
                name: `**${title}**` || 'Comando sin nombre',
                value: `**Uso:** ${safeUsage}\n**Descripción:** ${safeDescription}`,
                inline: false
            });
        }
        const color = colors[i % colors.length];
        embeds.push(new EmbedBuilder()
            .setColor(color)
            .setTitle(`Comandos en ${carpeta}`)
            .setDescription(`Comandos disponibles con ${traslatecommands[carpeta]}`)
            .addFields(fields)
        );
    }
    return { embeds };
}
function callHelpCommand(folder, file){
    let title = "";
    let usage = "";
    let description = "";

    try {
        const command = require(`./${folder}/${file}`);

        title = command.name ?? file.replace('.js', '');
        usage = command.usage || '';
        description = command.description || '';

    } catch (e) {
        console.error('Error cargando el comando:', e);
    }

    return { title, usage, description };
}


const handlerReqireCommand = async (carpeta, arg, message, redis)=>{
  try{
    console.log(`log desde handlerReqireCommand: carpeta: ${carpeta}, arg: ${arg}`)
    if (arg==='--help'){
        //  llamar a una funcion que busque en [carpeta] yy esta funcion llame a usage de cada comando y lo muestre en un embed
        const {embeds} = await scanFoldersCommands([carpeta])
        return message.reply({embeds: embeds});

    }
    const command = require(`./${carpeta}/${arg}`)
    command.run(message, redis)
  }catch(e){
    console.log(e)
  }

}




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
            if (!listValuesSub || listValuesSub.length === 0){
                return
            }   
            //buscar la info 
            const infoAdress = await getInfoAdressForRedis({ adress: ip, redis: redis });
            if (!infoAdress){
                return
            }
            for (const valuesSub of listValuesSub){
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
            console.log(`Se alcanzó el número máximo de intentos para el canal ${channelID} u otro error, abortando.`, attempt,'/' ,maxAttempts);
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

// Cargar Eventos 

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client , redis));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client , redis));
    }
}

// fin 

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
            else if (arg === '--help'){
              //  llamar a una funcion que busque en [adminCommands, createCommands, editCommands, setup] yy esta funcion llame a otra funcion que llame a usage de cada comando y lo muestre en un embed
                const {embeds} = await scanFoldersCommands(['adminCommands', 'createCommands', 'editCommands', 'setup'])
                return message.reply({embeds: embeds});
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
      
      

      console.log(arg)
      handlerReqireCommand('setup', arg, message, redis)

    }
    else if (message.content.startsWith('%')){
      const arg = message.content.slice(1).split(' ')[0]
      console.log(arg)
      handlerReqireCommand('commands', arg, message, redis)
    }
    
    

});




//tasks
async function startReloadLoop() {
    while(true) {
        try {
            await reloadStatusCraftyTask(client, redis);
        } catch (e) {
            console.error('Error en reloadStatusCraftyTask:', e);
        }
        await sleep(1000 * 60 * 2); // 3 minutos
    }
}





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
    await client.login(token);

    startReloadLoop();

}

ejecutar();









