const { retryEditChannelTitle } = require("../services/channelTitleRetry");
const { getSimpleRedisJson } = require("../services/getFromRedis");



function titleMembersCount({ guild }){
    const memberCount = guild.memberCount;
    console.log(`Miembros totales obtenidos: ${memberCount}`);
    return `Miembros: ${memberCount}`
}
async function changeAmountMembers(member, redis, client){
    if (!member?.guild) return;

    const guild = member.guild;
    const data = await getSimpleRedisJson({ redis: redis, type: 'voiceMembersCount', UID: `${guild.id}` })
    if (data && data.channelID){
        try{
            await retryEditChannelTitle({
                channelID: data.channelID,
                redisClient: redis,
                attempt: 1,
                maxAttempts: 3,
                titletextFunc: async ()=> titleMembersCount({ guild: member.guild }),
                client: client
            });
        }catch(e){
            console.log('error al cambiar el nombre del canal de miembros', e)
        }
        
    }

}

module.exports = { changeAmountMembers };