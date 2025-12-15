
const { parseArgs } = require('../utils/parseArgs');


module.exports = {
    description: `Comando para borrar mensajes puntuales de forma limpia (sin respuestas del bot). Puede usarse para borrar una cantidad específica de mensajes (por defecto 1, máximo 5) y a partir de un mensaje en específico (opción avanzada). No se puede usar para borrar mensajes en masa.`,
    usage: '%s clear [amount] --id [messageID]',

    run: async (message) => {
        let amount = 1
        let targetMessageID = null
        let targetMessage = message
        

        
        try {
            const args = parseArgs(message.content).slice(2);
            const channel = message.channel;
            // encontrar si hay un argumento --id
            for (let i = 0; i < args.length; i++) {
                if (args[i] === '--id' && i + 1 < args.length) {
                    targetMessageID = args[i + 1];
                    i++; // Saltar el siguiente argumento ya que es el ID

                    // borrar __id y el id del array de argumentos
                    args.splice(i - 1, 2);
                } else if (!isNaN(args[i])) {
                    amount = parseInt(args[i], 10);
                }
            } 

            if (amount < 1) amount = 1;
            if (amount > 5) amount = 5;


            if (targetMessageID) {
                targetMessage= await message.channel.messages.fetch(targetMessageID);
                if (!targetMessage){
                return message.reply(`No se encontró el mensaje con ID ${targetMessageID}`);
                }   
            }
            
            let messagesBefore = [];
            if (targetMessage.id === message.id ) {
                amount +=2
            }

            if (amount > 1) {
                
                const preMessagesBefore = await message.channel.messages.fetch({ before: targetMessage.id, limit: amount -1 });
                console.log('preMessagesBefore es:', preMessagesBefore)
                messagesBefore = Array.from(preMessagesBefore.values())
            } 
            const messagesToDelete = [targetMessage, ...messagesBefore].reverse();

            // no borrar el mensaje de comando si esta en la lista
            if (targetMessage.id === message.id) {
                messagesToDelete.shift()
                // borrar el ultimo 
                messagesToDelete.pop()

            }

            for (const msg of messagesToDelete) {
                console.log('borrando mensaje:', msg.id,' msg: ', msg.content);
                await msg.delete();
            }
            console.log(`Se han borrado ${messagesToDelete.length} mensajes.`);


        
            //eliminar el mensaje de comando
            try {
                await message.delete();
            } catch (error) {
                console.error("No se pudo eliminar el mensaje de comando:", error);
            }


        } catch (error) {
            console.error("Error inesperado:", error);
        }

    console.log('comaando finalizado ')
    }
};