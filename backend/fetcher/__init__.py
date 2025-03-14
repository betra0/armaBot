from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta, timezone
import time
import logging
from redis import Redis
import a2s
import json

# Crear una instancia del scheduler
scheduler = BackgroundScheduler()
scheduler.start()
logging.basicConfig(level=logging.INFO)
isError=False
r = Redis(host='localhost', port=6379, db=0)


def refreshInfo():
    global isError
    errorId = "Error"  # ID único para identificar el evento
    try:
        refreshIpsinfo()
        logging.info("funcion ejecutada.")
        isError=False
        
    except Exception as e:
        logging.error(f"\n ocurrio Un error al ejecutar la funcion Programada 'refreshIPsInfo : {e}\n")
        if not scheduler.get_job(errorId) and not isError:
            isError=True
            logging.error(f"\n Preparandose para reintentar la ejecución de la función 'refreshInfoClan' en 30 segundos.\n")
            scheduler.add_job(
                refreshInfo,  # Función a ejecutar
                trigger=DateTrigger(run_date=(datetime.now() + timedelta(seconds=60))), 
                id=errorId 
            )
        logging.error(f"\n Error al ejecutar el Actualizar la Info de las ips: {e}\n")
     
def dividirAdress(address):
    return address.split(":")


def refreshIpsinfo():
    logging.info("Actualizando la información del las ips...")
    addressList = getIpForRedis()
    for address in addressList:
        ip, port = dividirAdress(address)
        logging.info(f"Consultando la información de la ip: {ip} en el puerto: {port}")
        # Consultar la información de la ip
        try:
            infoadresDict = getInfoAdresFromA2s(ip, port)
            if infoadresDict:
                #buscar y comparar con la info en la base de datos 
                oldAdressInfo = searchAdressInRedis(address)
                if oldAdressInfo and compareAdressinfo(oldAdressInfo, infoadresDict):
                    logging.info("¡La información no ha cambiado!")
                elif oldAdressInfo:
                    saveAdressInRedis(address, infoadresDict)
                    # avisar de cambio en redis
                    if isSubadressInRedis(address):
                        logging.info("¡avisar en redis que la info cambio!")
                        publishNewChange(address)
                        #comparar la cantidad de jugadores y avisar a redis
                        # si la cantidad de jugadoeres cambio entonces le avisara a redis
                        compareAmoutOfPlayersAndPublishForRedis(oldAdressInfo, infoadresDict, address)
                else:
                    saveAdressInRedis(address, infoadresDict)
                    if isSubadressInRedis(address):
                        logging.info("¡avisar en redis que la info cambio!")
                        publishNewChange(address)
                        #comparar la cantidad de jugadores y avisar a redis
                        # si la cantidad de jugadoeres cambio entonces le avisara a redis
                        compareAmoutOfPlayersAndPublishForRedis(oldAdressInfo, infoadresDict, address)





                

                
        except Exception as e: 
            logging.error(f"Error al consultar la información de la ip: {ip} en el puerto: {port} : {e}")
            raise e
    logging.info("¡Información actualizada exitosamente!")
    pass



def getIpForRedis():
    logging.info("Obteniendo las ips para consultar de redis.")
    ips = r.smembers("ipsTofech")
    if ips == None:
        logging.info("No hay ips para consultar.")
        return set()
    else: 
        return set([ip.decode("utf-8") for ip in ips])
        
def insertIpInRedis():
    logging.info("Insertando las ips para consultar de redis.")
    r.sadd("ipsTofech", "104.234.7.8:2363")
    r.sadd("ipsTofech", "104.234.7.16:2353")
    #r .sadd("ipsTofech", "192.168.0.27:2363")
    # otra insecion para test 
    # para hset
    """ dictsubEample={"chanelIdExaple":'1234567890'}
    r.hset("adress:sub:status", "104.234.7.8:2363", json.dumps(dictsubEample)) """
