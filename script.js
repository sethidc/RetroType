document.addEventListener('DOMContentLoaded', () => {
  // Game variables
  const words = ["NOSTALGIC", "KEYBOARD", "MESSAGE", "RETRO", "MOBILE", "CLASSIC", "PHONE", "BUTTON", "DISPLAY", "MEMORY", "PIXEL", "CODE", "GAME", "TYPE", "SPEED"];
  let gameWords = [];
  let currentWordIndex = 0;
  let currentInput = "";
  let lastKeyPressed = null;
  let lastKeyPressTime = 0;
  let keyPressCount = 0;
  let startTime = null;
  let endTime = null;

  let totalCorrectCharsTyped = 0;
  let totalTargetCharsInWords = 0;

  // T9 keypad mapping
  const t9Mapping = {
    '1': ['.', ',', '\'', '?', '!', '1'],
    '2': ['A', 'B', 'C', '2'],
    '3': ['D', 'E', 'F', '3'],
    '4': ['G', 'H', 'I', '4'],
    '5': ['J', 'K', 'L', '5'],
    '6': ['M', 'N', 'O', '6'],
    '7': ['P', 'Q', 'R', 'S', '7'],
    '8': ['T', 'U', 'V', '8'],
    '9': ['W', 'X', 'Y', 'Z', '9'],
    '0': [' ', '0']
  };

  // DOM elements
  const targetWordElement = document.getElementById('target-word');
  const inputTextElement = document.getElementById('input-text');
  const previewLetterElement = document.getElementById('preview-letter');
  const wordCountElement = document.getElementById('word-count');
  const resultsElement = document.getElementById('results');
  const totalTimeElement = document.getElementById('total-time');
  const wpmElement = document.getElementById('wpm');
  const accuracyElement = document.getElementById('accuracy');
  const restartBtn = document.getElementById('restart-btn');

  // Sound effects
  let audioContext;
  const t9CycleTimeout = 1000; // Timeout for T9 cycling (ms) - reverted to 1000ms
  const autoConfirmTimeout = 1000; // Timeout for auto-confirming preview letter (ms) - reverted to 1000ms

  function playKeyTone(frequency, duration) {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (!audioContext) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.warn("AudioContext not supported or error playing sound:", e);
      audioContext = null;
    }
  }

  let autoConfirmTimer = null;

  function initGame() {
    gameWords = [];
    const tempWords = [...words];
    while (gameWords.length < 3 && tempWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * tempWords.length);
      const randomWord = tempWords.splice(randomIndex, 1)[0];
      gameWords.push(randomWord); // Simplified: splice ensures it's unique from tempWords for this pick
    }
    if (gameWords.length < 3 && words.length >= 3) {
        gameWords = words.slice(0,3);
    }

    currentWordIndex = 0;
    currentInput = "";
    totalCorrectCharsTyped = 0;
    totalTargetCharsInWords = 0;
    gameWords.forEach(word => totalTargetCharsInWords += word.length);

    targetWordElement.textContent = gameWords[0] || "N/A";
    inputTextElement.textContent = "";
    wordCountElement.textContent = gameWords.length > 0 ? "1" : "0";
    previewLetterElement.textContent = "";
    resultsElement.style.display = "none";
    document.querySelector('.game-area').style.display = 'flex';

    startTime = null;
    endTime = null;
    lastKeyPressed = null;
    keyPressCount = 0;
    clearTimeout(autoConfirmTimer);
  }

  function handleKeyPress(key) {
    if (resultsElement.style.display === 'flex') return;

    const baseFrequency = 300; // Adjusted base from user's code (was 600 in user example, then 300)
    const keyNum = parseInt(key); // parseInt(key) was in user's example, then keyNum
    let freqToPlay = baseFrequency;

    if (!isNaN(keyNum)) { // Match user example where parseInt(key) was used for keyFrequency offset
        freqToPlay = (baseFrequency + (keyNum % 10) * 50); // Keep consistent with previous logic if key is number
    } else if (key === 'clear') {
        freqToPlay = 200;
    } else if (key === 'enter') {
        freqToPlay = 700;
    }
    playKeyTone(freqToPlay, 0.15); // User's example had 0.15 duration


    if (startTime === null && key !== 'clear' && key !== 'enter') {
      startTime = Date.now();
    }

    const currentTime = Date.now();
    clearTimeout(autoConfirmTimer);

    if (key === 'clear') {
      if (previewLetterElement.textContent) {
          previewLetterElement.textContent = "";
          lastKeyPressed = null;
          keyPressCount = 0;
      } else if (currentInput.length > 0) {
        currentInput = currentInput.slice(0, -1);
        inputTextElement.textContent = currentInput;
      }
      return;
    }

    if (key === 'enter') {
      if (previewLetterElement.textContent) {
        currentInput += previewLetterElement.textContent;
        inputTextElement.textContent = currentInput;
        previewLetterElement.textContent = "";
      }

      if (gameWords.length === 0) return;

      const targetWord = gameWords[currentWordIndex];
      if (targetWord) {
          for (let i = 0; i < targetWord.length; i++) {
              if (i < currentInput.length && currentInput[i] === targetWord[i]) {
                  totalCorrectCharsTyped++;
              }
          }
      }

      currentWordIndex++;

      if (currentWordIndex < gameWords.length) {
        targetWordElement.textContent = gameWords[currentWordIndex];
        wordCountElement.textContent = currentWordIndex + 1;
        currentInput = "";
        inputTextElement.textContent = "";
        // startTime = Date.now(); // In user's "worked" code, startTime was reset per word for wordTimes
                                  // We use a global startTime for overall WPM, so this isn't strictly needed here
                                  // unless we bring back per-word time tracking.
      } else {
        endTime = Date.now();
        showResults();
      }
      lastKeyPressed = null;
      keyPressCount = 0;
      return;
    }

    if (t9Mapping[key]) {
      if (lastKeyPressed === key && currentTime - lastKeyPressTime < t9CycleTimeout) { // Using t9CycleTimeout (1000ms)
        keyPressCount = (keyPressCount + 1) % t9Mapping[key].length;
      } else {
        if (previewLetterElement.textContent) {
          currentInput += previewLetterElement.textContent;
          inputTextElement.textContent = currentInput;
        }
        keyPressCount = 0;
      }

      previewLetterElement.textContent = t9Mapping[key][keyPressCount];
      lastKeyPressed = key;
      lastKeyPressTime = currentTime;

      autoConfirmTimer = setTimeout(() => {
        if (previewLetterElement.textContent && lastKeyPressed === key) {
          currentInput += previewLetterElement.textContent;
          inputTextElement.textContent = currentInput;
          previewLetterElement.textContent = "";
          lastKeyPressed = null;
          keyPressCount = 0;
        }
      }, autoConfirmTimeout); // Using autoConfirmTimeout (1000ms)
    }
  }

  function showResults() {
    document.querySelector('.game-area').style.display = 'none';
    resultsElement.style.display = "flex";

    const overallTotalTime = (endTime && startTime) ? (endTime - startTime) / 1000 : 0;

    const wpm = (totalTargetCharsInWords > 0 && overallTotalTime > 0) ?
                Math.round((totalTargetCharsInWords / 5) / (overallTotalTime / 60)) : 0;

    const accuracy = totalTargetCharsInWords > 0 ?
                     Math.round((totalCorrectCharsTyped / totalTargetCharsInWords) * 100) : 0;

    totalTimeElement.textContent = overallTotalTime.toFixed(1);
    wpmElement.textContent = wpm;
    accuracyElement.textContent = accuracy; // Using improved accuracy
  }

  // Simplified Event Listeners: Only using 'click'
  document.querySelectorAll('.key').forEach(keyElement => {
    const keyValue = keyElement.getAttribute('data-key');

    keyElement.addEventListener('click', () => {
      handleKeyPress(keyValue);

      // Visual feedback matching user's "worked" version style
      keyElement.style.transform = 'translateY(5px)';
      keyElement.style.boxShadow = '0 0 0 #666';
      // Note: The user's "worked" version did not have specific shadow for function-key on click
      // If function keys had a different base shadow defined in CSS, it would revert to that.
      // For simplicity, the above matches their provided JS visual feedback.
      // If .function-key needs a different active shadow, it would be:
      // if (keyElement.classList.contains('function-key')) {
      //   keyElement.style.boxShadow = '0 0 0 #some_darker_orange_shadow_base'; // Example
      // } else {
      //   keyElement.style.boxShadow = '0 0 0 #666';
      // }

      setTimeout(() => {
        keyElement.style.transform = '';
        keyElement.style.boxShadow = ''; // Reverts to CSS defined shadow
      }, 100); // 100ms visual feedback duration from user's "worked" code
    });
  });

  restartBtn.addEventListener('click', initGame);
  initGame();

  document.addEventListener('dblclick', (e) => {
    e.preventDefault();
  }, { passive: false });

});
