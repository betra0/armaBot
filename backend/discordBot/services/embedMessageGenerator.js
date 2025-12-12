const { EmbedBuilder, Embed, InteractionFlags } = require('discord.js');


const generateMessageEmbed = ({title='ERROR: ', descripcion='Ocurrio in error Inesperado', color='#ff0000'

}) => {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(descripcion);
}
'No se ha podido obtener la información del servidor.'

module.exports = {
    generateMessageEmbed
}