# Python ML Components

## Setup

```bash
cd python
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Training

Organize labeled images in `training-data/`:
- `keep/` - Memes, interesting content
- `exclude/` - Manuals, duplicates, boring content

Train classifier:
```bash
python train_classifier.py --data ../training-data --output ../models/classifier.pkl
```

## Usage

Called automatically by TypeScript CLI via subprocess.

## Interactive Feedback Workflow

After running classification, you can review and correct results using the interactive feedback system with persistent action history and confidence-based sorting.

### Features

- **Persistent Action History**: All corrections and retraining runs logged in a sidebar that survives page refreshes
- **Confidence-Based Sorting**: Images automatically sorted by confidence (lowest first) to surface uncertain classifications
- **Visual Confidence Indicators**: Color-coded bars (red/yellow/green) show classification confidence at a glance
- **Simplified Feedback**: Brief toast notifications with detailed history in sidebar

### 1. Generate Review Page

```bash
python generate_review.py ../OUTPUT/VideoName/1
```

This creates an interactive `review.html` file showing classified images with:
- Two-column layout (images on left, action history on right)
- Images sorted by confidence within Keep/Exclude sections
- Empty action history sidebar

### 2. Start Feedback Server

```bash
python feedback_server.py ../OUTPUT/VideoName/1
```

This starts a Flask server at `http://localhost:5050` serving the review page.

### 3. Review and Correct

1. Open `http://localhost:5050` in your browser
2. Low-confidence images appear first in each section
3. Click on any misclassified image to toggle its label (keep ↔ exclude)
4. Modified images show a yellow border and "(Modified)" indicator
5. Click "Submit Corrections" to copy corrected images to `training-data/`
   - Action appears in sidebar: "📝 14:32 - Submitted 5 corrections"
   - Brief success toast confirms submission
6. Click "Retrain Model" to update the classifier with new training data
   - Action appears in sidebar: "🔄 14:35 - Retrained: 92.3% accuracy"
7. Action history persists across page refreshes

### 4. Verify Improvements

Re-run classification on the same video to see improved results:

```bash
cd ..
npm run dev -- video.mp4 --classify
```

### Confidence Data

The interface requires classification confidence scores to enable:
- Confidence-based sorting (low → high)
- Color-coded confidence bars (red/yellow/green)

If confidence data is missing, the interface:
- Shows warning banner: "⚠️ Confidence data unavailable - images sorted by filename"
- Falls back to alphabetical sorting
- Hides confidence bars
- All other features work normally

### Complete Example

```bash
# Initial classification run
npm run dev -- test.mp4 --classify

# Review and correct
cd python
python generate_review.py ../OUTPUT/test/1
python feedback_server.py ../OUTPUT/test/1

# (In browser: review low-confidence images, correct, submit, retrain)

# Re-run to verify improvements
cd ..
npm run dev -- test.mp4 --classify
```
