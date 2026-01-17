const findAndEditMessageText = async (client ,idChannel, idMessage, data='') => {
    /* IdChannel, IdMessage Data */
    try{
        const channel = await client.channels.fetch(idChannel);
        if (channel && channel.isTextBased()) {
            // Obtener el mensaje
            const message = await channel.messages.fetch(idMessage);

            if (!message) {
                console.log('El mensaje no existe o ya fue eliminado.');
                return;
            }
            await message.edit(data);
            console.log('Mensaje editado correctamente.');
            return true;
        } else {
            console.log('El canal no es válido o no es de texto.');
            throw new Error('El canal no es válido o no es de texto.');
        }
    }catch (err) {
        console.error('Error al editar el mensaje:', err);

        if (err.code === 50001) {
            console.log('El bot no tiene permisos para ver los mensajes en este canal.');
        } else if (err.code === 10008) {
            console.log('El mensaje no existe o ya fue eliminado.');
        } else {
            console.log('Error desconocido:', err);
        }
        throw err;
    }   
}


async function setChannelNameWithTimeout(channel, newName, timeout = 15000) {
    return Promise.race([
        channel.setName(newName),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TimeoutFunction')), timeout))
    ]);
}


const findAndEditChannelName = async (client, idChannel, newName, verify=false) => {
    console.log('inicioFuncion');
    try {
        const channel = await client.channels.fetch(idChannel);

        if (channel) {
            if (verify){
                //verificar que nombre tiene el canal
                if (channel.name === newName){
                    console.log('No fue necesario cambiar el nombre del canal.');
                    return false;
                }else{
                    console.log('El n Nombre actaul del canal es: ', channel.name, ' y se cambiara a: ', newName);
                }
            }
            try{
                await setChannelNameWithTimeout(channel, newName);

            }
            catch (err){
                console.error('Error en el setNameChannel:', err);
                throw err;
            }

            let reschanel = await client.channels.fetch(idChannel);
            let resName = reschanel.name;
            console.log('El nuevo nombre del canal es : ', resName);
            if (verify && resName === newName){
                console.log('El nombre del canal fue cambiado correctamente.');
            }else if (verify){
                console.log('No Cambio Error');
                throw new Error('No se pudo cambiar el nombre del canal.');
            }   
            console.log('finFuncion');
            return true;
        } else {
            console.log('El canal no es válido o no es un canal de voz.');
            throw new Error('El canal no es válido o no es un canal de voz.');
        }
    } catch (err) {
        console.log('Error en el catch');
        console.error('Error al cambiar el nombre del canal:', err);

        if (err.code === 50001) {
            console.log('El bot no tiene permisos para ver los canales en este servidor.');
        } else if (err.code === 50013) {
            console.log('El bot no tiene permisos para editar este canal.');
        } else if (err.code === 10003) {
            console.log('El canal no existe.');
        } else if (err.message === 'TimeoutFunction') {
            console.log('El tiempo de espera para cambiar el nombre del canal ha expirado.');
        }
        else {
            console.log('Error desconocido:', err);
        }
        throw err;
    }
};

module.exports = {
    findAndEditMessageText,
    findAndEditChannelName
};
