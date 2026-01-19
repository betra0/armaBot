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
const saveSimpleRedisJson = async ({ redis, type = 'defectData', UID, json, TTL= null }) => {
	if (!redis) {
    	throw new Error('Missing required parameter: redis client');
  	}

  	if (!UID || !json) {
    	throw new Error('Missing required parameters: UID or json');
  	}

  	await redis.hset(`databot:${type}`, UID, JSON.stringify(json));
	if (TTL) {
    	// EX = segundos
    	await redis.call(
        	'HEXPIRE',
        	`databot:${type}`, // la key hash
        	TTL,
        	'FIELDS',          // literal obligatorio
        	UID                // el field específico
    	);
  	}
};
const saveRedisJsonTTL = async ({
  redis,
  key,
  json,
  TTL = null
}) => {
  if (!redis) throw new Error('Missing redis client');
  if (!key || !json) throw new Error('Missing key or json');

  const value = JSON.stringify(json);

  if (TTL) {
    await redis.set(key, value, 'EX', TTL);
  } else {
    await redis.set(key, value);
  }
};


module.exports = {
    saveRedisNewMessageSubcription,
    insertAdressTofetcher,
    saveSimpleRedisJson,
    saveInfoAdressinRedis,
    saveRedisJsonTTL
}
