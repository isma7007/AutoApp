const MINIMUM_PASS_SCORE = 3;
const PACKS = [
  {
    id: "pack1",
    name: "Pack 1 · Fundamentos del permiso B",
    description: "Conceptos básicos de circulación, señales y seguridad vial",
    file: "data/pack1.json",
  },
];

const state = {
  questions: [],
  packMeta: null,
  selectedAnswers: [],
  currentIndex: 0,
};

const elements = {
  packSelector: document.querySelector("#packSelector"),
  startButton: document.querySelector("#startButton"),
  configError: document.querySelector("#configError"),
  configPanel: document.querySelector(".config-panel"),
  packDescription: document.querySelector("#packDescription"),
  testSection: document.querySelector("#testSection"),
  packTitle: document.querySelector("#packTitle"),
  questionCounter: document.querySelector("#questionCounter"),
  scoreTracker: document.querySelector("#scoreTracker"),
  questionText: document.querySelector("#questionText"),
  optionsForm: document.querySelector("#optionsForm"),
  questionFeedback: document.querySelector("#questionFeedback"),
  previousButton: document.querySelector("#previousButton"),
  nextButton: document.querySelector("#nextButton"),
  resultsSection: document.querySelector("#resultsSection"),
  resultsSummary: document.querySelector("#resultsSummary"),
  resultsStatus: document.querySelector("#resultsStatus"),
  resultsList: document.querySelector("#resultsList"),
  restartButton: document.querySelector("#restartButton"),
};

document.addEventListener("DOMContentLoaded", () => {
  initializePackSelector();
  wireEvents();
});

function initializePackSelector() {
  elements.packSelector.innerHTML = "";
  PACKS.forEach((pack) => {
    const option = document.createElement("option");
    option.value = pack.id;
    option.textContent = pack.name;
    elements.packSelector.append(option);
  });
  updatePackDescription();
}

function wireEvents() {
  elements.startButton.addEventListener("click", handleStartTest);
  elements.packSelector.addEventListener("change", updatePackDescription);
  elements.previousButton.addEventListener("click", showPreviousQuestion);
  elements.nextButton.addEventListener("click", handleNextButtonClick);
  elements.restartButton.addEventListener("click", resetApp);
  elements.optionsForm.addEventListener("submit", (event) => event.preventDefault());
}

function updatePackDescription() {
  const selectedPackId = elements.packSelector.value;
  const pack = PACKS.find((item) => item.id === selectedPackId);
  elements.packDescription.textContent = pack?.description ?? "";
}

async function handleStartTest() {
  clearFeedback();
  const selectedPackId = elements.packSelector.value;
  const pack = PACKS.find((item) => item.id === selectedPackId);

  if (!pack) {
    displayConfigError("Selecciona un pack de preguntas válido.");
    return;
  }

  try {
    setLoading(true);
    const response = await fetch(pack.file);

    if (!response.ok) {
      throw new Error("No se pudo cargar el pack de preguntas.");
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("El pack seleccionado no contiene preguntas disponibles.");
    }

    state.questions = data.questions;
    state.packMeta = data.meta ?? { title: pack.name, description: pack.description };
    state.selectedAnswers = new Array(state.questions.length).fill(null);
    state.currentIndex = 0;

    elements.configPanel.classList.add("hidden");
    elements.testSection.classList.remove("hidden");
    elements.resultsSection.classList.add("hidden");
    elements.packTitle.textContent = state.packMeta?.title ?? pack.name;

    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error(error);
    displayConfigError(error.message || "Ocurrió un error al cargar el test.");
  } finally {
    setLoading(false);
  }
}

function renderCurrentQuestion() {
  const question = state.questions[state.currentIndex];

  elements.questionCounter.textContent = `Pregunta ${state.currentIndex + 1} de ${state.questions.length}`;
  updateScoreTracker();

  elements.questionText.textContent = question.question;
  elements.optionsForm.innerHTML = "";

  const selected = state.selectedAnswers[state.currentIndex];

  question.options.forEach((optionText, index) => {
    const optionId = `question-${state.currentIndex}-option-${index}`;
    const optionLabel = document.createElement("label");
    optionLabel.className = "option-item";
    optionLabel.setAttribute("for", optionId);

    const optionInput = document.createElement("input");
    optionInput.type = "radio";
    optionInput.name = "question-options";
    optionInput.value = index;
    optionInput.id = optionId;
    optionInput.checked = selected === index;
    optionInput.addEventListener("change", () => {
      state.selectedAnswers[state.currentIndex] = index;
      elements.questionFeedback.textContent = "";
      updateScoreTracker();
    });

    const optionContent = document.createElement("span");
    optionContent.textContent = optionText;

    optionLabel.append(optionInput, optionContent);
    elements.optionsForm.append(optionLabel);
  });

  elements.previousButton.disabled = state.currentIndex === 0;
  elements.nextButton.textContent = state.currentIndex === state.questions.length - 1 ? "Finalizar test" : "Siguiente";
}

