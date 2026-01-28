const { saveRedisNewMessageSubcription, insertAdressTofetcher, saveSimpleRedisJson, saveRedisJsonTTL } = require('../services/insertInRedis');
const { generateMessageEmbed } = require('../services/embedMessageGenerator');
const { GenerateEmbedStatusServer } = require('../services/embedStatusServer');
const { getInfoAdressForRedis, getSimpleRedisJson, getRedisJson } = require('../services/getFromRedis');
const { parseArgs } = require('../utils/parseArgs');
const { ChannelType, PermissionsBitField, CategoryChannel } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { findAndEditMessageText } = require('../services/findAndEditMessageText');

// ahora mismo este archivo es una copia de chacuser solo para el fromato pero la idea es que cree un sistema de ticket de aplicacion osea un tiketck apply rol etc 

module.exports = {
    description:'comando iteractivo para Configurar un canal y sistema de ticket de aplicacion',
    usage:'Iniciador setup checkUser   o para las respuestas: %r respuestadelusario',

    run: async (message, redis) => {
        console.log('inicio de funcion ticketApply ')
        const args = parseArgs(message.content); // lista [ '%s', 'setup', 'ticketApply', 'hola', 'que', 'onda' ]
        console.log(args)

        const guild = message.guild;
        const client = message.client;
        const configDef = {
            nombreclave: 'postulaciones',
            title: 'Postulacion a Rol',
            description: 'para postularse a un rol, debe cumplir los siguientes requisitos:\n - Ser activo en el servidor\n - Tener buen comportamiento\n',
            messageForGiveRole: 'Felicidades! Has sido aprobado para el rol solicitado.',
            formInTicketStr: 'Por favor, respnda las siguientes preguntas para completar su postulacion:\n1. ¿Por qué desea obtener este rol?\n2. ¿Qué experiencia tiene relacionada con este rol?\n3. ¿Cuánto tiempo puede comprometerse a este rol?\n4. ¿Tiene alguna pregunta o comentario adicional?',
            imageUrl: null,
            roleToAssign: null,
            staffAurthorityRoles: [], // roles que pueden ver y gestionar los tickets
            MessagePostApproveStr: '',
            channelId: null,
            messageId: null,
            categoryId: null,
            channelForLogsId: null,
        };
        const respuestasArray = [
            {
                title:'Setup de Ticket de Aplicacion a rol', 
                descripcion:' Bienvenido al sistema de configuracion de Ticket de Aplicacion.\n Responda las siguientes preguntas para configurar el sistema.\n Para responder use el prefijo %r seguido de su respuesta.\n Ejemplo: %r "Nuevo Titulo del Mensaje", %r si o %r no, segun corresponda.'
            },
            {
                title:'Paso 1: nombre en clave del sistema de ticket', 
                descripcion:' Por favor, indique el nombre en clave para este sistema de ticket. Este nombre se usara para identificar el sistema internamente.\n Responda con "si" para usar el nombre por defecto: "postulaciones".'
            },
            {
                title:'Paso 2: Nombre en clave ya existente', 
                descripcion:' Ya existe un sistema de ticket con este nombre en clave.\n ¿Desea eliminarlo y crear uno nuevo? Responda "si" para eliminar y continuar, "no" para volver al paso 1, o "reparar" para intentar reparar el sistema existente.'
            },
            {
                title:'Paso 3: Titulo del mensaje para abrir ticket', 
                descripcion:` Por favor, indique el titulo del mensaje que se mostrara para abrir un ticket de aplicacion.\n Responda con "si" para usar el titulo por defecto: ${configDef.title}.`
            },
            {
                title:'Paso 4: Descripcion del mensaje para abrir ticket',
                descripcion:` Por favor, indique la descripcion del mensaje que se mostrara para abrir un ticket de aplicacion.\n Responda con "si" para usar la descripcion por defecto: ${configDef.description}.`
            },
            {
                title:'Paso 5: mensaje dentro del ticket(formulario, etc)',
                descripcion:` Por favor, indique el mensaje que se mostrara dentro del ticket, como por ejemplo un formulario o instrucciones.\n Responda con "si" para usar el mensaje por defecto: ${configDef.formInTicketStr}.`,
            },
            {
                title:'Paso 6: Rol a asignar al aprobar aplicacion (Obligatorio)',
                descripcion:` Por favor, mencione el rol que se asignara al usuario cuando su aplicacion sea aprobada.\n ejemplo %r @RolDeEjemplo\n Este paso es obligatorio.`,
            },
            {
                title:'Paso 7: roles de staff con autoridad para responder y gestionar tickets(obligatorio)',
                descripcion:` Por favor, mencione los roles que tendran autoridad para ver y gestionar los tickets de aplicacion.\n Mencione los roles separados por comas.\n ejemplo: %r @RolStaff1, @RolStaff2\n Este paso es obligatorio.`,
            },
            {
                title:'Paso 8: mensaje a enviar al aprobar aplicacion (opcional)',
                descripcion:` Por favor, indique el mensaje que se enviara al usuario cuando su postulacion sea aprobada.\n Responda con "no" para omitir este paso.`,
            },
            {
                title:'Paso 9: imagen para el mensaje de apertura de tickets (opcional)',
                descripcion:` Por favor, indique la URL de una imagen que se mostrara en el mensaje de apertura de tickets.\n Responda con "no" para omitir este paso.`,
            }
        ]
        
        const cantidadPasos = 9;
        
        let pasoActual = await getContext(); // por defecto 0
        let actualconfig = configDef
        actualconfig = await getActualConfig(guild.id, configDef) // funcion para obtener config actual si existe
        let respuestaUsuario = args.slice(3).join(' '); // unir todo lo que venga despues del tercer argumento
        if (args[0] === '%r'){
            respuestaUsuario = args.slice(1).join(' ');
        }
        let cancelado = false;
        const embeds=[]
        // cuerpo de la funcion

        if (respuestaUsuario && ['cancelar', 'cancel', 'exit', 'salir', 'quit', 'q'].includes(respuestaUsuario.toLowerCase().trim())) cancelado = true;
        
        if (pasoActual === 0){
            embeds.push(generateMessageEmbed(respuestasArray[0]))

        }else if (pasoActual === 1){
            // paso 1: nombre en clave
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='si'){
                actualconfig.nombreclave = respuestaUsuario.trim();
            }
            // revisar si ya existe un config con ese nombre en redis
            const existingConfig = await getSimpleRedisJson({ redis, type: `ticket:apply:${guild.id}`, UID: actualconfig.nombreclave });
            if (!existingConfig || Object.keys(existingConfig).length === 0){
                pasoActual++;
            }
        }else if (pasoActual === 2){
            // paso 2: nombre en clave ya existente
            if (respuestaUsuario && respuestaUsuario.toLowerCase() ==='no'){
                // volver al paso 1
                pasoActual = 0;
            }
            // por ahora se va a sobrescribir despues se dara mas opciones al usuario 
        }else if (pasoActual === 3){
            // paso 3: titulo del mensaje
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='si'){
                actualconfig.title = respuestaUsuario.trim()
            }
        }else if (pasoActual === 4){
            // paso 4: descripcion del mensaje
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='si'){
                actualconfig.description = respuestaUsuario.trim()
            }
        }else if (pasoActual === 5){
            // paso 5: mensaje dentro del ticket
            if( respuestaUsuario && respuestaUsuario.toLowerCase() !=='si'){
                actualconfig.formInTicketStr = respuestaUsuario.trim()
            }

        }else if (pasoActual === 6){
            // paso 6: rol a asignar
            if (respuestaUsuario && respuestaUsuario.trim() !=='' ){
                // extraer rol mencionado
                const rolMencionado = message.mentions.roles.first();
                if (rolMencionado){
                    actualconfig.roleToAssign = rolMencionado.id
                }
            }else{
                // no se menciono rol, repetir paso
                pasoActual--;
            }
        }else if (pasoActual === 7){
            // paso 7: roles de staff con autoridad
            if (respuestaUsuario?.trim()) {
                const rolesIds = message.mentions.roles.map(r => r.id)
            
                if (rolesIds.length === 0) {
                    // no mencionó ningún rol válido
                    pasoActual--
                    return
                }
                actualconfig.staffAurthorityRoles = rolesIds
            
                // rolesIds ya es válido
            } else {
                pasoActual--
            }
        }else if (pasoActual === 8){
            // paso 8: mensaje al aprobar aplicacion
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='no'&& respuestaUsuario.trim() !=='' ){
                actualconfig.MessagePostApproveStr = respuestaUsuario.trim();
            }
        }else if (pasoActual === 9){
            // paso 9: imagen para el mensaje de apertura de tickets
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='no'&& respuestaUsuario.trim() !=='' ){
                actualconfig.imageUrl = respuestaUsuario.trim();
            }
        }
        pasoActual++;

        // MENSAJE PARA pasos 1 a 8
        if (pasoActual <= cantidadPasos && !cancelado){
            embeds.push(generateMessageEmbed(respuestasArray[pasoActual]))
        }
        


        // si paso 9 crear canal y mensaje
        if (pasoActual == cantidadPasos+1 && !cancelado){
            
            embeds.push(generateMessageEmbed(
                {
                    title:'Configuracion Completa', 
                    descripcion:`se ha completado la configuracion del sistema de ticket de ${actualconfig.nombreclave}.\n Se creara la categoria, canales y mensaje para abrir tickets de aplicacion.`,
                    color:'#00ff00',
                }
            ))
            
            const embedVe=[]
            embedVe.push(generateMessageEmbed(
                {
                    title:actualconfig.title, 
                    descripcion:actualconfig.description,
                    imgUrl:actualconfig.imageUrl,
                    color:'#0099ff',
                }
            ))
            embedVe.push(generateMessageEmbed(
                {
                    title:`Postulacion`,
                    descripcion:`Para abrir un ticket de postulacion, haga click en el boton de abajo.`,
                    color:'#0099ff',
                    
                }
            ))
            actualconfig = await createSistemApply(client, guild, actualconfig, embedVe);
            
            savConfigFinal(guild.id, actualconfig);
            

        }



        // final guardar paso
        if (!cancelado && pasoActual <= cantidadPasos){
         saveContext(pasoActual);
         saveMomentActualConfig(guild.id, actualconfig);
        }else{
            delContext();
            redis.del(`configTicketApply:${guild.id}`); // borrar config temporal
        }
    

        message.reply({embeds:embeds})

        
        
        
        
        
        
        
        // FUNCIONES AUXILIARES
        async function reparar(client, config){
            // funcion momentania para reparar un mal abito de ids
            const embedVe=[]
            embedVe.push(generateMessageEmbed(
                {
                    title:config.title, 
                    descripcion:config.welcomeMessage,
                    imgUrl:config.imageUrl,
                    color:'#0099ff',
                }
            ))
            embedVe.push(generateMessageEmbed(
                {
                    title:`Verificacion de Usuario`,
                    descripcion:actualconfig.description,
                    color:'#0800ff',
                    
                }
            ))
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("verifyUserBtn")
                    .setLabel('Verificar')
                    .setEmoji('✅') 
                    .setStyle(ButtonStyle.Primary)
            );
            const body = {
                content: '',
                embeds: embedVe,
                components: [row]
            }
            findAndEditMessageText(client, config.channelId, config.messageId, body)
            
        }
        
        async function createSistemApply(client, guild, config, embeds){
            const btnId = 'ticket:apply:create:' + config.nombreclave; 
            // crear canal de texto
            const permisos=[
                {
                    id: guild.roles.everyone.id,     // @everyone no puede ver ni enviar mensajes
                    allow: [],  
                    deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],       
                },
            ];
            if (config.staffAurthorityRoles && Array.isArray( config.staffAurthorityRoles)){
                for (const roleId of config.staffAurthorityRoles){
                    permisos.push({
                        id: roleId,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                        deny: [],
                    })
                }
            }
            const category = await guild.channels.create({
                name: `Tickets - ${config.nombreclave}`,
                type: ChannelType.GuildCategory,
                permissionOverwrites: permisos,
            });

            const channel = await guild.channels.create({
              name: `postulaciones-${config.nombreclave}`,
              type: ChannelType.GuildText,
              parent: category.id,
                
            }); 
            console.log('canal creado')
            const channelForLogs = await guild.channels.create({
                name: `logs-ticket-${config.nombreclave}`,
                type: ChannelType.GuildText,
                parent: category.id,
            });
            console.log('canal de logs creado')

            

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(btnId)
                    .setLabel('Abrir Ticket')
                    .setEmoji('✅') 
                    .setStyle(ButtonStyle.Primary)
            );

            const message = await channel.send({
                content: '',
                embeds: embeds,
                components: [row]
            });
            console.log('mensaje de apertura de ticket creado')


            config.channelId = channel.id;
            config.messageId = message.id;
            config.categoryId = category.id;
            config.channelForLogsId = channelForLogs.id;
            return config;
            
        
        }

        async function getActualConfig(guildId, config){
            const data = await getRedisJson({ redis, key: `configTicketApply:${guildId}` });
            if (data && Object.keys(data).length > 0 ){
                return data
            }
            return config
        }

    
        async function getContext(){
            let paso= 0
            // pór ahora vacio
            const step = await redis.get(`stepTicketApply:${message.channel.id}`);
            if (step && !isNaN(parseInt(step, 10))) {
                paso = parseInt(step, 10);
            }
            console.log('paso actual sacado de redis:', paso) 
            return paso
        }
        async function saveContext(paso){
            // por ahora vacio
            await redis.set(`stepTicketApply:${message.channel.id}`, paso.toString(), 'EX', 60*8); // expira 
            await redis.set(`response:${message.channel.id}`, 'ticketApply', 'EX', 60*8); // expira en 8 minutos

        }
        async function delContext(){
            await redis.del(`stepTicketApply:${message.channel.id}`);
            await redis.del(`response:${message.channel.id}`);
        }   
        function saveMomentActualConfig(guildId, config){
            saveRedisJsonTTL({ redis, key: `configTicketApply:${guildId}`, json: config, TTL: 60*8 }) // 8 minutos  
        }
        function savConfigFinal(guildId, config){
                // cuando el setup se completa guardar sin TTL
            saveSimpleRedisJson({ redis, type: `ticket:apply:${guildId}`, UID: config.nombreclave, json: config })
        }
            

        
        
        //  message.reply({embeds:[embed1, embed2]})
        




        //let channelName = message.channel; // Por defecto, se utilizará el canal actual
        //let isNewChannel = false
        //let channelId = message.channel.id;

        
        

    }
}

