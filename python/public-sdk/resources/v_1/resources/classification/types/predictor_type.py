# This file was auto-generated by Fern from our API Definition.

import enum
import typing

T_Result = typing.TypeVar("T_Result")


class PredictorType(str, enum.Enum):
    FT = "FT"
    LLM = "LLM"

    def visit(self, ft: typing.Callable[[], T_Result], llm: typing.Callable[[], T_Result]) -> T_Result:
        if self is PredictorType.FT:
            return ft()
        if self is PredictorType.LLM:
            return llm()