const { ActionRowBuilder, ButtonBuilder, time, } = require('discord.js');
// Crear un botón
const button = new ButtonBuilder()
    .setCustomId('abort_btn') // ID único para el botón
    .setLabel('Cancealar')
    .setStyle(1);


module.exports = {
    description:'Borra todos los mensajes que pueda en un canal de forma masiva. Usar con mucha precaución.',
    usage: '%s superclear ',
    run: async (message) => {
        try {
            const args = message.content.split(' ').slice(1).join(' ');
            const forceDelete = args.includes('--forced');
            let abortar = false

            let reply
            if (forceDelete){
                const row = new ActionRowBuilder()
                    .addComponents(button);
                reply = await message.reply(
                    {
                        content:'Realizando Borrado Forzado, Porfabor espere ...',
                        components:[row]
                    })
                const filter = (interacion)=> interacion.user.id === message.author.id && interacion.message.id == reply.id
                const collector = reply.createMessageComponentCollector({ time: 600000 }); // 10 minutos
                collector.on('collect', async (interaction) => {
                    if (interaction.customId === 'abort_btn' && interaction.user.id === message.author.id) {
                        // El usuario ha interactuado con el botón 'abort_btn'
                        console.log('El usuario ha cancelado la acción');
                        reply.edit({components:[], content:'Cancelando el Clear'})
                        abortar = true
                    }
                });
                collector.on('end', (collected, reason) => {
                    console.log(`El recolector de interacciones ha terminado (${reason})`);
                });
            }
            const channel = message.channel;
            let messagesDeleted = 0;
            let manualDeletions = 0;
            do {
                console.log('se esta ejecutando el DOO')
                const messages = await channel.messages.fetch({ limit: 100 });
                if (messages.size === 0) break; // Si no hay más mensajes, salir del bucle

                const deletions = [];
                const manualDeletionsList = []
                messages.forEach(msg => {
                    console.log('abortar es:', abortar)
                    if (reply && reply.id === msg.id) return
                    else if(abortar) return
                    else if (Date.now() - msg.createdTimestamp > 14 * 24 * 60 * 60 * 1000) {
                        console.log('mensaje antiguo y forced delate', forceDelete)
                        if (forceDelete){
                            manualDeletionsList.push(new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    console.log('estoy ejecutando el timeout', abortar)
                                    if (!abortar){
                                        msg.delete()
                                        .then(() => {
                                            manualDeletions++
                                            messagesDeleted++
                                            resolve();
                                        })
                                        .catch(error => {
                                            console.error("Error al eliminar mensaje:", error);
                                            resolve(); // Continuar con la ejecución después del error
                                        });
                                    }else{ 
                                        console.log('se esta cancelando esta promesa de dlate') 
                                        resolve()
                                    }
                                }, 100);
                            }));
                        }
                        
                    } else {
                        console.log('apend messege news')
                        deletions.push(msg);
                    }
                });
                console.log('abor es aaaahkjsad:', abortar)
                if(abortar) break
                console.log('termine de hacer el for de 100msg')
                await Promise.all(manualDeletionsList);
                if (deletions.length > 0) {
                    await channel.bulkDelete(deletions).then(deletedMessages => {
                        messagesDeleted += deletedMessages.size;
                    }).catch(error => {
                        console.error("Error al eliminar mensajes en bloque:", error);
                    });
                }else if(deletions.length === 0 && !forceDelete) return
                console.log('este es el tamaño de la lista', deletions.length)
                messagesDeleted += messages.size - manualDeletions;

                // Esperar 1 segundo después de cada ciclo del bucle
                await new Promise(resolve => setTimeout(resolve, 1000));
            } while (!abortar);

            console.log(`Se eliminaron un total de ${messagesDeleted} mensajes.`);
            console.log(`Se realizaron ${manualDeletions} eliminaciones manuales.`);
            reply.delete()
        } catch (error) {
            console.error("Error inesperado:", error);
        }

    console.log('e terminado ')
    }
};