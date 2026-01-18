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
