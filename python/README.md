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

After running classification, you can review and correct results using the interactive feedback system:

### 1. Generate Review Page

```bash
python generate_review.py ../OUTPUT/VideoName/1
```

This creates an interactive `review.html` file showing classified images.

### 2. Start Feedback Server

```bash
python feedback_server.py ../OUTPUT/VideoName/1
```

This starts a Flask server at `http://localhost:5050` serving the review page.

### 3. Review and Correct

1. Open `http://localhost:5050` in your browser
2. Click on any misclassified image to toggle its label (keep ↔ exclude)
3. Modified images will show a yellow border and "(Modified)" indicator
4. Click "Submit Corrections" to copy corrected images to `training-data/`
5. Click "Retrain Model" to update the classifier with new training data

### 4. Verify Improvements

Re-run classification on the same video to see improved results:

```bash
cd ..
npm run dev -- video.mp4 --classify
```

### Complete Example

```bash
# Initial classification run
npm run dev -- test.mp4 --classify

# Review and correct
cd python
python generate_review.py ../OUTPUT/test/1
python feedback_server.py ../OUTPUT/test/1

# (In browser: review, correct, submit, retrain)

# Re-run to verify improvements
cd ..
npm run dev -- test.mp4 --classify
```
