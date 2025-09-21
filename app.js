import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { firebaseConfig } from "./firebase-config.js";

const MINIMUM_PASS_SCORE = 3;
const PACKS = [
  {
    id: "pack1",
    title: "Pack 1 · Fundamentos del permiso B",
    description: "Conceptos básicos de circulación, señales y seguridad vial.",
    file: "data/pack1.json",
    questionCount: 30,
    focus: ["Normativa", "Señales", "Seguridad vial"],
  },
];

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const state = {
  user: null,
  packId: null,
  packMeta: null,
  questions: [],
  selectedAnswers: [],
  currentIndex: 0,
  resultsByPack: {},
};

const elements = {
  authSection: document.querySelector("#authSection"),
  dashboardSection: document.querySelector("#dashboardSection"),
  loginForm: document.querySelector("#loginForm"),
  loginButton: document.querySelector("#loginButton"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  authError: document.querySelector("#authError"),
  logoutButton: document.querySelector("#logoutButton"),
  userDisplay: document.querySelector("#userDisplay"),
  dashboardUserName: document.querySelector("#dashboardUserName"),
  heroCompleted: document.querySelector("#heroCompleted"),
  heroLastResult: document.querySelector("#heroLastResult"),
  openLicenseB: document.querySelector("#openLicenseB"),
  licenseBButton: document.querySelector("#licenseBButton"),
  packsSection: document.querySelector("#packsSection"),
  packListFeedback: document.querySelector("#packListFeedback"),
  packList: document.querySelector("#packList"),
  testSection: document.querySelector("#testSection"),
  resultsSection: document.querySelector("#resultsSection"),
  packTitle: document.querySelector("#packTitle"),
  questionCounter: document.querySelector("#questionCounter"),
  scoreTracker: document.querySelector("#scoreTracker"),
  questionText: document.querySelector("#questionText"),
  optionsForm: document.querySelector("#optionsForm"),
  questionFeedback: document.querySelector("#questionFeedback"),
  previousButton: document.querySelector("#previousButton"),
  nextButton: document.querySelector("#nextButton"),
  resultsSummary: document.querySelector("#resultsSummary"),
  resultsStatus: document.querySelector("#resultsStatus"),
  resultsList: document.querySelector("#resultsList"),
  restartButton: document.querySelector("#restartButton"),
  resultsScore: document.querySelector("#resultsScore"),
  resultsAnswered: document.querySelector("#resultsAnswered"),
};

document.addEventListener("DOMContentLoaded", () => {
  wireEvents();
  renderPackList();
  onAuthStateChanged(auth, handleAuthStateChange);
});

function wireEvents() {
  elements.loginForm?.addEventListener("submit", handleLoginSubmit);
  elements.logoutButton?.addEventListener("click", handleLogout);
  elements.openLicenseB?.addEventListener("click", showPacksSection);
  elements.licenseBButton?.addEventListener("click", showPacksSection);
  elements.packList?.addEventListener("click", handlePackListClick);
  elements.previousButton?.addEventListener("click", showPreviousQuestion);
  elements.nextButton?.addEventListener("click", handleNextButtonClick);
  elements.restartButton?.addEventListener("click", resetApp);
  elements.optionsForm?.addEventListener("submit", (event) => event.preventDefault());
}

async function handleAuthStateChange(user) {
  state.user = user ?? null;

  if (user) {
    const displayName = formatDisplayName(user);
    elements.userDisplay.textContent = displayName;
    elements.dashboardUserName.textContent = capitalize(displayName);
    elements.userDisplay.classList.remove("hidden");
    elements.logoutButton.classList.remove("hidden");
    elements.authSection.classList.add("hidden");
    elements.dashboardSection.classList.remove("hidden");
    elements.loginForm?.reset();
    clearAuthError();
    await loadUserResults(user.uid);
  } else {
    elements.userDisplay.classList.add("hidden");
    elements.logoutButton.classList.add("hidden");
    elements.authSection.classList.remove("hidden");
    elements.dashboardSection.classList.add("hidden");
    elements.dashboardUserName.textContent = "piloto";
    state.resultsByPack = {};
    resetApp();
  }

  renderPackList();
  updateDashboardHighlights();
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  const username = elements.loginEmail?.value?.trim();
  const password = elements.loginPassword?.value?.trim();

  if (!username || !password) {
    displayAuthError("Introduce tus credenciales para continuar.");
    return;
  }

  const email = username.includes("@") ? username : `${username}@autoapp.dev`;

  setButtonBusy(elements.loginButton, true, "Accediendo...");
  clearAuthError();

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    displayAuthError(resolveAuthErrorMessage(error));
  } finally {
    setButtonBusy(elements.loginButton, false, "Acceder");
  }
}

