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
  const isFrameMount = mounts.startsWith('Спец. крепёж (Куб)'); // Подходит под "Каркас S", "Каркас M" и т.д.

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
  'mountCount', 'filmWidth', 'filmHeight', 'depth'
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
  const depth = parseFloat(document.getElementById('depth').value) || 0;
//----------------------------------------------------
// Площадь всех 6 поверхностей куба
function calculateCubeSurfaceArea() {
  // width, height, depth — в см, переводим в метры
  const w = width / 100;
  const h = height / 100;
  const d = depth / 100;

  // Площадь всех 6 сторон куба (2*(wh + wd + hd)) в м²
  return 2 * (w * h + w * d + h * d);
}

// Пример использования:
const surfaceArea = calculateCubeSurfaceArea();
//----------------------------------------------------
//Стоимость акрила для куба
function calculateAcrylicCost() {
  const acrylicPricePerM2 = parseFloat(DATA[9][1]) || 0;
  const surfaceArea = calculateCubeSurfaceArea();
  return surfaceArea * acrylicPricePerM2;
}
const acrylicCost = calculateAcrylicCost();
//----------------------------------------------------
//Расчёт стоимости каркаса
function calculateIronFrameCost() {
  const w = width / 100;
  const h = height / 100;
  const d = depth / 100;

  const totalLength = 4 * (w + h + d); // 12 рёбер
  return totalLength * ironFramePricePerMeter;
}

const ironFramePricePerMeter = parseFloat(DATA[11][1]) || 0; // например, B86 — грн/м.п.
const ironFrameCost = calculateIronFrameCost();
//----------------------------------------------------
// Стоимость печати (если выбрана) + фиксированная наценка 200
function calculatePrintCost() {
  const printSelected = document.getElementById('print').checked;
  const printPricePerM2 = parseFloat(DATA[55][1]) || 0; // Цена за м2 печати
  const fixedMarkup = parseFloat(DATA[56][1]) || 0; //Цена пристрела

  return printSelected ? ((surfaceArea * printPricePerM2) + fixedMarkup) : 0;
}
const printCost = calculatePrintCost();
//----------------------------------------------------
// Работа
function calculateWorkCost(surfaceArea, pricePerM2) {
  return surfaceArea * pricePerM2;
}
const workPricePerM2 = parseFloat(DATA[75][1]) || 0; // допустим, в таблице по адресу B61
const workCost = calculateWorkCost(surfaceArea, workPricePerM2);
//----------------------------------------------------
// Расходники по площади
function calculateMaterialsCost() {
  // Цены из таблицы (ячейки A20, A21, A22 — строки 19, 20, 21, колонка 1 — B)
  const materialTiers = [
    { maxArea: 0.5, price: parseFloat(DATA[21][1]) || 0 },  // A20 - строка 20, индекс 19
    { maxArea: 1.0, price: parseFloat(DATA[22][1]) || 0 },  // A21 - строка 21, индекс 20
    { maxArea: 1.5, price: parseFloat(DATA[23][1]) || 0 },  // A22 - строка 22, индекс 21
    { maxArea: 3, price: parseFloat(DATA[24][1]) || 0 },  // A22 - строка 22, индекс 21
  ];

  for (let tier of materialTiers) {
    if (surfaceArea <= tier.maxArea) {
      return tier.price;
    }
  }
  // Если площадь больше всех порогов, возвращаем максимальную цену
  return materialTiers[materialTiers.length - 1].price;
}
const materialsCost = calculateMaterialsCost();
//----------------------------------------------------
//Просчёт стоимости крепежей
const mounts = document.getElementById('mounts').value.trim();
const mountCountEl = document.getElementById('mountCount');
const mountCount = parseInt(mountCountEl.value) || (mountCountEl.disabled ? 1 : 0);

function calculateVolumeMount(width, height, depth) {
  return (width / 100) * (height / 100) * (depth / 100);
}
const volumeMount = calculateVolumeMount(width, height, depth);
let mountsCost = 0;

