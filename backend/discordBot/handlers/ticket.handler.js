const { ChannelType, PermissionsBitField, CategoryChannel, embedLength, EmbedBuilder } = require('discord.js');
const { getSimpleRedisJson } = require('../services/getFromRedis');
const { saveSimpleRedisJson } = require('../services/insertInRedis');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');




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
            await closeTicketApplication(interaction, client, redis, configApply);
            
        }
        else if (action === 'claim') {
            await claimTicketApplication(interaction, client, redis, configApply);
            
        }
        else if (action === 'approve') {
            await approveTicketApplication(interaction, client, redis, configApply);
        }
        else if (action === 'reject') {
            
        }
    }



    return 

}
module.exports = { ticketHandler };

async function createTicketApplication(interaction, client, redis, configApply) {
    const oldDataTicket = await getSimpleRedisJson({ redis, type: `ticket:apply:${interaction.guildId}:${configApply.nombreclave}`, UID: interaction.user.id });
    //   revisar si ya tiene un ticket abierto
    if (oldDataTicket && oldDataTicket.status !== 'closed') {
        await interaction.reply({ content: `Ya tienes un ticket abierto para esta aplicación: <#${oldDataTicket.channelId}>`, ephemeral: true }); 
        return;
    }
    // revisar si ya tiene el rol 
    if(interaction.member.roles.cache.has(configApply.roleToAssign)){
        await interaction.reply({ content: `Ya tienes el rol asociado a esta postulación,`, ephemeral: true });
        return;
    }

    // lógica para crear ticket de aplicación
    let metionsStr=''
    const permisos = [
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
        ],
      },
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ];
    if(configApply.staffAurthorityRoles && Array.isArray (configApply.staffAurthorityRoles)){
        configApply.staffAurthorityRoles.forEach(roleId => {
            permisos.push({
                id: roleId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages],
            });
            metionsStr += `<@&${roleId}> `;
        });
    }
    const newTicketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: configApply.categoryId || null,
        permissionOverwrites: permisos,
    });
    const rolApplyName = configApply.roleToAssign ? `<@&${configApply.roleToAssign}>` : 'Ninguno';
    const reclamado= 'No';
    const formText = configApply.formInTicketStr || null;

    const userId = interaction.user.id;

    const embeds = [];
    const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Ticket de Postulación de ${interaction.user.username}`)
    .setDescription(`Sistema de tickets de postulación.`)
    .addFields(
        { name: 'Rol a postular:', value: `${rolApplyName}`, inline: true },
        { name: 'Reclamado:', value: `${reclamado}`, inline : true },
        { name: 'Creador del ticket:', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Fecha de creación:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )
    .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
    .setAuthor({ name: `Staff Tickets`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
    embeds.push(embed);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket:apply:close:${configApply.nombreclave}`)
            .setLabel('Cerrar Ticket')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`ticket:apply:claim:${configApply.nombreclave}`)
            .setLabel('Reclamar Ticket')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`ticket:apply:approve:${configApply.nombreclave}`)
            .setLabel('Aprobar Rol')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`ticket:apply:reject:${configApply.nombreclave}`)
            .setLabel('Rechazar Rol')
            .setStyle(ButtonStyle.Danger),

    );
    
    const mainMessage = await newTicketChannel.send({
        content: `${metionsStr}`,
        embeds: embeds,
        components: [row]
    });

    const ticketData = {
        authorId: interaction.user.id,
        channelId: newTicketChannel.id,
        mainMessageId: mainMessage.id,
        status: 'open',
        claimedBy: null,
        createdAt: new Date().toISOString(),
        configId: configApply.nombreclave,

    }       
    await saveSimpleRedisJson({ redis, type: `ticket:apply:${interaction.guildId}:${configApply.nombreclave}`, UID: interaction.user.id, json: ticketData });
    await setReferenceTicket(redis, newTicketChannel.id, interaction.user.id);
    await interaction.reply({ content: `Tu ticket de aplicación ha sido creado: <#${newTicketChannel.id}>`, ephemeral: true });

    if (formText){
        await newTicketChannel.send({ content: ` 👋 Hola <@${userId}>, responde las siguientes preguntas para poder continuar con el proceso.\n${formText}` });

    }else {
        await newTicketChannel.send({ content: ` 👋 Hola <@${userId}>\nPor favor espera a que un miembro del staff te atienda.` });
    }




}
async function closeTicketApplication(interaction, client, redis, configApply) {

    const dataTicket = await logicCheckInTicketApplication(interaction, client, redis, configApply);



    // ideal dejar un aviso antes de cerrar
    // y dejar registro en un canal de logs
    // deuda tecnica

    // del referencia y data del ticker 
    await redis.del(`ticket:${interaction.channel.id}:author`);
    await redis.hdel(`databot:ticket:apply:${interaction.guildId}:${configApply.nombreclave}`, dataTicket.authorId);

    // eliminar canal
    await interaction.channel.delete('Ticket cerrado');

    return;
    
    
}
async function claimTicketApplication(interaction, client, redis, configApply) {
    const dataTicket = await logicCheckInTicketApplication(interaction, client, redis, configApply);
    // lógica de reclamar ticket
    if (dataTicket.claimedBy) {
        await interaction.reply({ content: `Este ticket ya ha sido reclamado por <@${dataTicket.claimedBy}>.`, ephemeral: true });
        return;
    }
    dataTicket.claimedBy = interaction.user.id;

    await saveSimpleRedisJson({ redis, type: `ticket:apply:${interaction.guildId}:${configApply.nombreclave}`, UID: dataTicket.authorId, json: dataTicket });
    await interaction.reply({ content: `El ticket ha sido reclamado por <@${interaction.user.id}>.` });
    return;

}

