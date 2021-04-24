#!/usr/bin/env bash


DATASET_DIR=/Dataset/coco128

# View the dataset in the App
fiftyone app view \
    --dataset-dir $DATASET_DIR \
    --type fiftyone.types.YOLOCustomDataset
