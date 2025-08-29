// Тут будет храниться вся таблица
let DATA = null;

// Название файла и листа
const fileUrl = 'prices.xlsx';
const sheetName = 'неон 2.0';

// Загружаем таблицу при открытии страницы
fetch(fileUrl)
  .then(res => res.arrayBuffer())
  .then(buffer => {
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      console.error(`Лист "${sheetName}" не найден.`);
      return;
    }

    DATA = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Данные из "${sheetName}" загружены:`, DATA);
  });

//Блокировка пульта
function updateRemoteLock() {
  const tapeType1 = document.getElementById('tapeType1').value;
  const tapeType2 = document.getElementById('tapeType2').value;
  const remoteEl = document.getElementById('remote');

  const needsRemote = (type) => type === 'RGB' || type === 'Smart';

  if (needsRemote(tapeType1) || needsRemote(tapeType2)) {
    remoteEl.value = 'Пульт WiFi';
    remoteEl.disabled = true;
  } else {
    remoteEl.disabled = false;
  }
}
document.getElementById('tapeType1').addEventListener('change', updateRemoteLock);
document.getElementById('tapeType2').addEventListener('change', updateRemoteLock);
//-----------------------------------------------------

//Обработка открытия и закрытия Доп. покрытия (Показать/скрыть блок размеров)
document.getElementById('filmOption').addEventListener('change', (e) => {
  const block = document.getElementById('filmSizeBlock');
  block.style.display = e.target.value ? 'block' : 'none';
});
//-----------------------------------------------------

// Обработка нажатия кнопки

document.getElementById('calculateBtn').addEventListener('click', () => {
  if (!DATA) {
    showNotification('Введите данные для просчёта стоимости');
    return;
  }
//-----------------------------------------------------------
// Анимация уведомления о незаполненных полях (БЛОК УВЕДОМЛЕНИЙ)
const requiredFields = [
  'height', 'width', 'tapeLength1',
  'mountCount', 'elementsCount1'
];

// Проверяем основные поля
for (let id of requiredFields) {
  const el = document.getElementById(id);
  if (!el || el.offsetParent === null || el.disabled) continue; // если элемент скрыт или отключён — пропускаем
  if (!el.value || parseFloat(el.value) <= 0) {
    showNotification(`Пожалуйста, введите корректное значение для поля: ${el.previousElementSibling.textContent}`);
    el.focus();
    return;
  }
}

// Проверка размеров плёнки, если выбран вариант плёнки
const filmOption = document.getElementById('filmOption');
if (filmOption && filmOption.value !== '') {
  const filmWidth = document.getElementById('filmWidth');
  const filmHeight = document.getElementById('filmHeight');
  if (filmWidth.offsetParent !== null && (!filmWidth.value || parseFloat(filmWidth.value) <= 0)) {
    showNotification('Пожалуйста, введите ширину покрытия');
    filmWidth.focus();
    return;
  }
  if (filmHeight.offsetParent !== null && (!filmHeight.value || parseFloat(filmHeight.value) <= 0)) {
    showNotification('Пожалуйста, введите высоту покрытия');
    filmHeight.focus();
    return;
  }
}

//-----------------------------------------------------------

// Показываем блок, если выбрана плёнка
// Пример — это ты подгрузишь из Excel-таблицы
// Функция для расчёта стоимости плёнки
function calculateFilmCost() {
  const filmType = document.getElementById('filmOption').value;
  if (!filmType) return 0;

  const width = parseFloat(document.getElementById('filmWidth').value) || 0;
  const height = parseFloat(document.getElementById('filmHeight').value) || 0;
  const areaM2 = (width * height) / 10000;

  let pricePerM2 = 0;
  switch (filmType) {
    case 'Плёнка фон':
      pricePerM2 = parseFloat(DATA[79][1]) || 0; // B80
      break;
    case 'Плёнка печать':
      pricePerM2 = parseFloat(DATA[80][1]) || 0; // B81
      break;
    default:
      pricePerM2 = 0;
  }

  return areaM2 * pricePerM2;
}
const filmCost = calculateFilmCost(); //Вывод суммы за плёнку
//----------------------------------------------------


//Просчёт стоимости печати
let printCost = 0;
if (document.getElementById('print').checked) {
  const height = parseFloat(document.getElementById('height').value) || 0;
  const width = parseFloat(document.getElementById('width').value) || 0;
  const area = (height * width) / 10000; // м²

  const printPricePerM2 = parseFloat(DATA[71][1] || 0); // B72 — строка 72, значит индекс 71
  printCost = area * printPricePerM2 + 200;
}
//----------------------------------------------------

//Просчёт стоимости крепежей
const mounts = document.getElementById('mounts').value;
const mountCount = parseInt(document.getElementById('mountCount').value) || 0;

let mountsCost = 0;
const mountsSelected = mounts.trim();

switch (mountsSelected) {
  case 'Металлические (шт.)':
    mountsCost = (parseFloat(DATA[60][1]) || 0) * mountCount;
    break;
  case 'Цепи (м.)':
    mountsCost = (parseFloat(DATA[61][1]) || 0) * mountCount;
    break;
  case 'Подставка (шт.)':
    mountsCost = (parseFloat(DATA[62][1]) || 0) * mountCount;
    break;
  case 'Липучки (шт.)':
    mountsCost = (parseFloat(DATA[63][1]) || 0) * mountCount;
    break;
  case 'Тросы (м.)':
    mountsCost = (parseFloat(DATA[64][1]) || 0) * mountCount;
    break;
  default:
    mountsCost = 0;
}
//----------------------------------------------------


// 9. Упаковка — аналог формулы Excel
let packagingCost = 0;

const width = parseFloat(document.getElementById('width').value) || 0;
const height = parseFloat(document.getElementById('height').value) || 0;
const areaM2 = (width * height) / 10000;

const area = areaM2;
// Считываем лимиты и цены из новых ячеек
const smallLimit = parseFloat(DATA[84][1]);  // B85 = 0.3
const mediumLimit = parseFloat(DATA[85][1]); // B86 = 0.8
const largeLimit = parseFloat(DATA[86][1]);  // B87 = 1.5

const smallCost = parseFloat(DATA[84][2]);   // C85 = 125
const mediumCost = parseFloat(DATA[85][2]);  // C86 = 180
const largeCost = parseFloat(DATA[86][2]);   // C87 = 260

const frameCost = parseFloat(DATA[87][2]);   // C88 = 500

if (area <= smallLimit) {
  packagingCost = smallCost;
} else if (area <= mediumLimit) {
  packagingCost = mediumCost;
} else if (area <= largeLimit) {
  packagingCost = largeCost;
} else {
  packagingCost = frameCost;
}
//----------------------------------------------------

// Лента + силикон
const tapeType1 = document.getElementById('tapeType1').value;
const tapeLength1 = document.getElementById('tapeLength1').value;
const neonWidth1 = document.getElementById('neonWidth1').value;
const quantity1 = parseFloat(document.getElementById('elementsCount1').value) || 1;

const tapeType2 = document.getElementById('tapeType2').value;
const tapeLength2 = document.getElementById('tapeLength2').value;
const neonWidth2 = document.getElementById('neonWidth2').value;
const quantity2 = parseFloat(document.getElementById('elementsCount2').value) || 1;

function calculateTapeCost(tapeType, tapeLengthRaw, neonWidth, quantityRaw) {
  const tapeLength = parseFloat(tapeLengthRaw) || 0;
  const quantity = parseFloat(quantityRaw) || 1;

  if (tapeLength <= 0) return 0;  // Проверка для каждого метража отдельно, чтобы не умножало стоимость при 0 на метраже и выбранном 8мм. или 12мм.

  const basePrices = {
    "Standart Neon": parseFloat(DATA[97][1]) || 0,  // B98
    "RGB": parseFloat(DATA[98][1]) || 0,       // B99
    "Smart": parseFloat(DATA[99][1]) || 0      // B100
  };

  const widthExtras = {
    "6 мм.": parseFloat(DATA[111][1]) || 0,  // 0 по условию
    "8 мм.": parseFloat(DATA[112][1]) || 0,          // B113
    "12 мм.": parseFloat(DATA[113][1]) || 0,         // B114
  };

  const basePrice = basePrices[tapeType] || 0;
  const extraPrice = widthExtras[neonWidth] || 0;

  return (basePrice * tapeLength) + (extraPrice * quantity);
}

const cost1 = calculateTapeCost(tapeType1, tapeLength1, neonWidth1, quantity1);
const cost2 = calculateTapeCost(tapeType2, tapeLength2, neonWidth2, quantity2);

const totalCostNeon = cost1 + cost2;

//----------------------------------------------------

//Расчет длины всех лент для Блока питания
tapeLengthBlock1 = parseFloat(document.getElementById('tapeLength1').value) || 0;
tapeLengthBlock2 = parseFloat(document.getElementById('tapeLength2').value) || 0;
const totalTapeLength = tapeLengthBlock1 + tapeLengthBlock2;

//Расчет стоимости блока питания по суммарной длине ленты
let powerSupplyCost = 0;

// Массив блоков питания: [макс длина (м), стоимость]
const powerBlocks = [
  [2,   parseFloat(DATA[44][2])],  // A4  24 Вт  До 2 метров
  [3,   parseFloat(DATA[45][2])],  // A5  36 Вт  До 3 метров
  [4,   parseFloat(DATA[46][2])],  // A6  48 Вт  До 4 метров
  [5,   parseFloat(DATA[47][2])],  // A7  60 Вт  До 5 метров
  [6,   parseFloat(DATA[48][2])],  // A8  72 Вт  До 6 метров
  [8,   parseFloat(DATA[49][2])],  // A9  96 Вт  До 8 метров
  [10,  parseFloat(DATA[50][2])],  // A10 120 Вт  До 10 метров
  [12.5, parseFloat(DATA[51][2])], // A11 150 Вт  До 12,5 метров
  [16.5, parseFloat(DATA[52][2])], // A12 200 Вт  До 16,5 метров
  [25,  parseFloat(DATA[53][2])], // A13 300 Вт  До 25 метров
  [35,  parseFloat(DATA[54][2])], // A14 450 Вт  До 35 метров
  [45,  parseFloat(DATA[55][2])], // A15 550 Вт  До 45 метров
  [55,  parseFloat(DATA[56][2])]  // A16 650 Вт  До 55 метров
];

for (let i = 0; i < powerBlocks.length; i++) {
  if (totalTapeLength <= powerBlocks[i][0]) {
    powerSupplyCost = powerBlocks[i][1];
    break;
  }
}

// Если длина ленты больше максимума — берем последнюю цену (максимальную)
if (powerSupplyCost === 0 && powerBlocks.length > 0) {
  powerSupplyCost = powerBlocks[powerBlocks.length - 1][1];
  // Можно вывести уведомление, если нужно
  showNotification("Длина ленты превышает стандартные блоки питания, выбран максимальный блок");
}


//Анимация уведомления
function showNotification(message, duration = 6000) {
  const notif = document.getElementById('notification');
  notif.textContent = message;
  notif.style.display = 'block';
  notif.style.opacity = 0;
  notif.style.transition = 'opacity 0.4s ease-in-out';
  
  // плавно показываем
  requestAnimationFrame(() => {
    notif.style.opacity = 1;
  });
  
  // через duration мс плавно скрываем
  setTimeout(() => {
    notif.style.opacity = 0;
    notif.addEventListener('transitionend', () => {
      notif.style.display = 'none';
    }, { once: true });
  }, duration);
}
//----------------------------------------------------

//Стоимость работы
function calculateWorkCost(tapeType1, quantity1, tapeLength1, tapeType2, quantity2, tapeLength2, waterProtection) {
  const pricesWithoutWater = {
    "Standart Neon": parseFloat(DATA[91][1]) || 0, // B92
    "RGB": parseFloat(DATA[92][1]) || 0,      // B93
    "Smart": parseFloat(DATA[93][1]) || 0     // B94
  };

  const pricesWithWater = {
    "Standart Neon": parseFloat(DATA[91][2]) || 0, // C92
    "RGB": parseFloat(DATA[92][2]) || 0,      // C93
    "Smart": parseFloat(DATA[93][2]) || 0     // C94
  };

  const waterProtectionPricePerMeter = parseFloat(DATA[91][3]) || 0; // Доп. Цена за метр влагозащиты из Д92

  let costWork1 = 0;
  let costWork2 = 0;

  const len1 = parseFloat(tapeLength1) || 0;
  const len2 = parseFloat(tapeLength2) || 0;

  if (waterProtection) {
    costWork1 = quantityWork1 * pricesWithWater[tapeType1] + 200 + len1 * waterProtectionPricePerMeter;
    costWork2 = quantityWork2 * pricesWithWater[tapeType2] + len2 * waterProtectionPricePerMeter;
  } else {
    costWork1 = quantityWork1 * pricesWithoutWater[tapeType1];
    costWork2 = quantityWork2 * pricesWithoutWater[tapeType2];
  }

  return costWork1 + costWork2;
}

// Пример вызова:
const tapeTypeWork1 = document.getElementById('tapeType1').value;
const quantityWork1 = parseFloat(document.getElementById('elementsCount1').value) || 0;

const tapeTypeWork2 = document.getElementById('tapeType2').value;
const quantityWork2 = parseFloat(document.getElementById('elementsCount2').value) || 0

const waterProtection = document.getElementById('waterProtection').checked;

const totalWorkCost = calculateWorkCost(tapeTypeWork1, quantityWork1, tapeLength1, tapeTypeWork2, quantityWork2, tapeLength2, waterProtection);


//----------------------------------------------------

// Расходники: учитываем элементы
const elementsCountDelails1 = parseFloat(document.getElementById('elementsCount1').value) || 0;
const elementsCountDelails2 = parseFloat(document.getElementById('elementsCount2').value) || 0;

// Суммируем общее количество элементов
const totalElements = elementsCountDelails1 + elementsCountDelails2;

// Массив диапазонов и стоимости расходников (из ячеек A118:B122)
const consumablesTiersByElements = [
  { max: 20, price: parseFloat(DATA[117][1]) },    // до 20 элементов — 150 грн (A118)
  { max: 30, price: parseFloat(DATA[118][1]) },    // до 30 элементов — 200 грн (A119)
  { max: 50, price: parseFloat(DATA[119][1]) },    // до 50 элементов — 250 грн (A120)
  { max: 80, price: parseFloat(DATA[120][1]) },    // до 80 элементов — 300 грн (A121)
  { max: 120, price: parseFloat(DATA[121][1]) },   // до 120 элементов — 370 грн (A122)
];

// По умолчанию цена 0
let consumablesCost = 0;

// Проходим по диапазонам и выбираем цену по количеству элементов
for (let i = 0; i < consumablesTiersByElements.length; i++) {
  if (totalElements <= consumablesTiersByElements[i].max) {
    consumablesCost = consumablesTiersByElements[i].price;
    break;
  }
}

// Если элементов больше 120, можно установить максимальную цену (по желанию)
if (consumablesCost === 0 && consumablesTiersByElements.length > 0) {
  consumablesCost = consumablesTiersByElements[consumablesTiersByElements.length - 1].price;
}

//----------------------------------------------------

// 4. Фрезеровка
  const millingPricePerM = parseFloat(DATA[34][1] || 0); // B35
  const tapeLength1Num = parseFloat(tapeLength1) || 0;
  const tapeLength2Num = parseFloat(tapeLength2) || 0;
  const millingCost = (tapeLength1Num + tapeLength2Num) * millingPricePerM;
//----------------------------------------------------

// Стоимость подложки
const signWidth = parseFloat(document.getElementById('width').value) || 0;   // в мм
const signHeight = parseFloat(document.getElementById('height').value) || 0; // в мм

// Переводим в квадратные метры
const areaSubstrateM2 = (signWidth / 100) * (signHeight / 100);

// Получаем тип подложки
const substrateType1 = document.getElementById('substrateType').value;

// Сопоставляем тип с ценой
let substratePricePerM2 = 0;

switch (substrateType1) {
  case "ПВХ":
    substratePricePerM2 = parseFloat(DATA[73][1]) || 0; // B74
    break;
  case "Композит":
    substratePricePerM2 = parseFloat(DATA[74][1]) || 0; // B75
    break;
  case "Акрил":
    substratePricePerM2 = parseFloat(DATA[75][1]) || 0; // B76
    break;
}

// Считаем стоимость
const substrateCost = areaSubstrateM2 * substratePricePerM2;

//----------------------------------------------------

//Цена шнура
const cordCost = parseFloat(DATA[36][1]) || 0;  // B37 - индекс 36, колонка 1 (вторая колонка)

//Цена 3д макета
const model3DCost = parseFloat(DATA[38][1]) || 0;  // B39 - индекс 38, колонка 1

//Цена света
const lightCost = parseFloat(DATA[35][1]) || 0;    // B36

const minisign = parseFloat(DATA[39][1]) || 0;    // B40

//----------------------------------------------------

//Пульт
function calculateRemoteCost() {
  const remoteType = document.getElementById("remote").value;

  const remotePrices = {
    "Пульт обычный": parseFloat(DATA[103][1]) || 0,     // B104
    "Пульт WiFi": parseFloat(DATA[104][1]) || 0,        // B105
    "Пульт сенсорный": parseFloat(DATA[105][1]) || 0,   // B106
    "Пульт максимальный": parseFloat(DATA[106][1]) || 0 // B107
  };

  return remotePrices[remoteType] || 0;
}
const remoteCost = calculateRemoteCost();

//----------------------------------------------------

const markupMultiplier = parseFloat(DATA[123][1]) || 1; // (Общий множитель переменная)

//Сумма тотал всего
  const total = Math.round(
    (printCost +
    filmCost +
    mountsCost +
    packagingCost +
    totalCostNeon +
    powerSupplyCost +
    totalWorkCost +
    consumablesCost +
    millingCost +
    substrateCost +
    cordCost +
    model3DCost +
    lightCost +
    minisign +
    remoteCost) * markupMultiplier
  );

//----------------------------------------------------

//Доп. информация о стоимостях
const showDetailsBtn = document.getElementById('showDetailsBtn');
const detailsContainer = document.getElementById('detailsContainer');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');
const detailsContent = document.getElementById('detailsContent');

showDetailsBtn.addEventListener('click', () => {
  // Собираем и формируем детальную стоимость (пример)
  const detailsText = `
    <p>Стоимость печати: ${printCost} грн.</p>
    <p>Стоимость доп. покрытия (Плёнка): ${filmCost} грн.</p>
    <p>Стоимость упаковки: ${packagingCost} грн.</p>
    <p>Стоимость Лента + Силикон 1: ${cost1.toFixed(2)} грн.</p>
    <p>Стоимость Лента + Силикон 2: ${cost2.toFixed(2)} грн.</p>
    <p>Стоимость блока питания: ${powerSupplyCost} грн.</p>
    <p>Стоимость работ: ${totalWorkCost.toFixed(2)} грн.</p>
    <p>Стоимость расходников: ${consumablesCost} грн.</p>
    <p>Стоимость фрезеровки: ${millingCost} грн.</p>
    <p>Стоимость подложки: ${substrateCost.toFixed(2)} грн.</p>
    <p>Стоимость шнура: ${cordCost} грн.</p>
    <p>Стоимость 3D-макета: ${model3DCost} грн.</p>
    <p>Стоимость света: ${lightCost} грн.</p>
    <p>Стоимость мини-вывески: ${minisign} грн.</p>
    <p>Стоимость пульта: ${remoteCost} грн.</p>
    <hr>
    <p>Себестоимость: ${(total / markupMultiplier).toFixed(2)} грн.</p>
    <strong>Итого: ${total} грн.</strong>
  `;

  detailsContent.innerHTML = detailsText;
  detailsContainer.style.display = 'block';
});

closeDetailsBtn.addEventListener('click', (event) => {
  event.preventDefault();  // Отключаем дефолтное поведение кнопки (перезагрузку)
  detailsContainer.style.display = 'none';
});


//анимация доп информации
const showDetailsBtn1 = document.getElementById('showDetailsBtn');
const detailsContainer1 = document.getElementById('detailsContainer');
const closeDetailsBtn1 = document.getElementById('closeDetailsBtn');

// Плавное открытие
showDetailsBtn1.addEventListener('click', () => {
  detailsContainer1.style.display = 'block';
  detailsContainer1.style.overflow = 'hidden';
  detailsContainer1.style.height = '0px';
  detailsContainer1.style.opacity = '0';
  detailsContainer1.style.transition = 'none';

  // Двойной requestAnimationFrame для корректного запуска анимации
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      detailsContainer1.style.transition = 'height 0.4s ease, opacity 0.4s ease';
      detailsContainer1.style.height = detailsContainer1.scrollHeight + 'px';
      detailsContainer1.style.opacity = '1';
    });
  });

  setTimeout(() => {
    detailsContainer1.style.height = 'auto';
    detailsContainer1.style.overflow = 'visible';
  }, 400);
});


// Плавное закрытие
closeDetailsBtn1.addEventListener('click', (e) => {
  e.preventDefault();

  detailsContainer1.style.overflow = 'hidden';
  detailsContainer1.style.height = detailsContainer1.scrollHeight + 'px';
  detailsContainer1.style.transition = 'none';

  // Опять двойной requestAnimationFrame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      detailsContainer1.style.transition = 'height 0.4s ease, opacity 0.4s ease';
      detailsContainer1.style.height = '0px';
      detailsContainer1.style.opacity = '0';
    });
  });

  setTimeout(() => {
    detailsContainer1.style.display = 'none';
    detailsContainer1.style.overflow = 'visible';
  }, 400);
});

//----------------------------------------------------
// Вывод общей суммы ИТОГ
document.getElementById('totalSum').textContent = total;


  console.log('--- Расчёт стоимости ---');
  console.log(`1. Печать ${printCost} грн`);
  console.log(`2. Плёнка: ${filmCost} грн`);
  console.log(`3. Упаковка: ${packagingCost} грн`);
  console.log(`4. Лента+Силикон 1: ${cost1.toFixed(2)} грн`);
  console.log(`5. Лента+Силикон 2: ${cost2.toFixed(2)} грн`);
  console.log(`6. Суммарная длина ленты: ${totalTapeLength} м → Блок питания: ${powerSupplyCost} грн`);
  console.log(`7. Стоимость работ: ${totalWorkCost.toFixed(2)} грн`);
  console.log(`8. Расходники (по элементам ${totalElements} эл.): ${consumablesCost} грн`);
  console.log(`9. Стоимость фрезеровки: ${millingCost} грн`);
  console.log(`9. Стоимость подложки: ${substrateCost.toFixed(2)} грн`);
  console.log(`10. Стоимость шнура: ${cordCost} грн.`);
  console.log(`11. Стоимость 3D-макета: ${model3DCost} грн.`);
  console.log(`12. Стоимость света: ${lightCost} грн.`);
  console.log(`13. Стоимость мини-вывески: ${minisign} грн.`);
  console.log(`14. Стоимость пульта: ${remoteCost} грн.`);
});  // <-- Вот эта закрывающая скобка и круглые скобки здесь обязательны

//----------------------------------------------------

