// zadarma-api.js
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

class ZadarmaAPI {
    constructor(key, secret, sandbox = false) {
        this.key = key;
        this.secret = secret;
        this.apiUrl = sandbox ? 'api-sandbox.zadarma.com' : 'api.zadarma.com';
    }

    generateSignature(method, path, params = {}) {
        const sortedKeys = Object.keys(params).sort();
        const sortedParams = {};
        sortedKeys.forEach(key => {
            sortedParams[key] = params[key];
        });
        
        const queryString = querystring.stringify(sortedParams);
        const stringToSign = method + path + queryString + this.key;
        
        console.log('=== DEBUG INFO ===');
        console.log('Method:', method);
        console.log('Path:', path);
        console.log('QueryString:', queryString);
        console.log('API Key:', this.key);
        console.log('String to sign:', stringToSign);
        
        const signature = crypto
            .createHmac('sha1', this.secret)
            .update(stringToSign)
            .digest('base64');
            
        console.log('Generated signature:', signature);
        console.log('=================');
        
        return signature;
    }

    makeRequest(method, path, params = {}) {
        return new Promise((resolve, reject) => {
            const signature = this.generateSignature(method, path, params);
            const queryString = Object.keys(params).length > 0 ? '?' + querystring.stringify(params) : '';
            
            const options = {
                hostname: this.apiUrl,
                port: 443,
                path: path + queryString,
                method: method,
                headers: {
                    'Authorization': this.key + ':' + signature,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            status: res.statusCode,
                            data: jsonData
                        });
                    } catch (error) {
                        reject(new Error('Ошибка парсинга JSON: ' + error.message));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error('Ошибка запроса: ' + error.message));
            });

            req.end();
        });
    }

    async getBalance() {
        try {
            const response = await this.makeRequest('GET', '/v1/info/balance/');
            return response;
        } catch (error) {
            throw new Error('Ошибка получения баланса: ' + error.message);
        }
    }

    async requestCallback(from, to, predicted = false) {
        try {
            const params = {
                from: from,
                to: to,
                predicted: predicted ? 1 : 0
            };
            
            const response = await this.makeRequest('POST', '/v1/request/callback/', params);
            return response;
        } catch (error) {
            throw new Error('Ошибка инициации обратного звонка: ' + error.message);
        }
    }

    async getNumbers() {
        try {
            const response = await this.makeRequest('GET', '/v1/info/numbers/');
            return response;
        } catch (error) {
            throw new Error('Ошибка получения номеров: ' + error.message);
        }
    }
}

module.exports = ZadarmaAPI;
