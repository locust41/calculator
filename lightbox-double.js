//-----------------------------------------------------
// Тут будет храниться вся таблица
let DATA = null;

// Название файла и листа
const fileUrl = '/prices.xlsx';
const sheetName = 'Световой лайтбокс';

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
document.getElementById('filmOption').addEventListener('change', (e) => {
  const block = document.getElementById('filmSizeBlock');
  block.style.display = e.target.value ? 'block' : 'none';
});
//-----------------------------------------------------
//Блокировка кнопки (ВРЕМЕННО)
 const buttons = document.querySelectorAll('.block-button');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.backgroundColor = '#000';
    btn.style.color = '#888';
    btn.style.cursor = 'not-allowed';
    btn.onclick = null;
  });
//-----------------------------------------------------
// Применить логику выбора mountCount сразу при загрузке страницы
window.addEventListener('DOMContentLoaded', function () {
  document.getElementById('mounts').dispatchEvent(new Event('change'));
});
//Блок полей "Кол-во крепежей" при выбораном "Без крепежей" и "Каркас"
document.getElementById('mounts').addEventListener('change', function () {
  const mounts = this.value;
  const mountCountEl = document.getElementById('mountCount');

  const isNoMount = mounts === 'Без крепежей';
  const isFrameMount = mounts.startsWith('Каркас'); // Подходит под "Каркас S", "Каркас M" и т.д.

  if (isNoMount) {
    mountCountEl.disabled = true;
    mountCountEl.placeholder = 'Отключено';
    mountCountEl.style.color = '#888';
    mountCountEl.value = '';
  } else if (isFrameMount) {
    mountCountEl.disabled = true;
    mountCountEl.placeholder = '1';
    mountCountEl.style.color = '#888';
    mountCountEl.value = 1;
  } else {
    mountCountEl.disabled = false;
    mountCountEl.placeholder = '';
    mountCountEl.style.color = '';
    mountCountEl.value = 0;
  }
});
//-----------------------------------------------------
// Обработка нажатия кнопки

