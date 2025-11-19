const fs = require('fs');
const path = require('path');

/**
 * Цвета для терминала (ANSI коды)
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Основные цвета
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Фоновые цвета
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

/**
 * Иконки для разных типов логов
 */
const icons = {
  info: '📋',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  transfer: '💸',
  config: '⚙️',
  balance: '💰',
  monitor: '👀',
};

/**
 * Класс для логирования с цветным выводом и сохранением в файл
 */
class Logger {
  constructor() {
    this.logFile = path.join(process.cwd(), 'logs', 'forwarder.log');
    this.ensureLogDirectory();
  }

  /**
   * Проверка и создание директории для логов
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Получить текущее время в формате [HH:MM:SS]
   */
  getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `[${hours}:${minutes}:${seconds}]`;
  }

  /**
   * Записать лог в файл
   */
  writeToFile(message) {
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `${timestamp} ${message}\n`;
      fs.appendFileSync(this.logFile, logMessage, 'utf8');
    } catch (error) {
      // Игнорируем ошибки записи в файл, чтобы не прерывать работу приложения
    }
  }

  /**
   * Базовый метод для логирования
   */
  log(type, message, color = colors.white) {
    const timestamp = this.getTimestamp();
    const icon = icons[type] || '';

    const consoleMessage = `${colors.dim}${timestamp}${colors.reset} ${icon} ${color}${message}${colors.reset}`;
    console.log(consoleMessage);

    // Записываем в файл без цветов
    const fileMessage = `${timestamp} ${icon} ${message}`;
    this.writeToFile(fileMessage);
  }

  /**
   * Информационное сообщение
   */
  info(message) {
    this.log('info', message, colors.cyan);
  }

  /**
   * Сообщение об успехе
   */
  success(message) {
    this.log('success', message, colors.green);
  }

  /**
   * Сообщение об ошибке
   */
  error(message, error = null) {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    this.log('error', errorMessage, colors.red);

    // Записываем полный стек ошибки в файл
    if (error && error.stack) {
      this.writeToFile(`Stack trace: ${error.stack}`);
    }
  }

  /**
   * Предупреждение
   */
  warning(message) {
    this.log('warning', message, colors.yellow);
  }

  /**
   * Сообщение о переводе
   */
  transfer(message) {
    this.log('transfer', message, colors.magenta);
  }

  /**
   * Сообщение о конфигурации
   */
  config(message) {
    this.log('config', message, colors.blue);
  }

  /**
   * Сообщение о балансе
   */
  balance(message) {
    this.log('balance', message, colors.yellow);
  }

  /**
   * Сообщение о мониторинге
   */
  monitor(message) {
    this.log('monitor', message, colors.cyan);
  }

  /**
   * Разделитель для красивого оформления
   */
  separator(char = '=', length = 60) {
    const line = char.repeat(length);
    console.log(`${colors.dim}${line}${colors.reset}`);
  }

  /**
   * Заголовок с рамкой
   */
  header(title) {
    this.separator();
    const padding = ' '.repeat(Math.max(0, Math.floor((60 - title.length) / 2)));
    console.log(`${colors.bright}${colors.cyan}${padding}${title}${colors.reset}`);
    this.separator();
  }
}

// Создаем единственный экземпляр логгера
const logger = new Logger();

module.exports = logger;
