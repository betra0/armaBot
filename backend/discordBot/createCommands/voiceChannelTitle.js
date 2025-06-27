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

        let voiceChannelArg 
        let voiceChannelId = null; // Inicializar como null
        let adress
        let seudoTitle
        const guildID = message.guild.id

        console.log('este es el args: ', args)
        
        const channelIndex = args.indexOf('--channel');
        console.log(channelIndex, args[channelIndex])
        if (channelIndex !== -1 && channelIndex < args.length - 1) {
            voiceChannelArg = args[channelIndex + 1];
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


        // Verificar si el canal existe y en que formato se mando y encontrar a idchanel
        if (voiceChannelArg.startsWith('<#') && voiceChannelArg.endsWith('>')) {
            voiceChannelId = voiceChannelArg.slice(2, -1);
        } else{
            //  buscar el canal por su nombre
            const voiceChannel = message.guild.channels.cache.find(channel => channel.name === voiceChannelArg);
            voiceChannelId = voiceChannel ? voiceChannel.id : null;
        }
        if (!voiceChannelId) {
            return message.reply(`No se encontró un canal de audio con el nombre o id ${voiceChannelArg}.`);
        }


        const content= `** preparando voice channel title...** para: ${adress} ** ...`
        try {    
            const mensaje = await channelName.send({content: content});
        
            await saveRedisNewMessageSubcription({
                type: 'playerCountInTitle',
                guildID,
                channelId: voiceChannelId,
                adress,
                seudoTitle,
                messageID: '',
                redis
            });
            await insertAdressTofetcher({adress, redis})
            mensaje.edit({content: `** voice channel title funcionando, los cambios se podrian ver reflejados en un maximo de 10 minutos.**`});





            if(!isNewChannel){
                message.delete()  
            }

        } catch (error) {
            console.log(error)
            return message.reply(`Hubo un error: \`\`\`${error.stack}\`\`\``);
        }


    }
}

