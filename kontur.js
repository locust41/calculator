// Тут будет храниться вся таблица
let DATA = null;

// Название файла и листа
const fileUrl = 'prices.xlsx';
const sheetName = 'Контурная';

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

//-----------------------------------------------------
//Обработка открытия и закрытия Доп. покрытия (Показать/скрыть блок размеров)
document.getElementById('acrylOption').addEventListener('change', (e) => {
  const block = document.getElementById('acrylSizeBlock');
  block.style.display = e.target.value ? 'block' : 'none';
});  
//-----------------------------------------------------
//Блокировка пульта
// Автоустановка пульта при изменении подсветки
function updateRemoteLock() {
  const tapeType = document.getElementById('tapeType').value;
  const remoteEl = document.getElementById('remote');

  const needsRemote = (type) => type === 'RGB' || type === 'Smart';

  if (needsRemote(tapeType)) {
    remoteEl.value = 'Пульт WiFi';
    remoteEl.disabled = true;
  } else {
    remoteEl.disabled = false;
  }
}

document.getElementById('tapeType').addEventListener('change', updateRemoteLock);

//-----------------------------------------------------

//Блок полей "Метраж" и "Кол-во элементов" при выбораном "Без неона"
document.getElementById('tapeType').addEventListener('change', function () {
  const tapeType = this.value;
  const tapeLengthEl = document.getElementById('tapeLength');
  const elementsCountEl = document.getElementById('elementsCount');

  const isNoNeon = tapeType === 'Без неона';

  [tapeLengthEl, elementsCountEl].forEach(el => {
    el.disabled = isNoNeon;
    el.placeholder = isNoNeon ? 'Отключено' : '';
    el.style.color = isNoNeon ? '#888' : '';

    if (isNoNeon) {
      el.value = '';
    } else {
      el.value = 0;
      el.style.color = ''; // Вернём обычный цвет
    }
  });
});

//-----------------------------------------------------

// Обработка нажатия кнопки

