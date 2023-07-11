// Добавляем обработчик события, который будет срабатывать после того как загрузится весь DOM
document.addEventListener("DOMContentLoaded", function () {

  // Добавляем обработчик события для кнопки "sendRandomButton", который сработает при клике на кнопку
  document.getElementById("sendRandomButton").addEventListener("click", function () {

    // Запрашиваем активную вкладку в текущем окне
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

      // Генерируем случайное число, приводим его к строке и дополняем нулями до длины 10 символов
      let randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, "0");

      // Сохраняем сгенерированное число в хранилище
      writeToConversationFile(randomNumber);

      // Выполняем скрипт на текущей вкладке
      chrome.tabs.executeScript(tabs[0].id, {
        code: `
          // Находим поле для ввода сообщения
          var inputField = document.querySelector(".im_editable");
          // Если поле найдено
          if (inputField) {
            // Вставляем в поле наше случайное число
            inputField.innerHTML = "${randomNumber}";
            // Создаем событие нажатия клавиши Enter
            var event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
            // Вызываем это событие на поле ввода, имитируя нажатие клавиши Enter
            inputField.dispatchEvent(event);
          }
        `,
      });
    });
  });

  // Добавляем обработчик события для кнопки "exportBtn", который сработает при клике на кнопку
  document.getElementById("exportBtn").addEventListener("click", function () {

    // Получаем из хранилища все сообщения
    chrome.storage.local.get("conversation", function (result) {

      // Если сообщений нет, то создаем пустой массив
      const conversation = result.conversation || [];

      // Если в массиве есть сообщения
      if (conversation.length > 0) {
        
        // Объединяем все сообщения в одну строку, разделяя их переносами строки
        const conversationText = conversation.join("\n");

        // Создаем Blob из нашей строки
        const blob = new Blob([conversationText], { type: "text/plain" });

        // Создаем URL для нашего Blob
        const url = URL.createObjectURL(blob);

        // Инициируем загрузку файла с нашими сообщениями
        chrome.downloads.download({
          url: url,
          filename: "conversation.txt",
        });

      } else {
        console.log("No conversation messages to export.");
      }
    });
  });

  // Очищаем историю сообщений при загрузке страницы
  chrome.storage.local.set({ conversation: [] });

  // Функция для имитации нажатия клавиши Enter в поле ввода
  function simulateEnterKey(randomNumber) {
    var inputField = document.querySelector(".im_editable");
    if (inputField) {
      inputField.innerHTML = randomNumber;
      var event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
      inputField.dispatchEvent(event);
    }
  }

  // Функция для сохранения сообщений в хранилище
  function writeToConversationFile(message) {
    chrome.storage.local.get("conversation", function (result) {
      let conversation = result.conversation || [];
      conversation.push(message);
      chrome.storage.local.set({ conversation: conversation }, function () {
        console.log("Message saved:", message);
      });
    });
  }
});
