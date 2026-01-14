const {Client, Events  } = require('discord.js');
const fs = require('fs');
const path = require('path');

const Redis = require('ioredis');
require('dotenv').config({ path: '../../.env' });


const { reloadStatusCraftyTask } = require('./task/reloadStatusCrafty');
const { retryEditChannelTitle } = require('./services/channelTitleRetry');
const { initRedisSubscriber } = require('./redis/subscriber');






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
// funcion que itera las carpetas de comandos [capeta, carpeta2, ...] y busca los comandos, 




client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    initRedisSubscriber(subscriber, redis, client);
});


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