document.getElementById('calculateBtn').addEventListener('click', () => {
  if (!DATA) {
    showNotification('Введите данные для просчёта стоимости');
    return;
  }
//-----------------------------------------------------------
//----------------------------------------------------
//Анимация уведомения о значениях
const requiredFields = [
  'height', 'width', 'curveLength', 'mountCount', 'tapeLength',
  'mountCount', 'filmWidth', 'filmHeight'
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
//Получение базовых параметров
  const width = parseFloat(document.getElementById('width').value) || 0;
  const height = parseFloat(document.getElementById('height').value) || 0;
  const thicknessStr = document.getElementById('boxThickness').value;
  const thickness = parseFloat(thicknessStr) || 0; // "3 см." → 3
//----------------------------------------------------
// Площадь дна и лица
function calculateFaceArea(width, height) {
  return (width * height) / 10000; // в м²
}
const area = calculateFaceArea(width, height);
//----------------------------------------------------
//Стоимость лица c двух сторон
function calculateFaceCost(area, DATA) {
  const acrylicPrice = parseFloat(DATA[2][1]) || 0;  // Цена белого акрила (лицо)
  return area * 2 * acrylicPrice;
}

const faceCost = calculateFaceCost(area, DATA);
//----------------------------------------------------
//Стоимость центральной вставки ПВХ
function calculateBottomCost(area, DATA) {
  const pvcPrice = parseFloat(DATA[1][1]) || 0;      // Цена ПВХ дно
  return area * pvcPrice;
}
const bottomCost = calculateBottomCost(area, DATA);
//----------------------------------------------------
//Расчёт стоимости борта х2 от суммы (Периметр, толщина, стоимость)
function calculatePerimeterCost() {
  const perimeterM = 2 * (width + height) / 100; // в метрах
  const thicknessM = thickness / 100; // тоже в метрах
  const sideArea = perimeterM * thicknessM; // площадь борта в м²

  const sidePVCPrice = parseFloat(DATA[3][1]) || 0; // Цена ПВХ борта 
  return sideArea * sidePVCPrice * 2;
}
const sideCost = calculatePerimeterCost();
//----------------------------------------------------
// Стоимость печати (если выбрана) + фиксированная наценка 200
function calculatePrintCost() {
  const printSelected = document.getElementById('print').checked;
  const printPricePerM2 = parseFloat(DATA[55][1]) || 0; // Цена за м2 печати
  const fixedMarkup = parseFloat(DATA[56][1]) || 0; //Цена пристрела

  return printSelected ? (((area * printPricePerM2) + fixedMarkup) * 2) : 0;
}
const printCost = calculatePrintCost();
//----------------------------------------------------
// Работа
function calculateWorkCost(area, workPricePerM2) {
  return area * workPricePerM2;
}
// Парсим цену за м² работы из Excel-таблицы
const workPricePerM2 = parseFloat(DATA[73][1]) || 0;

// Вызываем функцию (предполагаем, что area уже рассчитана)
const workCost = calculateWorkCost(area, workPricePerM2);
//----------------------------------------------------
// Расходники по площади
function calculateMaterialsCost(area, DATA) {
  // Цены из таблицы (ячейки A20, A21, A22 — строки 19, 20, 21, колонка 1 — B)
  const materialTiers = [
    { maxArea: 0.5, price: parseFloat(DATA[21][1]) || 0 },  // A20 - строка 20, индекс 19
    { maxArea: 1.0, price: parseFloat(DATA[22][1]) || 0 },  // A21 - строка 21, индекс 20
    { maxArea: 1.5, price: parseFloat(DATA[23][1]) || 0 },  // A22 - строка 22, индекс 21
  ];

  for (let tier of materialTiers) {
    if (area <= tier.maxArea) {
      return tier.price;
    }
  }
  // Если площадь больше всех порогов, возвращаем максимальную цену
  return materialTiers[materialTiers.length - 1].price;
}
const materialsCost = calculateMaterialsCost(area, DATA);
//----------------------------------------------------
//Просчёт стоимости крепежей
const mounts = document.getElementById('mounts').value.trim();
const mountCountEl = document.getElementById('mountCount');
const mountCount = parseInt(mountCountEl.value) || (mountCountEl.disabled ? 1 : 0);

let mountsCost = 0;

if (mounts === 'Без крепежей') {
  mountsCost = 0;
} else if (mounts.includes('Каркас')) {
  // Жёстко по квадратуре — выбираем нужную строку
  let rowIndex = 0;

  if (area <= 0.5) {
    rowIndex = 88; // A89 – Каркас S
  } else if (area <= 1) {
    rowIndex = 89; // A90 – Каркас M
  } else if (area <= 1.5) {
    rowIndex = 90; // A91 – Каркас L
  } else {
    rowIndex = 91; // A92 – Каркас XL
  }

  mountsCost = parseFloat(DATA[rowIndex][2]) || 0; // [автоматический выбор строки][выбор колонки]
} else {
  // Жестко по названию — напрямую по строкам
  if (mounts === 'Настенный (шт.)') {
    mountsCost = (parseFloat(DATA[93][2]) || 0) * mountCount; // A94
  } else if (mounts === 'Цепи (м.)') {
    mountsCost = (parseFloat(DATA[94][2]) || 0) * mountCount; // A95
  } else if (mounts === 'Тросы (м.)') {
    mountsCost = (parseFloat(DATA[95][2]) || 0) * mountCount; // A96
  } else {
    mountsCost = 0; // если вдруг что-то новое — не считать
  }
}
//----------------------------------------------------
//Стоимость доп.покрытия + резки
function calculateFilmCost(DATA) {
  const filmType = document.getElementById('filmOption').value;
  if (!filmType) return 0;

  const width = parseFloat(document.getElementById('filmWidth').value) || 0;
  const height = parseFloat(document.getElementById('filmHeight').value) || 0;
  const areaM2 = (width * height) / 10000;

  const curveLength = parseFloat(document.getElementById('curveLength').value) || 0;

  let pricePerM2 = 0;
  let cuttingPricePerM = 0;

  switch (filmType) {
    case 'Плёнка':
      pricePerM2 = parseFloat(DATA[43][1]) || 0;       // цена плёнки за м² (например B80)
      cuttingPricePerM = parseFloat(DATA[43][2]) || 0; // цена резки плёнки за метр (например B83)
      break;
    case 'Акрил':
      pricePerM2 = parseFloat(DATA[44][1]) || 0;       // цена акрила за м² (например B81)
      cuttingPricePerM = parseFloat(DATA[44][2]) || 0; // цена резки акрила за метр (например B84)
      break;
  }

  const materialCost = areaM2 * pricePerM2;
  const cuttingCost = curveLength * cuttingPricePerM;

  return (materialCost + cuttingCost) * 2;
}

const filmCost = calculateFilmCost(DATA);
//----------------------------------------------------
//Стоимость ленты
function calculateTapeCost() {
  let pricePerMeter = 0;
  switch(tapeType) {
    case 'Standart Neon':
      pricePerMeter = parseFloat(DATA[60][1]) || 0;
      break;
    case 'RGB':
      pricePerMeter = parseFloat(DATA[61][1]) || 0;
      break;
    case 'Smart':
      pricePerMeter = parseFloat(DATA[62][1]) || 0;
      break;
    default:
      pricePerMeter = 0;
  }
  return tapeLength * pricePerMeter;
}
const tapeLength = parseFloat(document.getElementById('tapeLength').value) || 0;
const tapeType = document.getElementById('tapeType').value;

const tapeCost = calculateTapeCost();
//----------------------------------------------------

//Расчет длины всех лент для Блока питания
tapeLengthBlock = parseFloat(document.getElementById('tapeLength').value) || 0;
const totalTapeLength = tapeLengthBlock;

//Расчет стоимости блока питания по суммарной длине ленты
let powerSupplyCost = 0;

// Массив блоков питания: [макс длина (м), стоимость]
const powerBlocks = [
  [2,   parseFloat(DATA[27][2])],  // A4  24 Вт  До 2 метров
  [3,   parseFloat(DATA[28][2])],  // A5  36 Вт  До 3 метров
  [4,   parseFloat(DATA[29][2])],  // A6  48 Вт  До 4 метров
  [5,   parseFloat(DATA[30][2])],  // A7  60 Вт  До 5 метров
  [6,   parseFloat(DATA[31][2])],  // A8  72 Вт  До 6 метров
  [8,   parseFloat(DATA[32][2])],  // A9  96 Вт  До 8 метров
  [10,  parseFloat(DATA[33][2])],  // A10 120 Вт  До 10 метров
  [12.5, parseFloat(DATA[34][2])], // A11 150 Вт  До 12,5 метров
  [16.5, parseFloat(DATA[35][2])], // A12 200 Вт  До 16,5 метров
  [25,  parseFloat(DATA[36][2])], // A13 300 Вт  До 25 метров
  [35,  parseFloat(DATA[37][2])], // A14 450 Вт  До 35 метров
  [45,  parseFloat(DATA[38][2])], // A15 550 Вт  До 45 метров
  [55,  parseFloat(DATA[39][2])]  // A16 650 Вт  До 55 метров
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
// 9. Упаковка — аналог формулы Excel
let packagingCost = 0;


// Считываем лимиты и цены из новых ячеек
const smallLimit = parseFloat(DATA[48][1]);  // B85 = 0.3
const mediumLimit = parseFloat(DATA[49][1]); // B86 = 0.8
const largeLimit = parseFloat(DATA[50][1]);  // B87 = 1.5

const smallCost = parseFloat(DATA[48][2]);   // C85 = 125
const mediumCost = parseFloat(DATA[49][2]);  // C86 = 180
const largeCost = parseFloat(DATA[50][2]);   // C87 = 260

const frameCost = parseFloat(DATA[51][2]);   // C88 = 500

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
//Цена шнура
const cordCost = parseFloat(DATA[66][1]) || 0;  // B37 - индекс 36, колонка 1 (вторая колонка)
//----------------------------------------------------
//Цена 3д макета
const model3DCost = parseFloat(DATA[67][1]) || 0;  // B39 - индекс 38, колонка 1
//----------------------------------------------------
//Цена света
const lightCost = parseFloat(DATA[65][1]) || 0;    // B36
//----------------------------------------------------
//Мини вывеска
const minisign = parseFloat(DATA[68][1]) || 0;    // B40
//----------------------------------------------------

//Множитель
const markupMultiplier = parseFloat(DATA[77][1]) || 1; // B124 → строка 124 (индекс 123), колонка B (индекс 1) (Общий множитель)

//Сумма тотал всего
  const total = Math.round(
    (faceCost +
    sideCost +
    printCost +
    workCost +
    materialsCost +
    mountsCost +
    filmCost +
    tapeCost +
    powerSupplyCost +
    packagingCost +
    cordCost +
    model3DCost +
    lightCost +
    minisign +
    bottomCost) * markupMultiplier
  );

//----------------------------------------------------

//Доп. информация о стоимостях
const showDetailsBtn = document.getElementById('showDetailsBtn');
const detailsContainer = document.getElementById('detailsContainer');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');

showDetailsBtn.addEventListener('click', () => {
  // Собираем и формируем детальную стоимость (пример)
  const detailsText = `
  <p>Стоимость упаковки: ${packagingCost} грн.</p>
  <p>Стоимость блока питания: ${powerSupplyCost} грн.</p>
  <p>Стоимость ленты: ${tapeCost} грн.</p>
  <p>Стоимость доп. покрытия и резки x2: ${filmCost} грн.</p>
  <p>Стоимость крепежей: ${mountsCost} грн.</p>
  <p>Стоимость расходников по площади: ${materialsCost} грн.</p>
  <p>Стоимость работ: ${workCost} грн.</p>
  <p>Стоимость печати x2: ${printCost} грн.</p>
  <p>Стоимость лица c двух сторон: ${faceCost} грн.</p>
  <p>Стоимость борта из ПВХ x2: ${sideCost} грн.</p>
  <p>Стоимость вставки ПВХ: ${bottomCost} грн.</p>
  <p>Стоимость шнура: ${cordCost} грн.</p>
  <p>Стоимость 3D-макета: ${model3DCost} грн.</p>
  <p>Стоимость света: ${lightCost} грн.</p>
  <p>Стоимость мини-вывески: ${minisign} грн.</p>
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
  console.log(`1. Стоимость упаковки: ${packagingCost} грн, размер (${area})`);
  console.log(`2. Стоимость блока питания: ${powerSupplyCost} грн`);
  console.log(`3. Стоимость ленты: ${tapeCost} грн`);
  console.log(`3. Стоимость доп.покрытия + резки х2: ${filmCost} грн`);
  console.log(`5. Стоимость крепежей: ${mountsCost} грн`);
  console.log(`6. Стоимость расходников по площади: ${materialsCost} грн`);
  console.log(`7. Стоимость работ: ${workCost} грн`);
  console.log(`3. Стоимость печати х2: ${printCost} грн`);
  console.log(`3. Стоимость лица c двух сторон: ${faceCost} грн`);
  console.log(`3. Стоимость борта х2: ${sideCost} грн`);
  console.log(`11. Стоимость шнура: ${cordCost} грн`);
  console.log(`12. Стоимость 3д макета: ${model3DCost} грн`);
  console.log(`13. Стоимость света: ${lightCost} грн`);
  console.log(`14. Стоимость Мини вывески: ${minisign} грн`);
  console.log(`15. Стоимость вставки пвх: ${bottomCost} грн`);

});  // <-- Вот эта закрывающая скобка и круглые скобки здесь обязательны

//----------------------------------------------------
