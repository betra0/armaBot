const { saveRedisNewMessageSubcription, insertAdressTofetcher, saveSimpleRedisJson } = require('../services/insertInRedis');
const { generateMessageEmbed } = require('../services/embedMessageGenerator');
const { GenerateEmbedStatusServer } = require('../services/embedStatusServer');
const { getInfoAdressForRedis, getSimpleRedisJson } = require('../services/getFromRedis');
const { parseArgs } = require('../utils/parseArgs');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');



module.exports = {
    description:'comando iteractivo para Configurar un canal y mensaje de verificación de usuario',
    usage:'Iniciador setup checkUser   o para las respuestas: %r respuestadelusario',
    // entrada de la funcion de cada iteracion: iniciador setup checkUser respuestadelusario
    // si respuestadelusario es vacio, se inicia el proceso
    // si no leer memoria redis para saber contexto actual

    //ideacion; 
    // 1 preguntaa(solo si el mensajechexuser si existe) detectamos que ya existe una verificacion de usuario desea eliminar? 
    //            si/no(quit)  (si dise que no se cancela todo) 
    // 2 Titulo del mensaje de verificacion Default: "Verificacion de Usuario" desea mantenerlo? si/"nuevo titulo"
    // 3 Mensaje de bienvenida Default: "bienvenido a {NombredeComunidad}" desea mantenerlo? si/"mensaje nuevo"
    // 4 Descripcion del mensaje de verificacion Default: "Para poder ver el resto de canales raciona aqui con " desea mantenerlo? si/"nueva descripcion"
    // 5 enlaces a canales importantes post verificacon, "mecione canales destacados post verificacion separados por comas" o "ninguno"
    //posible
    // 6 añadir foto al mensaje de verificacion? si/"url de la imagen"
    // 7 Rol a asignar al verificar "mencione el rol a asignar o id

    // 
    run: async (message, redis) => {
        console.log('inicio de funcion checkUser')
        const args = parseArgs(message.content); // lista [ '%s', 'setup', 'checkUser', 'hola', 'que', 'onda' ]
        console.log(args)
        
        const respuestasArray = [
            {
                title:'Setup CheckUser Iniciado', 
                descripcion:'Iniciando proceso de configuracion de verificacion de usuario.\n Responda las siguientes preguntas para configurar el canal.\n Para responder use el prefijo %r seguido de su respuesta.\n Ejemplo: %r "Nuevo Titulo del Mensaje", %r si o %r no, segun corresponda.'
            },
            {
                title:'Paso 1: Canal de Verificacion ya existente', 
                descripcion:'ya existe un canal de verificacion de usuario configurado en este servidor.\n Desea eliminar la configuracion actual y crear una nueva? Responda con %r si para eliminar o %r no para cancelar el proceso.'
            },
            {
                title:'Paso 2: Titulo del Mensaje de Verificacion', 
                descripcion:'El titulo actual del mensaje de verificacion es: "Verificacion de Usuario"\n Desea mantenerlo? Responda con %r si para mantenerlo o %r "Nuevo Titulo" para cambiarlo.'
            },
            {
                title:'Paso 3: Mensaje de Bienvenida', 
                descripcion:'El mensaje de bienvenida actual es: "Bienvenido a {NombredeComunidad}"\n Desea mantenerlo? Responda con %r si para mantenerlo o %r "Nuevo Mensaje" para cambiarlo.'
            },
            {
                title:'Paso 4: Descripcion del Mensaje de Verificacion', 
                descripcion:'La descripcion actual del mensaje de verificacion es: "Para poder ver el resto de canales raciona aqui con"\n Desea mantenerla? Responda con %r si para mantenerla o %r "Nueva Descripcion" para cambiarla.'
            },
            {
                title:'Paso 5: Canales Importantes Post Verificacion', 
                descripcion:'Actualmente no hay canales importantes configurados post verificacion.\n Mencione los canales destacados post verificacion separados por comas o responda %r ninguno si no desea añadir ninguno.'
            },
            {
                title:'Paso 6: Imagen del Mensaje de Verificacion', 
                descripcion:'Actualmente no hay imagen configurada para el mensaje de verificacion.\n Desea añadir una imagen? Responda con %r no o para añadir %r "URL de la Imagen" para especificar una URL.'
            },
            {
                title:'Paso 7: Rol a Asignar al Verificar', 
                descripcion:'Mencione el rol a asignar con %r @rol'
            },

        ]
        const guild = message.guild;
         const configDef = {
            title: 'Verificacion de Usuario',
            welcomeMessage: `Bienvenido a ${guild.name}`,
            description: 'Para poder ver el resto de canales haga clic en "Verificar"',
            importantChannels: [],
            imageUrl: null,
            roleToAssign: null,
            channelId: null,
            messageId: null,
            btnId: null,
        };
        const cantidadPasos = 7
        
        let pasoActual = await getContext(); // por defecto 0
        let actualconfig = configDef
        actualconfig = await getActualConfig(guild.id, configDef) // funcion para obtener config actual si existe
        let respuestaUsuario = args.slice(3).join(' '); // unir todo lo que venga despues del tercer argumento
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
            // paso 3: mensaje de bienvenida
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='si'){
                actualconfig.welcomeMessage = respuestaUsuario
            }
        }else if (pasoActual === 4){
            // paso 4: descripcion del mensaje
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='si'){
                actualconfig.description = respuestaUsuario
            }
        }else if (pasoActual === 5){
            // paso 5: canales importantes
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='no' && respuestaUsuario.toLowerCase() !=='ninguno' && respuestaUsuario.trim() !==''){
                // parsear canales separados por comas
                const canales = respuestaUsuario.split(',').map(c => c.trim());
                actualconfig.importantChannels = []; // por ahora vacio
            }
        }else if (pasoActual === 6){
            // paso 6: imagen del mensaje
            if (respuestaUsuario && respuestaUsuario.toLowerCase() !=='no' && respuestaUsuario.trim() !==''){
                actualconfig.imageUrl = respuestaUsuario
            }
        }else if (pasoActual === 7){
            // paso 7: rol a asignar
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
                
            
        }
        pasoActual++;

        // MENSAJE PARA pasos 1 a 7 
        if (pasoActual <= cantidadPasos && !cancelado){
            embeds.push(generateMessageEmbed(respuestasArray[pasoActual]))
        }
        


        // si paso 8 crear canal y mensaje
        if (pasoActual == cantidadPasos+1 && !cancelado){
            
            embeds.push(generateMessageEmbed({title:'Configuracion Completa', descripcion:'Se ha completado la configuracion de verificacion de usuario.\n Se ha creado el canal y mensaje de verificacion segun las especificaciones proporcionadas.'}))
            let body= `${actualconfig.welcomeMessage}\n\n${actualconfig.description}\n\n`
            const embedVe=[]
            embedVe.push(generateMessageEmbed({title:actualconfig.title, descripcion:body}))
            actualconfig = await createVerification(guild, actualconfig, embedVe);

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
        
        async function createVerification(guild, config, embeds){
            config.btnId = 'verificacion_btn_' + guild.id + '_' + Date.now()
            // crear canal de texto
            const permisos=[
                {
                    id: guild.roles.everyone.id,      
                    allow: [PermissionsBitField.Flags.ViewChannel],  // que lo vean
                    deny: [PermissionsBitField.Flags.SendMessages],       // que no puedan enviar mensajes 
                 
                }
            ]
            if (config.roleToAssign){
                permisos.push(
                    {
                        id: config.roleToAssign,      
                        deny: [PermissionsBitField.Flags.ViewChannel],  // que no lo vean
                    }
                )
            }

            const channel = await guild.channels.create({
              name: 'Verificacion',
              type: ChannelType.GuildText,
              permissionOverwrites: permisos,
                
            }); 
            console.log('canal creado')
            

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(config.btnId)
                    .setLabel('Verificar')
                    .setStyle(ButtonStyle.Primary)
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
            const data = await getSimpleRedisJson({ redis, type: 'checkUser:config', UID: guildId });
            if (data && Object.keys(data).length > 0 ){
                return data
            }
            return config
        }

    
        async function getContext(){
            let paso= 0
            // pór ahora vacio
            const step = await redis.get(`stepCheckUser:${message.channel.id}`);
            if (step && !isNaN(parseInt(step, 10))) {
                paso = parseInt(step, 10);
            }
            console.log('paso actual sacado de redis:', paso) 
            return paso
        }
        async function saveContext(paso){
            // por ahora vacio
            await redis.set(`stepCheckUser:${message.channel.id}`, paso.toString(), 'EX', 400); // expira 
            await redis.set(`response:${message.channel.id}`, 'checkUser', 'EX', 400); // expira en 400 segundos

        }
        async function delContext(){
            await redis.del(`stepCheckUser:${message.channel.id}`);
            await redis.del(`response:${message.channel.id}`);
        }   
        function saveACtualConfig(guildId, config){

            saveSimpleRedisJson({ redis, type: 'checkUser:config', UID: guildId, json: config })
        }
        // si no hay contexto iniciar proceso
        
        
        //  message.reply({embeds:[embed1, embed2]})
        




        //let channelName = message.channel; // Por defecto, se utilizará el canal actual
        //let isNewChannel = false
        //let channelId = message.channel.id;

        
        

    }
}

