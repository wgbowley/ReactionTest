let startTime;
let waiting = false;
let box = document.getElementById("box");
let stats = document.getElementById("stats");
let userChart, globalChart;
let clickTimeout;

const COLOR_WAIT = "#8E1616";
const COLOR_CLICK = "#265095";
const COLOR_TOO_SLOW = "#8E1616";
const COLOR_TOO_EARLY = "#FFA500";
const COLOR_DEFAULT = "#1e1e1e";

// Fetch global stats on load
fetch("/global_stats")
    .then(res => res.json())
    .then(data => {
        updateCharts(300, 50, data.mean, data.stdev || 1);
        document.getElementById("totalPeopleCount").textContent = `Number of participants: ${data.total_users}`;
    });

function truncatedGaussianPoints(mean, stdev) {
    let points = [];
    let start = 0;
    let end = mean + 4 * stdev;
    let step = (end - start) / 50;
    let cdf0 = jStat.normal.cdf(0, mean, stdev);

    for (let x = start; x <= end; x += step) {
        let y = jStat.normal.pdf(x, mean, stdev) / (1 - cdf0);
        points.push({ x, y });
    }
    return points;
}

function updateCharts(userMean, userStdev, globalMean, globalStdev) {
    let userData = truncatedGaussianPoints(userMean, userStdev);
    let globalData = truncatedGaussianPoints(globalMean, globalStdev);

    if (userChart) userChart.destroy();
    if (globalChart) globalChart.destroy();

    userChart = new Chart(document.getElementById("userChart"), {
        type: "line",
        data: { datasets: [{ label: "Your Distribution", data: userData, parsing: false, borderColor: "#265095", fill: true, backgroundColor: "rgba(38, 80, 149, 0.2)" }] },
        options: { maintainAspectRatio: false, scales: { x: { type: "linear", title: { display: true, text: "Reaction Time (ms)" } }, y: { display: false } } }
    });

    globalChart = new Chart(document.getElementById("globalChart"), {
        type: "line",
        data: { datasets: [{ label: "Population Distribution", data: globalData, parsing: false, borderColor: "#E44C31", fill: true, backgroundColor: "rgba(228, 76, 49, 0.2)" }] },
        options: { maintainAspectRatio: false, scales: { x: { type: "linear", title: { display: true, text: "Reaction Time (ms)" } }, y: { display: false } } }
    });
}

function startTest() {
    box.textContent = "Get ready...";
    box.style.background = COLOR_WAIT;
    box.textContent = "Wait...";
    waiting = true;
    startTime = null;

    let delay = 2000 + Math.random() * 3000;

    setTimeout(() => {
        if (!waiting) return;
        box.style.background = COLOR_CLICK;
        box.textContent = "CLICK!";
        startTime = Date.now();

        clickTimeout = setTimeout(() => {
            if (waiting) {
                box.textContent = "Too slow! Click or press space to try again.";
                waiting = false;
                box.style.background = COLOR_TOO_SLOW;
                box.onclick = startTest;
                document.removeEventListener("keydown", handleAttemptOnSpace);
                document.addEventListener("keydown", handleRestartOnSpace);
            }
        }, 5000);
    }, delay);

    box.onclick = handleAttempt;
    document.removeEventListener("keydown", handleRestartOnSpace);
    document.addEventListener("keydown", handleAttemptOnSpace);
}

function handleAttempt() {
    if (!waiting) return;
    if (!startTime) {
        box.textContent = "Too early! Click or press space to try again.";
        waiting = false;
        box.style.background = COLOR_TOO_EARLY;
        clearTimeout(clickTimeout);
        box.onclick = startTest;
        document.removeEventListener("keydown", handleAttemptOnSpace);
        document.addEventListener("keydown", handleRestartOnSpace);
    } else {
        handleClick();
    }
}

function handleClick() {
    if (!waiting) return;
    clearTimeout(clickTimeout);
    let reactionTime = Date.now() - startTime;
    box.textContent = "Your time: " + reactionTime + " ms. Click or press space to try again.";

    fetch("/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ time: reactionTime })
        })
        .then(res => res.json())
        .then(data => {
            stats.textContent = `Mean: ${data.mean.toFixed(2)} ms  -  Stdev: ${data.stdev.toFixed(2)}  -  Trials: ${data.count}`;
            updateCharts(data.mean, data.stdev || 1, data.global_mean, data.global_stdev || 1);
            document.getElementById("userInfo").textContent = `You are in the ${data.percentile.toFixed(1)}th percentile`;
            document.getElementById("totalPeopleCount").textContent = `Number of participants: ${data.total_users}`;
        });

    waiting = false;
    box.style.background = COLOR_WAIT;
    box.onclick = startTest;
    document.removeEventListener("keydown", handleAttemptOnSpace);
    document.addEventListener("keydown", handleRestartOnSpace);
}

function handleAttemptOnSpace(e) {
    if (e.code === "Space") {
        handleAttempt();
        e.preventDefault();
    }
}

function handleRestartOnSpace(e) {
    if (e.code === "Space") {
        startTest();
        e.preventDefault();
    }
}

// Add the copy link functionality
document.getElementById("copy-button").onclick = () => {
    const url = window.location.href;
    document.execCommand('copy');
    const button = document.getElementById("copy-button");
    const originalText = button.textContent;
    button.textContent = "Link Copied!";
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
};

// This is the function that initializes the test.
function init() {
    box.textContent = "Click or press space to start!";
    box.style.background = COLOR_DEFAULT;
    box.onclick = startTest;
    document.addEventListener("keydown", handleRestartOnSpace);
}

init();