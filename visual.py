import fiftyone as fo

name = "my-yolo-dataset3"
dataset_dir = "/Dataset/cocomini"

# Create the dataset
dataset = fo.Dataset.from_dir(
    dataset_dir, fo.types.YOLOCustomDataset, name=name
)

# View summary info about the dataset
print(dataset)

# Print the first few samples in the dataset
print(dataset.head())
