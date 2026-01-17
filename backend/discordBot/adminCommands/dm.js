const { channelLink } = require('discord.js');
const { parseArgs } = require('../utils/parseArgs');


module.exports = {
    description:'Envía un mensaje directo como si lo enviara el bot. Opcional: -b para borrar el mensaje original.',
    usage: '%s dm [id o nombreUnico] "mensaje" -b""',
    run: async (message, redis) => {
        const args = parseArgs(message.content);
        console.log('este es el args, dentro9 de comando: ', args)
        // buscar -b en args
        const borrarOriginal = args.includes('-b');
        if(borrarOriginal){
            // eliminar -b de args
            const index = args.indexOf('-b');
            if (index > -1) {
              args.splice(index, 1);
            }
        }
        const datoUser = args[2];
        const userText = args[3] || '';

        const dmMessage = `⚠️ **Aviso de moderación** ⚠️

${userText}

\`\`\`md
⚠️ Mensaje generado por el sistema de moderación.
Las respuestas directas a este mensaje no serán vistas por nadie.

Para comunicarte con alguien del staff, debes **abrir un ticket en ${message.guild.name}**.  
Todos los mensajes enviados por este canal son automáticos y **responder aquí no funcionará**.
\`\`\``;

        if (!datoUser || !dmMessage) {
            return message.reply('Uso incorrecto. Ejemplo: saydm 123456789012345678 "Hola, este es un mensaje de prueba."');
        }
        let user = null;

        // determinar si datoUser en un id formado por solo digitos

       

        try {
            if (!/^\d+$/.test(datoUser)) {
                // Si no es un ID válido, buscar por nombre de usuario único
                const foundUser = message.guild?.members.cache.find(
                      m => m.user.username === datoUser || m.user.tag === datoUser
                    )?.user;
                if (foundUser) {
                    user = foundUser;
                }
            }else{
                // Si es un ID válido, usarlo directamente
                user = await message.client.users.fetch(datoUser);
            }
            if (!user) {
                return message.reply('No se pudo encontrar al usuario con ese ID.');
            }

            await user.send(dmMessage);
            await message.reply('Mensaje enviado correctamente a ' + user.tag);
            console.log('Mensaje DM enviado a:', user.tag);


        } catch (error) {
            console.error('Error al enviar el mensaje DM:', error);
            return message.reply('Hubo un error al intentar enviar el mensaje DM. Asegúrate de que el ID sea correcto y que el bot tenga permiso para enviar DMs.');
        }

        try {
            if(borrarOriginal){
                await message.delete();
            }
        } catch (error) {
            console.error('Error al borrar el mensaje original:', error);
        }

        




    }
}