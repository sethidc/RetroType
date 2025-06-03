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
  let totalTargetCharsInWords = 0; // Sum of lengths of all gameWords selected for the current session

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

  // Sound effects (using AudioContext for better compatibility)
  let audioContext;
  const t9CycleTimeout = 800; // Timeout for T9 cycling (ms)
  const autoConfirmTimeout = 1000; // Timeout for auto-confirming preview letter (ms)


  function playKeyTone(frequency, duration) {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (!audioContext) return; // Exit if AudioContext is not supported/initialized

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
      audioContext = null; // Prevent further attempts if it fails badly
    }
  }

  let autoConfirmTimer = null;

  // Initialize game
  function initGame() {
    // Select 3 random words
    gameWords = [];
    const tempWords = [...words]; // Create a copy to draw from
    while (gameWords.length < 3 && tempWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * tempWords.length);
      const randomWord = tempWords.splice(randomIndex, 1)[0]; // Remove word from temp list
      if (!gameWords.includes(randomWord)) {
        gameWords.push(randomWord);
      }
    }
    if (gameWords.length < 3 && words.length >=3) { // Fallback if unique word selection fails with small pool
        gameWords = words.slice(0,3); // Just take the first 3
    }


    currentWordIndex = 0;
    currentInput = "";
    totalCorrectCharsTyped = 0;
    totalTargetCharsInWords = 0;
    gameWords.forEach(word => totalTargetCharsInWords += word.length);

    // Update UI
    targetWordElement.textContent = gameWords[0] || "N/A";
    inputTextElement.textContent = "";
    wordCountElement.textContent = gameWords.length > 0 ? "1" : "0";
    previewLetterElement.textContent = "";
    resultsElement.style.display = "none";
    document.querySelector('.game-area').style.display = 'flex';


    // Start timer on first interaction
    startTime = null;
    endTime = null;
    lastKeyPressed = null;
    keyPressCount = 0;
    clearTimeout(autoConfirmTimer); // Clear any pending auto-confirm
  }

  // Handle key press
  function handleKeyPress(key) {
    if (resultsElement.style.display === 'flex') return; // Don't process keys if results are shown

    // Play key tone
    const baseFrequency = 300;
    const keyNum = parseInt(key);
    let freqToPlay = baseFrequency;
    if (!isNaN(keyNum)) {
        freqToPlay = baseFrequency + (keyNum % 10) * 50; // Cycle through 0-9 for frequency
    } else if (key === 'clear') {
        freqToPlay = 200;
    } else if (key === 'enter') {
        freqToPlay = 700;
    }
    playKeyTone(freqToPlay, 0.1);


    if (startTime === null && key !== 'clear' && key !== 'enter') { // Start timer on first char input
      startTime = Date.now();
    }

    const currentTime = Date.now();
    clearTimeout(autoConfirmTimer); // Clear previous auto-confirm timer

    if (key === 'clear') {
      if (previewLetterElement.textContent) { // If there's a preview, clear that first
          previewLetterElement.textContent = "";
          lastKeyPressed = null;
          keyPressCount = 0;
      } else if (currentInput.length > 0) { // Otherwise, clear last confirmed character
        currentInput = currentInput.slice(0, -1);
        inputTextElement.textContent = currentInput;
      }
      return;
    }

    if (key === 'enter') {
      if (previewLetterElement.textContent) { // Confirm any previewed letter
        currentInput += previewLetterElement.textContent;
        inputTextElement.textContent = currentInput;
        previewLetterElement.textContent = "";
      }

      if (gameWords.length === 0) return; // No words to check against

      // Accuracy calculation for the current word
      const targetWord = gameWords[currentWordIndex];
      if (targetWord) { // Ensure targetWord is defined
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
      } else {
        endTime = Date.now();
        showResults();
      }
      lastKeyPressed = null;
      keyPressCount = 0;
      return;
    }

    // Handle number keys (T9 input)
    if (t9Mapping[key]) {
      if (lastKeyPressed === key && currentTime - lastKeyPressTime < t9CycleTimeout) {
        keyPressCount = (keyPressCount + 1) % t9Mapping[key].length;
      } else {
        if (previewLetterElement.textContent) { // Auto-commit previous letter if new key is pressed
          currentInput += previewLetterElement.textContent;
          inputTextElement.textContent = currentInput;
        }
        keyPressCount = 0;
      }

      previewLetterElement.textContent = t9Mapping[key][keyPressCount];
      lastKeyPressed = key;
      lastKeyPressTime = currentTime;

      // Auto-confirm after delay
      autoConfirmTimer = setTimeout(() => {
        if (previewLetterElement.textContent && lastKeyPressed === key) { // Check if still the same key's preview
          currentInput += previewLetterElement.textContent;
          inputTextElement.textContent = currentInput;
          previewLetterElement.textContent = "";
          lastKeyPressed = null; // Reset as it's confirmed
          keyPressCount = 0;
        }
      }, autoConfirmTimeout);
    }
  }

  // Show results
  function showResults() {
    document.querySelector('.game-area').style.display = 'none'; // Hide game area
    resultsElement.style.display = "flex";

    const overallTotalTime = (endTime && startTime) ? (endTime - startTime) / 1000 : 0;

    const wpm = (totalTargetCharsInWords > 0 && overallTotalTime > 0) ?
                Math.round((totalTargetCharsInWords / 5) / (overallTotalTime / 60)) : 0;

    const accuracy = totalTargetCharsInWords > 0 ?
                     Math.round((totalCorrectCharsTyped / totalTargetCharsInWords) * 100) : 0;

    totalTimeElement.textContent = overallTotalTime.toFixed(1);
    wpmElement.textContent = wpm;
    accuracyElement.textContent = accuracy;
  }

  // Event listeners for keys
  let lastTouchEndTime = 0;
  const veryShortDelayForVisuals = 100; // ms for visual feedback reset
  const clickGuardThreshold = 500; // MODIFIED: Increased threshold to 500ms

  document.querySelectorAll('.key').forEach(keyElement => {
    const keyValue = keyElement.getAttribute('data-key');

    // Touchstart: Primary handler for touch devices
    keyElement.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Crucial to prevent issues like zoom or ghost clicks
      // console.log('touchstart:', keyValue); // For debugging
      handleKeyPress(keyValue);

      // Visual feedback
      keyElement.style.transform = 'translateY(3px)';
      keyElement.style.boxShadow = '0 2px 0 #555';
      if (keyElement.classList.contains('function-key')) {
        keyElement.style.boxShadow = '0 2px 0 #a24000';
      }
    }, { passive: false }); // passive: false is important for preventDefault to work

    // Touchend: Mark when touch interaction finishes and reset visuals
    keyElement.addEventListener('touchend', (e) => {
      lastTouchEndTime = Date.now();
      // console.log('touchend:', keyValue, 'lastTouchEndTime:', lastTouchEndTime); // For debugging
      setTimeout(() => {
        keyElement.style.transform = '';
        keyElement.style.boxShadow = '';
      }, veryShortDelayForVisuals);
    });

    // Click: Fallback for mouse, or devices where touch events might not be primary
    keyElement.addEventListener('click', (e) => {
      const timeSinceLastTouchEnd = Date.now() - lastTouchEndTime;
      // console.log('click:', keyValue, 'timeSinceLastTouchEnd:', timeSinceLastTouchEnd); // For debugging

      // If a touch interaction just ended (i.e., touchend fired recently),
      // this click is likely a "synthetic" event from the tap.
      if (timeSinceLastTouchEnd < clickGuardThreshold) { // MODIFIED: Used clickGuardThreshold
        // console.log('click ignored due to recent touch'); // For debugging
        return; // Assume touchstart already handled the logic.
      }
      // Otherwise, it's a genuine click (e.g., from a mouse)
      // console.log('click processed:', keyValue); // For debugging
      handleKeyPress(keyValue);

      // Visual feedback for click
      keyElement.style.transform = 'translateY(3px)';
      keyElement.style.boxShadow = '0 2px 0 #555';
      if (keyElement.classList.contains('function-key')) {
        keyElement.style.boxShadow = '0 2px 0 #a24000';
      }
      setTimeout(() => {
        keyElement.style.transform = '';
        keyElement.style.boxShadow = '';
      }, veryShortDelayForVisuals);
    });
  });

  // Restart button
  restartBtn.addEventListener('click', initGame);

  // Initialize game
  initGame();

  // Prevent zooming on double tap for touch devices
  document.addEventListener('dblclick', (e) => {
    e.preventDefault();
  }, { passive: false });

});
