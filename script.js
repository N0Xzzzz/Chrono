"use strict";

const STORAGE_KEY = "chrono-preferences";
const root = document.documentElement;
const clockTime = document.getElementById("clock-time");
const clockDate = document.getElementById("clock-date");
const timezoneLabel = document.getElementById("timezone-label");
const formatToggle = document.getElementById("format-toggle");
const formatValue = document.getElementById("format-value");
const secondsToggle = document.getElementById("seconds-toggle");
const secondsValue = document.getElementById("seconds-value");
const themeToggle = document.getElementById("theme-toggle");
const fullscreenToggle = document.getElementById("fullscreen-toggle");

function loadPreferences() {
  const defaults = { theme: "dark", hour12: false, showSeconds: true };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored);
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      hour12: parsed.hour12 === true,
      showSeconds: parsed.showSeconds !== false,
    };
  } catch (error) {
    console.warn("Chrono could not load saved preferences.", error);
    return defaults;
  }
}

let preferences = loadPreferences();

function savePreferences() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn("Chrono could not save preferences.", error);
  }
}

function updatePreferenceControls() {
  root.dataset.theme = preferences.theme;
  document.querySelector('meta[name="theme-color"]').content =
    preferences.theme === "dark" ? "#101116" : "#f2f2ee";
  formatToggle.setAttribute("aria-pressed", String(preferences.hour12));
  formatValue.textContent = preferences.hour12 ? "12-hour" : "24-hour";
  secondsToggle.setAttribute("aria-pressed", String(preferences.showSeconds));
  secondsValue.textContent = preferences.showSeconds ? "On" : "Off";
  themeToggle.setAttribute(
    "aria-label",
    preferences.theme === "dark"
      ? "Switch to light theme"
      : "Switch to dark theme",
  );
}

let lastClockSecond = -1;

function renderClock(force = false) {
  const now = new Date();
  const currentSecond = Math.floor(now.getTime() / 1000);
  if (!force && currentSecond === lastClockSecond) return;
  lastClockSecond = currentSecond;
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: preferences.hour12 ? "h12" : "h23",
  };
  if (preferences.showSeconds) timeOptions.second = "2-digit";
  const nextTime = new Intl.DateTimeFormat(undefined, timeOptions).format(now);
  if (clockTime.textContent !== nextTime) {
    clockTime.textContent = nextTime;
    clockTime.classList.remove("tick");
    void clockTime.offsetWidth;
    clockTime.classList.add("tick");
  }
  clockDate.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
  timezoneLabel.textContent = new Intl.DateTimeFormat(undefined, {
    timeZoneName: "short",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName").value;
}

formatToggle.addEventListener("click", () => {
  preferences.hour12 = !preferences.hour12;
  updatePreferenceControls();
  savePreferences();
  renderClock(true);
});

secondsToggle.addEventListener("click", () => {
  preferences.showSeconds = !preferences.showSeconds;
  updatePreferenceControls();
  savePreferences();
  renderClock(true);
});

themeToggle.addEventListener("click", () => {
  preferences.theme = preferences.theme === "dark" ? "light" : "dark";
  updatePreferenceControls();
  savePreferences();
});

fullscreenToggle.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.error("Chrono could not change fullscreen mode.", error);
  }
});

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenToggle.setAttribute(
    "aria-label",
    isFullscreen ? "Exit fullscreen" : "Enter fullscreen",
  );
  fullscreenToggle.title = isFullscreen
    ? "Exit fullscreen"
    : "Toggle fullscreen";
});

let stopwatchElapsed = 0;
let stopwatchStartedAt = null;
let lapNumber = 0;
const stopwatchDisplay = document.getElementById("stopwatch-display");
const stopwatchStart = document.getElementById("stopwatch-start");
const stopwatchLap = document.getElementById("stopwatch-lap");
const stopwatchReset = document.getElementById("stopwatch-reset");
const lapList = document.getElementById("lap-list");

