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

    /**
     * Генерирует подпись для авторизации Zadarma API
     */
    generateSignature(method, path, params = {}) {
        const queryString = Object.keys(params).length > 0 ? querystring.stringify(params) : '';
        const stringToSign = method + path + queryString + this.key;
        
        return crypto
            .createHmac('sha1', this.secret)
            .update(stringToSign)
            .digest('base64');
    }

    /**
     * Выполняет HTTP запрос к Zadarma API
     */
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

    /**
     * Получает баланс аккаунта
     */
    async getBalance() {
        try {
            const response = await this.makeRequest('GET', '/v1/info/balance/');
            return response;
        } catch (error) {
            throw new Error('Ошибка получения баланса: ' + error.message);
        }
    }

    /**
     * Инициирует обратный звонок
     */
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

    /**
     * Получает информацию о номерах
     */
    async getNumbers() {
        try {
            const response = await this.makeRequest('GET', '/v1/info/numbers/');
            return response;
        } catch (error) {
            throw new Error('Ошибка получения номеров: ' + error.message);
        }
    }

    /**
     * Отправляет SMS
     */
    async sendSMS(number, message) {
        try {
            const params = {
                number: number,
                message: message
            };
            
            const response = await this.makeRequest('POST', '/v1/sms/send/', params);
            return response;
        } catch (error) {
            throw new Error('Ошибка отправки SMS: ' + error.message);
        }
    }

    /**
     * Получает тарифы
     */
    async getTariffs() {
        try {
            const response = await this.makeRequest('GET', '/v1/tariff/');
            return response;
        } catch (error) {
            throw new Error('Ошибка получения тарифов: ' + error.message);
        }
    }
}

module.exports = ZadarmaAPI;