function handleLogout() {
  signOut(auth).catch((error) => {
    console.error(error);
  });
}

async function loadUserResults(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const results = data?.results ?? {};
      state.resultsByPack = Object.entries(results).reduce((acc, [packId, attempt]) => {
        acc[packId] = normalizeAttempt(attempt);
        return acc;
      }, {});
    } else {
      state.resultsByPack = {};
    }
    setPackFeedback("");
  } catch (error) {
    console.error(error);
    state.resultsByPack = {};
    setPackFeedback("No se pudo cargar tu historial. Se mostrará cuando recuperemos la conexión.");
  }
}

function renderPackList() {
  if (!elements.packList) {
    return;
  }

  elements.packList.innerHTML = "";

  PACKS.forEach((pack) => {
    const card = document.createElement("article");
    card.className = "pack-card";
    card.setAttribute("role", "listitem");
    const statusInfo = computePackStatus(pack.id);
    card.dataset.status = statusInfo.dataset;

    const header = document.createElement("div");
    header.className = "pack-card__header";

    const title = document.createElement("h3");
    title.className = "pack-card__title";
    title.textContent = pack.title;

    const description = document.createElement("p");
    description.className = "pack-card__description";
    description.textContent = pack.description;

    const meta = document.createElement("div");
    meta.className = "pack-card__meta";
    meta.textContent = `${pack.questionCount} preguntas · ${MINIMUM_PASS_SCORE} aciertos para aprobar`;

    header.append(title, description, meta);
    card.append(header);

    if (Array.isArray(pack.focus) && pack.focus.length > 0) {
      const tagsContainer = document.createElement("div");
      tagsContainer.className = "pack-card__tags";
      pack.focus.forEach((topic) => {
        const tag = document.createElement("span");
        tag.className = "tag-pill";
        tag.textContent = topic;
        tagsContainer.append(tag);
      });
      card.append(tagsContainer);
    }

    const footer = document.createElement("div");
    footer.className = "pack-card__footer";

    const statusContainer = document.createElement("div");
    statusContainer.className = "pack-card__status";

    const statusChip = document.createElement("span");
    statusChip.className = `status-chip ${statusInfo.className}`;
    statusChip.textContent = statusInfo.label;

    const statusDetail = document.createElement("span");
    statusDetail.className = "status-detail";
    statusDetail.textContent = statusInfo.detail;

    statusContainer.append(statusChip, statusDetail);

    const actions = document.createElement("div");
    actions.className = "pack-card__actions";

    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "primary-button";
    startButton.dataset.packId = pack.id;
    startButton.dataset.defaultLabel = statusInfo.callToAction;
    startButton.textContent = statusInfo.callToAction;
    startButton.disabled = !state.user;

    actions.append(startButton);
    footer.append(statusContainer, actions);
    card.append(footer);

    elements.packList.append(card);
  });
}

function computePackStatus(packId) {
  if (!state.user) {
    return {
      dataset: "locked",
      className: "locked",
      label: "Inicia sesión",
      detail: "Accede para guardar tu progreso.",
      callToAction: "Acceder",
    };
  }

  const attempt = state.resultsByPack[packId];
  if (!attempt) {
    return {
      dataset: "pending",
      className: "pending",
      label: "Sin intentos",
      detail: "Todavía no has practicado este test.",
      callToAction: "Comenzar test",
    };
  }

  const score = typeof attempt.score === "number" ? attempt.score : 0;
  const total = typeof attempt.totalQuestions === "number" ? attempt.totalQuestions : PACKS.find((p) => p.id === packId)?.questionCount ?? 30;
  const detail = `Último intento: ${score}/${total} aciertos`;

  if (attempt.passed) {
    return {
      dataset: "pass",
      className: "pass",
      label: "Aprobado",
      detail,
      callToAction: "Repetir test",
    };
  }

  return {
    dataset: "fail",
    className: "fail",
    label: "Suspendido",
    detail,
    callToAction: "Volver a intentarlo",
  };
}

function handlePackListClick(event) {
  const button = event.target.closest("button[data-pack-id]");
  if (!button || button.disabled) {
    return;
  }

  const packId = button.dataset.packId;
  if (!packId) {
    return;
  }

  startPackTest(packId, button);
}

