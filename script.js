// This special event listener waits for the entire HTML page to be loaded and ready
// before trying to run any JavaScript. This prevents errors that can happen if
// JavaScript tries to access HTML elements that haven't been created yet.
document.addEventListener('DOMContentLoaded', () => {

  // --- Game Setup Variables ---
  // This is a list of words the game can choose from.
  const words = ["NOSTALGIC", "KEYBOARD", "MESSAGE", "RETRO", "MOBILE", "CLASSIC", "PHONE", "BUTTON", "DISPLAY", "MEMORY", "PIXEL", "CODE", "GAME", "TYPE", "SPEED"];
  // This array will hold the specific words selected for the current game round (usually 3 words).
  let gameWords = [];
  // This keeps track of which word the player is currently trying to type (e.g., 0 for the first word, 1 for the second).
  let currentWordIndex = 0;
  // This string stores the letters the player has typed so far for the current word.
  let currentInput = "";
  // These variables help manage the T9 input logic:
  // `lastKeyPressed` stores the number of the key that was last pressed (e.g., '2', '3').
  let lastKeyPressed = null;
  // `lastKeyPressTime` records when the last key was pressed. This helps determine if multiple presses on the same key are quick enough to cycle letters.
  let lastKeyPressTime = 0;
  // `keyPressCount` tracks how many times the same key has been pressed in quick succession (e.g., pressing '2' once for 'A', twice for 'B').
  let keyPressCount = 0;
  // These will store the start and end times of the typing challenge to calculate the total time taken.
  let startTime = null;
  let endTime = null;

  // These variables are for calculating the player's score.
  // `totalCorrectCharsTyped` will count how many characters the player typed correctly across all words.
  let totalCorrectCharsTyped = 0;
  // `totalTargetCharsInWords` will sum up the lengths of all the words chosen for the game.
  let totalTargetCharsInWords = 0;

  // This object defines the T9 keypad layout.
  // Each number key (e.g., '2') maps to an array of characters it can produce.
  // For example, key '2' can produce 'A', 'B', 'C', or the number '2' itself.
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
    '0': [' ', '0'] // Key '0' is used for space or the number '0'.
  };

  // --- Connecting to HTML Elements ---
  // These lines get references to various parts of our HTML page so JavaScript can interact with them.
  // For example, `targetWordElement` will be used to display the word the player needs to type.
  const targetWordElement = document.getElementById('target-word');
  const inputTextElement = document.getElementById('input-text'); // Shows what the player is typing.
  const previewLetterElement = document.getElementById('preview-letter'); // Shows the letter currently being formed by T9 input.
  const wordCountElement = document.getElementById('word-count'); // Shows "WORD X OF 3".
  const resultsElement = document.getElementById('results'); // The area where final scores are shown.
  const totalTimeElement = document.getElementById('total-time'); // Displays total time taken.
  const wpmElement = document.getElementById('wpm'); // Displays words per minute.
  const accuracyElement = document.getElementById('accuracy'); // Displays typing accuracy.
  const restartBtn = document.getElementById('restart-btn'); // The "RESTART" button.

  // --- Sound Effects Setup ---
  // `audioContext` is part of the Web Audio API, used for creating and playing sounds in the browser.
  let audioContext;
  // `t9CycleTimeout` is the maximum time (in milliseconds) allowed between two presses of the same key
  // for them to count as cycling through letters (e.g., 'A' -> 'B'). 1000ms = 1 second.
  const t9CycleTimeout = 1000;
  // `autoConfirmTimeout` is the time (in milliseconds) the game waits before automatically confirming
  // a previewed letter if no other key is pressed. 1000ms = 1 second.
  const autoConfirmTimeout = 1000;

  // This function plays a simple square wave tone.
  // `frequency` determines the pitch, and `duration` how long it plays.
  function playKeyTone(frequency, duration) {
    try {
      // If `audioContext` hasn't been created yet, try to create it.
      // `window.webkitAudioContext` is for older Safari browser compatibility.
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      // If `audioContext` still couldn't be created (e.g., browser doesn't support it), exit the function.
      if (!audioContext) return;

      const oscillator = audioContext.createOscillator(); // Creates a sound wave generator.
      const gainNode = audioContext.createGain(); // Controls the volume.

      oscillator.type = 'square'; // Sets the type of sound wave (e.g., 'sine', 'square', 'sawtooth', 'triangle').
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // Sets the pitch.
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Sets initial volume (0.1 is fairly quiet).
      // Fades the sound out quickly to create a short "beep" effect.
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

      oscillator.connect(gainNode); // Connect oscillator to volume control.
      gainNode.connect(audioContext.destination); // Connect volume control to speakers.
      oscillator.start(audioContext.currentTime); // Start playing the sound immediately.
      oscillator.stop(audioContext.currentTime + duration); // Stop the sound after the specified duration.
    } catch (e) {
      // If there's an error playing sound, log a warning and disable further sound attempts.
      console.warn("AudioContext not supported or error playing sound:", e);
      audioContext = null;
    }
  }

  // This variable will hold the timer that automatically confirms a previewed letter.
  let autoConfirmTimer = null;

  // --- Game Initialization Function ---
  // This function sets up or resets the game to its starting state.
  function initGame() {
    // Clear any previously selected game words.
    gameWords = [];
    // Create a copy of the main `words` list to pick from, so we don't modify the original.
    const tempWords = [...words];
    // Loop to select 3 unique random words for the game.
    while (gameWords.length < 3 && tempWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * tempWords.length); // Pick a random index.
      const randomWord = tempWords.splice(randomIndex, 1)[0]; // Get the word and remove it from `tempWords`.
      gameWords.push(randomWord); // Add the selected word to our `gameWords` list.
    }
    // Fallback: if somehow we couldn't get 3 unique words (e.g., `words` list is too short but has at least 3),
    // just take the first 3 words from the original list.
    if (gameWords.length < 3 && words.length >= 3) {
        gameWords = words.slice(0,3);
    }

    // Reset game progress variables.
    currentWordIndex = 0; // Start with the first word.
    currentInput = ""; // Clear any previously typed input.
    totalCorrectCharsTyped = 0; // Reset correct characters count.
    totalTargetCharsInWords = 0; // Reset total characters for the new set of words.
    // Calculate the total number of characters in the newly selected game words.
    gameWords.forEach(word => totalTargetCharsInWords += word.length);

    // Update the HTML display.
    targetWordElement.textContent = gameWords[0] || "N/A"; // Show the first word, or "N/A" if no words.
    inputTextElement.textContent = ""; // Clear the player's input display.
    wordCountElement.textContent = gameWords.length > 0 ? "1" : "0"; // Show "WORD 1 OF 3" (or 0 if no words).
    previewLetterElement.textContent = ""; // Clear the T9 preview letter.
    resultsElement.style.display = "none"; // Hide the results screen.
    document.querySelector('.game-area').style.display = 'flex'; // Make sure the game area is visible.

    // Reset timing and input state variables.
    startTime = null; // Timer hasn't started yet.
    endTime = null;
    lastKeyPressed = null; // No key has been pressed yet for the new game.
    keyPressCount = 0;
    clearTimeout(autoConfirmTimer); // Cancel any pending auto-confirmation timer from a previous game.
  }

  // --- Key Press Handling Function ---
  // This is the main function that processes what happens when a player presses a T9 key.
  function handleKeyPress(key) {
    // If the results screen is already showing, don't process any more key presses.
    if (resultsElement.style.display === 'flex') return;

    // Play a sound for the key press.
    const baseFrequency = 300;
    const keyNum = parseInt(key); // Try to convert the key (e.g., '2') into a number.
    let freqToPlay = baseFrequency;
    // Adjust frequency slightly for different number keys to give varied tones.
    if (!isNaN(keyNum)) {
        freqToPlay = (baseFrequency + (keyNum % 10) * 50);
    } else if (key === 'clear') { // Special tones for function keys.
        freqToPlay = 200;
    } else if (key === 'enter') {
        freqToPlay = 700;
    }
    playKeyTone(freqToPlay, 0.15); // Play the tone for 0.15 seconds.

    // If the game timer hasn't started yet, and this isn't a 'clear' or 'enter' press, start the timer.
    if (startTime === null && key !== 'clear' && key !== 'enter') {
      startTime = Date.now(); // Record the current time as the game start time.
    }

    const currentTime = Date.now(); // Get the current time for T9 logic.
    // Clear any existing auto-confirm timer because a new key has been pressed.
    clearTimeout(autoConfirmTimer);

    // Handle the 'Clear' key (backspace functionality).
    if (key === 'clear') {
      if (previewLetterElement.textContent) {
          // If there's a letter in the T9 preview area, clear that first.
          previewLetterElement.textContent = "";
          lastKeyPressed = null; // Reset T9 state.
          keyPressCount = 0;
      } else if (currentInput.length > 0) {
        // Otherwise, if there's typed input, remove the last character.
        currentInput = currentInput.slice(0, -1);
        inputTextElement.textContent = currentInput; // Update the display.
      }
      return; // Stop further processing for 'clear'.
    }

    // Handle the 'Enter' key (submitting a word).
    if (key === 'enter') {
      // If there's a letter in the T9 preview, confirm it before submitting.
      if (previewLetterElement.textContent) {
        currentInput += previewLetterElement.textContent;
        inputTextElement.textContent = currentInput;
        previewLetterElement.textContent = "";
      }

      // If there are no words loaded in the game, do nothing.
      if (gameWords.length === 0) return;

      // Compare the typed input with the target word for accuracy.
      const targetWord = gameWords[currentWordIndex];
      if (targetWord) { // Check if a target word exists.
          for (let i = 0; i < targetWord.length; i++) {
              // For each character in the target word,
              // if the player typed enough characters and the character matches, count it as correct.
              if (i < currentInput.length && currentInput[i] === targetWord[i]) {
                  totalCorrectCharsTyped++;
              }
          }
      }

      currentWordIndex++; // Move to the next word index.

      if (currentWordIndex < gameWords.length) {
        // If there are more words to type:
        targetWordElement.textContent = gameWords[currentWordIndex]; // Display the next word.
        wordCountElement.textContent = currentWordIndex + 1; // Update "WORD X OF 3".
        currentInput = ""; // Clear the input for the new word.
        inputTextElement.textContent = "";
      } else {
        // If all words have been typed (game over):
        endTime = Date.now(); // Record the end time.
        showResults(); // Display the results screen.
      }
      lastKeyPressed = null; // Reset T9 state for the next word or game.
      keyPressCount = 0;
      return; // Stop further processing for 'enter'.
    }

    // Handle number keys for T9 input (e.g., '2' for ABC).
    if (t9Mapping[key]) {
      // Check if the same key was pressed again quickly enough to cycle letters.
      if (lastKeyPressed === key && currentTime - lastKeyPressTime < t9CycleTimeout) {
        // Yes, cycle to the next character for this key.
        // The '%' (modulo) operator helps wrap around to the beginning of the character list.
        keyPressCount = (keyPressCount + 1) % t9Mapping[key].length;
      } else {
        // This is either a new key, or the same key was pressed after the cycle timeout.
        // If there was a letter in the preview from a previous key, confirm it now.
        if (previewLetterElement.textContent) {
          currentInput += previewLetterElement.textContent;
          inputTextElement.textContent = currentInput;
        }
        keyPressCount = 0; // Start at the first character for this key.
      }

      // Display the current T9 character in the preview area.
      previewLetterElement.textContent = t9Mapping[key][keyPressCount];
      // Update the state for the next key press.
      lastKeyPressed = key;
      lastKeyPressTime = currentTime;

      // Set a timer to automatically confirm the previewed letter if the player pauses.
      autoConfirmTimer = setTimeout(() => {
        // This function runs after `autoConfirmTimeout` milliseconds.
        // Check if the previewed letter is still the one we set the timer for.
        if (previewLetterElement.textContent && lastKeyPressed === key) {
          currentInput += previewLetterElement.textContent; // Add to main input.
          inputTextElement.textContent = currentInput; // Update display.
          previewLetterElement.textContent = ""; // Clear preview.
          lastKeyPressed = null; // Reset T9 state as the letter is confirmed.
          keyPressCount = 0;
        }
      }, autoConfirmTimeout);
    }
  }

  // --- Show Results Function ---
  // This function calculates and displays the player's score at the end of the game.
  function showResults() {
    document.querySelector('.game-area').style.display = 'none'; // Hide the main game area.
    resultsElement.style.display = "flex"; // Show the results screen.

    // Calculate total time taken in seconds.
    const overallTotalTime = (endTime && startTime) ? (endTime - startTime) / 1000 : 0;

    // Calculate Words Per Minute (WPM).
    // A common standard is to consider an average word length of 5 characters.
    const wpm = (totalTargetCharsInWords > 0 && overallTotalTime > 0) ?
                Math.round((totalTargetCharsInWords / 5) / (overallTotalTime / 60)) : 0;

    // Calculate accuracy percentage.
    const accuracy = totalTargetCharsInWords > 0 ?
                     Math.round((totalCorrectCharsTyped / totalTargetCharsInWords) * 100) : 0;

    // Update the HTML elements with the calculated results.
    totalTimeElement.textContent = overallTotalTime.toFixed(1); // Show time with 1 decimal place.
    wpmElement.textContent = wpm;
    accuracyElement.textContent = accuracy;
  }

  // --- Event Listeners for On-Screen Keys ---
  // This makes the on-screen number pad interactive.
  // It finds all elements with the class 'key'.
  document.querySelectorAll('.key').forEach(keyElement => {
    // Get the 'data-key' attribute (e.g., '2', 'clear') from the HTML of the key.
    const keyValue = keyElement.getAttribute('data-key');

    // Add a 'click' event listener to each key.
    // This means when a key is clicked (or tapped on a touch screen), this function runs.
    keyElement.addEventListener('click', () => {
      handleKeyPress(keyValue); // Process the key press using our main logic function.

      // Provide visual feedback for the key press (makes it look like it's being pushed down).
      keyElement.style.transform = 'translateY(5px)'; // Move the key down slightly.
      keyElement.style.boxShadow = '0 0 0 #666'; // Change its shadow to look pressed.

      // After a short delay (100ms), revert the visual feedback.
      setTimeout(() => {
        keyElement.style.transform = ''; // Reset position.
        keyElement.style.boxShadow = ''; // Reset shadow (reverts to what's in CSS).
      }, 100);
    });
  });

  // --- Restart Button Functionality ---
  // When the "RESTART" button is clicked, call the `initGame` function to start a new game.
  restartBtn.addEventListener('click', initGame);

  // --- Start the Game ---
  // Call `initGame` once when the page first loads to set up the initial game state.
  initGame();

  // --- Prevent Zooming on Double Tap (Mobile Feature) ---
  // On some touch devices, double-tapping can zoom the page.
  // This listener catches double-clicks and prevents that default browser behavior,
  // which is useful for a game-like interface.
  // `passive: false` is needed to allow `preventDefault` to work reliably for touch-related events.
  document.addEventListener('dblclick', (e) => {
    e.preventDefault();
  }, { passive: false });

});
