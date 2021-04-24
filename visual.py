import fiftyone as fo
print(fo.list_datasets())
name = "my-yolo-dataset9"
dataset_dir = "/Dataset/coco128"

# Create the dataset
dataset = fo.Dataset.from_dir(
    dataset_dir, fo.types.YOLOCustomDataset, name=name
)

# View summary info about the dataset
print(dataset)

# Print the first few samples in the dataset
print(dataset.head())
