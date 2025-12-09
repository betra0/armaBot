module.exports = {
    description:'para poder mandar msg como si fues el bot',
    run: async (message) => {
        const args = message.content.split(' ');
        args.shift(); // eliminar el primer elemento que es el activador del comando
        let channelName = message.channel; // Por defecto, se utilizará el canal actual
        let isNewChannel = false
        let messageContent = '';
        let avatarURL = message.author.displayAvatarURL({ dynamic: true })
        let nickname =  message.author.displayName ;
        console.log('este es el args: ', args)
        const channelIndex = args.indexOf('-channel');
        if (channelIndex !== -1 && channelIndex < args.length - 1) {
            isNewChannel = true
            channelName = args[channelIndex + 1];
            args.splice(channelIndex, 2);
        }
        messageContent = args.slice(1).join(' ');
        const firstMention = message.mentions.users.first();
            
            if (firstMention) {
                avatarURL = firstMention.displayAvatarURL({ dynamic: true });
                nickname = firstMention.displayName      
                const server = message.guild;
                if (server) {
                    const member = server.members.cache.get(firstMention.id); // Obtener el miembro del servidor
                    if (member && member.nickname) {
                        nickname = member.nickname;
                    }
                }
                messageContent=messageContent.replace(`<@${firstMention.id}>`, "").trim();
            }
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
        //if (!channelName.permissionsFor(message.author).has('SEND_MESSAGES')) {
        //    return message.reply('No tienes permiso para enviar mensajes en ese canal.');
        //}
        if(!isNewChannel){
            message.delete()
        }
        channelName.createWebhook({
            name: nickname,
            avatar: avatarURL,
            reason: 'Needed a cool new Webhook'
          })
            .then(webhook => {
                // Enviar el mensaje a través del webhook
                webhook.send(messageContent);
            })
            .catch(console.error);

    }
}