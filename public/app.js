/**
 * ============================================
 * CryptoKey Lab — Основной скрипт приложения
 * 
 * Тема индивидуального проекта:
 * «Разработка программного модуля для алгоритмов
 * шифрования с открытым ключом»
 * 
 * Проект разработан: Нигматова Зиеда
 * 
 * Технологии: Vanilla JavaScript, Web Crypto API
 * Алгоритмы: RSA-OAEP (шифрование), RSA-PSS (подпись)
 * ============================================
 */

// ========== НАВИГАЦИЯ ==========

/**
 * Переключение между секциями приложения
 * @param {string} sectionId - идентификатор секции
 */
function navigate(sectionId) {
  // Скрыть все секции
  document.querySelectorAll('.section').forEach(function(s) {
    s.classList.remove('active');
  });

  // Показать выбранную секцию
  var target = document.getElementById('section-' + sectionId);
  if (target) {
    target.classList.add('active');
    // Перезапуск анимации
    target.style.animation = 'none';
    target.offsetHeight; // reflow
    target.style.animation = '';
  }

  // Обновить активную ссылку в навигации
  document.querySelectorAll('.nav-links a').forEach(function(link) {
    link.classList.toggle('active', link.dataset.section === sectionId);
  });

  // Закрыть мобильное меню
  document.getElementById('navLinks').classList.remove('open');

  // Прокрутить наверх
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Мобильное меню
document.getElementById('mobileToggle').addEventListener('click', function() {
  document.getElementById('navLinks').classList.toggle('open');
});

// Эффект навбара при скролле
window.addEventListener('scroll', function() {
  var navbar = document.getElementById('navbar');
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});


// ========== УТИЛИТЫ ==========

/**
 * Показать toast-уведомление
 * @param {string} message - текст уведомления
 * @param {'success'|'error'|'info'} type - тип уведомления
 */
function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toastContainer');
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;

  var icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = '<span>' + (icons[type] || '') + '</span> ' + message;

  container.appendChild(toast);

  setTimeout(function() {
    toast.style.animation = 'toastOut 0.3s ease-in forwards';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

/**
 * Копирование текста в буфер обмена
 * @param {string} elementId - ID элемента с текстом
 */
async function copyToClipboard(elementId) {
  var element = document.getElementById(elementId);
  if (!element) return;

  try {
    await navigator.clipboard.writeText(element.textContent);
    showToast('Скопировано в буфер обмена', 'success');
  } catch (err) {
    // Fallback для старых браузеров
    var range = document.createRange();
    range.selectNodeContents(element);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();
    showToast('Скопировано в буфер обмена', 'success');
  }
}

/**
 * Установить состояние загрузки для кнопки
 * @param {string} btnId - ID кнопки
 * @param {boolean} loading - состояние загрузки
 * @param {string} originalText - исходный текст кнопки
 */
function setLoading(btnId, loading, originalText) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Обработка...'
    : originalText;
}


// ========== КРИПТОГРАФИЧЕСКИЕ УТИЛИТЫ ==========
// Проект разработан: Нигматова Зиеда

/**
 * Конвертация ArrayBuffer в Base64 строку
 * @param {ArrayBuffer} buffer - буфер данных
 * @returns {string} Base64 строка
 */
function arrayBufferToBase64(buffer) {
  var bytes = new Uint8Array(buffer);
  var binary = '';
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Конвертация Base64 строки в ArrayBuffer
 * @param {string} base64 - Base64 строка
 * @returns {ArrayBuffer} буфер данных
 */
function base64ToArrayBuffer(base64) {
  var binary = atob(base64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Экспорт CryptoKey в формат PEM
 * @param {CryptoKey} key - криптографический ключ
 * @param {'public'|'private'} type - тип ключа
 * @returns {Promise<string>} PEM-строка
 */
async function exportKeyToPEM(key, type) {
  var format = type === 'public' ? 'spki' : 'pkcs8';
  var exported = await crypto.subtle.exportKey(format, key);
  var base64 = arrayBufferToBase64(exported);

  // Разбиваем на строки по 64 символа (стандарт PEM)
  var lines = base64.match(/.{1,64}/g).join('\n');

  var label = type === 'public' ? 'PUBLIC KEY' : 'PRIVATE KEY';
  return '-----BEGIN ' + label + '-----\n' + lines + '\n-----END ' + label + '-----';
}

/**
 * Импорт открытого ключа из PEM для алгоритма RSA-OAEP (шифрование)
 * @param {string} pem - PEM-строка открытого ключа
 * @returns {Promise<CryptoKey>} импортированный ключ
 */
async function importPublicKeyForEncryption(pem) {
  var pemBody = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  var binaryDer = base64ToArrayBuffer(pemBody);

  return await crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
}

/**
 * Импорт закрытого ключа из PEM для алгоритма RSA-OAEP (расшифрование)
 * @param {string} pem - PEM-строка закрытого ключа
 * @returns {Promise<CryptoKey>} импортированный ключ
 */
async function importPrivateKeyForDecryption(pem) {
  var pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  var binaryDer = base64ToArrayBuffer(pemBody);

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}

/**
 * Импорт закрытого ключа из PEM для алгоритма RSA-PSS (подпись)
 * @param {string} pem - PEM-строка закрытого ключа
 * @returns {Promise<CryptoKey>} импортированный ключ
 */
async function importPrivateKeyForSigning(pem) {
  var pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  var binaryDer = base64ToArrayBuffer(pemBody);

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/**
 * Импорт открытого ключа из PEM для алгоритма RSA-PSS (проверка подписи)
 * @param {string} pem - PEM-строка открытого ключа
 * @returns {Promise<CryptoKey>} импортированный ключ
 */
async function importPublicKeyForVerification(pem) {
  var pemBody = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  var binaryDer = base64ToArrayBuffer(pemBody);

  return await crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    ['verify']
  );
}


// ========== ГЕНЕРАЦИЯ КЛЮЧЕЙ ==========

/**
 * Генерация пары ключей для шифрования с открытым ключом (RSA-OAEP)
 * Параметры: 2048 бит, SHA-256
 * Проект разработан: Нигматова Зиеда
 */
async function generateEncryptionKeys() {
  setLoading('btnGenEncryptKeys', true, '');

  try {
    // Генерация ключевой пары RSA-OAEP
    var keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true, // extractable — разрешаем экспорт ключей
      ['encrypt', 'decrypt']
    );

    // Экспорт ключей в формат PEM
    var publicPEM = await exportKeyToPEM(keyPair.publicKey, 'public');
    var privatePEM = await exportKeyToPEM(keyPair.privateKey, 'private');

    // Вывод ключей
    document.getElementById('encPublicKeyOutput').textContent = publicPEM;
    document.getElementById('encPrivateKeyOutput').textContent = privatePEM;
    document.getElementById('encryptKeysOutput').style.display = 'block';

    showToast('Ключи шифрования RSA-OAEP (2048 бит) успешно сгенерированы', 'success');
  } catch (error) {
    console.error('Ошибка генерации ключей RSA-OAEP:', error);
    showToast('Ошибка при генерации ключей: ' + error.message, 'error');
  } finally {
    setLoading('btnGenEncryptKeys', false, 'Сгенерировать ключи шифрования');
  }
}

/**
 * Генерация пары ключей для цифровой подписи (RSA-PSS)
 * Параметры: 2048 бит, SHA-256
 * Проект разработан: Нигматова Зиеда
 */
async function generateSigningKeys() {
  setLoading('btnGenSignKeys', true, '');

  try {
    // Генерация ключевой пары RSA-PSS
    var keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true, // extractable — разрешаем экспорт ключей
      ['sign', 'verify']
    );

    // Экспорт ключей в формат PEM
    var publicPEM = await exportKeyToPEM(keyPair.publicKey, 'public');
    var privatePEM = await exportKeyToPEM(keyPair.privateKey, 'private');

    // Вывод ключей
    document.getElementById('signPublicKeyOutput').textContent = publicPEM;
    document.getElementById('signPrivateKeyOutput').textContent = privatePEM;
    document.getElementById('signKeysOutput').style.display = 'block';

    showToast('Ключи подписи RSA-PSS (2048 бит) успешно сгенерированы', 'success');
  } catch (error) {
    console.error('Ошибка генерации ключей RSA-PSS:', error);
    showToast('Ошибка при генерации ключей: ' + error.message, 'error');
  } finally {
    setLoading('btnGenSignKeys', false, 'Сгенерировать ключи подписи');
  }
}


// ========== ШИФРОВАНИЕ С ОТКРЫТЫМ КЛЮЧОМ (RSA-OAEP) ==========

/**
 * Шифрование сообщения с помощью открытого ключа RSA-OAEP
 * Проект разработан: Нигматова Зиеда
 */
async function encryptMessage() {
  var message = document.getElementById('encryptMessage').value.trim();
  var publicKeyPEM = document.getElementById('encryptPublicKey').value.trim();

  if (!message) {
    showToast('Введите сообщение для шифрования', 'error');
    return;
  }
  if (!publicKeyPEM) {
    showToast('Введите открытый ключ', 'error');
    return;
  }

  setLoading('btnEncrypt', true, '');

  try {
    // Импорт открытого ключа из PEM
    var publicKey = await importPublicKeyForEncryption(publicKeyPEM);

    // Кодирование сообщения в байты (UTF-8)
    var encoder = new TextEncoder();
    var encoded = encoder.encode(message);

    // Шифрование с помощью RSA-OAEP
    var encrypted = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      encoded
    );

    // Конвертация результата в Base64
    var base64Cipher = arrayBufferToBase64(encrypted);

    document.getElementById('encryptedTextOutput').textContent = base64Cipher;
    document.getElementById('encryptOutput').style.display = 'block';

    showToast('Сообщение успешно зашифровано алгоритмом RSA-OAEP', 'success');
  } catch (error) {
    console.error('Ошибка шифрования RSA-OAEP:', error);
    showToast('Ошибка шифрования: ' + error.message, 'error');
  } finally {
    setLoading('btnEncrypt', false, '🔒 Зашифровать');
  }
}


// ========== РАСШИФРОВАНИЕ ЗАКРЫТЫМ КЛЮЧОМ (RSA-OAEP) ==========

/**
 * Расшифрование сообщения с помощью закрытого ключа RSA-OAEP
 * Проект разработан: Нигматова Зиеда
 */
async function decryptMessage() {
  var cipher = document.getElementById('decryptCipher').value.trim();
  var privateKeyPEM = document.getElementById('decryptPrivateKey').value.trim();

  if (!cipher) {
    showToast('Введите зашифрованный текст', 'error');
    return;
  }
  if (!privateKeyPEM) {
    showToast('Введите закрытый ключ', 'error');
    return;
  }

  setLoading('btnDecrypt', true, '');

  try {
    // Импорт закрытого ключа из PEM
    var privateKey = await importPrivateKeyForDecryption(privateKeyPEM);

    // Конвертация Base64 обратно в ArrayBuffer
    var encryptedBuffer = base64ToArrayBuffer(cipher);

    // Расшифрование с помощью RSA-OAEP
    var decrypted = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedBuffer
    );

    // Декодирование байтов в текст (UTF-8)
    var decoder = new TextDecoder();
    var plaintext = decoder.decode(decrypted);

    document.getElementById('decryptedTextOutput').textContent = plaintext;
    document.getElementById('decryptOutput').style.display = 'block';

    showToast('Сообщение успешно расшифровано', 'success');
  } catch (error) {
    console.error('Ошибка расшифрования RSA-OAEP:', error);
    showToast('Ошибка расшифрования: проверьте ключ и шифротекст', 'error');
  } finally {
    setLoading('btnDecrypt', false, '🔓 Расшифровать');
  }
}


// ========== СОЗДАНИЕ ЦИФРОВОЙ ПОДПИСИ (RSA-PSS) ==========

/**
 * Создание цифровой подписи сообщения с помощью закрытого ключа RSA-PSS
 * Проект разработан: Нигматова Зиеда
 */
async function signMessage() {
  var message = document.getElementById('signMessage').value.trim();
  var privateKeyPEM = document.getElementById('signPrivateKey').value.trim();

  if (!message) {
    showToast('Введите сообщение для подписи', 'error');
    return;
  }
  if (!privateKeyPEM) {
    showToast('Введите закрытый ключ', 'error');
    return;
  }

  setLoading('btnSign', true, '');

  try {
    // Импорт закрытого ключа из PEM
    var privateKey = await importPrivateKeyForSigning(privateKeyPEM);

    // Кодирование сообщения в байты (UTF-8)
    var encoder = new TextEncoder();
    var encoded = encoder.encode(message);

    // Создание подписи с помощью RSA-PSS (saltLength = 32 байта)
    var signature = await crypto.subtle.sign(
      { name: 'RSA-PSS', saltLength: 32 },
      privateKey,
      encoded
    );

    // Конвертация подписи в Base64
    var base64Sig = arrayBufferToBase64(signature);

    document.getElementById('signatureOutput').textContent = base64Sig;
    document.getElementById('signOutput').style.display = 'block';

    showToast('Цифровая подпись RSA-PSS успешно создана', 'success');
  } catch (error) {
    console.error('Ошибка создания подписи RSA-PSS:', error);
    showToast('Ошибка создания подписи: ' + error.message, 'error');
  } finally {
    setLoading('btnSign', false, '✍️ Создать подпись');
  }
}


// ========== ПРОВЕРКА ЦИФРОВОЙ ПОДПИСИ (RSA-PSS) ==========

/**
 * Проверка цифровой подписи с помощью открытого ключа RSA-PSS
 * Проект разработан: Нигматова Зиеда
 */
async function verifySignature() {
  var message = document.getElementById('verifyMessage').value.trim();
  var signature = document.getElementById('verifySignature').value.trim();
  var publicKeyPEM = document.getElementById('verifyPublicKey').value.trim();

  if (!message) {
    showToast('Введите сообщение', 'error');
    return;
  }
  if (!signature) {
    showToast('Введите подпись', 'error');
    return;
  }
  if (!publicKeyPEM) {
    showToast('Введите открытый ключ', 'error');
    return;
  }

  setLoading('btnVerify', true, '');

  try {
    // Импорт открытого ключа из PEM
    var publicKey = await importPublicKeyForVerification(publicKeyPEM);

    // Кодирование сообщения в байты (UTF-8)
    var encoder = new TextEncoder();
    var encoded = encoder.encode(message);

    // Конвертация подписи из Base64 в ArrayBuffer
    var sigBuffer = base64ToArrayBuffer(signature);

    // Проверка подписи с помощью RSA-PSS
    var isValid = await crypto.subtle.verify(
      { name: 'RSA-PSS', saltLength: 32 },
      publicKey,
      sigBuffer,
      encoded
    );

    var outputEl = document.getElementById('verifyOutput');
    outputEl.style.display = 'block';

    if (isValid) {
      outputEl.innerHTML =
        '<div class="result-badge valid">' +
        '✅ Подпись действительна' +
        '</div>';
      showToast('Подпись подтверждена — подпись действительна', 'success');
    } else {
      outputEl.innerHTML =
        '<div class="result-badge invalid">' +
        '❌ Подпись недействительна' +
        '</div>';
      showToast('Подпись не прошла проверку', 'error');
    }
  } catch (error) {
    console.error('Ошибка проверки подписи RSA-PSS:', error);
    var outputEl = document.getElementById('verifyOutput');
    outputEl.style.display = 'block';
    outputEl.innerHTML =
      '<div class="result-badge invalid">' +
      '❌ Ошибка проверки: ' + error.message +
      '</div>';
    showToast('Ошибка проверки подписи', 'error');
  } finally {
    setLoading('btnVerify', false, '✅ Проверить');
  }
}


// ========== ИНИЦИАЛИЗАЦИЯ ==========

// Проект разработан: Нигматова Зиеда
// Тема: Разработка программного модуля для алгоритмов шифрования с открытым ключом
console.log('%c CryptoKey Lab ', 'background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; font-size: 16px; padding: 8px 16px; border-radius: 8px; font-weight: bold;');
console.log('%c Автор: Нигматова Зиеда ', 'color: #8b5cf6; font-size: 12px;');
console.log('%c Тема: Разработка программного модуля для алгоритмов шифрования с открытым ключом ', 'color: #6366f1; font-size: 11px;');
