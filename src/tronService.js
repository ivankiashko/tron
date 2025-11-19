const TronWeb = require('tronweb');
const logger = require('./logger');

/**
 * Класс для работы с TRON блокчейном
 */
class TronService {
  constructor(privateKey, apiKey = null) {
    this.privateKey = privateKey;
    this.apiKey = apiKey;
    this.tronWeb = null;
    this.initTronWeb();
  }

  /**
   * Инициализация TronWeb с подключением к mainnet
   */
  initTronWeb() {
    try {
      // Узлы для подключения к TRON mainnet
      const fullNode = this.apiKey
        ? `https://api.trongrid.io`
        : 'https://api.trongrid.io';
      const solidityNode = this.apiKey
        ? `https://api.trongrid.io`
        : 'https://api.trongrid.io';
      const eventServer = this.apiKey
        ? `https://api.trongrid.io`
        : 'https://api.trongrid.io';

      this.tronWeb = new TronWeb({
        fullNode,
        solidityNode,
        eventServer,
        privateKey: this.privateKey,
      });

      // Установка API ключа если предоставлен
      if (this.apiKey) {
        this.tronWeb.setHeader({ 'TRON-PRO-API-KEY': this.apiKey });
      }

      logger.success('TronWeb инициализирован успешно');
    } catch (error) {
      logger.error('Ошибка инициализации TronWeb', error);
      throw error;
    }
  }

  /**
   * Получить баланс TRX для указанного адреса
   * @param {string} address - Адрес кошелька
   * @returns {Promise<number>} Баланс в TRX
   */
  async getBalance(address) {
    try {
      // Получаем баланс в SUN (1 TRX = 1,000,000 SUN)
      const balanceSun = await this.tronWeb.trx.getBalance(address);

      // Конвертируем SUN в TRX
      const balanceTrx = this.tronWeb.fromSun(balanceSun);

      return parseFloat(balanceTrx);
    } catch (error) {
      logger.error(`Ошибка получения баланса для ${address}`, error);
      throw error;
    }
  }

  /**
   * Получить информацию об аккаунте
   * @param {string} address - Адрес кошелька
   * @returns {Promise<Object>} Информация об аккаунте
   */
  async getAccount(address) {
    try {
      const account = await this.tronWeb.trx.getAccount(address);
      return account;
    } catch (error) {
      logger.error(`Ошибка получения информации об аккаунте ${address}`, error);
      throw error;
    }
  }

  /**
   * Отправить TRX с текущего кошелька на указанный адрес
   * @param {string} toAddress - Адрес получателя
   * @param {number} amount - Сумма в TRX
   * @returns {Promise<Object>} Результат транзакции с txid
   */
  async sendTrx(toAddress, amount) {
    try {
      // Конвертируем TRX в SUN
      const amountSun = this.tronWeb.toSun(amount);

      logger.info(`Создание транзакции: ${amount} TRX -> ${toAddress}`);

      // Создаем неподписанную транзакцию
      const transaction = await this.tronWeb.transactionBuilder.sendTrx(
        toAddress,
        amountSun,
        this.tronWeb.defaultAddress.base58
      );

      // Подписываем транзакцию
      const signedTransaction = await this.tronWeb.trx.sign(transaction);

      // Отправляем транзакцию
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);

      if (result.result) {
        const txid = result.txid || result.transaction?.txID;
        logger.success(`Транзакция отправлена успешно!`);
        logger.transfer(`TX ID: ${txid}`);
        logger.transfer(`Просмотр: https://tronscan.org/#/transaction/${txid}`);

        return {
          success: true,
          txid,
          amount,
          toAddress,
        };
      } else {
        throw new Error(result.message || 'Неизвестная ошибка при отправке транзакции');
      }
    } catch (error) {
      logger.error(`Ошибка отправки TRX на ${toAddress}`, error);
      throw error;
    }
  }

  /**
   * Получить адрес текущего кошелька (из приватного ключа)
   * @returns {string} Адрес кошелька
   */
  getAddress() {
    return this.tronWeb.defaultAddress.base58;
  }

  /**
   * Форматировать сумму TRX с 6 знаками после запятой
   * @param {number} amount - Сумма в TRX
   * @returns {string} Отформатированная сумма
   */
  formatTrx(amount) {
    return parseFloat(amount).toFixed(6);
  }

  /**
   * Конвертировать SUN в TRX
   * @param {number} sun - Сумма в SUN
   * @returns {number} Сумма в TRX
   */
  sunToTrx(sun) {
    return parseFloat(this.tronWeb.fromSun(sun));
  }

  /**
   * Конвертировать TRX в SUN
   * @param {number} trx - Сумма в TRX
   * @returns {number} Сумма в SUN
   */
  trxToSun(trx) {
    return this.tronWeb.toSun(trx);
  }

  /**
   * Проверить валидность адреса TRON
   * @param {string} address - Адрес для проверки
   * @returns {boolean} true если адрес валидный
   */
  isValidAddress(address) {
    return this.tronWeb.isAddress(address);
  }

  /**
   * Получить информацию о транзакции
   * @param {string} txid - ID транзакции
   * @returns {Promise<Object>} Информация о транзакции
   */
  async getTransaction(txid) {
    try {
      const transaction = await this.tronWeb.trx.getTransaction(txid);
      return transaction;
    } catch (error) {
      logger.error(`Ошибка получения информации о транзакции ${txid}`, error);
      throw error;
    }
  }

  /**
   * Ожидание подтверждения транзакции
   * @param {string} txid - ID транзакции
   * @param {number} maxAttempts - Максимальное количество попыток (по умолчанию 30)
   * @param {number} interval - Интервал между попытками в мс (по умолчанию 3000)
   * @returns {Promise<boolean>} true если транзакция подтверждена
   */
  async waitForConfirmation(txid, maxAttempts = 30, interval = 3000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const tx = await this.getTransaction(txid);

        if (tx && tx.ret && tx.ret[0] && tx.ret[0].contractRet === 'SUCCESS') {
          logger.success(`Транзакция ${txid} подтверждена!`);
          return true;
        }

        logger.info(`Ожидание подтверждения транзакции... (попытка ${i + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        // Продолжаем ожидание при ошибках
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    logger.warning(`Не удалось дождаться подтверждения транзакции ${txid} за ${maxAttempts} попыток`);
    return false;
  }
}

module.exports = TronService;
