const { infoServerFormatted } = require('../models/adressInfoServerFormat');

const getListRedisIpSubcription = async ({type='status', adress=null, value=null, redis })=>{
    // vaslue  e el valor obtenido sin formatear o sin parsear
    //
    if (!adress && !value){
        throw new Error('No se han proporcionado los datos necesarios.');
    } else if(!value){
        value = await redis.hget(`adress:sub:${type}`, adress)
    }
    const clanData= value ? JSON.parse(value) : {}
    // retornar una lista de objetos
    return Object.values(clanData)
    
}

const getInfoAdressForRedis = async ({ adress=null, redis})=>{ 
    if (!adress){
        throw new Error('No se han proporcionado los datos necesarios.');
    }
    let infoAdress = await redis.hget(`adressInfo`, adress)
    infoAdress = infoAdress ? JSON.parse(infoAdress) : null
    let imgsAdress = await redis.hget(`adressImgs`, adress)
    imgsAdress = imgsAdress ? JSON.parse(imgsAdress) : null
    // meter img en la info
    if (infoAdress && imgsAdress){
        infoAdress.imgs = imgsAdress
    }
    // formatear info del adress
    if (infoAdress){
        //console.log("esta es la info pre formated; ", infoAdress)
        infoAdress = infoServerFormatted({ infoAdress })
    }
    return infoAdress

}
const getSimpleRedisJson = async ({ redis, type = 'defectData', UID }) => {
  if (!redis) {
    throw new Error('Missing required parameter: redis client');
  }

  if (!UID) {
    throw new Error('Missing required parameter: UID');
  }

  const data = await redis.hget(`databot:${type}`, UID);
  return data ? JSON.parse(data) : null;
};

module.exports = {
    getListRedisIpSubcription,
    getInfoAdressForRedis,
    getSimpleRedisJson
}