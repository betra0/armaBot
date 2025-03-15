const { EmbedBuilder, Embed, InteractionFlags } = require('discord.js');


const generateMessageEmbed = ({title='ERROR: ', descripcion='Ocurrio in error Inesperado'

}) => {
    return new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle(title)
        .setDescription(descripcion);
}
'No se ha podido obtener la información del servidor.'

module.exports = {
    generateMessageEmbed
}