function formatElapsed(milliseconds, withCentiseconds = true) {
  const totalCentiseconds = Math.floor(Math.max(0, milliseconds) / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const main =
    hours > 0
      ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${String(totalMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return withCentiseconds
    ? `${main}<span>.${String(centiseconds).padStart(2, "0")}</span>`
    : main;
}

function updateStopwatch(now) {
  const elapsed =
    stopwatchElapsed +
    (stopwatchStartedAt === null ? 0 : now - stopwatchStartedAt);
  stopwatchDisplay.innerHTML = formatElapsed(elapsed);
}

stopwatchStart.addEventListener("click", () => {
  if (stopwatchStartedAt === null) {
    stopwatchStartedAt = performance.now();
    stopwatchStart.textContent = "Pause";
    stopwatchLap.disabled = false;
  } else {
    stopwatchElapsed += performance.now() - stopwatchStartedAt;
    stopwatchStartedAt = null;
    stopwatchStart.textContent = stopwatchElapsed === 0 ? "Start" : "Resume";
    stopwatchLap.disabled = true;
  }
  updateStopwatch(performance.now());
});

stopwatchLap.addEventListener("click", () => {
  if (stopwatchStartedAt === null) return;
  lapNumber += 1;
  const elapsed = stopwatchElapsed + performance.now() - stopwatchStartedAt;
  const item = document.createElement("li");
  const label = document.createElement("span");
  const time = document.createElement("span");
  label.textContent = `LAP ${String(lapNumber).padStart(2, "0")}`;
  time.textContent = formatElapsed(elapsed, false);
  item.append(label, time);
  lapList.prepend(item);
});

stopwatchReset.addEventListener("click", () => {
  stopwatchElapsed = 0;
  stopwatchStartedAt = null;
  lapNumber = 0;
  stopwatchStart.textContent = "Start";
  stopwatchLap.disabled = true;
  lapList.replaceChildren();
  updateStopwatch(performance.now());
});

const countdownDisplay = document.getElementById("countdown-display");
const countdownStart = document.getElementById("countdown-start");
const countdownPause = document.getElementById("countdown-pause");
const countdownReset = document.getElementById("countdown-reset");
const countdownStatus = document.getElementById("countdown-status");
const durationInputs = [
  document.getElementById("duration-hours"),
  document.getElementById("duration-minutes"),
  document.getElementById("duration-seconds"),
];
let countdownRemaining = 0;
let countdownDeadline = null;
let countdownFinished = false;

function getCountdownDuration() {
  const [hours, minutes, seconds] = durationInputs.map((input) => {
    const rawValue = input.valueAsNumber;
    const value = Number.isFinite(rawValue) ? Math.floor(rawValue) : 0;
    const normalized = Math.min(
      Number(input.max),
      Math.max(Number(input.min), value),
    );
    input.value = String(normalized);
    return normalized;
  });
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

function setDurationInputsDisabled(disabled) {
  durationInputs.forEach((input) => {
    input.disabled = disabled;
  });
}

function updateCountdown(now) {
  if (countdownDeadline !== null) {
    countdownRemaining = Math.max(0, countdownDeadline - now);
    if (countdownRemaining === 0) {
      countdownDeadline = null;
      countdownFinished = true;
      countdownStatus.textContent = "Time's up.";
      countdownStart.textContent = "Start";
      countdownPause.disabled = true;
      setDurationInputsDisabled(false);
    }
  }
  countdownDisplay.innerHTML = formatElapsed(countdownRemaining);
}

countdownStart.addEventListener("click", () => {
  if (countdownDeadline !== null) return;
  if (countdownFinished || countdownRemaining <= 0) {
    countdownRemaining = getCountdownDuration();
  }
  if (countdownRemaining <= 0) {
    countdownStatus.textContent = "Set a duration greater than zero.";
    return;
  }
  countdownFinished = false;
  countdownStatus.textContent = "";
  countdownDeadline = performance.now() + countdownRemaining;
  countdownStart.textContent = "Running";
  countdownPause.disabled = false;
  setDurationInputsDisabled(true);
  updateCountdown(performance.now());
});

countdownPause.addEventListener("click", () => {
  if (countdownDeadline === null) return;
  countdownRemaining = Math.max(0, countdownDeadline - performance.now());
  countdownDeadline = null;
  countdownStart.textContent = "Resume";
  countdownPause.disabled = true;
  setDurationInputsDisabled(false);
  updateCountdown(performance.now());
});

countdownReset.addEventListener("click", () => {
  countdownDeadline = null;
  countdownRemaining = 0;
  countdownFinished = false;
  countdownStart.textContent = "Start";
  countdownPause.disabled = true;
  countdownStatus.textContent = "";
  setDurationInputsDisabled(false);
  updateCountdown(performance.now());
});

durationInputs.forEach((input) => {
  input.addEventListener("input", () => {
    countdownRemaining = 0;
    countdownFinished = false;
    countdownStatus.textContent = "";
    countdownStart.textContent = "Start";
    updateCountdown(performance.now());
  });
});

function render() {
  const now = performance.now();
  renderClock(true);
  updateStopwatch(now);
  updateCountdown(now);
}

updatePreferenceControls();
render();
window.setInterval(render, 50);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});
