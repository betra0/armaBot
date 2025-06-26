const changeAdressInRedis = async ({redis, oldAdress, newAdress})=>{
    if (!oldAdress || !newAdress) {
            throw new Error('Debes proporcionar oldAdress y newAdress');
        }
    oldAdress = oldAdress.trim();
    newAdress = newAdress.trim();


        const hashKeys = [
            'adressInfo',
            'adress:sub:status',
            'adress:sub:playerCountInTitle'
        ];

        for (const hashKey of hashKeys) {
            const oldValue = await redis.hget(hashKey, oldAdress);
            if (oldValue) {
                await redis.hset(hashKey, newAdress, oldValue);  // Copiar al nuevo
                await redis.hdel(hashKey, oldAdress);             // Borrar el viejo
                console.log(`Migrado ${oldAdress} -> ${newAdress} en ${hashKey}`);
            }
        }

        // Para el set
        const isMember = await redis.sismember('ipsTofech', oldAdress);
        if (isMember) {
            await redis.srem('ipsTofech', oldAdress);
            await redis.sadd('ipsTofech', newAdress);
            console.log(`Migrado ${oldAdress} -> ${newAdress} en ipsTofech`);
        }

        console.log('Actualización completada.');
}


module.exports = {
    changeAdressInRedis
}
