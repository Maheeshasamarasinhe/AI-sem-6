# AI-sem-6: Student Learning Prediction Model

## 📚 Project Overview

This project implements a machine learning model to predict student success in educational problem-solving scenarios. Using data from the ASSISTments online learning platform, the model analyzes various behavioral and performance metrics to forecast whether a student will answer a problem correctly.

**Project Type:** Semester 6 Artificial Intelligence Assignment  
**Primary Language:** Python (Jupyter Notebook)  
**Dataset:** ASSISTments Platform Data  

---

## 🎯 Objectives

- **Predict Student Performance:** Build a predictive model to determine if students will solve math problems correctly
- **Feature Engineering:** Extract meaningful features from raw educational data including temporal patterns, confidence levels, and problem characteristics
- **Data Processing:** Handle a large-scale dataset (6M+ rows) with missing values and outliers
- **Model Development:** Train a neural network to learn student learning patterns

---

## 📊 Dataset Description

The project uses educational data from the **ASSISTments online learning platform** containing:

- **Size:** 6,123,270 records (sampled to 10% for processing)
- **Key Features:**
  - `problem_log_id`: Unique identifier for each problem attempt
  - `skill`: Mathematics skill category (e.g., "Rounding", "Multiplication and Division Integers")
  - `problem_id`: Unique problem identifier
  - `user_id`: Student identifier
  - `start_time` / `end_time`: Timestamp of problem-solving session
  - `correct`: Target variable (0 = incorrect, 1 = correct)
  - `hint_count`: Number of hints requested
  - `attempt_count`: Number of attempts to solve
  - `problem_type`: Type of problem (algebra, choose_1, fill_in_1, etc.)
  - **Emotion Confidence Metrics:**
    - `Average_confidence(FRUSTRATED)`
    - `Average_confidence(CONFUSED)`
    - `Average_confidence(CONCENTRATING)`
    - `Average_confidence(BORED)`

---

## 🔧 Data Pipeline

### 1. **Data Loading & Exploration**
   - Load CSV data using pandas
   - Inspect dataset shape and columns
   - Identify data types and structure

### 2. **Feature Engineering**
   - Convert timestamps to datetime format
   - Calculate `session_duration` (elapsed time in seconds)
   - Create `is_scaffold` feature (indicates scaffolding use)
   - Compute engagement and behavior metrics

### 3. **Data Sampling**
   - Use 10% random sample (612,327 rows) to prevent memory issues
   - Maintain stratified distribution for balanced training

### 4. **Missing Data Handling**
   - **Skill Column:** Drop rows with missing skills (57.03% missing) - critical for learning path prediction
   - **Time Columns:** Fill with median values
   - **Count Columns:** Fill with zeros
   - **Confidence Metrics:** Fill with zeros (default low confidence)
   - **Categorical Variables:** Fill with "Unknown"

### 5. **Outlier Handling**
   - Apply **Winsorization** (percentile capping at 1st and 99th percentiles)
   - Columns affected: `ms_first_response`, `session_duration`, `attempt_count`, `hint_count`

### 6. **Encoding & Scaling**
   - **Label Encoding:** Convert categorical features (`skill`, `problem_type`) to numeric values
   - **One-Hot Encoding:** Available for categorical features if needed
   - **Standardization:** Use StandardScaler on numerical features for neural networks

### 7. **Train-Validation-Test Split**
   - **Training Set:** 80% (210,517 samples)
   - **Validation Set:** 10% (26,286 samples)
   - **Test Set:** 10% (26,312 samples)
   - Stratified sampling to maintain class distribution

### 8. **Class Distribution**
   - **Class 0 (Incorrect):** 79,533 samples (30.2%)
   - **Class 1 (Correct):** 183,582 samples (69.8%)

---

## 🧠 Model Architecture

The notebook implements a **Deep Neural Network** using Keras/TensorFlow:

```
Input Layer (13 features)
↓
Dense Layer (128 units, ReLU activation)
↓
Dropout Layer (Regularization)
↓
Dense Layer (64 units, ReLU activation)
↓
Dropout Layer (Regularization)
↓
Output Layer (1 unit, Sigmoid activation)
```

**Model Configuration:**
- **Loss Function:** Binary Crossentropy
- **Optimizer:** Adam
- **Metrics:** Accuracy
- **Epochs:** 100
- **Batch Size:** Configurable

