const config = require('../../config.json');
const axios = require('axios');
const jwt = require("jsonwebtoken");
const querystring = require("querystring");
const humps = require('humps');

const request = {
    get: (url, camelizedParams) => {
        const params = humps.decamelizeKeys(camelizedParams);
        let payload = {
            api_key: config.gxc.port.apiKey,
            nonce: (new Date).getTime(),
        };
        
        if(params) {
            const query = querystring.stringify(params);
            payload.query = query;
        }
        const jwtToken = jwt.sign(payload, config.gxc.port.secretKey);
        const authorizationToken = `Bearer ${jwtToken}`;
        return axios.get(`${config.gxc.port.host}/v0${url}`, {params, headers: {Authorization: authorizationToken}})
    },
    post: (url, camelizedParams) => {
        const params = humps.decamelizeKeys(camelizedParams);
        let payload = {
            api_key: config.gxc.port.apiKey,
            nonce: (new Date).getTime(),
        };
        
        if(params) {
            const query = querystring.stringify(params);
            payload.query = query;
        }
        const jwtToken = jwt.sign(payload, config.gxc.port.secretKey);
        const authorizationToken = `Bearer ${jwtToken}`;
        return axios.post(`${config.gxc.port.host}/v0${url}`, params, {headers: {Authorization: authorizationToken}})
    },
}

module.exports = GXC = {
    login: function(gxcAccountName, gameLoginToken) {
        return request.post(`/game/login/`, {gxcAccountName, gameLoginToken, gxcGameName: config.gxc.gxcGameName})
    },
    loginVerify: function(gxcAccountName, gameLoginToken) {
        return request.post(`/game/login_verify/`, {gxcAccountName, gameLoginToken, gxcGameName: config.gxc.gxcGameName})
    },
    getBalance: function(gxcAccountName, symbol) {
        return request.get('/coin/balance/', {gxcGameName: config.gxc.gxcGameName, symbol, gxcAccountName})
    },

    increaseBalance: function(gxcAccountName, symbol, balance) {
        return request.post('/coin/increase/',
            {gxcGameName: config.gxc.gxcGameName, symbol, gxcAccountName, balance: parseFloat(balance).toFixed(2)})
    },

    decreaseBalance: function(gxcAccountName, symbol, balance) {
        return request.post('/coin/pay/',
            {gxcGameName: config.gxc.gxcGameName, symbol, gxcAccountName, balance: parseFloat(balance).toFixed(2)})
    }
};
