"""Passwords, sessions, and the token cipher for workspace credentials.

The DataHub token a workspace stores is a real credential to a real catalog,
so it is encrypted at rest with a key that lives only in the environment
(`NIGHTSHIFT_SECRET`). Everything here is deliberately boring: bcrypt for
passwords, Fernet for tokens, opaque random session cookies in the database.
"""

from __future__ import annotations

import base64
import hashlib
import os

import bcrypt
from cryptography.fernet import Fernet


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], password_hash.encode())
    except ValueError:
        return False


def _fernet() -> Fernet:
    secret = os.environ.get("NIGHTSHIFT_SECRET")
    if not secret:
        raise RuntimeError("NIGHTSHIFT_SECRET is not set; refusing to touch credentials")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def encrypt_token(token: str) -> str:
    if not token:
        return ""
    return _fernet().encrypt(token.encode()).decode()


def decrypt_token(blob: str) -> str:
    if not blob:
        return ""
    return _fernet().decrypt(blob.encode()).decode()
