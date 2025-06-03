# RetroType Challenge 🕹️

A T9-style typing game that brings back the nostalgia of old mobile phone keypads! Test your speed and accuracy by typing out words using a classic 3x4 numeric keypad interface.

## 🚀 Features

* **Retro Interface**: Styled to look like an old-school mobile phone screen.
* **T9 Input Logic**: Type words by pressing numeric keys multiple times to cycle through letters, just like on classic phones.
* **Timed Challenge**: Type a series of 3 words as quickly as you can.
* **Performance Metrics**: Get your results for:
    * Total Time
    * Words Per Minute (WPM)
    * Accuracy (%)
* **Sound Effects**: Simple key tones for an authentic feel.
* **Responsive Design**: Adapts to different screen sizes, primarily designed for a mobile-first view.

## 🎮 How to Play

1.  **Objective**: Type the displayed "TARGET WORD" in the input area using the T9 keypad.
2.  **T9 Input**:
    * Each number key (2-9) corresponds to a set of letters (e.g., 2 is ABC).
    * Press a key multiple times to cycle through its letters (e.g., press '2' once for 'A', twice for 'B', thrice for 'C').
    * If you pause or press a different key, the current previewed letter is confirmed.
    * The '1' key cycles through common punctuation.
    * The '0' key is for SPACE.
3.  **Preview**: The letter you are currently forming will appear in the "preview" area on the right of the input box.
4.  **Confirming Letters**:
    * A letter is automatically confirmed if you press a different key.
    * A letter is also auto-confirmed after a short delay (approx. 1 second).
5.  **Submitting Words**:
    * Once you've typed the word, press the '#' (Enter) key to submit it and move to the next word.
6.  **Clear**:
    * Press 'C' (Clear) key once to delete the currently previewed (unconfirmed) letter.
    * If there's no previewed letter, pressing 'C' will delete the last confirmed character from your input.
7.  **Game End**: After typing all 3 words, your results (Time, WPM, Accuracy) will be displayed.
8.  **Restart**: Click the "RESTART" button to play again with new words.

## 🎯 Accuracy Calculation (How It Works)

Accuracy in the game is calculated using the following formula:
accuracy = (number of correctly typed letters / total letters attempted) × 100

### 🔍 What this means:
- **Correctly typed letters**: The number of characters typed by the user that match the corresponding letters in the target word.
- **Total letters attempted**: The total number of characters the user typed (including incorrect ones).
- The result is rounded to the nearest whole number and displayed as a percentage.

### ✅ Example:
If the target word is:
banana

And the user types:
banena

Then 5 out of the 6 letters match the target word.
accuracy = (5 / 6) × 100 = 83.33% → 83%

This encourages both speed and precision in typing practice.

## 🖥️ Responsive Design

The game is designed with a mobile-first approach, mimicking the portrait orientation of a classic phone. It will scale to fit various screen sizes but is best experienced in a view that maintains the aspect ratio of a phone screen. Zooming is disabled for a more app-like feel.

## ⚙️ Tech Stack

* **HTML5**: Structure of the game.
* **CSS3**: Styling for the retro look and feel, including Flexbox and Grid for layout.
* **JavaScript (ES6+)**: Game logic, T9 input handling, and DOM manipulation.
    * **Web Audio API**: For simple sound effects.
