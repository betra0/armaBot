const saveRedisNewMessageSubcription = async ({redis, type='status', gildID, adress, channelID, messageID, seudoTitle=''})=>{
// hay Type status y voicetitle
// primero verificas si ya hay un objeto 
    if (!adress  || !channelID) {
        throw new Error('Missing required parameters: adress or channelID');
    }
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

const insertAdressTofetcher = async ({adress, redis})=>{
    // Guardar el adres en set sadd
    await redis.sadd(`ipsTofech`, adress)
}

const saveInfoAdressinRedis = async ({ adress, infoAdress, redis})=>{
    // guardar la info en adressInfoN
    if (!adress || !infoAdress || !redis) {
        throw new Error('Missing required parameters: adress, infoAdress or redis');
    }
    await redis.hset(`adressInfoN`, adress, JSON.stringify(infoAdress))
}
const saveSimpleRedisJson = async ({ redis, type = 'defectData', UID, json }) => {
  if (!redis) {
    throw new Error('Missing required parameter: redis client');
  }

  if (!UID || !json) {
    throw new Error('Missing required parameters: UID or json');
  }

  await redis.hset(`databot:${type}`, UID, JSON.stringify(json));
};


module.exports = {
    saveRedisNewMessageSubcription,
    insertAdressTofetcher,
    saveSimpleRedisJson,
    saveInfoAdressinRedis
}
