const findAndEditMessageText = async (client ,idChannel, idMessage, data='') => {
    /* IdChannel, IdMessage Data */
    console.log('Buscando mensaje...');
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
const findAndEditChannelName = async (client, idChannel, newName) => {
    console.log('Buscando canal...');
    try {
        const channel = await client.channels.fetch(idChannel);

        if (channel && channel.isVoiceBased()) {
            await channel.setName(newName);
            console.log(`Nombre del canal cambiado a: ${newName}`);
            return true;
        } else {
            console.log('El canal no es válido o no es un canal de voz.');
            throw new Error('El canal no es válido o no es un canal de voz.');
        }
    } catch (err) {
        console.error('Error al cambiar el nombre del canal:', err);

        if (err.code === 50001) {
            console.log('El bot no tiene permisos para ver los canales en este servidor.');
        } else if (err.code === 50013) {
            console.log('El bot no tiene permisos para editar este canal.');
        } else if (err.code === 10003) {
            console.log('El canal no existe.');
        } else {
            console.log('Error desconocido:', err);
        }
        throw err;
    }
};

module.exports = {
    findAndEditMessageText,
    findAndEditChannelName
};
