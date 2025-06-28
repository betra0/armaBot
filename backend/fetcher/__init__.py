from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta, timezone
import time
import logging
from redis import Redis
import a2s
import json
import os
import socket
from dotenv import load_dotenv
load_dotenv('../../.env')


# Crear una instancia del scheduler
scheduler = BackgroundScheduler()
scheduler.start()
logging.basicConfig(level=logging.INFO)
isError=False
r = Redis(host=os.getenv("REDISHOST"), port=os.getenv("REDISPORT"), db=0)


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
    r.sadd("ipsTofech", "104.234.7.37:2343")
    r.sadd("ipsTofech", "104.234.7.106:2353")
    #r .sadd("ipsTofech", "192.168.0.27:2363")
    # otra insecion para test 
    # para hset
    """ dictsubEample={"chanelIdExaple":'1234567890'}
    r.hset("adress:sub:status", "104.234.7.8:2363", json.dumps(dictsubEample)) """
def isSubadressInRedis(address):
    res = r.hget("adress:sub:status", address)  # Obtiene el valor de Redis
    res2 = r.hget("adress:sub:playerCountInTitle", address)  # Obtiene el valor de Redis

    if res is None and res2 is None:  # Si no existe, retorna None
        logging.info(f"la direccion {address} no esta en un canal de subcripcion")
        # Si no existe, retorna None
        return None
    else:
        return True
def publishNewChange(adress):
    r.publish("adressChangeInfo", adress)
    logging.info(f"Se ha publicado un cambio en la dirección: {adress}") 


def getInfoAdresFromA2s(ip, port):
    try:
        serverAddress = (ip, int(port))
        serverInfo = a2s.info(serverAddress, timeout=8)
        players = a2s.players(serverAddress, timeout=8)
        
        # Convertir jugadores a diccionarios
        playerslistFormat = [player.__dict__ for player in players]
        logging.info(f" estos son los players: {playerslistFormat}")
        return {
            "info": serverInfo.__dict__,
            "players": playerslistFormat,
            "updatedInfo": datetime.now(timezone.utc).isoformat(),
            "status":True
            }
    except socket.timeout:
        logging.error(f"no se pudo establecer conexion con el servidor {ip}:{port}")
        return {
            "info": {},
            "players": [],
            "updatedInfo": None,
            "status":False
        }
    except OSError as e:
        logging.error(f"Error de conexión al consultar la información de la ip: {ip} en el puerto: {port} : {e}")
        return
    except Exception as e:
        logging.error(f"Error Desconocido al consultar la información de la ip: {ip} en el puerto: {port} : {e}")
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
    # hacer una comparacion de la info para determinar si cambio o no
    #logging.info(f"la info de la direccion es :\n {adressInfo}, \n la info de la otra direccion es \n: {otherAdressInfo}\n")
    a= deep_compare(adressInfo["info"], otherAdressInfo["info"], ignore_key=["ping", "keywords"])
    b= compare_namesInList(adressInfo["players"], otherAdressInfo["players"])
    c = adressInfo.get("status", False) == otherAdressInfo.get("status", False)
    logging.info(f"la comparacion de la info es : {a} y {b} y {c}")
    #return False
    return a and b and c

def compare_namesInList(list1, list2):
    # Extraer los valores de la clave "name" en ambas listas
    names1 = {d["name"] for d in list1}
    names2 = {d["name"] for d in list2}

    # Comparar los conjuntos (ignora el orden automáticamente)
    return names1 == names2
def compareAmoutOfPlayersAndPublishForRedis(dict1Info, dict2Info, adress):
    logging.info(f"la info de dict1 es : {dict1Info}, la info de dict2 es : {dict2Info}")

    if dict1Info is None and dict2Info is None:
        return False
    elif dict1Info is None or dict2Info is None:
        pass
    # si el estatus es diferente al compara es prioridad avisarle al redis 
    elif dict1Info.get("status", False) != dict2Info.get("status", False): 
        pass
    elif (dict1Info["info"]["player_count"] and dict2Info["info"]["player_count"]) and (dict1Info["info"]["player_count"]) != (dict2Info["info"]["player_count"]): 
        pass
    else: 
        return False
    r.publish("adressChangePlayerCount", adress)
    logging.info('se aviso a titleChanel que cambio status o cantidad de jugadores')
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

def debugPublishRedis():
   #get alladress
    addressList = getIpForRedis()
    for address in addressList:
        logging.info(f"la adress es : {address}")
        r.publish("adressChangeInfo", address)
        r.publish("adressChangePlayerCount", address)
    
if  __name__ == "__main__":
    # primero leer  lo que ya hay en el redis para debug
    r2=searchAdressInRedis("104.234.7.8:2363")
    logging.info(f"\n la info en redis es : {r2}\n")
    insertIpInRedis()
    time.sleep(8)
    refreshIpsinfo()
    debugPublishRedis()
    # Programar un evento recurrente cada hora
    scheduler.add_job(
        refreshInfo,  # Función a ejecutar
        trigger=IntervalTrigger(seconds=int(os.getenv("REFRESH_INTERVAL"))),
        id="refreshInfoClanPeriodic"  # ID único para evitar duplicados
    )

    # Mantener el scheduler en ejecución
    try:
        while True:

            logging.info("¡Hola Mundo!")

            time.sleep(60*60*3)  # Pausa para evitar un uso excesivo de CPU
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
