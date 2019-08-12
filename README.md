# homebridge-mqtt-acpartner
a homebridge plugin for IRremoteESP8266 https://github.com/crankyoldgit/IRremoteESP8266

## Note: 
 If you find bugs, please submit them to issues or QQ Group: 107927710.

## Installation
1. Install HomeBridge, please follow it's [README](https://github.com/nfarina/homebridge/blob/master/README.md).   
If you are using Raspberry Pi, please read [Running-HomeBridge-on-a-Raspberry-Pi](https://github.com/nfarina/homebridge/wiki/Running-HomeBridge-on-a-Raspberry-Pi).   
2. Make sure you can see HomeBridge in your iOS devices, if not, please go back to step 1.   
3. Install packages.   
```
npm install -g homebridge-mqtt-acpartner
```

"mqtttemp" is the topic of a mqtt temperature sensor

```
{
    "bridge": {
        "name": "mqtt",
        "username": "B5:99:EB:99:AA:4E",
        "port": 51198,
        "pin": "123-11-678"
    },
    "accessories": [
        {
            "accessory": "acpartner",
            "name": "美的空调",
            "serviceType": "HeaterCooler",
            "mqtttemp": "MICO_B0F893277C32/tmp",
            "mqtt": {
               "server": "10.0.0.50:1883",
               "prefix": "homebridge",
               "username": "pi",
               "password": "raspberry"
            }
        }
    ]
}
```
