const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function generateRegister({ members, NRegistro = 0, logMembers }) {
    // Esta función entregará un embed que será un registro
    let Field = [];
    if (logMembers.length >8) return null; 
    for (const memberLog of logMembers) {
        // Puedes definir la lógica para 'donó' y 'recibió' si tienes información relevante

        let name = `'${members[memberLog.id]?.username || "Unknown"}' : `;
        let dono = '0 Tropas'; 
        let recibio = '0 Tropas';
        let titleDono = 'Donó';
        let titleRecibio = 'Recibió';

        if (memberLog.donationsLog === 1) {
            dono = ` ${memberLog.donationsLog} tropa.`;
        } else if (memberLog.donationsLog > 1) {
            dono = ` ${memberLog.donationsLog} tropas.`;
        } else {
            dono = ' ';
            titleDono = ' ';
        }

        if (memberLog.requestsLog === 1) {
            recibio = ` ${memberLog.requestsLog} tropa.`;
        } else if (memberLog.requestsLog > 1) {
            recibio = `  ${memberLog.requestsLog} tropas.`;
        } else {
            recibio = ' ';
            titleRecibio = ' ';
        }

        // Agregar los campos correspondientes al embed
        Field.push({ name: name, value: ' ', inline: true });
        Field.push({ name: titleDono, value: dono, inline: true });
        Field.push({ name: titleRecibio, value: recibio, inline: true });
    }

    // Crear el Embed con la información
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`≫ ───────≪•◦Registro N°${NRegistro}•◦≫ ───────≪`)
        .addFields(Field)

    return embed;
}
module.exports = generateRegister;