document.getElementById('calculateBtn').addEventListener('click', () => {
  if (!DATA) {
    showNotification('Введите данные для просчёта стоимости');
    return;
  }
//----------------------------------------------------
//Анимация уведомения о значениях
const requiredFields = [
  'height', 'width', 'curveLength', 'mountCount', 'tapeLength',
  'mountCount', 'filmWidth', 'filmHeight', 'curveHeight2', 'curveWidth2', 'curveLength2'
];
//Проверка названий полей и привязка data-label
// Проверяем основные поля
for (let id of requiredFields) {
  const el = document.getElementById(id);
  if (!el || el.offsetParent === null || el.disabled) continue; // если элемент скрыт или отключён — пропускаем

  if (!el.value || parseFloat(el.value) <= 0) {
    // Сначала пытаемся взять data-label
    let label = el.getAttribute('data-label');

    // Если data-label нет — смотрим предыдущий лейбл (соседний элемент)
    if (!label) {
      // Попробуем найти label с for=el.id
      const labelEl = document.querySelector(`label[for="${id}"]`);
      if (labelEl) {
        label = labelEl.textContent.trim();
      } else if (el.previousElementSibling) {
        label = el.previousElementSibling.textContent.trim();
      }
    }

    // Если всё равно ничего не нашли — показываем id
    if (!label) label = id;

    showNotification(`Пожалуйста, введите корректное значение для поля: ${label}`);
    el.focus();
    return;
  }
}

//----------------------------------------------------
const tapeType3 = document.getElementById('tapeType').value;
// Добавляем поля только если выбран не "Без неона"
if (tapeType3 !== 'Без неона') {
  requiredFields.push('tapeLength', 'elementsCount');
}

//-----------------------------------------------------------
//Просчёт стоимости печати
let printCost = 0;
if (document.getElementById('print').checked) {
  const height = parseFloat(document.getElementById('height').value) || 0;
  const width = parseFloat(document.getElementById('width').value) || 0;
  const area = (height * width) / 10000; // м² неона

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
const tapeType = document.getElementById('tapeType').value;
const tapeLength = document.getElementById('tapeLength').value;
const neonWidth = document.getElementById('neonWidth').value;
const quantity = parseFloat(document.getElementById('elementsCount').value) || 1;

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

const cost1 = calculateTapeCost(tapeType, tapeLength, neonWidth, quantity);

const totalCostNeon = cost1;

//----------------------------------------------------

//Расчет длины всех лент для Блока питания
tapeLengthBlock = parseFloat(document.getElementById('tapeLength').value) || 0;
const totalTapeLength = tapeLengthBlock;

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

// 4. Фрезеровка неона
  const millingPricePerM = parseFloat(DATA[34][1] || 0); // B35
  const tapeLength1Num = parseFloat(tapeLength) || 0;
  const millingCost = tapeLength1Num * millingPricePerM;
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
  case "Без подложки":
    substratePricePerM2 = 0;
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
//Мини вывеска
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

//Фрезеровка контурного акрила (контура)
function calculateAcrylicCuttingCost() {
  const curveHeight = parseFloat(document.getElementById('curveHeight').value) || 0; // см
  const curveWidth = parseFloat(document.getElementById('curveWidth').value) || 0;   // см
  const curveLength = parseFloat(document.getElementById('curveLength').value) || 0; // м
  const konturType = document.getElementById('konturType').value;

  // Цены из DATA
  const priceBlackMilk = parseFloat(DATA[127][1]) || 0;  // A128
  const priceBlackFilm = parseFloat(DATA[128][1]) || 0;  // A129
  const priceSilver = parseFloat(DATA[129][1]) || 0;     // A130
  const priceGold = parseFloat(DATA[130][1]) || 0;       // A131
  const cuttingPricePerMeter = parseFloat(DATA[127][2]) || 0; // C128 — цена за пг.м. порезки

  // Выбор материала
  let materialPricePerM2 = 0;
  switch (konturType) {
    case 'Чёрный-молочный':
      materialPricePerM2 = priceBlackMilk;
      break;
    case 'Чёрный + плёнка':
      materialPricePerM2 = priceBlackFilm;
      break;
    case 'Серебрянный':
      materialPricePerM2 = priceSilver;
      break;
    case 'Золотой':
      materialPricePerM2 = priceGold;
      break;
    default:
      materialPricePerM2 = 0;
  }

  // Площадь в м²
  const curveAreaM2 = (curveHeight * curveWidth) / 10000;

  // Расчёты
  const cuttingCost = curveLength * cuttingPricePerMeter;          // длина кривой * цена за пг.м
  const materialCost = curveAreaM2 * materialPricePerM2;           // площадь * цена за м²
  const curveCost = cuttingCost + materialCost;                    // итог

  return curveCost;
}

const curveCost = calculateAcrylicCuttingCost();

//----------------------------------------------------
//Стоимость работ по вырезному акрилу 1 и 2
 // Получаем значения ширины и высоты из форм
const curveWidth1 = parseFloat(document.getElementById("curveWidth").value) || 0;
const curveHeight1 = parseFloat(document.getElementById("curveHeight").value) || 0;
const curveWidth2 = parseFloat(document.getElementById("curveWidth2").value) || 0;
const curveHeight2 = parseFloat(document.getElementById("curveHeight2").value) || 0;

// Расчёт суммарной площади в м²
const curveAreaM2 = (curveWidth1 * curveHeight1 + curveWidth2 * curveHeight2) / 10000;

// Стоимость работы по вырезному акрилу
function calculateAcrylicLaborOnly(DATA) {
  // Чтение цен из Excel-файла
  const laborCostUnder1 = parseFloat(DATA[134][1]) || 0;    // A135
  const laborCost1to1_5 = parseFloat(DATA[135][1]) || 0;    // A136
  const laborCost1_5to2 = parseFloat(DATA[136][1]) || 0;    // A137

  let laborCost = 0;

  if (curveAreaM2 <= 1) {
    laborCost = laborCostUnder1;
  } else if (curveAreaM2 <= 1.5) {
    laborCost = laborCost1to1_5;
  } else if (curveAreaM2 <= 2) {
    laborCost = laborCost1_5to2;
  } else {
    laborCost = laborCost1_5to2; // Больше 2 — максимум
  }

  return laborCost;
}

const acrylicLaborCost = calculateAcrylicLaborOnly(DATA);
//----------------------------------------------------

//Стоимость работы по неону
function calculateWorkCost(tapeType1, quantity1, tapeLength1, waterProtection) {
  if (tapeType1 === "Без неона") return 0; // <--- добавлено условие (При условии будет 0)

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

  const len1 = parseFloat(tapeLength) || 0;

  if (waterProtection) {
    costWork1 = quantityWork1 * pricesWithWater[tapeType] + 200 + len1 * waterProtectionPricePerMeter;
  } else {
    costWork1 = quantityWork1 * pricesWithoutWater[tapeType];
  }

  return costWork1;
}


// Пример вызова:
const tapeTypeWork1 = document.getElementById('tapeType').value;
const quantityWork1 = parseFloat(document.getElementById('elementsCount').value) || 0;

const waterProtection = document.getElementById('waterProtection').checked;

const totalWorkCost = calculateWorkCost(tapeTypeWork1, quantityWork1, tapeLength, waterProtection);

//----------------------------------------------------
//расходники 
const elementsCount = parseFloat(document.getElementById('elementsCount').value) || 0;

// Фиксированная цена для до 10 элементов (A118, второй столбец)
const fixedPriceUpTo10 = parseFloat(DATA[117][1]) || 300; 

// Цена за элемент, если элементов больше 10 (A119, второй столбец)
const pricePerElementAfter10 = parseFloat(DATA[118][1]) || 0;

let consumablesCost = 0;

if (elementsCount <= 10) {
  consumablesCost = fixedPriceUpTo10;
} else {
  consumablesCost = elementsCount * pricePerElementAfter10;
}

//----------------------------------------------------
// Стоимость доп. покрытия + резки (по погонным метрам)
function calculateAcrylCurveCost2(DATA) {
  const acrylType = document.getElementById('acrylOption').value;
  if (!acrylType) return 0; // если "-" выбрано

  const width = parseFloat(document.getElementById('curveWidth2').value) || 0;
  const height = parseFloat(document.getElementById('curveHeight2').value) || 0;
  const areaM2 = (width * height) / 10000; // перевод см² → м²

  const curveLength = parseFloat(document.getElementById('curveLength2').value) || 0; // длина в метрах

  let pricePerM2 = 0;
  let cuttingPricePerM = 0;

  switch (acrylType) {
    case 'Чёрный-молочный':
      pricePerM2 = parseFloat(DATA[127][1]) || 0;
      cuttingPricePerM = parseFloat(DATA[127][2]) || 0;
      break;
    case 'Чёрный + плёнка':
      pricePerM2 = parseFloat(DATA[128][1]) || 0;
      cuttingPricePerM = parseFloat(DATA[127][2]) || 0;
      break;
    case 'Серебрянный':
      pricePerM2 = parseFloat(DATA[129][1]) || 0;
      cuttingPricePerM = parseFloat(DATA[127][2]) || 0;
      break;
    case 'Золотой':
      pricePerM2 = parseFloat(DATA[130][1]) || 0;
      cuttingPricePerM = parseFloat(DATA[127][2]) || 0;
      break;
  }

  const materialCost = areaM2 * pricePerM2;
  const cuttingCost = curveLength * cuttingPricePerM;

  return materialCost + cuttingCost;
}
const acrylCost2 = calculateAcrylCurveCost2(DATA);
//----------------------------------------------------

const markupMultiplier = parseFloat(DATA[123][1]) || 1; // B124 → строка 124 (индекс 123), колонка B (индекс 1) (Общий множитель)

//Сумма тотал всего
  const total = Math.round(
    (printCost +
    mountsCost +
    packagingCost +
    totalCostNeon +
    powerSupplyCost +
    consumablesCost +
    millingCost +
    substrateCost +
    cordCost +
    model3DCost +
    lightCost +
    minisign +
    remoteCost + 
    curveCost +
    acrylicLaborCost +
    totalWorkCost +
    acrylCost2) * markupMultiplier
  );

//----------------------------------------------------

//Доп. информация о стоимостях
const showDetailsBtn = document.getElementById('showDetailsBtn');
const detailsContainer = document.getElementById('detailsContainer');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');

showDetailsBtn.addEventListener('click', () => {
  // Собираем и формируем детальную стоимость (пример)
  const detailsText = `
    <p>Стоимость печати: ${printCost} грн.</p>
    <p>Стоимость упаковки: ${packagingCost} грн.</p>
    <p>Стоимость крепежей: ${mountsCost} грн.</p>
    <p>Стоимость Лента + Силикон: ${cost1.toFixed(2)} грн.</p>
    <p>Стоимость блока питания: ${powerSupplyCost} грн.</p>
    <p>Стоимость работ по неону: ${totalWorkCost} грн.</p>
    <p>Стоимость расходников: ${consumablesCost} грн.</p>
    <p>Стоимость фрезеровки неона: ${millingCost} грн.</p>
    <p>Стоимость подложки: ${substrateCost.toFixed(2)} грн.</p>
    <p>Стоимость шнура: ${cordCost} грн.</p>
    <p>Стоимость 3D-макета: ${model3DCost} грн.</p>
    <p>Стоимость света: ${lightCost} грн.</p>
    <p>Стоимость мини-вывески: ${minisign} грн.</p>
    <p>Стоимость пульта: ${remoteCost} грн.</p>
    <p>Стоимость работ по вырезному акрилу (общ.): ${curveAreaM2.toFixed(2)} м², ${acrylicLaborCost} грн.</p>
    <p>Стоимость вырезного акрила: ${curveCost.toFixed(2)} грн.</p>
    <p>Стоимость вырезного акрила 2: ${acrylCost2.toFixed(2)} грн.</p>
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
  console.log(`2. Упаковка: ${packagingCost} грн`);
  console.log(`3. Лента + Силикон: ${cost1.toFixed(2)} грн`);
  console.log(`4. Суммарная длина ленты: ${totalTapeLength} м → Блок питания: ${powerSupplyCost} грн`);
  console.log(`5. Стоимость работ по неону: ${totalWorkCost} грн`);
  console.log(`6. Расходники (по элементам ${elementsCount} эл.): ${consumablesCost} грн`);
  console.log(`7. Стоимость фрезеровки неона: ${millingCost} грн`);
  console.log(`8. Стоимость подложки: ${substrateCost.toFixed(2)} грн`);
  console.log(`9. Стоимость шнура: ${cordCost} грн.`);
  console.log(`10. Стоимость 3D-макета: ${model3DCost} грн.`);
  console.log(`11. Стоимость света: ${lightCost} грн.`);
  console.log(`12. Стоимость мини-вывески: ${minisign} грн.`);
  console.log(`13. Стоимость пульта: ${remoteCost} грн.`);
  console.log(`14. Стоимость работ по вырезному акрилу (общ.): ${curveAreaM2.toFixed(2)} м², ${acrylicLaborCost} грн`);
  console.log('15. Стоимость вырезного акрила:', curveCost.toFixed(2), 'грн');
  console.log("16. Стоимость вырезного акрила 2:", acrylCost2.toFixed(2), 'грн');
  console.log(`16. Стоимость крепежей: ${mountsCost} грн.`);

});  // <-- Вот эта закрывающая скобка и круглые скобки здесь обязательны

//----------------------------------------------------
