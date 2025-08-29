// Тут будет храниться вся таблица
let DATA = null;

// Название файла и листа
const fileUrl = 'prices.xlsx';
const sheetName = 'зеркала';
//-----------------------------------------------------------
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
//-----------------------------------------------------------
// Автоустановка пульта при изменении подсветки
document.getElementById('tapeType').addEventListener('change', () => {
  const tapeType = document.getElementById('tapeType').value;
  const remoteEl = document.getElementById('remote');

  if (tapeType === 'RGB' || tapeType === 'Smart') {
    remoteEl.value = 'Пульт WiFi';    // автоматически ставим пульт WiFi
    remoteEl.disabled = true;          // блокируем выбор
  } else {
    remoteEl.disabled = false;         // разблокируем выбор
  }
});

//-----------------------------------------------------------
// Обработка нажатия кнопки
document.getElementById('calculateBtn').addEventListener('click', () => {
  if (!DATA) {
    showNotification('Введите данные для просчёта стоимости');
    return;
  }
//-----------------------------------------------------------
//БЛОК УВЕДОМЛЕНИЙ о значениях в полях
// Проверка обязательных полей (без учёта активности)
const requiredFields = [
  'height', 'width', 'tapeLength',
  'engravingHeight', 'engravingWidth'
];

for (let id of requiredFields) {
  const el = document.getElementById(id);

  if (!el.value || parseFloat(el.value) <= 0) {
    showNotification(`Пожалуйста, введите корректное значение для поля: ${el.previousElementSibling.textContent}`);
    el.focus();
    return; // Прерываем расчёт
  }
}
//-----------------------------------------------------------
  // Переменные из полей
  const height = parseFloat(document.getElementById('height').value) || 0;
  const width = parseFloat(document.getElementById('width').value) || 0;
  const tapeType = document.getElementById('tapeType').value;
  const tapeLength = parseFloat(document.getElementById('tapeLength').value) || 0;
  const backlightTape = document.getElementById('backlightTape').value;
  const engravingHeight = parseFloat(document.getElementById('engravingHeight').value) || 0;
  const engravingWidth = parseFloat(document.getElementById('engravingWidth').value) || 0;
  const mirrorType = document.getElementById('mirrorType').value;
  const remote = document.getElementById('remote').value;
  const remotezone = document.getElementById('remotezone').value;
  const mounts = document.getElementById('mounts').value;


  // 2. Гравировка
  const engravingArea = (engravingHeight / 100) * (engravingWidth / 100);
  const engravingCost = engravingArea * parseFloat(DATA[56][1] || 0); // B58
//-----------------------------------------------------------
  // 3. Подсветка
  let tapeTypeCost = 0;
  switch (tapeType) {
    case "Standart Neon":
      tapeTypeCost = parseFloat(DATA[77][1] || 0); // B79
      break;
    case "RGB":
      tapeTypeCost = parseFloat(DATA[78][1] || 0); // B80
      break;
    case "Smart":
      tapeTypeCost = parseFloat(DATA[79][1] || 0); // B81
      break;
  }
  const tapeCost = tapeLength * tapeTypeCost;
//-----------------------------------------------------------
  // 4. Фрезеровка
  const millingPricePerM = parseFloat(DATA[31][1] || 0); // B84
  const millingCost = tapeLength * millingPricePerM;
//-----------------------------------------------------------

//Пульты
let remoteCost = 0;
const remoteLower = remote.trim().toLowerCase();

for (let i = 83; i <= 86; i++) {
  const row = DATA[i];
  if (!row) continue;

  const name = (row[0] || '').toString().trim().toLowerCase();
  const price = parseFloat(row[1]) || 0;

  if (name === remoteLower) {
    remoteCost = price;
    console.log(`Найдена цена пульта "${remote}":`, remoteCost);
    break;
  }
}
//-----------------------------------------------------------
//Пульты Зона
let remoteZoneCost = 0;
const remoteZoneLower = remotezone.trim().toLowerCase();

for (let i = 71; i <= 73; i++) {  // A72–A74 → индекс 71–73
  const row = DATA[i];
  if (!row) continue;

  const name = (row[0] || '').toString().trim().toLowerCase();
  const price = parseFloat(row[1]) || 0;

  if (name === remoteZoneLower) {
    remoteZoneCost = price;
    console.log(`Найдена цена пульта управления зонами "${remotezone}":`, remoteZoneCost);
    break;
  }
}

//-----------------------------------------------------------
//Крепежи
let mountsCost = 0;
const mountsSelected = mounts.trim().toLowerCase();

if (mountsSelected === 'подставка') {
  mountsCost = parseFloat(DATA[51][1]) || 0; // строка 52
} else if (mountsSelected === 'крепление на стену') {
  mountsCost = parseFloat(DATA[52][1]) || 0; // строка 53
}
console.log(`Цена подставки/крепления "${mounts}":`, mountsCost);

//-----------------------------------------------------------

// Расходники: учитываем обе ленты
tapeLength3 = parseFloat(document.getElementById('tapeLength').value) || 0;
backlightTape3 = parseFloat(document.getElementById('backlightTape').value) || 0;

// Массив расходников: [макс длина (м), стоимость] — из ячеек A19:B23
const consumablesTiers = [
  [5,   parseFloat(DATA[18][1])], // A19
  [10,  parseFloat(DATA[19][1])], // A20
  [15,  parseFloat(DATA[20][1])], // A21
  [20,  parseFloat(DATA[21][1])], // A22
  [Infinity, parseFloat(DATA[22][1])] // A23
];

// Расчёт длины: суммируем переднюю и заднюю ленту
const totalConsumableLength = tapeLength3 + backlightTape3;
let consumablesCost = 0;
for (let i = 0; i < consumablesTiers.length; i++) {
  if (totalConsumableLength <= consumablesTiers[i][0]) {
    consumablesCost = consumablesTiers[i][1];
    break;
  }
}

// Если длина больше всех — берём последнюю цену
if (consumablesCost === 0 && consumablesTiers.length > 0) {
  consumablesCost = consumablesTiers[consumablesTiers.length - 1][1];
}

//-----------------------------------------------------------


// 8. Тип зеркала (строки 90–93 в Excel, то есть индексы 89–92 в массиве)
// Определяем стоимость по типу зеркала
const shapeOptions = {
  "Квадратное": 89,
  "Круглое": 90,
  "Волны": 91,
  "По форме": 92
};

const shapeRowIndex = shapeOptions[mirrorType];

if (shapeRowIndex !== undefined && DATA[shapeRowIndex] && DATA[shapeRowIndex][1]) {
  mirrorShapeCost = parseFloat(DATA[shapeRowIndex][1]) || 0;
  console.log(`Тип зеркала "${mirrorType}", стоимость:`, mirrorShapeCost);
} else {
  console.warn(`Тип зеркала "${mirrorType}" не найден или не указана цена.`);
}

  // 1. Зеркало
  const mirrorArea = (height / 100) * (width / 100);
  const mirrorCost = mirrorArea * mirrorShapeCost;

//-----------------------------------------------------------
// 9. Упаковка — аналог формулы Excel
let packagingCost = 0;
const area = mirrorArea; // площадь зеркала

// Значения из таблицы
const smallLimit = parseFloat(DATA[64][1]); // B65
const mediumLimit = parseFloat(DATA[65][1]); // B66
const largeLimit = parseFloat(DATA[66][1]); // B67
const smallCost = parseFloat(DATA[64][2]); // C65
const mediumCost = parseFloat(DATA[65][2]); // C66
const largeCost = parseFloat(DATA[66][2]); // C67
const frameCost = parseFloat(DATA[67][2]); // C68

if (area <= smallLimit) {
  packagingCost = smallCost;
} else if (area <= mediumLimit) {
  packagingCost = mediumCost;
} else if (area <= largeLimit) {
  packagingCost = largeCost;
} else {
  packagingCost = frameCost;
}
//-----------------------------------------------------------
// 10. Расчет длины всех лент для Блока питания
tapeLength1 = parseFloat(document.getElementById('tapeLength').value) || 0;
backlightTape1 = parseFloat(document.getElementById('backlightTape').value) || 0;
const totalTapeLength = tapeLength1 + backlightTape1;

// 11. Расчет стоимости блока питания по суммарной длине ленты
let powerSupplyCost = 0;

// Массив блоков питания: [макс длина (м), стоимость]
const powerBlocks = [
  [2,   parseFloat(DATA[3][2])],  // A4  24 Вт  До 2 метров
  [3,   parseFloat(DATA[4][2])],  // A5  36 Вт  До 3 метров
  [4,   parseFloat(DATA[5][2])],  // A6  48 Вт  До 4 метров
  [5,   parseFloat(DATA[6][2])],  // A7  60 Вт  До 5 метров
  [6,   parseFloat(DATA[7][2])],  // A8  72 Вт  До 6 метров
  [8,   parseFloat(DATA[8][2])],  // A9  96 Вт  До 8 метров
  [10,  parseFloat(DATA[9][2])],  // A10 120 Вт  До 10 метров
  [12.5, parseFloat(DATA[10][2])], // A11 150 Вт  До 12,5 метров
  [16.5, parseFloat(DATA[11][2])], // A12 200 Вт  До 16,5 метров
  [25,  parseFloat(DATA[12][2])], // A13 300 Вт  До 25 метров
  [35,  parseFloat(DATA[13][2])], // A14 450 Вт  До 35 метров
  [45,  parseFloat(DATA[14][2])], // A15 550 Вт  До 45 метров
  [55,  parseFloat(DATA[15][2])]  // A16 650 Вт  До 55 метров
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

//-----------------------------------------------------------
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
//-----------------------------------------------------------
// Расчет стоимости работы
// Длина основной ленты (без задней подсветки)
// Работа: получаем значения из таблицы
const workPerMeter = parseFloat(DATA[34][1]) || 0; // A35
const minWorkCost = parseFloat(DATA[35][1]) || 0;  // A36

// Длина основной ленты (без задней подсветки)
const tapeLength2 = parseFloat(document.getElementById('tapeLength').value) || 0;

// Расчет стоимости работы
let workCost = 0;

if (tapeLength2 <= 3.5) {
  workCost = minWorkCost;
} else {
  workCost = tapeLength2 * workPerMeter;
}
//-----------------------------------------------------------


//Цена шнура
const cordCost = parseFloat(DATA[30][1]) || 0;  // B31 - индекс 30, колонка 1 (вторая колонка)
//-----------------------------------------------------------
//Цена 3д макета
const model3DCost = parseFloat(DATA[33][1]) || 0;  // B34 - индекс 33, колонка 1
//-----------------------------------------------------------
//Цена света
const lightCost = parseFloat(DATA[29][1]) || 0;    // B30
//-----------------------------------------------------------
//Сумма двух метражей лент, (общая длина и стоимость одна на две)
const totalTapeCost = totalTapeLength * tapeTypeCost;
//-----------------------------------------------------------

console.log('Стоимость расходников:', consumablesCost);
console.log('--- Расчёт стоимости ---');
console.log(`1. Зеркало (${mirrorArea.toFixed(2)} м² × ${mirrorShapeCost} грн/м²): ${mirrorCost} грн`);
console.log(`2. Гравировка (${engravingArea.toFixed(2)} м² × ${DATA[56][1]} грн/м²): ${engravingCost} грн`);
console.log(`3. Подсветка общая (${tapeType}, ${totalTapeLength} м × ${tapeTypeCost} грн/м): ${totalTapeCost} грн`);
console.log(`4. Фрезеровка (${tapeLength} м × ${millingPricePerM} грн/м): ${millingCost} грн`);
console.log(`5. Пульт (${remote}): ${remoteCost} грн`);
console.log(`6. Крепление (${mounts}): ${mountsCost} грн`);
console.log(`7. Расходники (по длине ${totalConsumableLength} м): ${consumablesCost} грн`);
console.log(`Площадь зеркала: ${area.toFixed(2)} м² → Упаковка: ${packagingCost} грн`);
console.log(`Суммарная длина ленты: ${totalTapeLength} м → Блок питания: ${powerSupplyCost} грн`);
console.log(`Стоимость работы: ${workCost} грн.`);
console.log(`Стоимость шнура: ${cordCost} грн.`);
console.log(`Стоимость 3D-макета: ${model3DCost} грн.`);
console.log(`Стоимость света: ${lightCost} грн.`);
console.log(`Стоимость пульта зона: ${remoteZoneCost} грн.`);

console.log('---------------------------');
//-----------------------------------------------------------
const markupMultiplier = parseFloat(DATA[94][1]) || 1; // (Общий множитель переменная)

  // ИТОГО
const total = Math.round(
  (mirrorCost +
  engravingCost +
  tapeCost +
  millingCost +
  remoteCost +
  mountsCost +
  consumablesCost +
  packagingCost +
  powerSupplyCost +
  workCost +
  cordCost +
  model3DCost +
  lightCost +
  remoteZoneCost +
  totalTapeCost) * markupMultiplier
);
//-----------------------------------------------------------
//Доп. информация о стоимостях
const showDetailsBtn = document.getElementById('showDetailsBtn');
const detailsContainer = document.getElementById('detailsContainer');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');
const detailsContent = document.getElementById('detailsContent');

showDetailsBtn.addEventListener('click', () => {
  // Собираем и формируем детальную стоимость (пример)
  const detailsText = `
    <p>Стоимость зеркала: ${mirrorCost} грн.</p>
    <p>Стоимость гравировки: ${engravingCost} грн.</p>
    <p>Стоимость ленты: ${totalTapeCost} грн.</p>
    <p>Стоимость фрезеровки: ${millingCost} грн.</p>
    <p>Стоимость пульта: ${remoteCost} грн.</p>
    <p>Стоимость подставок/креплений: ${mountsCost} грн.</p>
    <p>Стоимость расходников: ${consumablesCost} грн.</p>
    <p>Стоимость упаковки: ${packagingCost} грн.</p>
    <p>Стоимость блока питания: ${powerSupplyCost} грн.</p>
    <p>Стоимость работы: ${workCost} грн.</p>
    <p>Стоимость шнура: ${cordCost} грн.</p>
    <p>Стоимость 3D-макета: ${model3DCost} грн.</p>
    <p>Стоимость света: ${lightCost} грн.</p>
    <p>Стоимость пульта зона: ${remoteZoneCost} грн.</p>
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
//-----------------------------------------------------------

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

  // Вывод на страницу
  document.getElementById('totalSum').textContent = total;
});
//-----------------------------------------------------------