var Accessory, Service, Characteristic, UUIDGen;

const fs = require('fs');
const packageFile = require("./package.json");
const mqtt = require("mqtt");

module.exports = function(homebridge) {
    if(!isConfig(homebridge.user.configPath(), "accessories", "acpartner")) {
        return;
    }
    
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerAccessory('homebridge-mqtt-acpartner', 'acpartner', acpartner);
}

function isConfig(configFile, type, name) {
    var config = JSON.parse(fs.readFileSync(configFile));
    if("accessories" === type) {
        var accessories = config.accessories;
        for(var i in accessories) {
            if(accessories[i]['accessory'] === name) {
                return true;
            }
        }
    } else if("platforms" === type) {
        var platforms = config.platforms;
        for(var i in platforms) {
            if(platforms[i]['platform'] === name) {
                return true;
            }
        }
    } else {
    }
    
    return false;
}

function acpartner(log, config) {
    if(null == config) {
        return;
    }

    this.log = log;
    this.name = config["name"];
    this.mqtttemp = config["mqtttemp"];
    this.mode = Characteristic.CurrentHeaterCoolerState.INACTIVE;
    this.modestate = Characteristic.TargetHeaterCoolerState.AUTO;
    this.maxTemperature = 18;
    this.Temperature = 26;
    this.fanspeed = 100;
    var that = this;
    this.serviceType = config && config['serviceType'] || "HeaterCooler";
    
    var mqttCfg = config["mqtt"];
    var mqttHost = "mqtt://" + (mqttCfg && mqttCfg['server'] || "127.0.0.1");
    var mqttPrefix = mqttCfg && mqttCfg['prefix'] || "homebridge";
    var mqttUsername = mqttCfg && mqttCfg['username'] || "mqtt";
    var mqttPassword = mqttCfg && mqttCfg['password'] || "mqtt";
    var mqttOptions = {
        clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
        username: mqttUsername,
        password: mqttPassword
    };
    this.mqttTopic = {
        "power": mqttPrefix + "/ac/cmnd/power",
        "mode": mqttPrefix + "/ac/cmnd/mode",
        "temp": mqttPrefix + "/ac/cmnd/temp",
        "fanspeed": mqttPrefix + "/ac/cmnd/fanspeed",
        "swingv": mqttPrefix + "/ac/cmnd/swingv",
        "light": mqttPrefix + "/ac/cmnd/light",
        "powerstat": mqttPrefix + "/ac/stat/power",
        "modestat": mqttPrefix + "/ac/stat/mode",
        "tempstat": mqttPrefix + "/ac/stat/temp",
        "fanspeedstat": mqttPrefix + "/ac/stat/fanspeed",
        "swinghstat": mqttPrefix + "/ac/stat/swingv",
        "lightstat": mqttPrefix + "/ac/stat/light"
        
    };

    try {
        this.mqttClient = mqtt.connect(mqttHost, mqttOptions);
        that.mqttClient.subscribe(that.mqttTopic['powerstat']);
        that.mqttClient.subscribe(that.mqttTopic['modestat']);
		that.mqttClient.subscribe(that.mqttTopic['tempstat']);
		that.mqttClient.subscribe(that.mqttTopic['fanspeedstat']);
        that.mqttClient.subscribe(that.mqttTopic['swinghstat']);
		that.mqttClient.subscribe(that.mqttTopic['lightstat']);
        that.mqttClient.subscribe(this.mqtttemp);
    } catch(e) {
    }
}

