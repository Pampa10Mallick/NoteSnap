
/* =========================================
   NOTESNAP — BASIC STUDY TOOLS
   ========================================= */

const $ = (id) => document.getElementById(id);

let questions = [];
let selectedAnswers = {};
let quizChecked = false;

// NAVIGATION
function showPage(pageId) {
  document.querySelectorAll(".page-section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== pageId);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.dataset.page === pageId;
    link.classList.toggle("active", active);

    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (location.hash !== `#${pageId}`) {
    history.replaceState(null, "", `#${pageId}`);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showPage(link.dataset.page);
  });
});

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.open);
  });
});

$("goSummary").addEventListener("click", () => showPage("summary"));
$("goQuiz").addEventListener("click", () => showPage("quiz"));

$("goUpload").addEventListener("click", () => {
  showPage("summary");
  $("notesFile").click();
});

// NOTES TRANSFER
function getNotes(sourceId, targetId) {
  const text = $(sourceId).value.trim();

  if (text) {
    $(targetId).value = text;
  }

  return text;
}

$("dashboardSummarize").addEventListener("click", () => {
  const text = getNotes("dashboardNotes", "summaryInput");

  showPage("summary");

  if (text) generateSummary();
});

$("dashboardQuiz").addEventListener("click", () => {
  const text = getNotes("dashboardNotes", "quizInput");

  showPage("quiz");

  if (text) generateQuiz();
});

// TEXT FILE UPLOAD
$("notesFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  const allowed = /\.(txt|md|csv)$/i.test(file.name);

  if (!allowed) {
    $("fileStatus").textContent = "Please choose a TXT, MD, or CSV file.";
    event.target.value = "";
    return;
  }

  try {
    const text = await file.text();

    $("summaryInput").value = text;
    $("dashboardNotes").value = text;
    $("quizInput").value = text;

    $("fileStatus").textContent =
      `Loaded: ${file.name} (${text.length} characters)`;

  } catch {
    $("fileStatus").textContent = "Unable to read this file.";
  }
});

// QUICK SUMMARY
function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function generateSummary() {
  const text = $("summaryInput").value.trim();

  if (!text) {
    $("summaryOutput").innerHTML = `
      <div class="empty-state">
        <h3>No notes provided</h3>
        <p>Please paste notes or upload a text file first.</p>
      </div>`;
    return;
  }

  const sentences = splitSentences(text);

  const maxPoints = Math.min(
    8,
    Math.max(3, Math.ceil(sentences.length * 0.4))
  );

  let selected = sentences;

  if (sentences.length > maxPoints) {
    const step = (sentences.length - 1) / (maxPoints - 1);

    selected = Array.from(
      { length: maxPoints },
      (_, i) => sentences[Math.round(i * step)]
    );
  }

  $("summaryOutput").replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = "Key revision points";
  $("summaryOutput").appendChild(heading);

  const list = document.createElement("ul");

  selected.forEach((sentence) => {
    const item = document.createElement("li");
    item.textContent = sentence;
    list.appendChild(item);
  });

  $("summaryOutput").appendChild(list);

  const note = document.createElement("p");
  note.textContent =
    "Basic summary preview: selected sentences from your original notes.";
  $("summaryOutput").appendChild(note);
}

$("generateSummary").addEventListener("click", generateSummary);

$("clearSummary").addEventListener("click", () => {
  $("summaryInput").value = "";
  $("summaryOutput").innerHTML = `
    <div class="empty-state">
      <h3>Your summary will appear here</h3>
      <p>Paste notes, then select Generate summary.</p>
    </div>`;
  $("notesFile").value = "";
  $("fileStatus").textContent = "No file selected.";
});

// BASIC MCQ GENERATION
function makeQuestions(text) {
  const sentences = splitSentences(text);
  const result = [];

  for (const sentence of sentences) {
    const words = sentence.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || [];

    if (words.length < 5) continue;

    const uniqueWords = [...new Set(words)];

    const answer = uniqueWords
      .filter((word) => word.length >= 4)
      .sort((a, b) => b.length - a.length)[0];

    if (!answer) continue;

    const questionText = sentence.replace(
      new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
      "_____"
    );

    const distractors = uniqueWords
      .filter((word) => word.toLowerCase() !== answer.toLowerCase())
      .filter((word) => word.length >= 3)
      .sort((a, b) => a.length - b.length)
      .slice(0, 3);

    if (distractors.length < 3) continue;

    const options = [answer, ...distractors]
      .sort(() => Math.random() - 0.5);

    result.push({
      question: questionText,
      answer,
      options
    });

    if (result.length >= 5) break;
  }

  return result;
}

function generateQuiz() {
  const text = $("quizInput").value.trim();

  if (!text) {
    $("quizOutput").innerHTML = `
      <div class="empty-state">
        <h3>No notes provided</h3>
        <p>Please paste your notes first.</p>
      </div>`;
    return;
  }

  questions = makeQuestions(text);
  selectedAnswers = {};
  quizChecked = false;

  if (questions.length === 0) {
    $("quizOutput").innerHTML = `
      <div class="empty-state">
        <h3>Not enough text to make questions</h3>
        <p>Try adding a few longer sentences with clear facts.</p>
      </div>`;

    $("quizActions").classList.add("hidden");
    $("quizScore").textContent = "Score: 0";
    return;
  }

  renderQuiz();
}