if (mounts === 'Спец. крепёж (Куб)') {
  let rowIndex = null;

  if (volumeMount <= 1) {
    rowIndex = 96; // A97 – Куб S
  } else if (volumeMount <= 1.5) {
    rowIndex = 97; // A98 – Куб M
  } else if (volumeMount <= 2) {
    rowIndex = 98; // A99 – Куб L
  }

  if (rowIndex !== null) {
    const price = parseFloat(DATA[rowIndex][2]) || 0; // B-столбец
    mountsCost = price * mountCount;
  }
} else {
  mountsCost = 0; // "Без крепежей" или другие
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

  return (materialCost + cuttingCost) * 6;
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
//Упаковка
function calculateVolume(width, height, depth) {
  return (width / 100) * (height / 100) * (depth / 100);
}

function calculatePackagingCostByVolume(width, height, depth, DATA) {
  const volume = calculateVolume(width, height, depth);

  const smallVolLimit = parseFloat(DATA[81][1]);
  const mediumVolLimit = parseFloat(DATA[82][1]);
  const largeVolLimit = parseFloat(DATA[83][1]);

  const smallVolCost = parseFloat(DATA[81][2]);
  const mediumVolCost = parseFloat(DATA[82][2]);
  const largeVolCost = parseFloat(DATA[83][2]);
  const extraVolCost = parseFloat(DATA[84][2]);

  if (volume <= smallVolLimit) return smallVolCost;
  if (volume <= mediumVolLimit) return mediumVolCost;
  if (volume <= largeVolLimit) return largeVolCost;
  return extraVolCost;
}

// вызов
const volume = calculateVolume(width, height, depth);
const packagingCost = calculatePackagingCostByVolume(width, height, depth, DATA);
//----------------------------------------------------
//Стоимость пространства для ленты

// Площадь пространства вдоль всех 12 рёбер (в м²)
function calculateLightSpaceArea() {
  const w = width / 100;
  const h = height / 100;
  const d = depth / 100;

  const totalEdgeLength = 4 * (w + h + d); // длина всех 12 рёбер в метрах
  const channelWidth = 0.01; // ширина канала 1 см = 0.01 м

  return totalEdgeLength * channelWidth; // площадь в м²
}

//Просчёт стоимости пространства
function calculateLightSpaceCost() { 
  const lightSpacePricePerM2 = parseFloat(DATA[10][1]) || 0;
  const areaLightSpace = calculateLightSpaceArea();
  return areaLightSpace * lightSpacePricePerM2;
}
const areaLightSpace = calculateLightSpaceArea();
const lightSpaceCost = calculateLightSpaceCost();
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
    (mountsCost +
    filmCost +
    tapeCost +
    powerSupplyCost +
    packagingCost +
    cordCost +
    model3DCost +
    lightCost +
    minisign +
    materialsCost +
    workCost +
    printCost +
    acrylicCost +
    ironFrameCost +
    lightSpaceCost
    ) * markupMultiplier
);

//----------------------------------------------------

//Доп. информация о стоимостях
const showDetailsBtn = document.getElementById('showDetailsBtn');
const detailsContainer = document.getElementById('detailsContainer');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');

showDetailsBtn.addEventListener('click', () => {
  // Собираем и формируем детальную стоимость (пример)
  const detailsText = `
  <p>Общая площадь куба: ${surfaceArea} м²</p>
  <p>Стоимость упаковки: ${packagingCost} грн. (Объём: ${volume} м³)</p>
  <p>Стоимость блока питания: ${powerSupplyCost} грн.</p>
  <p>Стоимость ленты: ${tapeCost} грн.</p>
  <p>Стоимость доп. покрытия и резки ×6: ${filmCost} грн.</p>
  <p>Стоимость крепежей: ${mountsCost} грн.</p>
  <p>Стоимость расходников по площади: ${materialsCost} грн.</p>
  <p>Стоимость работ: ${workCost} грн. (цена ${workPricePerM2} грн/м² × ${surfaceArea} м²)</p>
  <p>Стоимость печати ×6: ${printCost} грн.</p>
  <p>Стоимость шнура: ${cordCost} грн.</p>
  <p>Стоимость 3D-макета: ${model3DCost} грн.</p>
  <p>Стоимость света: ${lightCost} грн.</p>
  <p>Стоимость мини-вывески: ${minisign} грн.</p>
  <p>Стоимость акрила для куба: ${acrylicCost.toFixed(2)} грн.</p>
  <p>Железный каркас: ${ironFrameCost} грн. (по ${ironFramePricePerMeter} грн/м)</p>
  <p>Стоимость пространства для ленты: ${lightSpaceCost} грн. (Площадь: ${areaLightSpace} м²)</p>
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
  console.log(`Общая площадь куба: ${surfaceArea} м2`);
  console.log(`1. Стоимость упаковки: ${packagingCost} грн, Объём: ${volume} м3`);
  console.log(`2. Стоимость блока питания: ${powerSupplyCost} грн`);
  console.log(`3. Стоимость ленты: ${tapeCost} грн`);
  console.log(`3. Стоимость доп.покрытия + резки x6: ${filmCost} грн`);
  console.log(`5. Стоимость крепежей: ${mountsCost} грн`);
  console.log(`6. Стоимость расходников по площади: ${materialsCost} грн`);
  console.log(`7. Стоимость работы: ${workPricePerM2} грн/м² × ${surfaceArea} м² = ${workCost} грн`);
  console.log(`8. Стоимость печати х6: ${printCost} грн`);
  console.log(`9. Стоимость шнура: ${cordCost} грн`);
  console.log(`10. Стоимость 3д макета: ${model3DCost} грн`);
  console.log(`11. Стоимость света: ${lightCost} грн`);
  console.log(`12. Стоимость Мини вывески: ${minisign} грн`);
  console.log(`13. Стоимость акрила для куба: ${acrylicCost.toFixed(2)} грн`);
  console.log(`14. Железный каркас: ${ironFrameCost} грн (по ${ironFramePricePerMeter} грн/м)`);
  console.log(`15. Стоимость пространства для ленты: ${lightSpaceCost} грн, Площадь: ${areaLightSpace} м2`);

});  // <-- Вот эта закрывающая скобка и круглые скобки здесь обязательны

//----------------------------------------------------