acpartner.prototype = {
    getServices: function() {
        var that = this;
        var services = [];
        
        var infoService = new Service.AccessoryInformation();
        infoService
            .setCharacteristic(Characteristic.Manufacturer, "Hassbian-ABC")
            .setCharacteristic(Characteristic.Model, "Midea")
            .setCharacteristic(Characteristic.SerialNumber, "B0F893277C32")
            .setCharacteristic(Characteristic.FirmwareRevision, packageFile.version);
        services.push(infoService);
        
			var heaterCoolerService = new Service.HeaterCooler(that.name);
			var activeCharacteristic = heaterCoolerService.getCharacteristic(Characteristic.Active);
			var currentHeaterCoolerStateCharacteristic = heaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState);
			var targetHeaterCoolerStateCharacteristic = heaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState);
			var currentTemperatureCharacteristic = heaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature);
		    var swingModeCharacteristic = heaterCoolerService.addCharacteristic(Characteristic.SwingMode);
            var coolingThresholdTemperatureCharacteristic = heaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature);
			var heatingThresholdTemperatureCharacteristic = heaterCoolerService.addCharacteristic(Characteristic.HeatingThresholdTemperature);
		    var rotationSpeedCharacteristic = heaterCoolerService.addCharacteristic(Characteristic.RotationSpeed);
            rotationSpeedCharacteristic.setProps({
		        minValue: 0, 
                maxValue: 100, 
                minStep: 25, 
            });
            coolingThresholdTemperatureCharacteristic.setProps({
		        minValue: 17, 
                maxValue: 30, 
                minStep: 1, 
            });
            heatingThresholdTemperatureCharacteristic.setProps({
		        minValue: 17, 
                maxValue: 30, 
                minStep: 1, 
            });            
            
            
            activeCharacteristic
                .on('set', (value, callback) => {
                    if (value == Characteristic.Active.INACTIVE) {
                          that.mqttClient.publish(that.mqttTopic['power'], "off");
                          that.mqttClient.publish(that.mqttTopic['swingv'], "off");
                          currentHeaterCoolerStateCharacteristic.updateValue(Characteristic.CurrentHeaterCoolerState.INACTIVE);
                          that.lastControlFlag = (new Date()).getTime();
                          callback(null);
                    } else {
                          that.mqttClient.publish(that.mqttTopic['power'], "on");
                          if (this.mode = Characteristic.CurrentHeaterCoolerState.INACTIVE) {
                              targetHeaterCoolerStateCharacteristic.setValue(this.modestate);
                          }
                          if (targetHeaterCoolerStateCharacteristic.value === Characteristic.TargetHeaterCoolerState.AUTO) { 
                              heatingThresholdTemperatureCharacteristic.updateValue(this.maxTemperature);
                              coolingThresholdTemperatureCharacteristic.updateValue(this.Temperature);   
                          } else if (targetHeaterCoolerStateCharacteristic.value !== Characteristic.TargetHeaterCoolerState.AUTO) {
                              coolingThresholdTemperatureCharacteristic.updateValue(this.Temperature); 
                              heatingThresholdTemperatureCharacteristic.updateValue(this.Temperature);                    
                          }
                          that.lastControlFlag = (new Date()).getTime();
                          callback(null);
                    }
            });
                
            targetHeaterCoolerStateCharacteristic
                .on('set', (value, callback) => {
                    if (value === Characteristic.TargetHeaterCoolerState.AUTO) {
                        
                        that.mqttClient.publish(that.mqttTopic['mode'], "auto");               
                    } else if (value === Characteristic.TargetHeaterCoolerState.HEAT) {
                        that.mqttClient.publish(that.mqttTopic['mode'], "heat");
                        currentHeaterCoolerStateCharacteristic.updateValue(Characteristic.CurrentHeaterCoolerState.HEATING);
                    } else if (value === Characteristic.TargetHeaterCoolerState.COOL) {
                        that.mqttClient.publish(that.mqttTopic['mode'], "cool");
                        currentHeaterCoolerStateCharacteristic.updateValue(Characteristic.CurrentHeaterCoolerState.COOLING);
                    }
                    that.lastControlFlag = (new Date()).getTime();
                    callback(null);
                });
             
            swingModeCharacteristic
                 .on('set', (value, callback) => {
                     var valueStr = value ? "auto" : "off";
                     that.mqttClient.publish(that.mqttTopic['swingv'], valueStr);
                     that.lastControlFlag = (new Date()).getTime();
                     callback(null);
                 });
                           

            coolingThresholdTemperatureCharacteristic 
                .on('set', (value, callback) => { 
                         this.Temperature = value;               
                         var valueStr = value.toString();
                         that.mqttClient.publish(that.mqttTopic['temp'], valueStr);
                         that.lastControlFlag = (new Date()).getTime();
                         callback(null);
                });
                
                 
            heatingThresholdTemperatureCharacteristic
                .on('set', (value, callback) => {  
                  if (targetHeaterCoolerStateCharacteristic.value === Characteristic.TargetHeaterCoolerState.AUTO) { 
                           this.maxTemperature = value;
                   } else {
                       this.Temperature = value;
                        var valueStr = value.toString();
                         that.mqttClient.publish(that.mqttTopic['temp'], valueStr);
                   }
                   that.lastControlFlag = (new Date()).getTime();
                   callback(null);
                });
            
            rotationSpeedCharacteristic
                .on('set', (value, callback) => { 
                    this.fanspeed = value;                
                    if (value == 25) {
                        that.mqttClient.publish(that.mqttTopic['fanspeed'], "min");
                    } else if (value == 50) {
                        that.mqttClient.publish(that.mqttTopic['fanspeed'], "medium");
                    } else if (value == 75) {
                        that.mqttClient.publish(that.mqttTopic['fanspeed'], "max");
                    } else {
                        that.mqttClient.publish(that.mqttTopic['fanspeed'], "auto");
                    }
                    that.lastControlFlag = (new Date()).getTime();
                    callback(null);
                });
               
			
			that.mqttClient.on('message', (topic, message) => {
                if((new Date()).getTime() - that.lastControlFlag < 1000) {
                    return;
                }
                
               if(topic == that.mqttTopic['powerstat']) {
                    var value = (message == 'on' ? true : false);
                   activeCharacteristic.updateValue(value);

			    } else if (topic == that.mqttTopic['tempstat']) {
                    var value = parseInt(message);
                    this.Temperature = value;
                    
                    if (targetHeaterCoolerStateCharacteristic.value === Characteristic.TargetHeaterCoolerState.AUTO) { 
                          heatingThresholdTemperatureCharacteristic.updateValue(this.maxTemperature);
                          coolingThresholdTemperatureCharacteristic.updateValue(this.Temperature);   
                    } else if (targetHeaterCoolerStateCharacteristic.value !== Characteristic.TargetHeaterCoolerState.AUTO) {
                         coolingThresholdTemperatureCharacteristic.updateValue(this.Temperature); 
                         heatingThresholdTemperatureCharacteristic.updateValue(this.Temperature);                    
                    }
                } else if (topic == that.mqttTopic['swinghstat']) {
                    var value = (message == 'auto' ? true : false);
                    swingModeCharacteristic.updateValue(value);
                } else if (topic == that.mqttTopic['fanspeedstat']) {
                    var value = message;
                    if (value == "auto") {
                        this.fanspeed = 100;
                    } else if (value == "min") {
                        this.fanspeed = 25;
                    } else if (value == "medium") {
                        this.fanspeed = 50;
                    } else if (value == "max") {
                        this.fanspeed = 75;
                    }
                    rotationSpeedCharacteristic.updateValue(this.fanspeed);
                } else if (topic == that.mqttTopic['modestat']) {
                    var value = message;
                    if (value == "auto") {
                        this.modestate = Characteristic.TargetHeaterCoolerState.AUTO;
                    } else if (value == "heat") {
                        this.mode = Characteristic.CurrentHeaterCoolerState.HEATING;
                        this.modestate = Characteristic.TargetHeaterCoolerState.HEAT;
                    } else if (value == "cool") {
                        this.mode = Characteristic.CurrentHeaterCoolerState.COOLING;
                        this.modestate = Characteristic.TargetHeaterCoolerState.COOL;
                    } else if (value == "off") {
                        this.mode = Characteristic.CurrentHeaterCoolerState.INACTIVE;
                    } else {
                        this.modestate = Characteristic.TargetHeaterCoolerState.AUTO;
                    }
                    targetHeaterCoolerStateCharacteristic.updateValue(this.modestate);
                    currentHeaterCoolerStateCharacteristic.updateValue(this.mode);
                } else if (topic == this.mqtttemp) {
                        var value = parseFloat(message);
                        currentTemperatureCharacteristic.updateValue(value);
                   
                }
            });
            
            services.push(heaterCoolerService);
		
        return services;
    }
}