function handleNextButtonClick() {
  if (state.currentIndex === state.questions.length - 1) {
    finalizeTest();
    return;
  }

  if (!isCurrentQuestionAnswered()) {
    elements.questionFeedback.textContent = "Selecciona una opción para continuar.";
    return;
  }

  state.currentIndex += 1;
  renderCurrentQuestion();
  elements.questionFeedback.textContent = "";
}

function showPreviousQuestion() {
  if (state.currentIndex === 0) {
    return;
  }

  state.currentIndex -= 1;
  renderCurrentQuestion();
  elements.questionFeedback.textContent = "";
}

function finalizeTest() {
  if (!isCurrentQuestionAnswered()) {
    elements.questionFeedback.textContent = "Selecciona una opción antes de finalizar.";
    return;
  }

  const totalQuestions = state.questions.length;
  const totalAnswered = state.selectedAnswers.filter((answer) => answer !== null).length;
  const score = calculateScore();
  const passed = score >= MINIMUM_PASS_SCORE;
  const packTitle = state.packMeta?.title ?? "Pack de preguntas";

  elements.testSection.classList.add("hidden");
  elements.resultsSection.classList.remove("hidden");

  elements.resultsSummary.textContent = `${packTitle}: respondiste ${totalAnswered} de ${totalQuestions} preguntas y acertaste ${score}.`;
  elements.resultsStatus.textContent = passed ? "¡Aprobado!" : "Suspenso";
  elements.resultsStatus.classList.toggle("pass", passed);
  elements.resultsStatus.classList.toggle("fail", !passed);

  buildResultsList();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildResultsList() {
  elements.resultsList.innerHTML = "";

  state.questions.forEach((question, index) => {
    const userAnswerIndex = state.selectedAnswers[index];
    const isCorrect = userAnswerIndex === question.correctOption;

    const listItem = document.createElement("li");
    listItem.className = "result-item";
    if (!isCorrect) {
      listItem.classList.add("fail");
    }

    const questionHeader = document.createElement("strong");
    questionHeader.textContent = `Pregunta ${index + 1}: ${question.question}`;

    const userAnswerParagraph = document.createElement("p");
    const userAnswerText = userAnswerIndex !== null ? question.options[userAnswerIndex] : "Sin responder";
    userAnswerParagraph.innerHTML = `<span class="label">Tu respuesta:</span> ${userAnswerText}`;

    const correctAnswerParagraph = document.createElement("p");
    const correctAnswerText = question.options[question.correctOption];
    correctAnswerParagraph.innerHTML = `<span class="label">Respuesta correcta:</span> ${correctAnswerText}`;

    listItem.append(questionHeader, userAnswerParagraph, correctAnswerParagraph);

    if (question.explanation) {
      const explanationParagraph = document.createElement("p");
      explanationParagraph.innerHTML = `<span class="label">Explicación:</span> ${question.explanation}`;
      listItem.append(explanationParagraph);
    }

    elements.resultsList.append(listItem);
  });
}

function resetApp() {
  state.questions = [];
  state.packMeta = null;
  state.selectedAnswers = [];
  state.currentIndex = 0;

  elements.resultsSection.classList.add("hidden");
  elements.testSection.classList.add("hidden");
  elements.configPanel.classList.remove("hidden");
  elements.packTitle.textContent = "";
  updatePackDescription();

  clearFeedback();
  elements.packSelector.focus();
}

function setLoading(isLoading) {
  elements.startButton.disabled = isLoading;
  elements.startButton.textContent = isLoading ? "Cargando..." : "Comenzar test";
}

function updateScoreTracker() {
  const score = calculateScore();
  elements.scoreTracker.textContent = `Aciertos provisionales: ${score}`;
}

function calculateScore() {
  return state.selectedAnswers.reduce((total, answer, index) => {
    if (answer === null) {
      return total;
    }

    const question = state.questions[index];
    return answer === question.correctOption ? total + 1 : total;
  }, 0);
}

function isCurrentQuestionAnswered() {
  return state.selectedAnswers[state.currentIndex] !== null;
}

function displayConfigError(message) {
  elements.configError.textContent = message;
}

function clearFeedback() {
  elements.configError.textContent = "";
  elements.questionFeedback.textContent = "";
}
