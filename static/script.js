let startTime;
let waiting = false;
let box = document.getElementById("box");
let result = document.getElementById("result");
let stats = document.getElementById("stats");
let userChart, globalChart;
let clickTimeout;

// Fetch global stats on load
fetch("/global_stats")
  .then(res => res.json())
  .then(data => {
    updateCharts(300, 50, data.mean, data.stdev || 1);
  });

function truncatedGaussianPoints(mean, stdev) {
  let points = [];
  let start = 0;
  let end = mean + 4 * stdev;
  let step = (end - start) / 50;
  let cdf0 = jStat.normal.cdf(0, mean, stdev);

  for (let x = start; x <= end; x += step) {
    let y = jStat.normal.pdf(x, mean, stdev) / (1 - cdf0);
    points.push({x, y});
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
    data: { datasets: [{ label: "Your Distribution", data: userData, parsing: false, borderColor: "blue", fill: true, backgroundColor: "rgba(0,0,255,0.2)" }] },
    options: { maintainAspectRatio: false, scales: { x: { type: "linear", title: { display: true, text: "Reaction Time (ms)" } }, y: { display: false } } }
  });

  globalChart = new Chart(document.getElementById("globalChart"), {
    type: "line",
    data: { datasets: [{ label: "Population Distribution", data: globalData, parsing: false, borderColor: "green", fill: true, backgroundColor: "rgba(0,255,0,0.2)" }] },
    options: { maintainAspectRatio: false, scales: { x: { type: "linear", title: { display: true, text: "Reaction Time (ms)" } }, y: { display: false } } }
  });
}

function startTest() {
  result.textContent = "Get ready...";
  box.style.background = "red";
  box.textContent = "Wait...";
  waiting = true;

  let delay = 2000 + Math.random() * 3000;
  setTimeout(() => {
    if (!waiting) return;
    box.style.background = "green";
    box.textContent = "CLICK!";
    startTime = Date.now();

    clickTimeout = setTimeout(() => {
      if (waiting) {
        result.textContent = "Too slow! Try again.";
        waiting = false;
        box.style.background = "red";
        box.textContent = "Wait...";
        setTimeout(startTest, 1500);
      }
    }, 5000);

  }, delay);
}

function handleClick() {
  if (waiting && box.style.background === "green") {
    clearTimeout(clickTimeout);
    let reactionTime = Date.now() - startTime;
    result.textContent = "Your time: " + reactionTime + " ms";

    fetch("/submit", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({time: reactionTime})
    })
    .then(res => res.json())
    .then(data => {
      stats.textContent = `Mean: ${data.mean.toFixed(2)} ms | Stdev: ${data.stdev.toFixed(2)} | Trials: ${data.count}`;
      updateCharts(data.mean, data.stdev || 1, data.global_mean, data.global_stdev || 1);
    });

    waiting = false;
    box.style.background = "red";
    box.textContent = "Wait...";
    setTimeout(startTest, 1500);
  }
}

box.onclick = handleClick;

// Space bar triggers click
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    handleClick();
    e.preventDefault();
  }
});

startTest();