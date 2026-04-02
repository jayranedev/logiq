"""
Train XGBoost models for delivery delay prediction.

1. Classifier: delay yes/no (binary)
2. Regressor: estimated delay in minutes

Run: python -m app.ml.train_model (from backend/)
"""
import os
import pickle

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error
from xgboost import XGBClassifier, XGBRegressor

ML_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(ML_DIR, "delivery_history.csv")

FEATURE_COLS = [
    "distance_km",
    "weight_kg",
    "priority_encoded",
    "hour_of_day",
    "day_of_week",
    "traffic_factor",
    "weather_score",
    "driver_experience_days",
    "is_rush_hour",
    "zone_density",
]


def train():
    """Train both models and save to disk."""
    if not os.path.exists(DATA_PATH):
        print(f"Data file not found: {DATA_PATH}")
        print("Run: python -m app.ml.generate_data  first")
        return

    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} records")

    X = df[FEATURE_COLS].values
    y_class = df["is_delayed"].values
    y_reg = df["delay_minutes"].values

    X_train, X_test, yc_train, yc_test, yr_train, yr_test = train_test_split(
        X, y_class, y_reg, test_size=0.2, random_state=42
    )

    # --- Classifier ---
    print("\n--- Training Classifier ---")
    clf = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )
    clf.fit(X_train, yc_train)

    yc_pred = clf.predict(X_test)
    acc = accuracy_score(yc_test, yc_pred)
    f1 = f1_score(yc_test, yc_pred)
    print(f"  Accuracy: {acc:.4f}")
    print(f"  F1 Score: {f1:.4f}")

    clf_path = os.path.join(ML_DIR, "model_classifier.pkl")
    with open(clf_path, "wb") as f:
        pickle.dump(clf, f)
    print(f"  Saved → {clf_path}")

    # --- Regressor (only on delayed samples) ---
    print("\n--- Training Regressor ---")
    delayed_mask_train = yr_train > 0
    delayed_mask_test = yr_test > 0

    reg = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
    )
    if delayed_mask_train.sum() > 100:
        reg.fit(X_train[delayed_mask_train], yr_train[delayed_mask_train])
        yr_pred = reg.predict(X_test[delayed_mask_test])
        mae = mean_absolute_error(yr_test[delayed_mask_test], yr_pred)
        print(f"  MAE (delayed only): {mae:.2f} minutes")
    else:
        reg.fit(X_train, yr_train)
        yr_pred = reg.predict(X_test)
        mae = mean_absolute_error(yr_test, yr_pred)
        print(f"  MAE (all): {mae:.2f} minutes")

    reg_path = os.path.join(ML_DIR, "model_regressor.pkl")
    with open(reg_path, "wb") as f:
        pickle.dump(reg, f)
    print(f"  Saved → {reg_path}")

    # --- Feature importance ---
    print("\n--- Feature Importance (Classifier) ---")
    importances = clf.feature_importances_
    for name, imp in sorted(zip(FEATURE_COLS, importances), key=lambda x: -x[1]):
        bar = "█" * int(imp * 50)
        print(f"  {name:25s} {imp:.4f} {bar}")

    print("\nDone! Models saved to app/ml/")


if __name__ == "__main__":
    train()
