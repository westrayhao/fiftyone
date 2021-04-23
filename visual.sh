#!/usr/bin/env bash


DATASET_DIR=/Dataset/cocomini

# View the dataset in the App
fiftyone app view \
    --dataset-dir $DATASET_DIR \
    --type fiftyone.types.YOLOCustomDataset