
const { changeAdressInRedis } = require('../services/changeAdressInRedis');



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
    description:' Cambia el Adress del servidor completamente, se usa cuando la ip de un servidor cambia ',
    run: async (message, redis) => {
        const args = parseArgs(message.content);

        let channel = message.channel; // Por defecto, se utilizará el canal actual
        let oldAdress
        let newAdress
        const guild = message.guild
        console.log('este es el args: ', args)

        const adressIndex = args.indexOf('--old-adress');
        // si c.idexOf no encuentra el valor, devuelve -1
        // el if revisa si el valor fue encontrado y si no se encuentra al final del array
        if (adressIndex !== -1 && adressIndex < args.length - 1) {
            adress = args[adressIndex + 1];
            args.splice(adressIndex, 2);
        }else{
            return message.reply('Debes ingresar una dirección de servidor ejemplo --adress xxx.xxx.xx.xx:xxxx')
        }
        




        
        const content= `** Cambiando la dirección del servidor de: ${oldAdress} a: ${newAdress}**` 
        try {    
            const mensaje = await channelName.send({content: content});
            changeAdressInRedis({
                redis: redis,
                oldAdress: oldAdress,
                newAdress: newAdress
            });
            const successMessage =  await channel.send(`Dirección del servidor cambiada de **${oldAdress}** a **${newAdress}** correctamente, es posible que los cambios tarden en reflejarse, maximo 10 minutos.`);
            




            // time slepp 1 min 
            await new Promise(resolve => setTimeout(resolve, 60000));
            
            message.delete()  
            

        } catch (error) {
            console.log(error)
            return message.reply(`Hubo un error: \`\`\`${error.stack}\`\`\``);
        }


    }
}

