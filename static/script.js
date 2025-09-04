
const COLOR_WAIT = "#8E1616";
const COLOR_CLICK = "#265095";
const COLOR_TOO_SLOW = "#8E1616";
const COLOR_TOO_EARLY = "#FFA500";
const COLOR_DEFAULT = "#1e1e1e";

const box = document.getElementById("box");
const statsEl = document.getElementById("stats");
const userInfoEl = document.getElementById("userInfo");
const totalPeopleCountEl = document.getElementById("totalPeopleCount");
const copyButton = document.getElementById("copy-button");
const userChartEl = document.getElementById("userChart");
const globalChartEl = document.getElementById("globalChart");

let startTime = null;
let waiting = false;
let clickTimeout = null;
let userChart, globalChart;

/**
 * Generates points for a truncated Gaussian distribution.
 * @param {number} mean - The mean of the distribution.
 * @param {number} stdev - The standard deviation.
 * @returns {Array<{x: number, y: number}>} An array of x,y coordinates for plotting.
 */
const truncatedGaussianPoints = (mean, stdev) => {
    const points = [];
    const start = 0;
    const end = mean + 4 * stdev;
    const step = (end - start) / 50;
    const cdf0 = jStat.normal.cdf(0, mean, stdev);

    for (let x = start; x <= end; x += step) {
        const y = jStat.normal.pdf(x, mean, stdev) / (1 - cdf0);
        points.push({ x, y });
    }
    return points;
};

/**
 * Updates or creates the user and global distribution charts.
 * @param {number} userMean - The user's mean reaction time.
 * @param {number} userStdev - The user's standard deviation.
 * @param {number} globalMean - The global mean reaction time.
 * @param {number} globalStdev - The global standard deviation.
 */
const updateCharts = (userMean, userStdev, globalMean, globalStdev) => {
    const userData = truncatedGaussianPoints(userMean, userStdev);
    const globalData = truncatedGaussianPoints(globalMean, globalStdev);

    if (userChart) userChart.destroy();
    if (globalChart) globalChart.destroy();

    userChart = new Chart(userChartEl, {
        type: "line",
        data: {
            datasets: [{
                label: "Your Distribution",
                data: userData,
                parsing: false,
                borderColor: "#265095",
                fill: true,
                backgroundColor: "rgba(38, 80, 149, 0.2)"
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Reaction Time (ms)" }
                },
                y: { display: false }
            }
        }
    });

    globalChart = new Chart(globalChartEl, {
        type: "line",
        data: {
            datasets: [{
                label: "Population Distribution",
                data: globalData,
                parsing: false,
                borderColor: "#E44C31",
                fill: true,
                backgroundColor: "rgba(228, 76, 49, 0.2)"
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Reaction Time (ms)" }
                },
                y: { display: false }
            }
        }
    });
};

/**
 * Submits the reaction time to the backend and updates the UI.
 * @param {number} reactionTime - The user's reaction time in ms.
 */
const submitResult = (reactionTime) => {
    fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: reactionTime })
    })
    .then(res => res.json())
    .then(data => {
        statsEl.textContent = `Mean: ${data.mean.toFixed(2)} ms  -  Stdev: ${data.stdev.toFixed(2)}  -  Trials: ${data.count}`;
        userInfoEl.textContent = `You are in the ${data.percentile.toFixed(1)}th percentile`;
        totalPeopleCountEl.textContent = `Number of participants: ${data.total_users}`;
        updateCharts(data.mean, data.stdev || 1, data.global_mean, data.global_stdev || 1);
    });
};

/**
 * Handles the click/spacebar press after the box turns blue.
 */
const handleSuccess = () => {
    if (!waiting) return;
    clearTimeout(clickTimeout);
    const reactionTime = Date.now() - startTime;
    box.textContent = `Your time: ${reactionTime} ms. Click or press space to try again.`;
    submitResult(reactionTime);
    waiting = false;
};

/**
 * Handles the case where the user clicks before the box turns blue.
 */
const handleTooEarly = () => {
    box.textContent = "Too early! Click or press space to try again.";
    box.style.background = COLOR_TOO_EARLY;
    waiting = false;
    clearTimeout(clickTimeout);
};

/**
 * Handles the case where the user is too slow to react.
 */
const handleTooSlow = () => {
    box.textContent = "Too slow! Click or press space to try again.";
    box.style.background = COLOR_TOO_SLOW;
    waiting = false;
};

/**
 * Starts the reaction time test.
 */
const startTest = () => {
    box.textContent = "Get ready...";
    box.style.background = COLOR_WAIT;
    waiting = true;
    startTime = null;

    const delay = 2000 + Math.random() * 3000;
    
    // Set up a timeout to change the box color and start the timer.
    setTimeout(() => {
        if (!waiting) return;
        box.style.background = COLOR_CLICK;
        box.textContent = "CLICK!";
        startTime = Date.now();
        
        // Set a timeout to handle the "too slow" case.
        clickTimeout = setTimeout(() => {
            handleTooSlow();
        }, 5000);
    }, delay);
};

// Event listeners for game state changes.
box.addEventListener("click", () => {
    if (waiting) {
        if (startTime) {
            handleSuccess();
        } else {
            handleTooEarly();
        }
    } else {
        startTest();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        if (waiting) {
            if (startTime) {
                handleSuccess();
            } else {
                handleTooEarly();
            }
        } else {
            startTest();
        }
    }
});

// Add the copy link functionality.
copyButton.addEventListener("click", () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        const originalText = copyButton.textContent;
        copyButton.textContent = "Link Copied!";
        setTimeout(() => {
            copyButton.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
});

// Fetch global stats on initial load.
const fetchInitialStats = () => {
    fetch("/global_stats")
    .then(res => res.json())
    .then(data => {
        totalPeopleCountEl.textContent = `Number of participants: ${data.total_users}`;
        updateCharts(300, 50, data.mean, data.stdev || 1);
    });
};

// Call the initial setup function.
document.addEventListener("DOMContentLoaded", fetchInitialStats);
