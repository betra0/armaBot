const { EmbedBuilder, Embed, InteractionFlags } = require('discord.js');


const generateMessageEmbed = ({title='ERROR: ', descripcion='Ocurrio in error Inesperado', color='#ff0000', imgUrl=null

}) => {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(descripcion)
        .setImage(imgUrl);
}
'No se ha podido obtener la información del servidor.'

module.exports = {
    generateMessageEmbed
}