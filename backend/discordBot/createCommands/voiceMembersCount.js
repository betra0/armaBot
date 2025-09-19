const { saveRedisNewMessageSubcription, insertAdressTofetcher, saveSimpleRedisJson } = require('../services/insertInRedis');

const { getInfoAdressForRedis } = require('../services/getFromRedis');
const { parseArgs } = require('../utils/parseArgs');
const { ChannelType, PermissionsBitField } = require('discord.js');






module.exports = {
    description:'crear en el servidor un canal de voz que actualize su titulo con la cantidad de miembros en el discord',
    usage: 'VoiceMembersCount ',
    run: async (message, redis) => {
        const args = parseArgs(message.content);

        let voiceChannelArg 
        let voiceChannelId = null; // Inicializar como null

        const guildID = message.guild.id
        const guild = message.guild;

        const memberCount = guild.memberCount;
        console.log(`Miembros totales: ${memberCount}`);

        console.log('este es el args: ', args)
        
        // crear un canal de Voz visible para todos pero sin permisos psara conectarse 
        const channel = await guild.channels.create({
          name: 'Miembros: ' + memberCount,
          type: ChannelType.GuildVoice,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,      
              allow: [PermissionsBitField.Flags.ViewChannel],  // que lo vean
              deny: [PermissionsBitField.Flags.Connect],       // que no puedan entrar
            },
          ],
            
        }); 
        console.log('canal creado')
        voiceChannelId = channel.id; // Asignar el ID del canal creado



        const content= `** Creando** ...`
        try {    
            const mensaje = await message.reply(content);
            console.log('parametros para redis: ', );
            
        
            await saveSimpleRedisJson(
              {redis, type:'voiceMembersCount', UID:`${guildID}`, json:{
                guildID: guildID,
                channelID: voiceChannelId,
                memberCount: memberCount,
                }
              }
            )
            console.log('guardado en redis')

            return mensaje.edit(`Canal de voz creado con exito, se actualizara cada ves que un usuario entre o salga del servidor. <#${voiceChannelId}>`);
            





        } catch (error) {
            console.log(error)
            return message.reply(`Hubo un error: \`\`\`${error.stack}\`\`\``);
        }


    }
}

