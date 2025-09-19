const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Embed, InteractionFlags } = require('discord.js');
const { generateMessageEmbed } = require('./embedMessageGenerator');
const safeValue = (value, defaultValue = 'Desconocido') => {
    // Si el valor es null o undefined, devolver el valor por defecto
    if (value == null) {
        return defaultValue;
    }

    // Si no es una cadena, convertirlo a cadena
    if (typeof value !== 'string') {
        value = String(value);
    }

    // Si la cadena no está vacía o solo contiene espacios en blanco, devolver el valor
    if (value.trim()) {
        return value;
    }

    // Si no cumple, devolver el valor por defecto
    return defaultValue;
};
async function checkImageExists(url) {
    //verificar que es una url str 
    if (typeof url !== 'string' || url.trim() === '') {
        return false
    }
  try {
    const res = await fetch(url, { method: "HEAD" })
    if (!res.ok) return false
    const type = res.headers.get("content-type")
    return type && type.startsWith("image/")
  } catch (err) {
    return false
  }
}

const  GenerateEmbedStatusServer = async ({infoAdress=null, seudoTitle='No definido'}) => {
    console.log('infoAdress dentro de Gener..EbedStatus: ', infoAdress)
    const allEbeds = []
    if (!infoAdress){
         return [generateMessageEmbed({title:'Warning', descripcion:'No se a encontrado Informacion del servidor aun.'}),]
    }
    //elegir la img a usar 
    let imgToUse = 'https://cdn.discordapp.com/attachments/1417387761501208656/1417387791846998086/image.png?ex=68ca4cbf&is=68c8fb3f&hm=e7fa9ab0901c3deb30f3b4cc88f1d20ea13ee7217268c6bbabef1bb7e054c546&'
    // si hay imgs en la info usar una de ellas dew forma aleatoria
    if (infoAdress.imgs && Array.isArray(infoAdress.imgs) && infoAdress.imgs.length > 0) {
        // seleccionar una img aleatoria
        let intent =0
        let indexRotos = []
        while (intent < 15){
            const randomIndex = Math.floor(Math.random() * infoAdress.imgs.length);
            const randomImg = infoAdress.imgs[randomIndex];
            if (indexRotos.includes(randomIndex)){
                intent +=1
                continue
            }
            // comprobar que la img existe
            if (randomImg && await checkImageExists(randomImg)){
                imgToUse = randomImg
                break
            }
            indexRotos.push(randomIndex)
            
            // si no existe intentar con otra img
            if (indexRotos.length >= infoAdress.imgs.length){
                // si ya se han probado todas las imgs salir del bucle
                break
            }
            intent +=1
        }
    }
    console.log('antes del primer embed')
    const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`≫ ${seudoTitle} ≪`)
    .setDescription(`${infoAdress.serverName}`)
    .addFields(
        { name: 'Modo', value: `${safeValue(infoAdress.game)}`, inline: true },
        { name: 'Mapa', value: `${safeValue(infoAdress.mapName)}`, inline: true },
        { name: 'Jugadores', value: `${safeValue(infoAdress.playerCount)}/${safeValue(infoAdress.maxPlayers)}`, inline: true },
        { name: 'Contraseña:', value: `${safeValue(infoAdress.passwordProtected ? 'Sí' : 'No')}`, inline: true },
        { name: 'Versión', value: `${safeValue(infoAdress.version)}`, inline: true },
        { name: 'SteamId', value: `${safeValue(infoAdress.steamId)}`, inline: true },
        { name: 'IP', value: `${safeValue(infoAdress.adress)}`, inline: true },
        { name: 'Puerto', value: `${safeValue(infoAdress.port)}`, inline: true },
            
        
    )
    .setImage(imgToUse)
    .setTimestamp();
    allEbeds.push(embed)
    // si el status es false se agrega un embed de error
    if(infoAdress.status == false){
        console.log('status false')
        allEbeds.push(generateMessageEmbed({title:'Error', descripcion:'El servidor se encuentra cerrado o no se ha podido obtener la información.'}))
    }

    if (infoAdress.playerCount > 0 && infoAdress.players) {
        let fieldsPlayers = [];
        const maxFields = 25; // Límite de Discord
    
        for (let i = 0; i < Math.min(infoAdress.players.length, maxFields); i++) {
            fieldsPlayers.push({
                name: `${safeValue(infoAdress.players[i].name)}`,
                value: `${Number(infoAdress.players[i].score) * 100} Puntos`,
                inline: true
            });
        }
    
        const embed2 = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Jugadores ${infoAdress.playerCount}/${infoAdress.maxPlayers}`)
            .addFields(fieldsPlayers);
    
        allEbeds.push(embed2);
    }
    return allEbeds
}


module.exports = {
    GenerateEmbedStatusServer
}