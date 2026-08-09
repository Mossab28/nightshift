"""Persistence for the Nightshift app tier.

SQLite through SQLAlchemy: one file, zero operations. The graph remains the
source of truth for everything the agents conclude -- this database only holds
what a SaaS shell needs and DataHub cannot hold for us: accounts, sessions,
workspace connections, and the run history of shifts.
"""

from __future__ import annotations

import datetime as dt
import os
import secrets

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


def _utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: secrets.token_hex(16)
    )
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)

    workspaces: Mapped[list[Workspace]] = relationship(back_populates="owner")


class Workspace(Base):
    """One team, one DataHub connection, one on-call rota of agents."""

    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: secrets.token_hex(16)
    )
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    gms_url: Mapped[str] = mapped_column(String, default="")
    gms_token_encrypted: Mapped[str] = mapped_column(Text, default="")
    sentinel_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    sentinel_interval_s: Mapped[int] = mapped_column(Integer, default=120)
    shift_budget_usd: Mapped[float] = mapped_column(Float, default=1.5)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)

    owner: Mapped[User] = relationship(back_populates="workspaces")
    watches: Mapped[list[Watch]] = relationship(back_populates="workspace")
    shifts: Mapped[list[Shift]] = relationship(back_populates="workspace")


class Watch(Base):
    """A dataset the Sentinel keeps its eye on."""

    __tablename__ = "watches"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: secrets.token_hex(16)
    )
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    dataset_urn: Mapped[str] = mapped_column(Text)
    #: Last known schema fingerprint (sorted fieldPaths), for drift detection.
    schema_fingerprint: Mapped[str] = mapped_column(Text, default="")
    last_checked_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)

    workspace: Mapped[Workspace] = relationship(back_populates="watches")


class Shift(Base):
    """One night of work: trigger, live events, conclusion, metrics."""

    __tablename__ = "shifts"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: secrets.token_hex(16)
    )
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    #: "manual" | "sentinel" | "demo"
    trigger: Mapped[str] = mapped_column(String, default="manual")
    symptom: Mapped[str] = mapped_column(Text)
    entry_point_urn: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="running")  # running|done|failed
    events: Mapped[list] = mapped_column(JSON, default=list)
    conclusion: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)
    ended_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    investigation_calls: Mapped[int] = mapped_column(Integer, default=0)
    started_from_memory: Mapped[bool] = mapped_column(Boolean, default=False)

    workspace: Mapped[Workspace] = relationship(back_populates="shifts")


class Session(Base):
    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: secrets.token_urlsafe(32)
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)
    expires_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=lambda: _utcnow() + dt.timedelta(days=14)
    )


def make_engine(path: str | None = None):
    path = path or os.environ.get("NIGHTSHIFT_DB", "nightshift.db")
    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return engine


def make_session_factory(engine=None) -> sessionmaker:
    return sessionmaker(bind=engine or make_engine(), expire_on_commit=False)
