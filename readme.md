## Reaction Test
A simple Flask application to measure your reflexes and compare them against a Gaussian population distribution. 
Designed to collect data for my Specialist Math SAC while letting users have a bit of fun.

### Participate in survey
Click here: [here](https://reactiontest.onrender.com/)!

As promised, the raw data is available here: <br>
Last updated from the website on 7/9/2025.
[`/dataset`](./dataset/reaction.sql)

## Features
- Personal reaction time distribution with <b>mean, standard deviation, and trial count</b>
- Comparison to the <b>global population distribution</b>
- Percentile ranking against the global distribution

## Installation
```py 
pip install -r requirements.txt
```

## Usage
```bash
python app.py
```
Then open http://127.0.0.1:8000 in your browser
