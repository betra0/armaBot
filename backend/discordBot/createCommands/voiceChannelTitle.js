const { saveRedisNewMessageSubcription, insertAdressTofetcher } = require('../services/insertInRedis');



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
    description:'crear un titulodinamico typo status del servidor en un canal de texto específico',
    usage: 'voiceChannelTitle --channel "Nombre del canal" --address xxx.xxx.xx.xx:xxxx --title "Nombre del servidor"',
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
        }else{
            return message.reply('Debes ingresar un canal de voz ejemplo --channel "Nombre del canal" o --channel #canal');
        }

        const adressIndex = args.indexOf('--address');
        // si c.idexOf no encuentra el valor, devuelve -1
        // el if revisa si el valor fue encontrado y si no se encuentra al final del array
        if (adressIndex !== -1 && adressIndex < args.length - 1) {
            adress = args[adressIndex + 1];
            args.splice(adressIndex, 2);
        }else{
            return message.reply('Debes ingresar una dirección de servidor ejemplo --address xxx.xxx.xx.xx:xxxx')
        }
        
        // buscar seudotitle
        //seudiTitleIndex
        const seudoTitleIndex = args.indexOf('--title');
        if (seudoTitleIndex !== -1 && seudoTitleIndex < args.length - 1) {
            seudoTitle = args[seudoTitleIndex + 1];
            args.splice(seudoTitleIndex, 2);
        }else{
            return message.reply('Debes ingresar un título ejemplo --title "Nombre del servidor"')
        }


        // Verificar si el canal existe y en que formato se mando y encontrar a idchanel

        console.log('este es el voiceChannelArg:',voiceChannelArg)
        const cleanArg = voiceChannelArg
         .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/g, '') // caracteres de control + invisibles
         .trim();


        console.log('este es el cleanArg:',cleanArg)

        if (cleanArg.startsWith('<#') && cleanArg.endsWith('>')) {
            // Si el canal está en formato <#id>, extraer el ID
            voiceChannelId = cleanArg.slice(2, -1);
        }
        else{
            console.log('no es un formato de id de canal, revisando si es un id de canal')
            // primero revisar si son puros numeros
            if (/^\d+$/.test(cleanArg)) {
                // si es un numero, es un id de canal
                console.log('es un numero', cleanArg)
                // si se verifica que es un id existente el nuemro
                voiceChannelId = message.guild.channels.cache.get(cleanArg)?.id || null;
            }else{
                console.log('no es un numero, revisando si es un nombre de canal')
                // si no es un numero, es un nombre de canal
                //  buscar el canal por su nombre
                const voiceChannel = message.guild.channels.cache.find(channel => channel.name === cleanArg);
                voiceChannelId = voiceChannel ? voiceChannel.id : null;
            }
        }
        console.log('este es el voiceChannelId: ', voiceChannelId)

        if (voiceChannelId === null) {
            return message.reply(`No se encontró un canal de audio con el nombre o id ${voiceChannelArg}.`);
        }


        const content= `** preparando voice channel title...** para: ${adress} ** ...`
        try {    
            const mensaje = await message.reply(content);
            console.log('parametros para redis: ', { 
                gildID:guildID, 
                adress:adress, 
                channelID:voiceChannelId,  
                seudoTitle: seudoTitle
            });
            console.log('pase esta parte ',)
        
            await saveRedisNewMessageSubcription({
                type:'playerCountInTitle', 
                gildID:guildID, 
                adress:adress, 
                channelID:voiceChannelId, 
                messageID:'', 
                seudoTitle: seudoTitle, 
                redis:redis
            });
            await insertAdressTofetcher({adress, redis})
            mensaje.edit({content: `** voice channel title funcionando, los cambios se podrian ver reflejados en un maximo de 10 minutos.**`});






        } catch (error) {
            console.log(error)
            return message.reply(`Hubo un error: \`\`\`${error.stack}\`\`\``);
        }


    }
}

