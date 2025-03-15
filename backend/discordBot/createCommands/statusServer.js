const { saveRedisNewMessageSubcription, insertAdressTofetcher } = require('../services/insertInRedis');
const { generateMessageEmbed } = require('../services/embedMessageGenerator');
const { GenerateEmbedStatusServer } = require('../services/embedStatusServer');
const { getInfoAdressForRedis } = require('../services/getFromRedis');


function parseArgs(input) {
    const args = [];
    let currentArg = '';
    let insideQuotes = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (char === '"' || char === "'") { // Si encontramos una comilla
            if (insideQuotes) {
                // Cerramos la comilla
                args.push(currentArg);
                currentArg = '';
                insideQuotes = false;
            } else {
                // Abrimos la comilla
                insideQuotes = true;
            }
        } else if (char === ' ' && !insideQuotes) {
            // Si estamos fuera de comillas, separa por espacios
            if (currentArg) {
                args.push(currentArg);
                currentArg = '';
            }
        } else {
            // Añadir carácter a la palabra actual
            currentArg += char;
        }
    }

    // Agregar el último argumento si lo hay
    if (currentArg) {
        args.push(currentArg);
    }

    return args;
}



module.exports = {
    description:'crear un mensaje de status del servidor en un canal de texto específico',
    run: async (message, redis) => {
        const args = parseArgs(message.content);

        let channelName = message.channel; // Por defecto, se utilizará el canal actual
        let isNewChannel = false
        let channelId = message.channel.id;
        let adress
        let seudoTitle
        const guildID = message.guild.id
        console.log('este es el args: ', args)
        const channelIndex = args.indexOf('--channel');
        console.log(channelIndex, args[channelIndex])
        if (channelIndex !== -1 && channelIndex < args.length - 1) {
            isNewChannel = true
            channelName = args[channelIndex + 1];
            args.splice(channelIndex, 2);
        }
        const adressIndex = args.indexOf('--adress');
        // si c.idexOf no encuentra el valor, devuelve -1
        // el if revisa si el valor fue encontrado y si no se encuentra al final del array
        if (adressIndex !== -1 && adressIndex < args.length - 1) {
            adress = args[adressIndex + 1];
            args.splice(adressIndex, 2);
        }else{
            return message.reply('Debes ingresar una dirección de servidor ejemplo --adress xxx.xxx.xx.xx:xxxx')
        }
        
        // buscar seudotitle
        //seudiTitleIndex
        seudoTitleIndex = args.indexOf('--title');
        if (seudoTitleIndex !== -1 && seudoTitleIndex < args.length - 1) {
            seudoTitle = args[seudoTitleIndex + 1];
            args.splice(seudoTitleIndex, 2);
        }else{
            return message.reply('Debes ingresar un título ejemplo --title "Nombre del servidor"')
        }



        if (isNewChannel && channelName.startsWith('<#') && channelName.endsWith('>')) {
            channelId = channelName.slice(2, -1);
        } else if(isNewChannel){
            //  buscar el canal por su nombre
            channelName = message.guild.channels.cache.find(channel => channel.name === channelName);
        }
        if (isNewChannel && !channelName) {
            return message.reply(`No se encontró un canal con el nombre ${channelName}.`);

        }else if(isNewChannel){
            channelId = channelName.id;

        }
        
        const content= `** Creando Un Status del servidor ${adress} ** ...`
        try {    
            const mensaje = await channelName.send({content: content});
        
            const Idmensaje = mensaje.id
            saveRedisNewMessageSubcription({
                redis: redis,
                type: 'status',
                gildID: guildID,
                channelID: channelId,  // Asegúrate de que sea channelID en lugar de channelId
                messageID: Idmensaje,
                adress: adress,
                seudoTitle: seudoTitle
            });
            insertAdressTofetcher({adress, redis})
            const infoAdress = await getInfoAdressForRedis({adress, redis})
            const allEbeds = GenerateEmbedStatusServer({infoAdress, seudoTitle})

            allEbeds.push(generateMessageEmbed(
                {
                    title:'Aviso', 
                    descripcion:'puede que la informacion actualizada no este disponible, espere unos minutos hasta que este mensaje desaparesca.'
                }))
        
            await mensaje.edit({content: "", embeds: allEbeds})





            if(!isNewChannel){
                message.delete()  
            }

        } catch (error) {
            console.log(error)
            return message.reply('Hubo un error al enviar el mensaje.');
        }


    }
}

