const {jailRoleId } = require('../config.json');
module.exports = {
    description:'',
    run: async(message)=>{
        const args = message.content.split(' ').slice(1).join(' ')

        message.reply(args)
        const mentionedMember = message.mentions.members.first();
        if (!mentionedMember) {
            return message.reply('Debes mencionar a un usuario para aplicarle el rol de "jail".');
          }
          const member = message.member;
          const guild = message.guild;
          const role = guild.roles.cache.get(jailRoleId); // Obtén el rol del servidor usando su ID
          const timeArg = message.content.split(' ')[2];
          const time = timeArg  ? parseInt(timeArg ) *60 * 1000 :  60 * 1000; 
    
          if (!role) return console.log('El rol especificado no existe.');
    
          await mentionedMember.roles.add(role);
    
          console.log(`Rol "${role.name}" asignado `);
    
    
    
          setTimeout(async () => {
              await mentionedMember.roles.remove(role);
              console.log(`Rol "${role.name}" eliminado de ${mentionedMember.user.tag} después de ${time} ms`);
            }, time);
          
            // Responde al usuario que ejecutó el comando
            const reply = await message.reply(`¡${mentionedMember.user.tag} ha sido encarcelado por ${time / (1000 * 60)} minutos!`);
    
            // Eliminar el mensaje de respuesta después de 5 segundos (5000 milisegundos)
            setTimeout(() => {
              reply.delete();
            }, 5000);
    
            message.delete();
    }
}