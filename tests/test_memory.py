"""The memory layer is the product; these tests pin its contract."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import datahub.metadata.schema_classes as models

from nightshift.memory import (
    MEMORY_PROPERTY_URN,
    GraphMemory,
    Postmortem,
    failure_mode_tag,
)


def make_postmortem(**overrides) -> Postmortem:
    base = dict(
        dataset_urn="urn:li:dataset:(urn:li:dataPlatform:snowflake,marts.fct_revenue,PROD)",
        failure_mode="silent-schema-change",
        summary="revenue dashboard read zero after upstream rename",
        root_cause="`order_total` renamed to `order_amount` upstream; join produced NULLs",
        changed_field="order_total",
    )
    base.update(overrides)
    return Postmortem(**base)


def test_postmortem_survives_the_round_trip():
    original = make_postmortem(lineage_path=["a", "b"], minutes_to_root_cause=4.2)
    restored = Postmortem.from_json(original.to_json())
    assert restored == original


def test_prose_speaks_to_a_human_not_a_parser():
    prose = make_postmortem(guard_urn="urn:li:assertion:nightshift-x").as_prose()
    assert "Root cause" in prose
    assert "order_total" in prose
    assert "cannot recur silently" in prose


def test_failure_mode_tags_are_namespaced_and_searchable():
    assert failure_mode_tag("silent-schema-change") == (
        "urn:li:tag:nightshift.silent-schema-change"
    )


def test_remember_appends_instead_of_overwriting():
    """A second incident must never erase the memory of the first."""
    graph = MagicMock()
    first = make_postmortem(summary="first night")
    existing = models.StructuredPropertiesClass(
        properties=[
            models.StructuredPropertyValueAssignmentClass(
                propertyUrn=MEMORY_PROPERTY_URN, values=[first.to_json()]
            )
        ]
    )

    def get_aspect(urn, aspect_type, version=0):
        if aspect_type is models.StructuredPropertiesClass:
            return existing
        return None

    graph.get_aspect.side_effect = get_aspect

    memory = GraphMemory(graph)
    memory.remember(make_postmortem(summary="second night"))

    emitted = [call.args[0] for call in graph.emit_mcp.call_args_list]
    props = [
        m.aspect for m in emitted if isinstance(m.aspect, models.StructuredPropertiesClass)
    ]
    assert len(props) == 1
    values = props[0].properties[0].values
    assert len(values) == 2
    summaries = {json.loads(v)["summary"] for v in values}
    assert summaries == {"first night", "second night"}


def test_recall_orders_by_time_and_skips_garbage():
    graph = MagicMock()
    newer = make_postmortem(summary="newer", recorded_at_ms=2000)
    older = make_postmortem(summary="older", recorded_at_ms=1000)
    graph.get_aspect.return_value = models.StructuredPropertiesClass(
        properties=[
            models.StructuredPropertyValueAssignmentClass(
                propertyUrn=MEMORY_PROPERTY_URN,
                values=[newer.to_json(), "not json at all", older.to_json()],
            )
        ]
    )
    out = GraphMemory(graph).recall("urn:whatever")
    assert [p.summary for p in out] == ["older", "newer"]


def test_recall_returns_nothing_for_a_clean_asset():
    graph = MagicMock()
    graph.get_aspect.return_value = None
    assert GraphMemory(graph).recall("urn:clean") == []
