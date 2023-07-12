document.addEventListener("DOMContentLoaded", function() {
  // Переменные для состояния расширения
  let employeeID = null;
  let currentQuestionID = null;
  let remainingQuestions = null;
  let delay = 1000; // Стандартная задержка 10 секунд а тут 1 секунда
  let paused = false;

  // Функция для обновления состояния расширения
  function updateExtensionState() {
    document.getElementById("remainingQuestionNumber").innerText = remainingQuestions;
    document.getElementById("currentQuestionNumber").innerText = currentQuestionID;
  }

  // Функция для загрузки вопросов по выбранному EmployeeID
  function loadQuestions() {
    employeeID = document.getElementById("employeeID").value;
    if (employeeID) {
      fetch(`http://localhost:5000/get_questions?EmployeeID=${employeeID}`)
        .then(response => response.json())
        .then(data => {
          remainingQuestions = data.length;
          currentQuestionID = 1;
          updateExtensionState();
        })
        .catch(error => {
          displayStatus("Ошибка при загрузке вопросов", "error");
          console.error(error);
        });
    } else {
      displayStatus("Введите номер вопросника", "error");
    }
  }

  // Функция для отправки ответа на сервер
  function sendResponse(message) {
    fetch('http://localhost:5000/store_response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'employee_id': employeeID,
        'question_text': document.getElementById("questionText").innerText,
        'processed_id': currentQuestionID,
        'message': message
      })
    })
      .then(response => {
        console.log("Ответ от сервера:", response);
        if (!paused) {
          observeChat(); // Возобновляем наблюдение за чатом после отправки сообщения
        }
      })
      .catch(error => {
        displayStatus("Ошибка при отправке ответа", "error");
        console.error(error);
      });
  }

  // Функция для обработки новых сообщений в чате
  function observeChat() {
    let observer = new MutationObserver(function(mutations) {
      for (let mutation of mutations) {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            let messageNode = node.querySelector(".im-mess--text.wall_module._im_log_body");
            if (messageNode) {
              let userMessage = messageNode.innerText;
              if (userMessage) {
                observer.disconnect();
                sendResponse(userMessage);
                break;
              }
            }
          }
        }
      }
    });

    let chatContainer = document.querySelector(".im-page--chat-body-wrap-inner-2");
    observer.observe(chatContainer, { childList: true, subtree: true });
  }

  // Функция для отображения статуса во всплывающем окне
  function displayStatus(message, type) {
    let statusPopup = document.getElementById("statusPopup");
    let statusMessage = document.getElementById("statusMessage");
    statusMessage.innerText = message;

    statusPopup.classList.remove("success", "error");
    if (type === "success") {
      statusPopup.classList.add("success");
    } else if (type === "error") {
      statusPopup.classList.add("error");
    }

    statusPopup.classList.add("active");

    // Скрытие всплывающего окна через 5 секунд
    setTimeout(function() {
      statusPopup.classList.remove("active");
    }, 5000);
  }

  // Обработчик нажатия кнопки "ОК" для загрузки вопросов
  document.getElementById("loadQuestionsButton").addEventListener("click", function() {
    loadQuestions();
  });

  // Обработчик нажатия кнопки "Продолжить" для возобновления опроса
  document.getElementById("continueButton").addEventListener("click", function() {
    if (employeeID && currentQuestionID && remainingQuestions) {
      document.getElementById("employeeID").value = employeeID;
      updateExtensionState();
      observeChat();
    } else {
      displayStatus("Выберите вопросник и нажмите ОК", "error");
    }
  });

  // Обработчик нажатия кнопки "Приостановить" для приостановки опроса
  document.getElementById("pauseButton").addEventListener("click", function() {
    paused = true;
    displayStatus("Опрос приостановлен", "success");
  });

  // Обработчик нажатия кнопки "Начать заново" для сброса опроса
  document.getElementById("resetButton").addEventListener("click", function() {
    fetch('http://localhost:5000/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'employee_id': employeeID
      })
    })
      .then(response => {
        console.log("Ответ от сервера:", response);
        remainingQuestions = null;
        currentQuestionID = null;
        updateExtensionState();
        displayStatus("Опрос сброшен", "success");
      })
      .catch(error => {
        displayStatus("Ошибка при сбросе опроса", "error");
        console.error(error);
      });
  });

  // Обработчик нажатия кнопки "Скачать историю" для экспорта ответов
  document.getElementById("downloadHistoryButton").addEventListener("click", function() {
    if (employeeID) {
      fetch(`http://localhost:5000/export?employee_id=${employeeID}`)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = 'result.txt';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        })
        .catch(error => {
          displayStatus("Ошибка при экспорте истории", "error");
          console.error(error);
        });
    } else {
      displayStatus("Выберите вопросник и нажмите ОК", "error");
    }
  });

  // Обработчик выбора задержки
  document.getElementById("delaySelect").addEventListener("change", function() {
    delay = parseInt(this.value);
    displayStatus(`Задержка установлена на ${delay / 1000} сек.`, "success");
  });

  // Функция для отправки случайного сообщения
  function sendRandomMessage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      let randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, "0");
      chrome.tabs.executeScript(tabs[0].id, {
        code: `
          var inputField = document.querySelector(".im_editable");
          if (inputField) {
            inputField.innerHTML = "${randomNumber}";
            var event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
            inputField.dispatchEvent(event);
          }
        `,
      });
    });
  }

  // Обработчик нажатия кнопки "Отправить случайное сообщение"
  document.getElementById("sendRandomButton").addEventListener("click", function() {
    sendRandomMessage();
  });
});