def isSubadressInRedis(address):
    res = r.hget("adress:sub:status", address)  # Obtiene el valor de Redis

    if res is None:  # Si no existe, retorna None
        return None
    else:
        return True
def publishNewChange(adress):
    r.publish("adressChangeInfo", adress)
    logging.info(f"Se ha publicado un cambio en la dirección: {adress}")
def getInfoAdresFromA2s(ip, port):
    try:
        serverAddress = (ip, int(port))
        serverInfo = a2s.info(serverAddress)
        players = a2s.players(serverAddress)
        
        # Convertir jugadores a diccionarios
        playerslistFormat = [player.__dict__ for player in players]
        logging.info(f" estos son los players: {playerslistFormat}")
        return {
            "info": serverInfo.__dict__,
            "players": playerslistFormat,
            "updatedInfo": datetime.now(timezone.utc).isoformat()
            }
    except Exception as e:
        logging.error(f"Error al consultar la información de la ip: {ip} en el puerto: {port} : {e}")
        #raise e
        return None
def searchAdressInRedis(address):
    res = r.hget("adressInfo", address)  # Obtiene el valor de Redis

    if res is None:  # Si no existe, retorna None
        return None
    else:
        return json.loads(res.decode("utf-8"))
def saveAdressInRedis(address, info):
    r.hset("adressInfo", address, json.dumps(info))  # Guarda la información en Redis
def compareAdressinfo(adressInfo, otherAdressInfo):
    # hacer una comparacion profunda entre los dos diccionarios ignorando la clave upda
    a= deep_compare(adressInfo["info"], otherAdressInfo["info"], ignore_key=["ping", "keywords"])
    b= compare_namesInList(adressInfo["players"], otherAdressInfo["players"])
    logging.info(f"la comparacion de la info es : {a} y {b}")
    #return False
    return a and b

def compare_namesInList(list1, list2):
    # Extraer los valores de la clave "name" en ambas listas
    names1 = {d["name"] for d in list1}
    names2 = {d["name"] for d in list2}

    # Comparar los conjuntos (ignora el orden automáticamente)
    return names1 == names2
def compareAmoutOfPlayersAndPublishForRedis(dict1Info, dict2Info, adress):
    # Comparar la cantidad de jugadores
    if not (dict1Info["info"]["player_count"]) == (dict2Info["info"]["player_count"]):
        # Publicar en Redis
        r.publish("adressChangePlayerCount", adress)
        logging.info('se supone que ya se aviso del cambio de players ')

        return True


def deep_compare(dict1, dict2, ignore_key=[]):
    # Si ambos son diccionarios, compararlos recursivamente
    if isinstance(dict1, dict) and isinstance(dict2, dict):
        # Si las claves son iguales, compararlas recursivamente
        if dict1.keys() != dict2.keys():
            return False
        for key in dict1:
            # Si la clave es la que se debe ignorar, continuar sin comparar
            if key in ignore_key:
                continue
            if not deep_compare(dict1[key], dict2[key], ignore_key):
                return False
        return True
    # Si son valores simples (no diccionarios), compararlos directamente
    return dict1 == dict2
    
if  __name__ == "__main__":
    # primero leer  lo que ya hay en el redis para debug
    r2=searchAdressInRedis("104.234.7.8:2363")
    logging.info(f"la info en redis es : {r2}\n")
    insertIpInRedis()
    refreshIpsinfo()
    # Programar un evento recurrente cada hora
    scheduler.add_job(
        refreshInfo,  # Función a ejecutar
        trigger=IntervalTrigger(minutes=4),  # Intervalo de tiempo
        id="refreshInfoClanPeriodic"  # ID único para evitar duplicados
    )

    # Mantener el scheduler en ejecución
    try:
        while True:

            logging.info("¡Hola Mundo!")

            time.sleep(60*60*3)  # Pausa para evitar un uso excesivo de CPU
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
