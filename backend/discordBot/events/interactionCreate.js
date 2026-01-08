
const { Agent } = require('undici');
const { MessageFlags } = require('discord.js');
const { getListRedisIpSubcription, getInfoAdressForRedis, getSimpleRedisJson } = require('../services/getFromRedis');
const { generateMessageEmbed } = require('../services/embedMessageGenerator');
const { saveSimpleRedisJson } = require('../services/insertInRedis');


const craftyDispatcher = new Agent({
    connect: {
        rejectUnauthorized: false, // cert autofirmado de Crafty
    },
});

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client, redis) {
        console.log('Interacción recibida:' );
        console.log('Tipo de interacción:', interaction.type);
        console.log('ID de interacción:', interaction.id);

        try {
            
        if (!interaction.isButton()) return;

        if (interaction.user.bot) return;

        let data = await getSimpleRedisJson({
            redis: redis,
            type: 'checkUser:config',
            UID: `${interaction.guild.id}`
        });

        // boton de verificación
        if (data && data.btnId && interaction.customId === data.btnId) {
            console.log('*****Botón de verificación presionado por:', interaction.user.tag);
            const minHours = 12;
            const timeCreatedMs = interaction.user.createdTimestamp;
            const minMs = minHours * 60 * 60 * 1000;
            if (Date.now() - timeCreatedMs < minMs) {
                await interaction.reply({
                    content: `❌ Tu cuenta debe tener al menos ${minHours} horas de antigüedad para poder verificarte en este servidor.`,
                    flags: MessageFlags.Ephemeral
                });
                console.log('Verificación fallida: cuenta demasiado nueva para', interaction.user.tag);
                return;
            }
            const joinedAt = interaction.member.joinedTimestamp;
            const MinJoinTimeMs = 1 * 60 *1000; // 1 minuto
            if (Date.now() - joinedAt < MinJoinTimeMs) {
                await interaction.reply({
                    content: `❌ Debes estar en el servidor al menos ${MinJoinTimeMs / (60 * 1000)} minutos antes de poder verificarte.`,
                    flags: MessageFlags.Ephemeral
                });
                console.log('Verificación fallida: usuario recién unido', interaction.user.tag);
                return;
            }

        


        
            const role = interaction.guild.roles.cache.get(data.roleToAssign);

            if (role) {
                await interaction.member.roles.add(role);
                const embeds = [];
                let destacados='';
                if (data.importantChannels && data.importantChannels.length > 0) {
                    destacados =` y a canales recurrentes como: ` + data.importantChannels.map(channelId => `<#${channelId}>`).join(' ');

                }
                embeds.push(generateMessageEmbed(
                        {
                            title:'¡Verificación exitosa!',
                            descripcion:` Ahora tienes acceso al servidor${destacados}.` ,
                            color:'#00ff00',
                        }
                    ));
                await interaction.reply({
                    content: '',
                    embeds: embeds,
                    flags: MessageFlags.Ephemeral
                });
                console.log('Rol de verificación asignado correctamente a', interaction.user.tag);
            } else {
                await interaction.reply({
                    content: 'Error: El rol de verificación no existe.',
                    flags: MessageFlags.Ephemeral
                });
            }
            return;
        }



        data = await getSimpleRedisJson({
            redis: redis,
            type: 'adminCraftyServer:config',
            UID: `${interaction.guild.id}`
        });

        // botones de administración del servidor crafty
        if (data && (data.btnStartId === interaction.customId || data.btnStopId === interaction.customId || data.btnRebootId === interaction.customId || data.btnBackUpId === interaction.customId)) {
            console.log('*****Botón de administración presionado por:', interaction.user.tag);
            if (interaction.customId === data.btnStartId) {
                try {
                    await sendCraftyAction(data.serverEndpoint, data.craftyToken, 'start_server');
                
                    await interaction.reply({
                        content: '✅ El servidor está arrancando.',
                        ephemeral: true,
                    });
                    await setRegisterAction({ redis, interaction, userName: interaction.user.tag, action: 'start_server' });
                } catch (e) {
                    console.error(e);
                    await interaction.reply({
                        content: `❌ ${e.message}`,
                        ephemeral: true,
                    });
                }
            } else if (interaction.customId === data.btnStopId || interaction.customId === data.btnRebootId || interaction.customId === data.btnBackUpId) {
                //revisar si el usuario tiene rol permitido data.roleToAdmin tiene el id del rol
                if (interaction.member && !interaction.member?.roles.cache.has(data.roleToAdmin)) {
                    return interaction.reply({
                        content: '❌ ¡No tienes permiso para realizar esta acción!',
                        ephemeral: true,
                    });
                }
                const action = interaction.customId === data.btnStopId ? 'stop_server' : interaction.customId === data.btnRebootId ? 'restart_server' : 'backup_server/acf7cefa-fb3d-4b01-85ff-a3b5ee822173';
                // deuda técnica: el id del backup está hardcodeado, debería obtenerse dinámicamente
                try {
                    await sendCraftyAction(data.serverEndpoint, data.craftyToken, action);

                    await interaction.reply({
                        content: '⏹️ El servidor se está deteniendo, reiniciando o haciendo una copia de seguridad.',
                        ephemeral: true,
                    });
                    await setRegisterAction({ redis, interaction, userName: interaction.user.tag, action: action });
                } catch (e) {
                    console.error(e);
                    await interaction.reply({
                        content: `❌ ${e.message}`,
                        ephemeral: true,
                    });
                }
            }

        }



        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this interaction!', ephemeral: true });
        }
    },
};



// 






async function sendCraftyAction(serverEndpoint, token, action) {
    const res = await fetch(
        `${serverEndpoint}/action/${action}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            dispatcher: craftyDispatcher,
        }
    );

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Crafty error ${res.status}: ${text}`);
    }

    return res.json();
}

async function setRegisterAction({redis, interaction, userName = "user", action='None'}) {

    //register debe ser un array de acciones max 5
    let register = await getSimpleRedisJson({
        redis,
        type: 'adminCraftyServer:register',
        UID: `${interaction.guild.id}`,
    });
    if (!register || !Array.isArray(register)) {
        register = [];
    }
    register.push({
        user: userName,
        action: action,
        date: new Date().toISOString(),
    })
    if (register.length > 5) {
        register.shift();
    }

    await saveSimpleRedisJson({
        redis,
        type: 'adminCraftyServer:register',
        UID: `${interaction.guild.id}`,
        json: register,

     });

}