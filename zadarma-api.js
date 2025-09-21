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

    generateSignature(method, params = {}) {
        // 1. Сортируем параметры по ключу в алфавитном порядке
        const sortedKeys = Object.keys(params).sort();
        const sortedParams = {};
        sortedKeys.forEach(key => {
            sortedParams[key] = params[key];
        });
        
        // 2. Создаем query string (аналогично http_build_query в PHP)
        const queryString = querystring.stringify(sortedParams);
        
        // 3. Создаем MD5 хеш от query string
        const md5Hash = crypto.createHash('md5').update(queryString).digest('hex');
        
        // 4. Создаем строку для подписи: method + queryString + md5(queryString)
        const stringToSign = method + queryString + md5Hash;
        
        console.log('=== ZADARMA AUTH DEBUG ===');
        console.log('Method:', method);
        console.log('Sorted params:', sortedParams);
        console.log('Query string:', queryString);
        console.log('MD5 hash:', md5Hash);
        console.log('String to sign:', stringToSign);
        console.log('API Key:', this.key);
        
        // 5. Создаем HMAC SHA1 подпись с секретным ключом
        const signature = crypto
            .createHmac('sha1', this.secret)
            .update(stringToSign)
            .digest('base64');
            
        console.log('Generated signature:', signature);
        console.log('Authorization header:', this.key + ':' + signature);
        console.log('========================');
        
        return signature;
    }

    makeRequest(method, path, params = {}) {
        return new Promise((resolve, reject) => {
            const signature = this.generateSignature(method, params);
            
            let requestPath = path;
            let postData = '';
            
            const options = {
                hostname: this.apiUrl,
                port: 443,
                method: method,
                headers: {
                    'Authorization': this.key + ':' + signature,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            // Для GET запросов добавляем параметры в URL
            if (method === 'GET' && Object.keys(params).length > 0) {
                const queryString = querystring.stringify(params);
                requestPath = path + '?' + queryString;
            }
            
            // Для POST запросов добавляем параметры в body
            if (method === 'POST' && Object.keys(params).length > 0) {
                postData = querystring.stringify(params);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }
            
            options.path = requestPath;
            
            console.log('=== REQUEST INFO ===');
            console.log('URL:', `https://${this.apiUrl}${requestPath}`);
            console.log('Method:', method);
            console.log('Headers:', options.headers);
            if (postData) console.log('Post data:', postData);
            console.log('==================');

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log('=== RESPONSE INFO ===');
                    console.log('Status code:', res.statusCode);
                    console.log('Response body:', data);
                    console.log('====================');
                    
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            status: res.statusCode,
                            data: jsonData
                        });
                    } catch (error) {
                        reject(new Error('Ошибка парсинга JSON: ' + error.message + '. Raw response: ' + data));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error('Ошибка запроса: ' + error.message));
            });

            // Отправляем POST данные, если есть
            if (postData) {
                req.write(postData);
            }
            
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
                to: to
            };
            
            if (predicted) {
                params.predicted = 'predicted';
            }
            
            const response = await this.makeRequest('GET', '/v1/request/callback/', params);
            return response;
        } catch (error) {
            throw new Error('Ошибка инициации обратного звонка: ' + error.message);
        }
    }

    async getNumbers() {
        try {
            const response = await this.makeRequest('GET', '/v1/direct_numbers/');
            return response;
        } catch (error) {
            throw new Error('Ошибка получения номеров: ' + error.message);
        }
    }

    async sendSMS(number, message, caller_id = null) {
        try {
            const params = {
                number: number,
                message: message
            };
            
            if (caller_id) {
                params.caller_id = caller_id;
            }
            
            const response = await this.makeRequest('POST', '/v1/sms/send/', params);
            return response;
        } catch (error) {
            throw new Error('Ошибка отправки SMS: ' + error.message);
        }
    }

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
