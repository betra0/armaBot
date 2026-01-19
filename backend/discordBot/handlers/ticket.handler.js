const { ChannelType, PermissionsBitField, CategoryChannel } = require('discord.js');
const { getSimpleRedisJson } = require('../services/getFromRedis');


async function ticketHandler(interaction, client, redis) {

    const prefixLog = `[interactionCreate-TicketHandler] `;

    const args = interaction.customId.split(':');
    const type = args[1];
    // estructura de ticket postulacion(application) : ticket:apply:action:applyId
    if (type === 'apply') {
        const action = args[2]; // create, close, claim, approve, reject
        const applyId = args[3];
        const guildId = interaction.guildId;
        const configApply = await getSimpleRedisJson({ redis, type: `ticket:apply:${guildId}`, UID: applyId });
        if (!configApply) return
        
        
        if (action === 'create') {
            await createTicketApplication(interaction, client, redis, configApply);

        }
        else if (action === 'close') {
            
        }
        else if (action === 'claim') {
            
        }
        else if (action === 'approve') {
            
        }
        else if (action === 'reject') {
            
        }
    }



    return 

}
module.exports = { ticketHandler };

async function createTicketApplication(interaction, client, redis, configApply) {
    // lógica para crear ticket de aplicación
    const permisos = [
            {
                id: interaction.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            },
        ]
    if(configApply.staffAurthorityRoles && Array.isArray (configApply.staffAurthorityRoles)){
        configApply.staffAurthorityRoles.forEach(roleId => {
            permisos.push({
                id: roleId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages],
            });
        });
    }
    const newTicketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: configApply.categoryId || null,
        permissionOverwrites: permisos,
    });
    const mainEmbedMessage = await newTicketChannel.send({
        content: `Hola <@${interaction.user.id}>, gracias por crear un ticket de aplicación. Por favor, espera a que el staff revise tu solicitud.`,
    });
    await interaction.reply({ content: `Tu ticket de aplicación ha sido creado: <#${newTicketChannel.id}>`, ephemeral: true });

    


}