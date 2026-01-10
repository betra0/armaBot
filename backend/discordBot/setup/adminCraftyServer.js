const { saveRedisNewMessageSubcription, insertAdressTofetcher, saveSimpleRedisJson } = require('../services/insertInRedis');
const { generateMessageEmbed } = require('../services/embedMessageGenerator');
const { getInfoAdressForRedis, getSimpleRedisJson } = require('../services/getFromRedis');
const { parseArgs } = require('../utils/parseArgs');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');



module.exports = {
    description:'comando iteractivo para Configurar un canal de embed De Admin Crafty Server',
    usage:'Iniciador setup adminCraftyServer   o para las respuestas: %r respuestadelusario',
    // entrada de la funcion de cada iteracion: iniciador setup adminCraftyServer respuestadelusario
    // si respuestadelusario es vacio, se inicia el proceso
    // si no leer memoria redis para saber contexto actual

    //ideacion; 
    // paso 1: existe un admin crafty server ya configurado? si/no
    // paso 2: titulo del mensaje
    // paso 3: direccion del servidor crafty
    // paso 4: token crafty
    // PASO 5 
    run: async (message, redis) => {
        console.log('inicio de funcion setup adminCraftyServer')
        const args = parseArgs(message.content); // lista [ '%s', 'setup', 'adminCraftyServer', 'hola', 'que', 'onda' ]
        console.log(args)


        
        const guild = message.guild;
         const configDef = {
            title: 'server Crafty',
            roleToAdmin: null,
            channelId: null,
            messageId: null,
            btnStartId: null,
            btnStopId: null,
            btnBackUpId: null,
            btnRebootId: null,
            craftyToken: null,
            serverEndpoint: null,
            backupId: null,

        };
        const respuestasArray = [
            {
                title:'Configuracion de Admin Crafty Server', 
                descripcion:'Bienvenido al asistente de configuracion de Admin Crafty Server.\n ¿Desea continuar con la configuracion? Responda "si" para continuar o "no" para cancelar el proceso.',
                color:'#0099ff',
            },
            {
                title:'PASO 1: Canal Existente',
                descripcion:'Se ha detectado que ya existe una configuracion de Admin Crafty Server en este servidor.\n ¿Desea eliminar la configuracion actual y crear una nueva? Responda "si" para eliminar o "no" para cancelar el proceso.',
                color:'#ff9900',
            },
            {
                title:'PASO 2: Titulo del Mensaje',
                descripcion:'Por favor, ingrese el titulo que desea para el mensaje de Admin Crafty Server.\n Responda con el titulo deseado o "si" para usar el titulo por defecto (Admin Crafty Server).',
                color:'#0099ff',
            },
            {
                title:'PASO 3: Direccion del Servidor Crafty',
                descripcion:'Por favor, ingrese la ruta del servidor Crafty que desea administrar. ejemplo: http://mi-servidor-crafty.com:8000/api/v2/servers/id  \n Responda con la direccion (obligatoria).',
                color:'#0099ff',
            },
            {
                title:'PASO 4: Token de Admin Crafty',
                descripcion:'Por favor, ingrese el token de admin de Crafty Server.\n Responda con el token (obligatorio).',
                color:'#0099ff',
            },
            {
                title:'PASO 5: Rol de Administrador',
                descripcion:'Por favor, mencione el rol QUE TENDRA AUTORIZACIONPARA HACER REBOOT, BACKUP Y REINICIAR EL SERVIDOR CRAFTY, El boton start estara disponible para todos los usuarios, Responda mencionando el rol (obligatorio).',
                color:'#0099ff',
            },
            {
                title:'Paso 6: Backup ID',
                descripcion:'Por favor, ingrese el ID de la copia de seguridad que desea utilizar. Responda con el ID o "ninguno" o "no" para omitir este paso.',
                color:'#0099ff',
            }
        ]

        const cantidadPasos = 6;

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

        if (pasoActual === 0){
            embeds.push(generateMessageEmbed(respuestasArray[0]))
            if (!actualconfig || !actualconfig.channelId){
                // no hay canal configurado, saltar al paso 2
                pasoActual = 1
            } 
        }else if (pasoActual === 1){
            // paso 1: existe canal, desea eliminar?
            if (respuestaUsuario && respuestaUsuario.toLowerCase() === 'si'){
                // eliminar config actual
                actualconfig = configDef

            }else{
                // cancelar proceso
                embeds.push(generateMessageEmbed({title:'Proceso Cancelado', descripcion:'No se realizaron cambios en la configuracion de verificacion de usuario.'}))
                cancelado = true;
            }     
        }else if (pasoActual === 2){
            // paso 2: titulo del mensaje
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='si'){
                actualconfig.title = respuestaUsuario
            }

        }else if (pasoActual === 3){
            // paso 3: direccion del servidor crafty
            if (respuestaUsuario && respuestaUsuario.trim() !==''){
                actualconfig.serverEndpoint = respuestaUsuario
            }else{
                // no se ingreso direccion, repetir paso
                pasoActual--;
            }

        }else if (pasoActual === 4){
            // paso 4: token crafty
            if (respuestaUsuario && respuestaUsuario.trim() !==''){
                actualconfig.craftyToken = respuestaUsuario
            }
            else{
                // no se ingreso token, repetir paso
                pasoActual--;
            }
        }
        else if (pasoActual === 5){
            // paso 5: rol de administrador
            const roleMention = respuestaUsuario.match(/<@&(\d+)>/);
            if (roleMention){
                const roleId = roleMention[1];
                const role = guild.roles.cache.get(roleId);
                if (role){
                    actualconfig.roleToAdmin = roleId;
                }else{
                    // rol no encontrado, repetir paso
                    pasoActual--;
                }
            }else{
                // no se menciono rol, repetir paso
                pasoActual--;
            }
        }else if (pasoActual === 6){
            // paso 6: backup id
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !== 'no' && respuestaUsuario.toLowerCase() !== 'ninguno'){
                actualconfig.backupId = respuestaUsuario;
            }
        }
        pasoActual++;

        // MENSAJE PARA pasos 1 a 5     
        if (pasoActual <= cantidadPasos && !cancelado){
            embeds.push(generateMessageEmbed(respuestasArray[pasoActual]))
        }
        


        // si paso 8 crear canal y mensaje
        if (pasoActual == cantidadPasos+1 && !cancelado){
            
            embeds.push(generateMessageEmbed(
                {
                    title:'Configuracion Completa', 
                    descripcion:'Se ha completado la configuracion de verificacion de usuario.\n Se ha creado el canal y mensaje de verificacion segun las especificaciones proporcionadas.',
                    color:'#00ff00',
                }
            ))
            // Generar el embed  de administracion de crafty server
            const embedVe=[]
            embedVe.push(generateMessageEmbed(
                {
                    title:actualconfig.title || 'Admin Crafty Server', 
                    descripcion:'Utilice los botones a continuacion para administrar el servidor Crafty.',
                    imgUrl:actualconfig.imageUrl,
                    color:'#0099ff',
                }
            ))
            
            actualconfig = await createAdminServer(guild, actualconfig, embedVe);

        }
        saveACtualConfig(guild.id, actualconfig);



        // final guardar paso
        if (!cancelado && pasoActual <= cantidadPasos){
         saveContext(pasoActual);
        }else{
            delContext();
        }
    

        message.reply({embeds:embeds})

        
        
        
        
        
        
        
        // FUNCIONES AUXILIARES
        
        async function createAdminServer(guild, config, embeds){
            config.btnStartId = 'start_btn_' + guild.id + '_' + Date.now()
            config.btnStopId = 'stop_btn_' + guild.id + '_' + Date.now()
            config.btnBackUpId = 'backup_btn_' + guild.id + '_' + Date.now()
            config.btnRebootId = 'reboot_btn_' + guild.id + '_' + Date.now()

            // crear canal de texto
            const permisos=[
                {
                    id: guild.roles.everyone.id,      
                    allow: [PermissionsBitField.Flags.ViewChannel],  // que lo vean
                    deny: [PermissionsBitField.Flags.SendMessages],       // que no puedan enviar mensajes 
                 
                }
            ]
            
            const channel = await guild.channels.create({
              name: 'admin-crafty-server',
              type: ChannelType.GuildText,
              permissionOverwrites: permisos,
                
            }); 
            console.log('canal creado')
            

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(config.btnStartId)
                    .setLabel('Iniciar')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(config.btnStopId)
                    .setLabel('Detener')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(config.btnBackUpId)
                    .setLabel('Respaldar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(config.btnRebootId)
                    .setLabel('Reiniciar')
                    .setStyle(ButtonStyle.Danger)
            );

            const message = await channel.send({
                content: '',
                embeds: embeds,
                components: [row]
            });

            config.channelId = channel.id;
            config.messageId = message.id;
            return config;
            
        
        }

        async function getActualConfig(guildId, config){
            const data = await getSimpleRedisJson({ redis, type: 'adminCraftyServer:config', UID: guildId });
            if (data && Object.keys(data).length > 0 ){
                return data
            }
            return config
        }

    
        async function getContext(){
            let paso= 0
            // pór ahora vacio
            const step = await redis.get(`stepadminCraftyServer:${message.channel.id}`);
            if (step && !isNaN(parseInt(step, 10))) {
                paso = parseInt(step, 10);
            }
            console.log('paso actual sacado de redis:', paso) 
            return paso
        }
        async function saveContext(paso){
            // por ahora vacio
            await redis.set(`stepadminCraftyServer:${message.channel.id}`, paso.toString(), 'EX', 400); // expira 
            await redis.set(`response:${message.channel.id}`, 'adminCraftyServer', 'EX', 400); // expira en 400 segundos

        }
        async function delContext(){
            await redis.del(`stepadminCraftyServer:${message.channel.id}`);
            await redis.del(`response:${message.channel.id}`);
        }   
        function saveACtualConfig(guildId, config){

            saveSimpleRedisJson({ redis, type: 'adminCraftyServer:config', UID: guildId, json: config })
        }
        // si no hay contexto iniciar proceso
        
        
        //  message.reply({embeds:[embed1, embed2]})
        




        //let channelName = message.channel; // Por defecto, se utilizará el canal actual
        //let isNewChannel = false
        //let channelId = message.channel.id;

        
        

    }
}

