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

const GenerateEmbedStatusServer = ({infoAdress=null, seudoTitle='No definido'}) => {
    console.log('infoAdress dentro de Gener..EbedStatus: ', infoAdress)
    const allEbeds = []
    if (!infoAdress){
         return [generateMessageEmbed({title:'Warning', descripcion:'No se a encontrado Informacion del servidor aun.'}),]
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
    .setImage('https://cdn.discordapp.com/attachments/1349294304455163938/1349294670806646824/36636746158cb38795e0eb6cdde17624d7183ed4.png?ex=67d29416&is=67d14296&hm=fc441b5728558c3286e726cd3c2acb336a2a65ba4b00f131673213df7bf924fb&')
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
                name: `${infoAdress.players[i].name}`,
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