async function approveTicketApplication(interaction, client, redis, configApply) {
    // lógica de aprobar rol en ticket
    const dataTicket = await logicCheckInTicketApplication(interaction, client, redis, configApply);
    if (!configApply.roleToAssign) {
        await interaction.reply({ content: `ERROR: No hay un rol configurado para asignar en esta postulación.`, ephemeral: true });
        return;
    }
    const member = await interaction.guild.members.fetch(dataTicket.authorId);
    if (!member) {
        await interaction.reply({ content: `ERROR: No se pudo encontrar al miembro para asignar el rol.`, ephemeral: true });
        return;
    }
    const strMesageOnApprove = configApply.MessagePostApproveStr || ''
    const embeds = [];
    const embed1 = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle(`Postulación Aprobada`)
    .setDescription(`¡Felicidades <@${dataTicket.authorId}>! Tu postulación ha sido aprobada 🥳.\n \n ${strMesageOnApprove}`)
    .addFields(
        { name: 'Rol Asignado:', value: `<@&${configApply.roleToAssign}>`, inline: true },
    )
    .setTimestamp();
    embeds.push(embed1);
    //if (configApply.MessagePostApproveStr && configApply.MessagePostApproveStr.trim() !==''){
    //    const embed2 = new EmbedBuilder()
    //    .setColor('#0099ff') 
    //    .setTitle(`Canales importantes`)
    //    .setDescription(`${configApply.MessagePostApproveStr}`)
    //    .setTimestamp();
    //    embeds.push(embed2);
    //}
    const embed3 = new EmbedBuilder()
    .setColor('#0099ff') 
    .setTitle(`Proceso Finalizado`)
    .setDescription(`Si no necesitas más ayuda, puedes cerrar este ticket.`)
    const row = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket:apply:close:${configApply.nombreclave}`)
            .setLabel('Cerrar Ticket 👋')
            .setStyle(ButtonStyle.Danger),
    );
    
    await member.roles.add(configApply.roleToAssign, 'Rol aprobado en postulación');
    dataTicket.status = 'approved';
    await saveSimpleRedisJson({ redis, type: `ticket:apply:${interaction.guildId}:${configApply.nombreclave}`, UID: dataTicket.authorId, json: dataTicket });
    await interaction.reply({ content: `<@${dataTicket.authorId}>`, embeds: [...embeds, embed3], components: [row] });
    return;
}





// funciones auxiliares

async function getDataTicket(redis, channel, appliId) {
    const authorId = await getReferenceTicket(redis, channel.id);
    if (!authorId) {
        throw new Error('No authorId found for this ticket channel');
    }
    const dataTicket = await getSimpleRedisJson({redis, type: `ticket:apply:${channel.guildId}:${appliId}`, UID: authorId});
    return dataTicket;   
}

async function setReferenceTicket(redis , channelId, authorId) {
    await redis.set(`ticket:${channelId}:author`, authorId);
}

async function getReferenceTicket(redis, channelId) {
    const authorId = await redis.get(`ticket:${channelId}:author`);
    return authorId;
    
}
async function logicCheckInTicketApplication(interaction, client, redis, configApply) {
        const hasAnyRole = configApply.staffAurthorityRoles
    .some(roleId => interaction.member.roles.cache.has(roleId));
    if (!hasAnyRole && !interaction.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({ content: `Solo los miembros del staff pueden interactuar con este ticket.`, ephemeral: true });
        return;
    }
    const dataTicket = await getDataTicket(redis, interaction.channel, configApply.nombreclave);
    if (!dataTicket) {
        await interaction.reply({ content: `ERROR: No se encontró información del ticket.`, ephemeral: true });
        return;
    }
    if (dataTicket.status === 'closed') {
        await interaction.reply({ content: `Este ticket ya está cerrado.`, ephemeral: true });
        return;
    }
    return dataTicket;
}
async function rejectTicketApplication(interaction, client, redis, configApply) {
    const dataTicket = await logicCheckInTicketApplication(interaction, client, redis, configApply);

    

}