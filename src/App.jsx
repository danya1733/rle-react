import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Paper,
  Box,
  Button,
} from '@mui/material';

function App() {
  // -------------------------
  // Состояния для Кодировщика
  // -------------------------
  const [encodeInput, setEncodeInput] = useState(''); // Ввод для текстового кодирования
  const [allowNumbers, setAllowNumbers] = useState(false); // Флаг разрешения чисел в тексте
  const [encodedText, setEncodedText] = useState(''); // Результат текстового кодирования

  const [encodeImageFile, setEncodeImageFile] = useState(null); // Загруженный файл для кодирования (PNG)
  const [encodeImageType, setEncodeImageType] = useState(''); // Тип изображения (image/png)
  const [encodedImageText, setEncodedImageText] = useState(''); // Результат кодирования изображения (RLE пикселей)

  // -------------------------
  // Состояния для Декодировщика
  // -------------------------
  const [decodeInput, setDecodeInput] = useState(''); // Ввод для текстового декодирования
  const [decodedText, setDecodedText] = useState(''); // Результат текстового декодирования

  const [decodeImageFile, setDecodeImageFile] = useState(null); // Загруженный текстовый файл для декодирования изображения
  const [decodedImageSrc, setDecodedImageSrc] = useState(''); // Результат декодирования изображения (Data URL)

  // -------------------------
  // Обработчики для Кодировщика
  // -------------------------

  // Обработка изменения текста для кодирования
  const handleEncodeInputChange = (e) => {
    let value = e.target.value;

    // Если числа не разрешены, удаляем их из строки
    if (!allowNumbers) {
      let filteredValue = '';
      for (let i = 0; i < value.length; i++) {
        const char = value[i];
        // Проверяем, является ли символ цифрой
        if (!(char >= '0' && char <= '9')) {
          filteredValue += char;
        }
      }
      value = filteredValue;
    }

    setEncodeInput(value); // Обновляем состояние ввода

    // Кодируем строку
    const encoded = encodeRLE(value, allowNumbers);
    setEncodedText(encoded); // Обновляем состояние закодированного текста
  };

  // Обработка изменения чекбокса разрешения чисел
  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setAllowNumbers(checked); // Обновляем состояние разрешения чисел

    // Если числа теперь не разрешены, удаляем их из текущего ввода и кодируем заново
    if (!checked) {
      let filteredValue = '';
      for (let i = 0; i < encodeInput.length; i++) {
        const char = encodeInput[i];
        if (!(char >= '0' && char <= '9')) {
          filteredValue += char;
        }
      }
      setEncodeInput(filteredValue); // Обновляем ввод без цифр
      const encoded = encodeRLE(filteredValue, false); // Кодируем без чисел
      setEncodedText(encoded); // Обновляем закодированный текст
    } else {
      // Если числа разрешены, просто кодируем текущий ввод
      const encoded = encodeRLE(encodeInput, true);
      setEncodedText(encoded);
    }
  };

  // Обработка изменения файла для кодирования изображения
  const handleEncodeImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'image/png') {
      setEncodeImageFile(file); // Сохраняем файл в состоянии
      setEncodeImageType(file.type); // Сохраняем тип изображения
    } else {
      alert('Пожалуйста, выберите PNG изображение.');
    }
  };

  // Обработка кодирования изображения
  const handleEncodeImage = () => {
    if (!encodeImageFile) {
      alert('Пожалуйста, выберите изображение для кодирования.');
      return;
    }

    if (encodeImageType === 'image/png') {
      // Кодирование PNG через массив пикселей с применением RLE
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Создаем off-screen canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Извлекаем пиксельные данные
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = Array.from(imageData.data); // Uint8ClampedArray -> Array

          // Преобразуем пиксели в массив пиксельных строк (RGBA)
          const pixelStrings = [];
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            pixelStrings.push(`${r},${g},${b},${a}`);
          }

          // Применяем RLE кодирование к массиву пиксельных строк
          const encodedPixels = encodeRLEArray(pixelStrings);

          // Создаем объект для сохранения типа, размеров и данных
          const encodedData = {
            type: 'PNG',
            width: canvas.width,
            height: canvas.height,
            data: encodedPixels,
          };

          // Преобразуем объект в JSON строку
          setEncodedImageText(JSON.stringify(encodedData));
        };
        img.onerror = () => {
          alert('Не удалось загрузить изображение. Пожалуйста, попробуйте другое.');
        };
        img.src = e.target.result;
      };

      reader.readAsDataURL(encodeImageFile);
    }
  };

  // -------------------------
  // Обработчики для Декодировщика
  // -------------------------

  // Обработка изменения текста для декодирования
  const handleDecodeInputChange = (e) => {
    const value = e.target.value;
    setDecodeInput(value); // Обновляем состояние ввода

    // Декодируем строку
    const decoded = decodeRLE(value);
    setDecodedText(decoded); // Обновляем состояние декодированного текста
  };

  // Обработка изменения файла для декодирования изображения
  const handleDecodeImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/plain') {
      setDecodeImageFile(file); // Сохраняем файл в состоянии
    } else {
      alert('Пожалуйста, выберите текстовый файл для декодирования изображения.');
    }
  };

  // Обработка декодирования изображения
  const handleDecodeImage = () => {
    if (!decodeImageFile) {
      alert('Пожалуйста, выберите текстовый файл для декодирования изображения.');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const encodedString = e.target.result; // Получаем закодированную строку

      let encodedData;
      try {
        encodedData = JSON.parse(encodedString);
      } catch (error) {
        alert('Неверный формат закодированных данных. Убедитесь, что файл содержит корректные данные.');
        return;
      }

      if (encodedData.type === 'PNG') {
        const { width, height, data } = encodedData;

        if (!width || !height || !data) {
          alert('Недостаточно данных для декодирования PNG изображения.');
          return;
        }

        // Декодируем RLE строку
        const decodedPixelStrings = decodeRLEArray(data);

        // Преобразуем строку пикселей в массив чисел
        const pixelArray = [];
        for (let pixelStr of decodedPixelStrings) {
          const [r, g, b, a] = pixelStr.split(',').map(Number);
          if ([r, g, b, a].some(channel => isNaN(channel))) {
            alert('Некорректные данные пикселей. Убедитесь, что данные соответствуют формату RGBA.');
            return;
          }
          pixelArray.push(r, g, b, a);
        }

        if (pixelArray.length !== width * height * 4) {
          alert('Некорректные данные пикселей. Убедитесь, что данные соответствуют указанным размерам изображения.');
          return;
        }

        // Создаем off-screen canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Создаем ImageData
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(pixelArray);
        ctx.putImageData(imageData, 0, 0);

        // Получаем Data URL из canvas
        const dataURL = canvas.toDataURL('image/png');
        setDecodedImageSrc(dataURL); // Обновляем состояние с изображением
      } else {
        alert('Неизвестный формат закодированных данных.');
      }
    };

    // Читаем файл как текст
    reader.readAsText(decodeImageFile);
  };

  // -------------------------
  // Функции Кодирования и Декодирования RLE для строк
  // -------------------------

  // Функция кодирования RLE для строк
  const encodeRLE = (str, numbersAllowed) => {
    if (str.length === 0) return ''; // Если строка пустая, возвращаем пустую строку

    let encoded = ''; // Инициализируем закодированную строку
    let count = 1; // Счётчик повторений символа
    let prevChar = str[0]; // Предыдущий символ

    // Проходим по строке начиная со второго символа
    for (let i = 1; i < str.length; i++) {
      const currentChar = str[i];
      if (currentChar === prevChar) {
        count++; // Увеличиваем счётчик, если символ такой же
      } else {
        // Добавляем в закодированную строку количество и символ
        if (numbersAllowed) {
          encoded += `${count}:${prevChar},`;
        } else {
          encoded += `${count}${prevChar}`;
        }
        prevChar = currentChar; // Обновляем предыдущий символ
        count = 1; // Сбрасываем счётчик
      }
    }

    // Добавляем последний символ и его количество
    if (numbersAllowed) {
      encoded += `${count}:${prevChar}`;
    } else {
      encoded += `${count}${prevChar}`;
    }

    return encoded; // Возвращаем закодированную строку
  };

  // Функция декодирования RLE для строк
  const decodeRLE = (str) => {
    if (str.length === 0) return ''; // Если строка пустая, возвращаем пустую строку

    let decoded = ''; // Инициализируем декодированную строку
    let i = 0; // Индекс текущего символа

    while (i < str.length) {
      let countStr = ''; // Строка для хранения количества

      // Считываем количество
      while (i < str.length && str[i] >= '0' && str[i] <= '9') {
        countStr += str[i];
        i++;
      }

      let count = parseInt(countStr, 10); // Преобразуем количество в число

      // Проверяем, есть ли двоеточие после числа
      if (str[i] === ':') {
        i++; // Пропускаем двоеточие
      }

      if (i < str.length) {
        const char = str[i]; // Получаем символ
        for (let j = 0; j < count; j++) {
          decoded += char; // Добавляем символ 'count' раз
        }
        i++; // Переходим к следующему символу
      }

      // Пропускаем запятые, если есть
      if (str[i] === ',') {
        i++;
      }
    }

    return decoded; // Возвращаем декодированную строку
  };

  // -------------------------
  // Функции Кодирования и Декодирования RLE для массивов
  // -------------------------

  // Функция кодирования RLE для массивов (например, пикселей PNG)
  const encodeRLEArray = (arr) => {
    if (arr.length === 0) return '';

    let encoded = '';
    let count = 1;
    let prev = arr[0];

    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === prev) {
        count++;
      } else {
        encoded += `${count}:${prev}|`; // Используем '|' как разделитель
        prev = arr[i];
        count = 1;
      }
    }

    // Добавляем последний элемент
    encoded += `${count}:${prev}|`;

    return encoded;
  };

  // Функция декодирования RLE для массивов (например, пикселей PNG)
  const decodeRLEArray = (str) => {
    if (str.length === 0) return [];

    const decoded = [];
    const parts = str.split('|').filter(part => part.length > 0); // Разделяем по '|'

    for (let part of parts) {
      const [count, value] = part.split(':');
      const numCount = parseInt(count, 10);
      if (isNaN(numCount) || value === undefined) {
        console.error('Некорректный формат RLE записи:', part);
        continue; // Пропускаем некорректные записи
      }
      for (let i = 0; i < numCount; i++) {
        decoded.push(value);
      }
    }

    return decoded;
  };

  // -------------------------
  // JSX Возвращение Компонента
  // -------------------------
  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
      {/* Заголовок приложения */}
      <Typography variant="h4" align="center" gutterBottom>
        RLE (Run-Length Encoding) - Кодировщик и Декодировщик
      </Typography>

      <Grid container spacing={4}>
        {/* Блок Кодировщика */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: '1rem' }}>
            <Typography variant="h6" gutterBottom>
              Кодировщик
            </Typography>

            {/* -------------------------
                 Текстовый Кодировщик
               ------------------------- */}
            <Box mb={4}>
              <Typography variant="subtitle1" gutterBottom>
                Текстовый Кодировщик
              </Typography>

              {/* Поле ввода исходной строки */}
              <Box mb={2}>
                <TextField
                  label="Исходная строка"
                  variant="outlined"
                  fullWidth
                  value={encodeInput}
                  onChange={handleEncodeInputChange}
                  inputProps={{
                    // Блокируем ввод цифр, если чекбокс не отмечен
                    onKeyDown: (e) => {
                      if (!allowNumbers && e.key >= '0' && e.key <= '9') {
                        e.preventDefault(); // Предотвращаем ввод цифры
                      }
                    },
                  }}
                />
              </Box>

              {/* Чекбокс для разрешения чисел */}
              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allowNumbers}
                      onChange={handleCheckboxChange}
                      color="primary"
                    />
                  }
                  label="Разрешить числа в исходной строке"
                />
              </Box>

              {/* Отображение закодированного текста */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Закодированный текст:
                </Typography>
                <Paper
                  variant="outlined"
                  style={{
                    padding: '0.5rem',
                    minHeight: '3rem',
                    wordWrap: 'break-word', // Позволяет переносить длинные слова
                    whiteSpace: 'pre-wrap', // Сохраняет пробелы и переносы строк
                    overflowY: 'auto', // Добавляет вертикальную прокрутку при необходимости
                  }}
                >
                  <Typography variant="body1">
                    {encodedText || 'Здесь будет отображен закодированный текст'}
                  </Typography>
                </Paper>
              </Box>
            </Box>

            {/* -------------------------
                 Кодировщик изображений
               ------------------------- */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Кодировщик изображений (PNG)
              </Typography>

              {/* Поле выбора PNG файла */}
              <Box mb={2}>
                <input
                  accept="image/png"
                  style={{ display: 'none' }}
                  id="encode-image-file"
                  type="file"
                  onChange={handleEncodeImageChange}
                />
                <label htmlFor="encode-image-file">
                  <Button variant="contained" component="span" color="primary">
                    Выбрать PNG изображение
                  </Button>
                </label>
                {encodeImageFile && (
                  <Typography variant="body2" style={{ marginTop: '0.5rem' }}>
                    Выбран файл: {encodeImageFile.name}
                  </Typography>
                )}
              </Box>

              {/* Кнопка для кодирования изображения */}
              <Box mb={2}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleEncodeImage}
                  disabled={!encodeImageFile}
                >
                  Кодировать Изображение
                </Button>
              </Box>

              {/* Отображение закодированного текста изображения и кнопка скачивания */}
              {encodedImageText && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Закодированный текст изображения:
                  </Typography>
                  <Paper
                    variant="outlined"
                    style={{
                      padding: '0.5rem',
                      minHeight: '3rem',
                      maxHeight: '10rem', // Ограничиваем высоту блока
                      wordWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                      overflowY: 'scroll', // Добавляем вертикальный скролл
                    }}
                  >
                    <Typography variant="body1">
                      {encodedImageText}
                    </Typography>
                  </Paper>

                  {/* Кнопка для скачивания закодированного текста */}
                  <Box mt={2}>
                    <a
                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(encodedImageText)}`}
                      download="encoded_image.txt"
                    >
                      <Button variant="outlined" color="primary">
                        Скачать Закодированный Текст
                      </Button>
                    </a>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Блок Декодировщика */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: '1rem' }}>
            <Typography variant="h6" gutterBottom>
              Декодировщик
            </Typography>

            {/* -------------------------
                 Текстовый Декодировщик
               ------------------------- */}
            <Box mb={4}>
              <Typography variant="subtitle1" gutterBottom>
                Текстовый Декодировщик
              </Typography>

              {/* Поле ввода закодированной строки */}
              <Box mb={2}>
                <TextField
                  label="Закодированная строка"
                  variant="outlined"
                  fullWidth
                  value={decodeInput}
                  onChange={handleDecodeInputChange}
                />
              </Box>

              {/* Отображение декодированного текста */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Декодированный текст:
                </Typography>
                <Paper
                  variant="outlined"
                  style={{
                    padding: '0.5rem',
                    minHeight: '3rem',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    overflowY: 'auto',
                  }}
                >
                  <Typography variant="body1">
                    {decodedText || 'Здесь будет отображен декодированный текст'}
                  </Typography>
                </Paper>
              </Box>
            </Box>

            {/* -------------------------
                 Декодировщик изображений
               ------------------------- */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Декодировщик изображений (PNG)
              </Typography>

              {/* Поле выбора текстового файла */}
              <Box mb={2}>
                <input
                  accept="text/plain"
                  style={{ display: 'none' }}
                  id="decode-image-file"
                  type="file"
                  onChange={handleDecodeImageChange}
                />
                <label htmlFor="decode-image-file">
                  <Button variant="contained" component="span" color="primary">
                    Выбрать Текстовый Файл
                  </Button>
                </label>
                {decodeImageFile && (
                  <Typography variant="body2" style={{ marginTop: '0.5rem' }}>
                    Выбран файл: {decodeImageFile.name}
                  </Typography>
                )}
              </Box>

              {/* Кнопка для декодирования изображения */}
              <Box mb={2}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleDecodeImage}
                  disabled={!decodeImageFile}
                >
                  Декодировать Изображение
                </Button>
              </Box>

              {/* Отображение декодированного изображения */}
              {decodedImageSrc && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Декодированное Изображение:
                  </Typography>
                  <Paper
                    variant="outlined"
                    style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      maxHeight: '300px',
                      overflow: 'auto',
                    }}
                  >
                    <img
                      src={decodedImageSrc}
                      alt="Декодированное"
                      style={{ maxWidth: '100%', maxHeight: '280px' }}
                    />
                  </Paper>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default App;
