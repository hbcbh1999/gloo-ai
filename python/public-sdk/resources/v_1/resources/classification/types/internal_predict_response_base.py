# This file was auto-generated by Fern from our API Definition.

import datetime as dt
import typing

import pydantic

from ......core.datetime_utils import serialize_datetime
from .details_union import DetailsUnion
from .selected_class import SelectedClass


class InternalPredictResponseBase(pydantic.BaseModel):
    selected_classes: typing.List[SelectedClass] = pydantic.Field(
        description=("The predicted classes which were selected\n")
    )
    predictor_details: typing.List[DetailsUnion] = pydantic.Field(description=("The sources of the predictions\n"))

    def json(self, **kwargs: typing.Any) -> str:
        kwargs_with_defaults: typing.Any = {"by_alias": True, "exclude_unset": True, **kwargs}
        return super().json(**kwargs_with_defaults)

    def dict(self, **kwargs: typing.Any) -> typing.Dict[str, typing.Any]:
        kwargs_with_defaults: typing.Any = {"by_alias": True, "exclude_unset": True, **kwargs}
        return super().dict(**kwargs_with_defaults)

    class Config:
        frozen = True
        json_encoders = {dt.datetime: serialize_datetime}
