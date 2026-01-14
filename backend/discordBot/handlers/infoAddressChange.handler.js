const { retryEditChannelTitle } = require('../services/channelTitleRetry');
const { GenerateEmbedStatusServer } = require('../services/embedStatusServer');
const { findAndEditMessageText } = require('../services/findAndEditMessageText');
const { getInfoAdressForRedis, getListRedisIpSubcription } = require('../services/getFromRedis');


async function changeInfoGameServerHandler(channel, message, redis, client) 
{ 
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
                titletextFunc: async ()=> await titleTextGameServer({ adress: ip, redisClient: redis, seudoTitle: valuesSub.seudoTitle }),
                client: client
            });
            
                
            
            
        }
    }
            
} 


async function titleTextGameServer({ adress, redisClient, seudoTitle }){
    const infoAdress = await getInfoAdressForRedis({ adress: adress, redis: redisClient });
    if (!infoAdress){
        throw new Error('No infoAdress');
    }
    let text = infoAdress.status == false ? '| CLOSED' : `| ${infoAdress.playerCount}/${infoAdress.maxPlayers}`
    return `🎮 ${seudoTitle} ${text} 👥`
}

module.exports = { changeInfoGameServerHandler };