---

## 📈 Features Used in Model

| Feature | Type | Description |
|---------|------|-------------|
| `skill` | Categorical (Encoded) | Mathematics skill being practiced |
| `attempt_count` | Numerical | Number of attempts for the problem |
| `hint_count` | Numerical | Number of hints requested |
| `bottom_hint` | Numerical | Whether bottom-out hint was shown |
| `ms_first_response` | Numerical | Time to first response (milliseconds) |
| `first_action` | Categorical | Type of first action (encoded) |
| `session_duration` | Numerical | Total time spent on problem (seconds) |
| `is_scaffold` | Binary | Whether scaffolding was used |
| `Average_confidence(FRUSTRATED)` | Numerical | Confidence metric for frustration |
| `Average_confidence(CONFUSED)` | Numerical | Confidence metric for confusion |
| `Average_confidence(CONCENTRATING)` | Numerical | Confidence metric for concentration |
| `Average_confidence(BORED)` | Numerical | Confidence metric for boredom |
| `problem_type` | Categorical (Encoded) | Problem format type |

---

## 🚀 How to Run

### Prerequisites
```bash
pip install pandas numpy scikit-learn tensorflow keras
```

### Steps
1. **Place Dataset:** Ensure `data.csv` is in the project root directory
2. **Open Notebook:** Launch `SEM6 -AI.ipynb` in Jupyter Notebook
3. **Run Cells Sequentially:** Execute each cell from top to bottom
4. **Monitor Training:** Observe model training progress and validation metrics

### Expected Output
- Data preprocessing logs and statistics
- Missing data report
- Outlier handling confirmation
- Model training progress
- Validation and test set performance metrics

---

## 📉 Key Metrics & Analysis

### Data Quality
- **Total Records Processed:** 263,115 (after handling missing skills)
- **Missing Data Removed:** 57.03% of skill column
- **Final Missing Values:** 0
- **Outliers Capped:** Percentile-based Winsorization applied

### Model Performance Indicators
- **Class Distribution:** Imbalanced (30.2% incorrect, 69.8% correct)
- **Stratified Splitting:** Maintains class balance across train/val/test sets
- **Data Type Optimization:** float32 for memory efficiency

---

## 🔍 Key Insights

1. **Skill Prediction Importance:** The majority of missing data is in the `skill` column, highlighting the importance of skill information for learning path prediction

2. **Session Duration Patterns:** Students who take longer may need additional support - modeled as a predictive feature

3. **Hint Usage:** The number of hints and bottom-out hints serve as indicators of problem difficulty and student struggle

4. **Confidence Metrics:** Emotional state during problem-solving correlates with performance outcomes

5. **Behavioral Features:** First response time and attempt count indicate problem-solving efficiency

---

## 📝 File Structure

```
AI-sem-6/
├── README.md                    # This file
├── SEM6 -AI.ipynb              # Main Jupyter Notebook with complete pipeline
├── data.csv                    # Input dataset (not included, add your own)
└── .ipynb_checkpoints/         # Jupyter checkpoint directory
```

---

## 🎓 Learning Outcomes

This project demonstrates:
- ✅ Large-scale data preprocessing and cleaning
- ✅ Feature engineering for educational data
- ✅ Handling imbalanced datasets
- ✅ Machine learning pipeline development
- ✅ Deep learning with neural networks
- ✅ Model training and evaluation
- ✅ Working with real-world messy data

---

## 🤝 Contributors

**Project Author:** Maheeshasamarasinhe  
**Course:** Semester 6 - Artificial Intelligence

---

## 📖 References

- **Dataset Source:** ASSISTments Online Learning Platform
- **Libraries Used:**
  - [Pandas](https://pandas.pydata.org/) - Data manipulation
  - [NumPy](https://numpy.org/) - Numerical computing
  - [Scikit-learn](https://scikit-learn.org/) - Machine learning
  - [Keras/TensorFlow](https://www.tensorflow.org/) - Deep learning

---

## 📧 Contact & Support

For questions about this project, please reach out to the repository owner.

---

## 📄 License

This project is part of academic coursework. Please refer to your institution's policies regarding code reuse and attribution.

---

**Last Updated:** July 02, 2026  
**Status:** ✅ Active Development
