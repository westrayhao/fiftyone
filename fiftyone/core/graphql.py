import graphene
from graphene.relay import Node
from graphene_mongo import MongoengineConnectionField, MongoengineObjectType

from fiftyone.core.odm import DatasetDocument, SampleFieldDocument


class SampleField(MongoengineObjectType):
    class Meta:
        model = SampleFieldDocument
        interfaces = (Node,)


class Dataset(MongoengineObjectType):
    class Meta:
        model = DatasetDocument
        interfaces = (Node,)


class Query(graphene.ObjectType):
    node = Node.Field()
    all_datasets = MongoengineConnectionField(Dataset)
    sample_field = graphene.Field(SampleField)


schema = graphene.Schema(query=Query, types=[Dataset, SampleField])
