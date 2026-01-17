
const { Agent } = require('undici');
const { MessageFlags } = require('discord.js');
const { getListRedisIpSubcription, getInfoAdressForRedis, getSimpleRedisJson } = require('../services/getFromRedis');
const { generateMessageEmbed } = require('../services/embedMessageGenerator');
const { saveSimpleRedisJson } = require('../services/insertInRedis');
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');


const craftyDispatcher = new Agent({
    connect: {
        rejectUnauthorized: false, // cert autofirmado de Crafty
    },
});
const initContadorSi= async(redis, userId) =>{
    const key = `verifyAttempts:${userId}`;
    await redis.set(key, 0, 'NX', 'EX', 60 * 30);
} 
const incrementarContador = async(redis, userId) => {
    const key = `verifyAttempts:${userId}`;
    await redis.set(key, -1, 'NX', 'EX', 60 * 30);
    return await redis.incr(key);
}
const prefixLog = '[interactionCreate] ';
module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client, redis) {
        console.log(prefixLog + 'iteracion de user;', interaction.user.tag);
        try {
            console.log(prefixLog + 'idCustom:', interaction.customId);
        } catch (e) {
            console.log(prefixLog + 'No es una interacción con customId');
        }

        try {
            

        if (interaction.user.bot) return;


        // boton de verificación
        if (interaction.customId === "verifyUserBtn") {
            console.log(prefixLog + '**Botón de verificación presionado por:', interaction.user.tag);
            const raw = await redis.get(`verifyAttempts:${interaction.user.id}`);
            let intento = raw === null ? -1 : Number(raw);
 
            if (intento >= 3) {
                await interaction.reply({
                    content: `❌ Has superado el número máximo de intentos de verificación. Por favor intentelo más tarde.`,
                    flags: MessageFlags.Ephemeral
                });
                console.log(prefixLog + 'Verificación bloqueada por demasiados intentos para', interaction.user.tag);
                return;
            }else if (intento >= 0) {
                // directo a modal
                console.log(prefixLog + 'es nesesario checkear al user:', interaction.user.tag);
                const modal = await createVerifyModal();
                await interaction.showModal(modal);
                return;
            }
            const data = await getSimpleRedisJson({
                redis: redis,
                type: 'checkUser:config',
                UID: `${interaction.guild.id}`
            });
            
            const minHoursArray = [7, 24*8*7]; // opciones de horas mínimas, de 7 horas a 7 semanas
            const timeCreatedMs = interaction.user.createdTimestamp;
            const minMsArray = minHoursArray.map(hours => hours * 60 * 60 * 1000);
            let [min, max] = minMsArray;
            if (Date.now() - timeCreatedMs < max) {
                await initContadorSi(redis, interaction.user.id);

                if (Date.now() - timeCreatedMs > min) {
                    // se manda el modal de verificación adicional
                    console.log(prefixLog + 'se requiere verificación adicional para', interaction.user.tag, "cuenta muy nueva:", (Date.now() - timeCreatedMs)/(60*60*1000), "horas");
                    const modal = await createVerifyModal();
                    await interaction.showModal(modal);
                    return;
                }
                await interaction.reply({
                    content: `❌ Tu cuenta debe tener al menos ${minHoursArray[0]} horas de antigüedad para poder verificarte en este servidor.`,
                    flags: MessageFlags.Ephemeral
                });
                console.log(prefixLog + 'Verificación fallida: cuenta demasiado nueva para', interaction.user.tag);
                return;
            }
            const joinedAt = interaction.member.joinedTimestamp;
            const MinJoinTimeMsRango = [1000*7, 30*1000]; // 7 segundos a 30 segundos
            if (Date.now() - joinedAt < MinJoinTimeMsRango[1]) {
                // o se manda a modal o se ignora, pero si o si es sopechoso
                    await initContadorSi(redis, interaction.user.id);
                if (Date.now() - joinedAt > MinJoinTimeMsRango[0]) {
                    // se manda el modal de verificación adicional
                    console.log(prefixLog + 'se requiere verificación adicional para', interaction.user.tag, "usuario recién unido:", (Date.now() - joinedAt)/1000, "segundos");
                    const modal = await createVerifyModal();
                    await interaction.showModal(modal);
                    return;
                }
                await interaction.reply({
                    content: `❌ No se pudo verificar tu cuenta, intenta de nuevo más tarde.`,
                    flags: MessageFlags.Ephemeral
                });
                console.log(prefixLog + 'Verificación fallida: usuario recién unido', interaction.user.tag, "tiempo en servidor:", (Date.now() - joinedAt)/1000, "segundos");
                return;
            }

            console.log(prefixLog + 'Stats' + interaction.user.tag + ': tiempo de creacion de cuenta ' + ((Date.now() - timeCreatedMs)/(60*60*1000)).toFixed(2) + ' horas, tiempo en servidor ' + ((Date.now() - joinedAt)/1000).toFixed(2) + ' segundos.');

        

            //const modal = await createVerifyModal();
            //await interaction.showModal(modal);
        
            // si no se requiere modal, asignar rol directamente
            await acceptUserToServer(interaction, data, redis);
            return;
        }
        // Modal de verificación adicional
        if (interaction.customId === 'verifyRealUserModal'){
            if (!interaction.isModalSubmit()) {
                console.log(prefixLog + 'Interacción no es un envío de modal:', interaction.user.tag);
                return;
            }
            const userId = interaction.user.id;
            const userTag = interaction.user.tag;
            console.log(prefixLog + '*****Procesando modal de verificación adicional para:', userTag);
            const retoKey = interaction.fields.components[0].components[0].customId.split(':')[1];
            const userAnswer = interaction.fields.components[0].components[0].value.trim();
            const correctAnswer = retosVerify[retoKey].answer;
            if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
                // respuesta correcta
                await acceptUserToServer(interaction, data, redis);
                await redis.del(`verifyAttempts:${userId}`);
                console.log(prefixLog + 'Verificación adicional exitosa para', userTag);
            } else {
                // respuesta incorrectao
                const intentos = await incrementarContador(redis, userId);
                await interaction.reply({
                    content: '❌ Respuesta incorrecta. No se te ha asignado el rol de verificación.',
                    flags: MessageFlags.Ephemeral
                });
                console.log(prefixLog + 'Verificación adicional fallida para', userTag);
            }
            return;
        }



        // botones de administración del servidor crafty
        if (["startServerCraftyBtn", "stopServerCraftyBtn", "rebootServerCraftyBtn", "backupServerCraftyBtn"].includes(interaction.customId)) {
            console.log(prefixLog + '**Botón de administración presionado por:', interaction.user.tag);
            const data = await getSimpleRedisJson({
                redis: redis,
                type: 'adminCraftyServer:config',
                UID: `${interaction.guild.id}`
            });
            if (interaction.customId === "startServerCraftyBtn") {
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
            } else if (["stopServerCraftyBtn", "rebootServerCraftyBtn", "backupServerCraftyBtn"].includes(interaction.customId)) {
                //revisar si el usuario tiene rol permitido data.roleToAdmin tiene el id del rol
                if (interaction.member && !interaction.member?.roles.cache.has(data.roleToAdmin)) {
                    return interaction.reply({
                        content: '❌ ¡No tienes permiso para realizar esta acción!',
                        ephemeral: true,
                    });
                }
                newKeys={
                    'stopServerCraftyBtn':'stop_server',
                    'rebootServerCraftyBtn':'restart_server',
                    'backupServerCraftyBtn':'backup_server'
                }

                const action = newKeys[interaction.customId];
                let actionurl = action;
                if (action === "backup_server")
                {
                    if(!data.backupId || data.backupId === '' || data.backupId.toLowerCase() === 'no' || data.backupId.toLowerCase() === 'ninguno')
                    {
                        await interaction.reply({
                            content: '❌ No se ha proporcionado un ID de copia de seguridad válido para realizar la acción de copia de seguridad.',
                            ephemeral: true,
                        });
                        return;
                    }
                    actionurl = `backup_server/${data.backupId}`;
                }
                    
  
                try {
                    await sendCraftyAction(data.serverEndpoint, data.craftyToken, actionurl);

                    await interaction.reply({
                        content: '⏹️ Has ejecutado la siguiente acción en el servidor: ' + action.replace('_', ' ') + '.',
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
            console.log('')
            console.log(prefixLog + 'Error al procesar la interacción');
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
const retosVerify = {
  1: { label: 'Escribe la palabra VERIFICAR', answer: 'VERIFICAR', example: 'VERIFICAR' },
  2: { label: '¿Cuánto es 5 + 3?', answer: '8', example: '8' },
  3: { label: 'Escribe la palabra VALIDAR', answer: 'VALIDAR', example: 'VALIDAR' },
  4: { label: '¿Cuánto es 10 + 4?', answer: '14', example: '14' },
  5: { label: 'Escribe la palabra BOT', answer: 'BOT', example: 'BOT' },
};

async function createVerifyModal() {

    const KeyReto = Math.floor(Math.random() * Object.keys(retosVerify).length) + 1;
    const reto = retosVerify[KeyReto];
 
    const modal = new ModalBuilder()
        .setCustomId('verifyRealUserModal')
        .setTitle('Verificación de usuario')

    // Crear un campo de entrada de texto
    const checkInput = new TextInputBuilder()
        .setCustomId(`RETO:${KeyReto}`)
        .setLabel(reto.label)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Ejemplo: ${reto.example}`)
        .setRequired(true);

    
    const firstActionRow = new ActionRowBuilder().addComponents(checkInput);

    // Agregar la fila de acción a la modal
    modal.addComponents(firstActionRow);

    return modal;
    
}

async function acceptUserToServer(interaction, data, redis) 
{
    const userTag = interaction.user.tag;   
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
                console.log(prefixLog + 'Rol de verificación asignado correctamente a', userTag);
            } else {
                await interaction.reply({
                    content: 'Error: El rol de verificación no existe.',
                    flags: MessageFlags.Ephemeral
                });
            }
}