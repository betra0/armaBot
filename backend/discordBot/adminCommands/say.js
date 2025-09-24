const { channelLink } = require('discord.js');

module.exports = {
    description:'para poder mandar msg como si fues el bot',
    run: async (message) => {
        const args = message.content.split(' ');
        let channelName = message.channel; // Por defecto, se utilizará el canal actual
        let isNewChannel = false
        let messageContent = '';
        console.log('este es el args: ', args)
        const channelIndex = args.indexOf('-channel');
        console.log(channelIndex, args[channelIndex])
        if (channelIndex !== -1 && channelIndex < args.length - 1) {
            isNewChannel = true
            channelName = args[channelIndex + 1];
            args.splice(channelIndex, 2);
        }

        messageContent = args.slice(1).join(' ');

        if (isNewChannel && channelName.startsWith('<#') && channelName.endsWith('>')) {
            const channelId = channelName.slice(2, -1);
            // Buscar el canal por su ID
            channelName = message.guild.channels.cache.get(channelId);
        } else if(isNewChannel){
            //  buscar el canal por su nombre
            channelName = message.guild.channels.cache.find(channel => channel.name === channelName);
        }
        if (isNewChannel && !channelName) {
            return message.reply(`No se encontró un canal con el nombre ${channelName}.`);
        }
  /*       if (!channelName.permissionsFor(message.author).has('SEND_MESSAGES')) {
            return message.reply('No tienes permiso para enviar mensajes en ese canal.');
        } */ // Descometar un ves Arreglen esta lineas Que no funcionan
        if(!isNewChannel){
            message.delete()
        }

        channelName.send(messageContent)
        /* channelName.createWebhook({
            name: 'Snek',
            avatar: 'https://i.imgur.com/mI8XcpG.jpg',
            reason: 'Needed a cool new Webhook'
          })
            .then(webhook => {
                // Enviar el mensaje a través del webhook
                webhook.send(messageContent);
            })
            .catch(console.error); */

    }
}