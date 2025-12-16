const { channelLink } = require('discord.js');
const { parseArgs } = require('../utils/parseArgs');

module.exports = {
    description:'Envía un mensaje como si lo enviara el bot, puedes especificar un canal diferente usando el argumento o flag --channel #canal o -c #canal',
    usage: '%s say messageContent, %s say --channel #channel messageContent o %s say -c #channel messageContent',
    run: async (message) => {
        let args = parseArgs(message.content);
        args = args.slice(2); // eliminar el primer y segundo elemento que es el activador del comando y el comando 'say'
        let channel = message.channel; // Por defecto, se utilizará el canal actual
        let messageContent = '';
        console.log('este es el args: ', args)
        let inputChannel = null
        const channelIndex = args.findIndex(arg => arg === '--channel' || arg === '-c');
        console.log(channelIndex, args[channelIndex])
        if (channelIndex !== -1 && channelIndex < args.length - 1) {
            inputChannel = args[channelIndex + 1];
            args.splice(channelIndex, 2);
        }

        messageContent = args.join(' ');

        if (inputChannel && inputChannel.startsWith('<#') && inputChannel.endsWith('>')) {
            const channelId = inputChannel.slice(2, -1);
            // Buscar el canal por su ID
            channel = message.guild.channels.cache.get(channelId) ?? await message.guild.channels.fetch(channelId).catch(() => null);
        } else if(inputChannel){
            //  buscar el canal por su nombre
            channel = message.guild.channels.cache.find(channel => channel.name === inputChannel) ?? null;
        }
        if (inputChannel && !channel) {
            return message.reply(`No se encontró el canal ${inputChannel}.`);
        }
  /*       if (!channel.permissionsFor(message.author).has('SEND_MESSAGES')) {
            return message.reply('No tienes permiso para enviar mensajes en ese canal.');
        } */ // Descometar un ves Arreglen esta lineas Que no funcionan
        if(!inputChannel){
            message.delete()
        }

        channel.send(messageContent)


    }
}