function showPacksSection() {
  if (!state.user) {
    displayAuthError("Debes iniciar sesión para ver los tests disponibles.");
    return;
  }

  elements.packsSection?.classList.remove("hidden");
  elements.testSection?.classList.add("hidden");
  elements.resultsSection?.classList.add("hidden");
  window.scrollTo({ top: elements.packsSection.offsetTop - 40, behavior: "smooth" });
}

async function startPackTest(packId, triggerButton) {
  const pack = PACKS.find((item) => item.id === packId);
  if (!pack) {
    setPackFeedback("No se encontró el test seleccionado.");
    return;
  }

  try {
    setPackFeedback("");
    setButtonBusy(triggerButton, true, "Preparando...");

    const response = await fetch(pack.file);
    if (!response.ok) {
      throw new Error("No se pudo cargar el pack de preguntas.");
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("El pack seleccionado no contiene preguntas disponibles.");
    }

    state.packId = pack.id;
    state.packMeta = data.meta ?? { title: pack.title, description: pack.description };
    state.questions = data.questions;
    state.selectedAnswers = new Array(state.questions.length).fill(null);
    state.currentIndex = 0;

    elements.packTitle.textContent = state.packMeta?.title ?? pack.title;
    elements.scoreTracker.textContent = "Aciertos provisionales: 0";

    elements.packsSection?.classList.add("hidden");
    elements.resultsSection?.classList.add("hidden");
    elements.testSection?.classList.remove("hidden");

    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error(error);
    setPackFeedback(error.message || "Ocurrió un error al preparar el test.");
  } finally {
    setButtonBusy(triggerButton, false);
  }
}

function renderCurrentQuestion() {
  const question = state.questions[state.currentIndex];
  if (!question) {
    return;
  }

  const totalQuestions = state.questions.length;
  elements.questionCounter.textContent = `Pregunta ${state.currentIndex + 1} de ${totalQuestions}`;
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

    const optionLetter = document.createElement("span");
    optionLetter.className = "option-letter";
    optionLetter.textContent = String.fromCharCode(65 + index);

    const optionContent = document.createElement("span");
    optionContent.className = "option-text";
    optionContent.textContent = optionText;

    optionInput.addEventListener("change", () => {
      state.selectedAnswers[state.currentIndex] = index;
      elements.questionFeedback.textContent = "";
      updateScoreTracker();
      elements.optionsForm.querySelectorAll(".option-item").forEach((item) => item.classList.remove("selected"));
      optionLabel.classList.add("selected");
    });

    optionLabel.append(optionInput, optionLetter, optionContent);
    if (selected === index) {
      optionLabel.classList.add("selected");
    }

    elements.optionsForm.append(optionLabel);
  });

  elements.previousButton.disabled = state.currentIndex === 0;
  elements.nextButton.textContent = state.currentIndex === totalQuestions - 1 ? "Finalizar test" : "Siguiente pregunta";
}

async function handleNextButtonClick() {
  if (state.currentIndex === state.questions.length - 1) {
    await finalizeTest();
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

async function finalizeTest() {
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

  elements.resultsSummary.textContent = `Completaste "${packTitle}". Respondiste ${totalAnswered} de ${totalQuestions} preguntas y acertaste ${score}.`;
  elements.resultsScore.textContent = String(score);
  elements.resultsAnswered.textContent = `${totalAnswered}/${totalQuestions}`;

  elements.resultsStatus.textContent = passed ? "¡Aprobado!" : "Suspendido";
  elements.resultsStatus.className = `status-chip ${passed ? "pass" : "fail"}`;

  buildResultsList();
  window.scrollTo({ top: elements.resultsSection.offsetTop - 20, behavior: "smooth" });

  if (state.user && state.packId) {
    const attempt = {
      score,
      totalQuestions,
      passed,
      updatedAt: new Date().toISOString(),
    };
    await persistResult(state.packId, attempt);
  }
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
    userAnswerParagraph.innerHTML = `<span class="metric-label">Tu respuesta:</span> ${userAnswerText}`;

    const correctAnswerParagraph = document.createElement("p");
    const correctAnswerText = question.options[question.correctOption];
    correctAnswerParagraph.innerHTML = `<span class="metric-label">Respuesta correcta:</span> ${correctAnswerText}`;

    listItem.append(questionHeader, userAnswerParagraph, correctAnswerParagraph);

    if (question.explanation) {
      const explanationParagraph = document.createElement("p");
      explanationParagraph.innerHTML = `<span class="metric-label">Explicación:</span> ${question.explanation}`;
      listItem.append(explanationParagraph);
    }

    elements.resultsList.append(listItem);
  });
}

