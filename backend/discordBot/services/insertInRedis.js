const saveRedisNewMessageSubcription = async ({redis, type='status', gildID, adress, channelID, messageID, seudoTitle=''})=>{
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

const insertAdressTofetcher = async ({adress, redis})=>{
    // Guardar el adres en set sadd
    await redis.sadd(`ipsTofech`, adress)
}

module.exports = {
    saveRedisNewMessageSubcription,
    insertAdressTofetcher
}
