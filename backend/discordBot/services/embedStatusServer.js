const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Embed, InteractionFlags } = require('discord.js');
const { generateMessageEmbed } = require('./embedMessageGenerator');

const GenerateEmbedStatusServer = ({ infoAdress = {}, seudoTitle = '' }) => {
    const allEbeds = [];
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`≫ ${seudoTitle} ≪`)
        .setDescription(`${infoAdress.serverName ?? 'Desconocido'}`)
        .addFields(
            { name: 'Modo', value: `${infoAdress.game ?? 'Desconocido'}`, inline: true },
            { name: 'Mapa', value: `${infoAdress.mapName ?? 'Desconocido'}`, inline: true },
            { name: 'Jugadores', value: `${infoAdress.playerCount ?? 0}/${infoAdress.maxPlayers ?? 0}`, inline: true },
            { name: 'Contraseña:', value: `${infoAdress.passwordProtected ? 'Sí' : 'No'}`, inline: true },
            { name: 'Versión', value: `${infoAdress.version ?? 'Desconocido'}`, inline: true },
            { name: 'SteamId', value: `${infoAdress.steamId ?? 'Desconocido'}`, inline: true },
        )
        .setImage('https://cdn.discordapp.com/attachments/1349294304455163938/1349294670806646824/36636746158cb38795e0eb6cdde17624d7183ed4.png?ex=67d29416&is=67d14296&hm=fc441b5728558c3286e726cd3c2acb336a2a65ba4b00f131673213df7bf924fb&')
        .setTimestamp();

    allEbeds.push(embed);
    console.log('status info antes de if; ', infoAdress.status);

    // Si el estado es falso, agrega un embed de error
    if (infoAdress.status === false) {
        console.log('status false');
        allEbeds.push(generateMessageEmbed({
            title: 'Error',
            descripcion: 'El servidor se encuentra cerrado o no se ha podido obtener la información.'
        }));
    }

    if ((infoAdress.playerCount ?? 0) > 0 && Array.isArray(infoAdress.players)) {
        let fieldsPlayers = [];
        const maxFields = 25; // Límite de Discord

        for (let i = 0; i < Math.min(infoAdress.players.length, maxFields); i++) {
            fieldsPlayers.push({
                name: `${infoAdress.players[i]?.name ?? 'Desconocido'}`,
                value: `${Number(infoAdress.players[i]?.score ?? 0) * 100} Puntos`,
                inline: true
            });
        }

        const embed2 = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Jugadores ${infoAdress.playerCount ?? 0}/${infoAdress.maxPlayers ?? 0}`)
            .addFields(fieldsPlayers);

        allEbeds.push(embed2);
    }

    return allEbeds;
};


module.exports = {
    GenerateEmbedStatusServer
}