function renderQuiz() {
  $("quizOutput").replaceChildren();

  questions.forEach((question, questionIndex) => {
    const card = document.createElement("article");
    card.className = "question-card";

    const heading = document.createElement("p");
    heading.className = "question-text";
    heading.textContent =
      `${questionIndex + 1}. ${question.question}`;

    card.appendChild(heading);

    question.options.forEach((option, optionIndex) => {
      const label = document.createElement("label");
      label.className = "option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `question-${questionIndex}`;
      radio.value = option;
      radio.checked = selectedAnswers[questionIndex] === option;
      radio.disabled = quizChecked;

      radio.addEventListener("change", () => {
        selectedAnswers[questionIndex] = option;
      });

      const text = document.createElement("span");
      text.textContent = option;

      label.append(radio, text);
      card.appendChild(label);
    });

    if (quizChecked) {
      const feedback = document.createElement("p");
      feedback.className = "feedback";

      const correct =
        selectedAnswers[questionIndex] === question.answer;

      feedback.textContent = correct
        ? "Correct!"
        : `Correct answer: ${question.answer}`;

      feedback.classList.add(correct ? "correct" : "incorrect");
      card.appendChild(feedback);
    }

    $("quizOutput").appendChild(card);
  });

  $("quizActions").classList.remove("hidden");
  $("checkAnswers").classList.toggle("hidden", quizChecked);
  $("retryQuiz").classList.toggle("hidden", !quizChecked);
  $("quizInstructions").textContent =
    `${questions.length} practice questions generated.`;
}

function checkAnswers() {
  quizChecked = true;

  const score = questions.reduce((total, question, index) => {
    return total +
      (selectedAnswers[index] === question.answer ? 1 : 0);
  }, 0);

  $("quizScore").textContent = `Score: ${score}/${questions.length}`;
  $("quizFeedback").textContent =
    `You scored ${score} out of ${questions.length}. Keep practising!`;

  $("quizFeedback").classList.remove("hidden");

  renderQuiz();
}

$("generateQuiz").addEventListener("click", generateQuiz);
$("checkAnswers").addEventListener("click", checkAnswers);

$("retryQuiz").addEventListener("click", () => {
  selectedAnswers = {};
  quizChecked = false;

  $("quizScore").textContent = "Score: 0";
  $("quizFeedback").classList.add("hidden");

  renderQuiz();
});

$("clearQuiz").addEventListener("click", () => {
  $("quizInput").value = "";
  questions = [];
  selectedAnswers = {};
  quizChecked = false;

  $("quizOutput").innerHTML = `
    <div class="empty-state">
      <h3>Your questions will appear here</h3>
      <p>Add your notes and select Generate MCQs.</p>
    </div>`;

  $("quizActions").classList.add("hidden");
  $("quizFeedback").classList.add("hidden");
  $("quizScore").textContent = "Score: 0";
});

// FLASHCARDS

let myFlashcards = [];
let currentFlashcard = 0;

function renderFlashcard() {
  if (myFlashcards.length === 0) return;

  const card = myFlashcards[currentFlashcard];

  document.getElementById("flashcardCounter").textContent =
    `Card ${currentFlashcard + 1} of ${myFlashcards.length}`;

  document.getElementById("flashcardQuestion").textContent =
    card.question;

  document.getElementById("flashcardAnswer").textContent =
    card.answer;

  document.getElementById("flashcardInner").classList.remove("flipped");

  document.getElementById("writeAnswerArea").classList.add("hidden");

  document.getElementById("userAnswer").value = "";
}

// GENERATE FLASHCARDS

document.getElementById("generateFlashcards").addEventListener("click", function () {

  const notes = document.getElementById("flashcardInput").value.trim();

  if (!notes) {
    alert("Please paste your notes first!");
    return;
  }

  const sentences = notes
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (sentences.length === 0) {
    alert("Please enter detailed notes!");
    return;
  }

  myFlashcards = sentences.map(sentence => {

    const words = sentence.split(/\s+/);
    const answer = words[0];

    return {
      question: "Complete the statement:\n\n" +
        "_____ " + words.slice(1).join(" ") + ".",
      answer: sentence + "."
    };
  });

  currentFlashcard = 0;

  document.getElementById("flashcardArea").classList.remove("hidden");

  renderFlashcard();
});

// ANSWER BUTTON

document.getElementById("showAnswerInput").addEventListener("click", function () {

  document.getElementById("writeAnswerArea").classList.toggle("hidden");

});

// REVEAL ANSWER - FLIP CARD

document.getElementById("flipFlashcard").addEventListener("click", function () {

  document.getElementById("flashcardInner").classList.add("flipped");

});

// BACK TO QUESTION

document.getElementById("backToQuestion").addEventListener("click", function () {

  document.getElementById("flashcardInner").classList.remove("flipped");

});

// NEXT CARD

document.getElementById("nextFlashcard").addEventListener("click", function () {

  if (myFlashcards.length === 0) return;

  currentFlashcard =
    (currentFlashcard + 1) % myFlashcards.length;

  renderFlashcard();

});

// PREVIOUS CARD

document.getElementById("previousFlashcard").addEventListener("click", function () {

  if (myFlashcards.length === 0) return;

  currentFlashcard =
    (currentFlashcard - 1 + myFlashcards.length) % myFlashcards.length;

  renderFlashcard();

});

// CLEAR FLASHCARDS

document.getElementById("clearFlashcards").addEventListener("click", function () {

  document.getElementById("flashcardInput").value = "";

  document.getElementById("flashcardArea").classList.add("hidden");

  myFlashcards = [];
  currentFlashcard = 0;

});