function resetApp() {
  state.packId = null;
  state.packMeta = null;
  state.questions = [];
  state.selectedAnswers = [];
  state.currentIndex = 0;

  elements.resultsSection.classList.add("hidden");
  elements.testSection.classList.add("hidden");
  if (state.user) {
    elements.packsSection?.classList.remove("hidden");
  } else {
    elements.packsSection?.classList.add("hidden");
  }

  elements.packTitle.textContent = "";
  elements.questionText.textContent = "";
  elements.optionsForm.innerHTML = "";
  elements.questionFeedback.textContent = "";
  elements.scoreTracker.textContent = "";
  elements.resultsSummary.textContent = "";
  elements.resultsStatus.textContent = "";
  elements.resultsStatus.className = "status-chip";
  elements.resultsList.innerHTML = "";
  elements.resultsScore.textContent = "0";
  elements.resultsAnswered.textContent = "0";
  setPackFeedback("");
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

async function persistResult(packId, attempt) {
  const normalizedAttempt = normalizeAttempt(attempt);

  try {
    const userDoc = doc(db, "users", state.user.uid);
    await setDoc(userDoc, { results: { [packId]: normalizedAttempt } }, { merge: true });
    state.resultsByPack[packId] = normalizedAttempt;
    renderPackList();
    updateDashboardHighlights();
    setPackFeedback("");
  } catch (error) {
    console.error(error);
    setPackFeedback("Guardaremos tu resultado en cuanto vuelva la conexión.");
  }
}

function normalizeAttempt(attempt = {}) {
  const normalized = { ...attempt };
  if (attempt?.updatedAt && typeof attempt.updatedAt.toDate === "function") {
    normalized.updatedAt = attempt.updatedAt.toDate().toISOString();
  }
  if (typeof normalized.updatedAt !== "string") {
    normalized.updatedAt = new Date().toISOString();
  }
  normalized.score = typeof attempt.score === "number" ? attempt.score : 0;
  normalized.totalQuestions = typeof attempt.totalQuestions === "number" ? attempt.totalQuestions : 0;
  normalized.passed = Boolean(attempt.passed);
  return normalized;
}

function updateDashboardHighlights() {
  if (!elements.heroCompleted || !elements.heroLastResult) {
    return;
  }

  const results = Object.values(state.resultsByPack ?? {});
  const passedCount = results.filter((attempt) => attempt?.passed).length;
  elements.heroCompleted.textContent = `${passedCount}/${PACKS.length}`;

  if (results.length === 0) {
    elements.heroLastResult.textContent = "—";
    return;
  }

  const latest = [...results]
    .map((attempt) => ({
      ...attempt,
      updatedAt: attempt?.updatedAt ?? new Date().toISOString(),
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  if (latest && typeof latest.score === "number" && typeof latest.totalQuestions === "number") {
    elements.heroLastResult.textContent = `${latest.score}/${latest.totalQuestions}`;
  } else {
    elements.heroLastResult.textContent = "—";
  }
}

function displayAuthError(message) {
  if (elements.authError) {
    elements.authError.textContent = message;
  }
}

function clearAuthError() {
  if (elements.authError) {
    elements.authError.textContent = "";
  }
}

function setPackFeedback(message) {
  if (elements.packListFeedback) {
    elements.packListFeedback.textContent = message;
  }
}

function setButtonBusy(button, isBusy, busyLabel) {
  if (!button) {
    return;
  }

  const defaultLabel = button.dataset.defaultLabel || button.textContent;
  if (busyLabel) {
    button.dataset.busyLabel = busyLabel;
  }

  button.disabled = Boolean(isBusy);
  if (isBusy) {
    button.textContent = button.dataset.busyLabel || busyLabel || "Cargando...";
  } else {
    button.textContent = defaultLabel;
  }

  button.dataset.defaultLabel = defaultLabel;
}

function resolveAuthErrorMessage(error) {
  const code = error?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Usuario o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Has realizado demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    default:
      return "No se pudo iniciar sesión. Revisa la configuración de Firebase y vuelve a intentar.";
  }
}

function formatDisplayName(user) {
  if (user.displayName) {
    return user.displayName;
  }
  if (user.email) {
    return user.email.split("@")[0];
  }
  return "piloto";
}

function capitalize(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
