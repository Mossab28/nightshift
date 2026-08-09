"""The Nightshift command line.

    nightshift status            # can we reach the graph, what does it remember
    nightshift break             # plant the silent schema change (demo)
    nightshift restore           # undo it
    nightshift oncall            # hand the pager to the agents for one shift
    nightshift report            # print the latest morning report
"""

from __future__ import annotations

import json
import pathlib

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .config import load_settings
from .datahub.client import build_graph
from .memory import GraphMemory
from .scenario import PlantedIncident, break_pipeline, restore_pipeline

app = typer.Typer(add_completion=False, rich_markup_mode="rich")
console = Console()

#: Where the planted incident and shift reports are kept between commands.
STATE_DIR = pathlib.Path(".nightshift")
INCIDENT_FILE = STATE_DIR / "planted-incident.json"
REPORTS_DIR = STATE_DIR / "reports"

# Defaults chosen for the showcase-ecommerce datapack; overridable on the CLI
# so the same commands work on any graph.
DEFAULT_UPSTREAM = (
    "urn:li:dataset:(urn:li:dataPlatform:snowflake,"
    "b2fd91.order_entry_db.order_entry.orders,PROD)"
)
DEFAULT_VICTIM = (
    "urn:li:dataset:(urn:li:dataPlatform:powerbi,"
    "b2fd91.datahub_order_entries.Essential_KPI_Measures,PROD)"
)
DEFAULT_OLD_COLUMN = "order_total"
DEFAULT_NEW_COLUMN = "order_amount"


@app.command()
def status() -> None:
    """Check the connection to DataHub and summarize what the graph remembers."""
    settings = load_settings()
    graph = build_graph(settings)
    console.print(f"[bold]GMS[/bold] {settings.gms_url} ... ", end="")
    graph.test_connection()
    console.print("[green]connected[/green]")

    if INCIDENT_FILE.exists():
        planted = json.loads(INCIDENT_FILE.read_text())
        console.print(
            Panel(
                f"upstream: {planted['upstream_urn']}\n"
                f"rename:   {planted['old_column']} -> {planted['new_column']}\n"
                f"victim:   {planted['victim_urn']}",
                title="planted incident (active)",
                border_style="red",
            )
        )
    else:
        console.print("No planted incident. `nightshift break` to start the demo.")


@app.command("break")
def break_(
    upstream: str = typer.Option(DEFAULT_UPSTREAM, help="Dataset whose schema changes."),
    victim: str = typer.Option(DEFAULT_VICTIM, help="Downstream asset that goes dark."),
    old_column: str = typer.Option(DEFAULT_OLD_COLUMN),
    new_column: str = typer.Option(DEFAULT_NEW_COLUMN),
) -> None:
    """Plant the silent schema change. Nobody is told; that is the point."""
    graph = build_graph(load_settings())
    planted = break_pipeline(
        graph,
        upstream_urn=upstream,
        old_column=old_column,
        new_column=new_column,
        victim_urn=victim,
    )
    STATE_DIR.mkdir(exist_ok=True)
    INCIDENT_FILE.write_text(planted.to_json())
    console.print(
        Panel(
            f"`{old_column}` is now `{new_column}` on\n{upstream}\n\n"
            "Downstream SQL still selects the old name. The dashboard reads zero.\n"
            "Nobody was told.",
            title="pipeline broken",
            border_style="red",
        )
    )


@app.command()
def restore(
    upstream: str = typer.Option(DEFAULT_UPSTREAM),
    old_column: str = typer.Option(DEFAULT_OLD_COLUMN),
    new_column: str = typer.Option(DEFAULT_NEW_COLUMN),
) -> None:
    """Put the original schema back so the demo can run again."""
    graph = build_graph(load_settings())
    restore_pipeline(
        graph, upstream_urn=upstream, old_column=old_column, new_column=new_column
    )
    if INCIDENT_FILE.exists():
        INCIDENT_FILE.unlink()
    console.print("[green]Schema restored. The graph keeps its memories.[/green]")


@app.command()
def oncall(
    symptom: str = typer.Option(
        None,
        help="What the human reported. Defaults to the planted incident's symptom.",
    ),
    entry_point: str = typer.Option(
        None, help="URN where the pager points. Defaults to the planted victim."
    ),
) -> None:
    """Hand the pager to the agents for one shift."""
    from .agent.shift import run_shift  # imported late: pulls the agent SDK

    planted: PlantedIncident | None = None
    if INCIDENT_FILE.exists():
        planted = PlantedIncident(**json.loads(INCIDENT_FILE.read_text()))
    if symptom is None:
        if planted is None:
            raise typer.BadParameter("No planted incident; pass --symptom explicitly.")
        symptom = planted.symptom
    if entry_point is None:
        if planted is None:
            raise typer.BadParameter("No planted incident; pass --entry-point explicitly.")
        entry_point = planted.victim_urn

    report = run_shift(symptom=symptom, entry_point_urn=entry_point, console=console)

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = report.started_at.strftime("%Y%m%d-%H%M%S")
    out = REPORTS_DIR / f"shift-{stamp}.md"
    out.write_text(report.to_markdown())
    (REPORTS_DIR / f"shift-{stamp}.json").write_text(json.dumps(report.to_dict(), indent=2))
    console.print(f"\nMorning report written to [bold]{out}[/bold]")


@app.command()
def report() -> None:
    """Print the most recent morning report."""
    reports = sorted(REPORTS_DIR.glob("shift-*.md")) if REPORTS_DIR.exists() else []
    if not reports:
        console.print("No shift has run yet. `nightshift oncall` to start one.")
        raise typer.Exit(1)
    console.print(reports[-1].read_text())


@app.command("war-room")
def war_room() -> None:
    """Render the latest shift as a dark, single-file war-room page."""
    from .warroom import render_file

    shifts = sorted(REPORTS_DIR.glob("shift-*.json")) if REPORTS_DIR.exists() else []
    if not shifts:
        console.print("No shift has run yet. `nightshift oncall` to start one.")
        raise typer.Exit(1)
    out = render_file(shifts[-1])
    console.print(f"War room rendered: [bold]{out}[/bold]")


@app.command()
def memory(dataset_urn: str) -> None:
    """Show everything Nightshift remembers about one asset."""
    graph = build_graph(load_settings())
    postmortems = GraphMemory(graph).recall(dataset_urn)
    if not postmortems:
        console.print("The graph holds no Nightshift memory for this asset yet.")
        return
    table = Table(title=f"Nightshift memory -- {dataset_urn}")
    table.add_column("when", style="dim")
    table.add_column("failure mode")
    table.add_column("root cause")
    for p in postmortems:
        table.add_row(str(p.recorded_at_ms), p.failure_mode, p.root_cause)
    console.print(table)


@app.command()
def forget(dataset_urn: str) -> None:
    """Erase Nightshift's memory on one asset (demo resets, bad conclusions)."""
    graph = build_graph(load_settings())
    dropped = GraphMemory(graph).forget(dataset_urn)
    console.print(f"Dropped {dropped} postmortem(s) from {dataset_urn}")


if __name__ == "__main__":
    app()
